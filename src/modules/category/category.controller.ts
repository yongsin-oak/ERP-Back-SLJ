import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryCreateDto } from './dto/create-category.dto';
import { Category } from './entities/category.entity';
import { ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import {
  PaginatedGetAllDto,
  PaginatedResponseDto,
} from 'src/common/dto/paginated.dto';
import { ApiOkResponsePaginated } from 'src/common/decorator/paginated.decorator';
import { CategoryGetDto } from './dto/get-category.dto';
import {
  CategoryResponseDto,
  CategoryResponseWithChildrenDto,
  CategoryResponseWithParentDto,
} from './dto/response-category.dto';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryservice: CategoryService) {}

  @Post()
  @ApiOkResponse({
    description: 'Create a new category',
    type: Category,
  })
  async createCategory(@Body() body: CategoryCreateDto): Promise<Category> {
    return this.categoryservice.create(body);
  }

  @Get()
  @ApiOkResponsePaginated(CategoryResponseDto)
  async getAllCategories(
    @Query() query: CategoryGetDto,
  ): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    return this.categoryservice.findAll(query);
  }

  @Get('tree')
  @ApiOkResponse({
    description: 'Get all categories as a tree structure',
    type: CategoryResponseWithChildrenDto,
    isArray: true,
  })
  async getAllCategoriesTree(): Promise<CategoryResponseWithChildrenDto[]> {
    return this.categoryservice.findAllTree();
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Get category by ID',
    type: CategoryResponseWithChildrenDto,
  })
  async getCategoryById(
    @Param('id') id: number,
  ): Promise<CategoryResponseWithChildrenDto> {
    return this.categoryservice.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'Update category by ID',
    type: CategoryResponseWithParentDto,
  })
  async updateCategory(
    @Param('id') id: number,
    @Body() body: CategoryCreateDto,
  ): Promise<CategoryResponseWithParentDto> {
    return this.categoryservice.update(id, body);
  }

  @Delete(':id')
  @ApiOkResponse({
    description: 'Delete category by ID',
    type: CategoryResponseWithChildrenDto,
  })
  @ApiQuery({
    name: 'deleteChild',
    required: false,
    type: Boolean,
    description: 'Delete all child categories as well',
  })
  async deleteCategory(
    @Param('id') id: number,
    @Query('deleteChild') deleteChild?: string,
  ): Promise<CategoryResponseWithChildrenDto> {
    const deleteChildBool = deleteChild === 'true' || deleteChild === '1';
    return this.categoryservice.remove(id, deleteChildBool);
  }
}
