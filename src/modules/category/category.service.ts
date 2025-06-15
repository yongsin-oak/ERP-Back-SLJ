import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category } from './entities/category.entity';
import { Repository } from 'typeorm';
import {
  getEntityOrNotFound,
  throwIfEntityExists,
} from 'src/common/helpers/entity.helper';
import { CategoryCreateDto } from './dto/create-category.dto';
import { CategoryUpdateDto } from './dto/update-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';
import { CategoryGetDto } from './dto/get-category.dto';
import {
  CategoryResponseDto,
  CategoryResponseWithChildrenDto,
  CategoryResponseWithParentDto,
} from './dto/response-category.dto';
import { generateId } from 'src/common/helpers/generateIdWithPrefix';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async categoryThrowExists(name: string): Promise<void> {
    await throwIfEntityExists(
      this.categoryRepository,
      {
        where: { name },
      },
      `Category ${name}`,
    );
  }

  async categoryGetEntityOrNotFound(id: string): Promise<Category> {
    return await getEntityOrNotFound(
      this.categoryRepository,
      { where: { id } },
      `Category ${id}`,
    );
  }

  async create(dto: CategoryCreateDto): Promise<Category> {
    await this.categoryThrowExists(dto.name);

    if (dto.parentId) {
      const parent = await this.findOne(dto.parentId);
      if (!parent) {
        throw new NotFoundException(`Parend id ${dto.parentId} not found`);
      }
    }
    const id = generateId('CAT');
    const category = this.categoryRepository.create({
      ...dto,
      id,
    });
    return this.categoryRepository.save(category);
  }

  async findAll({
    page,
    limit,
    parentId: parentQuery,
  }: CategoryGetDto): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    const skip = (page - 1) * limit;
    const take = limit;
    const [categories, total] = await this.categoryRepository.findAndCount({
      take,
      skip,
      relations: ['parent'],
      where: {
        ...(parentQuery && { parent: { id: parentQuery } }),
      },
    });

    return {
      data: categories.map((category) => {
        const { parent, ...rest } = category;
        return {
          ...rest,
          parentId: category.parent?.id ?? null,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async findAllTree(): Promise<CategoryResponseWithChildrenDto[]> {
    const categories = await this.categoryRepository.find({
      relations: ['children'],
    });
    const categoryTree = categories.map((category) => {
      const { parent, ...rest } = category;
      return {
        ...rest,
        children: category.children.map((child) => ({
          id: child.id,
          name: child.name,
          description: child.description,
          createdAt: child.createdAt,
          updatedAt: child.updatedAt,
        })),
      };
    });
    return categoryTree;
  }

  async findOne(id: string): Promise<Category> {
    const category = await getEntityOrNotFound(
      this.categoryRepository,
      { where: { id }, relations: ['parent', 'children'] },
      `Category ${id}`,
    );
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: CategoryUpdateDto,
  ): Promise<CategoryResponseWithParentDto> {
    await this.categoryGetEntityOrNotFound(id);
    await this.categoryRepository.update(id, {
      ...updateCategoryDto,
      ...(updateCategoryDto.parentId
        ? {
            parent: { id: updateCategoryDto.parentId },
          }
        : {
            parent: null,
          }),
    });
    const category = await this.findOne(id);
    const { parentId, ...rest } = category;
    return rest;
  }

  async remove(
    id: string,
    delChild?: boolean,
  ): Promise<CategoryResponseWithChildrenDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    if (category.children && category.children.length > 0) {
      if (delChild === true) {
        for (const child of category.children) {
          await this.remove(child.id, true); // ลบลูกทั้งหมดแบบ recursive
        }
      } else {
        throw new BadRequestException(
          `Cannot delete category ${id} because it has ${category.children.length} child(ren). Set delChild=true to force delete.`,
        );
      }
    }

    await this.categoryRepository.delete(id);

    const { parent, children, ...rest } = category;

    return {
      ...rest,
      children: [],
    };
  }
}
