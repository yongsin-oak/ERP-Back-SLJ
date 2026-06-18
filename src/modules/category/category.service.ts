import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from '@app/modules/product/entities/product.entity';
import { CategoryCreateDto } from './dto/create-category.dto';
import { CategoryGetDto } from './dto/get-category.dto';
import {
  CategoryResponseDto,
  CategoryResponseWithChildrenDto,
  CategoryResponseWithParentDto,
} from './dto/response-category.dto';
import { CategoryUpdateDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { getEntityOrNotFound, throwIfEntityExists } from '@app/common/helpers/entity.helper';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { badRequest, notFound } from '@app/common/helpers/response';
import { applyKeywordSearch, paginateQuery } from '@app/common/helpers/query.helper';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  private async categoryGetEntityOrFail(id: string): Promise<Category> {
    return getEntityOrNotFound(this.categoryRepository, { where: { id } }, `หมวดหมู่`);
  }

  private async categoryThrowIfExists(name: string): Promise<void> {
    await throwIfEntityExists(this.categoryRepository, { where: { name } }, `หมวดหมู่ "${name}"`);
  }

  async create(dto: CategoryCreateDto): Promise<Category> {
    await this.categoryThrowIfExists(dto.name);
    if (dto.parentId) {
      await this.categoryGetEntityOrFail(dto.parentId);
    }
    const category = this.categoryRepository.create(dto);
    return this.categoryRepository.save(category);
  }

  async findAll({ page, limit, parentId, search }: CategoryGetDto): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    const qb = this.categoryRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.parent', 'parent')
      .orderBy('c.name', 'ASC');
    if (parentId) qb.andWhere('parent.id = :parentId', { parentId });
    applyKeywordSearch(qb, ['c.name'], search);

    return paginateQuery(qb, page, limit, ({ parent, ...rest }) => ({
      ...rest,
      parentId: parent?.id ?? null,
    }));
  }

  async findAllTree(): Promise<CategoryResponseWithChildrenDto[]> {
    const roots = await this.categoryRepository.find({
      relations: ['children'],
      where: { parent: null },
    });
    return roots.map(({ parent, ...rest }) => ({
      ...rest,
      children: rest.children.map((child) => ({
        id: child.id,
        name: child.name,
        description: child.description,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt,
      })),
    }));
  }

  async findOne(id: string): Promise<Category> {
    return getEntityOrNotFound(
      this.categoryRepository,
      { where: { id }, relations: ['parent', 'children'] },
      `หมวดหมู่`,
    );
  }

  async update(id: string, dto: CategoryUpdateDto): Promise<CategoryResponseWithParentDto> {
    await this.categoryGetEntityOrFail(id);
    await this.categoryRepository.update(id, {
      ...dto,
      ...(dto.parentId ? { parent: { id: dto.parentId } } : { parent: null }),
    });
    const category = await this.findOne(id);
    const { parentId, ...rest } = category;
    return rest;
  }

  /** รวบรวม id ของหมวดหมู่ทั้งสาย (ตัวเอง + ลูกหลานทุกชั้น) เรียงจากบนลงล่าง (BFS) */
  private async collectSubtreeIds(rootId: string): Promise<string[]> {
    const all = await this.categoryRepository.find({
      select: { id: true, parentId: true },
    });
    const childrenOf = new Map<string, string[]>();
    for (const c of all) {
      if (!c.parentId) continue;
      const siblings = childrenOf.get(c.parentId) ?? [];
      siblings.push(c.id);
      childrenOf.set(c.parentId, siblings);
    }
    const ordered: string[] = [];
    const queue = [rootId];
    while (queue.length) {
      const cur = queue.shift() as string;
      ordered.push(cur);
      queue.push(...(childrenOf.get(cur) ?? []));
    }
    return ordered;
  }

  async remove(id: string, delChild = false): Promise<CategoryResponseWithChildrenDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!category) throw notFound(`ไม่พบหมวดหมู่`);

    // หา id ทั้งสายที่จะถูกลบ (ตัวเอง + ลูกหลานทั้งหมด) — backend ลบแบบ cascade ลึก
    const subtreeIds = await this.collectSubtreeIds(id);
    const childCount = subtreeIds.length - 1;

    if (childCount > 0 && !delChild) {
      throw badRequest(
        `ไม่สามารถลบได้ เนื่องจากหมวดหมู่นี้มี ${childCount} หมวดหมู่ย่อย`,
      );
    }

    // กันข้อมูลสูญหาย: ถ้ามีสินค้าอยู่ในหมวดใดในสายนี้ ห้ามลบ (สินค้าไม่ถูก cascade)
    const productCount = await this.categoryRepository.manager.count(Product, {
      where: { categoryId: In(subtreeIds) },
    });
    if (productCount > 0) {
      throw badRequest(
        `ไม่สามารถลบได้ เนื่องจากมีสินค้า ${productCount} รายการอยู่ในหมวดหมู่นี้หรือหมวดย่อย กรุณาย้ายสินค้าออกก่อน`,
      );
    }

    // ลบทั้งสายในทรานแซกชันเดียว ลบลูกก่อนพ่อ (กัน FK parentId พังกลางคัน)
    await this.categoryRepository.manager.transaction(async (em) => {
      for (const cid of [...subtreeIds].reverse()) {
        await em.delete(Category, cid);
      }
    });

    const { parent, children, ...rest } = category;
    return { ...rest, children: [] };
  }
}
