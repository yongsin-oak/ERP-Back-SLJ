import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CategoryCreateDto } from './dto/create-category.dto';
import { CategoryGetDto } from './dto/get-category.dto';
import {
  CategoryResponseDto,
  CategoryResponseWithChildrenDto,
  CategoryResponseWithParentDto,
} from './dto/response-category.dto';
import { Category } from './entities/category.entity';
import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { Roles } from '@app/auth/role/roles.decorator';
import { Role } from '@app/auth/role/role.enum';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';

@Controller('category')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(private readonly categoryservice: CategoryService) {}

  @Post()
  @Roles(Role.SuperAdmin)
  @ApiOkResponse({
    description: 'Create a new category',
    type: Category,
  })
  async createCategory(@Body() body: CategoryCreateDto): Promise<Category> {
    return this.categoryservice.create(body);
  }

  @Get()
  @Roles('*')
  @ApiOkResponsePaginated(CategoryResponseDto)
  async getAllCategories(
    @Query() query: CategoryGetDto,
  ): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    return this.categoryservice.findAll(query);
  }

  @Get('tree')
  @Roles('*')
  @ApiOkResponse({
    description: 'Get all categories as a tree structure',
    type: CategoryResponseWithChildrenDto,
    isArray: true,
  })
  async getAllCategoriesTree(): Promise<CategoryResponseWithChildrenDto[]> {
    return this.categoryservice.findAllTree();
  }

  @Get(':id')
  @Roles('*')
  @ApiOkResponse({
    description: 'Get category by ID',
    type: CategoryResponseWithChildrenDto,
  })
  async getCategoryById(
    @Param('id') id: string,
  ): Promise<CategoryResponseWithChildrenDto> {
    return this.categoryservice.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin)
  @ApiOkResponse({
    description: 'Update category by ID',
    type: CategoryResponseWithParentDto,
  })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: CategoryCreateDto,
  ): Promise<CategoryResponseWithParentDto> {
    return this.categoryservice.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.SuperAdmin)
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
    @Param('id') id: string,
    @Query('deleteChild') deleteChild?: string,
  ): Promise<CategoryResponseWithChildrenDto> {
    const deleteChildBool = deleteChild === 'true' || deleteChild === '1';
    return this.categoryservice.remove(id, deleteChildBool);
  }
}
