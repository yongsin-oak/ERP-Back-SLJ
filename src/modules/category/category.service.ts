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
import { badRequest, notFound, paginatedResponse } from '@app/common/helpers/response';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  private async categoryGetEntityOrFail(id: string): Promise<Category> {
    return getEntityOrNotFound(this.categoryRepository, { where: { id } }, `Category ${id}`);
  }

  private async categoryThrowIfExists(name: string): Promise<void> {
    await throwIfEntityExists(this.categoryRepository, { where: { name } }, `Category "${name}"`);
  }

  async create(dto: CategoryCreateDto): Promise<Category> {
    await this.categoryThrowIfExists(dto.name);
    if (dto.parentId) {
      await this.categoryGetEntityOrFail(dto.parentId);
    }
    const category = this.categoryRepository.create(dto);
    return this.categoryRepository.save(category);
  }

  async findAll({ page, limit, parentId }: CategoryGetDto): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    const [categories, total] = await this.categoryRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['parent'],
      where: { ...(parentId && { parent: { id: parentId } }) },
    });

    return paginatedResponse(
      categories.map(({ parent, ...rest }) => ({
        ...rest,
        parentId: parent?.id ?? null,
      })),
      page,
      limit,
      total,
    );
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
      `Category ${id}`,
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

    if (!category) throw notFound(`Category ${id} not found`);

    if (category.children?.length > 0) {
      if (!delChild) {
        throw badRequest(
          `Category ${id} has ${category.children.length} child(ren). Pass deleteChild=true to force delete.`,
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
