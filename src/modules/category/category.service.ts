import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async remove(id: string, delChild = false): Promise<CategoryResponseWithChildrenDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!category) throw notFound(`ไม่พบหมวดหมู่`);

    if (category.children?.length > 0) {
      if (!delChild) {
        throw badRequest(
          `ไม่สามารถลบได้ เนื่องจากหมวดหมู่นี้มี ${category.children.length} หมวดหมู่ย่อย`,
        );
      }
      for (const child of category.children) {
        await this.remove(child.id, true);
      }
    }

    await this.categoryRepository.delete(id);
    const { parent, children, ...rest } = category;
    return { ...rest, children: [] };
  }
}
