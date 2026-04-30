import { JwtAuthGuard } from '@app/auth/jwt/jwt-auth.guard';
import { Role } from '@app/auth/role/role.enum';
import { Roles } from '@app/auth/role/roles.decorator';
import { RolesGuard } from '@app/auth/role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';
import { ApiOkResponsePaginated } from '@app/common/decorator/paginated.decorator';
import { PaginatedResponseDto } from '@app/common/dto/paginated.dto';
import { ok } from '@app/common/helpers/response';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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

@Controller({ path: 'category', version: '1' })
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(private readonly categoryservice: CategoryService) {}

  @Post()
  @Roles(Role.SuperAdmin)
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'Create a new category', type: CategoryResponseDto })
  async createCategory(@Body() body: CategoryCreateDto) {
    return ok(await this.categoryservice.create(body));
  }

  @Get()
  @Roles('*')
  @ApiOkResponsePaginated(CategoryResponseDto)
  async getAllCategories(@Query() query: CategoryGetDto): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    return ok(await this.categoryservice.findAll(query));
  }

  @Get('tree')
  @Roles('*')
  @ApiOkResponse({ description: 'Get all categories as a tree structure', type: CategoryResponseWithChildrenDto, isArray: true })
  async getAllCategoriesTree() {
    return ok(await this.categoryservice.findAllTree());
  }

  @Get(':id')
  @Roles('*')
  @ApiOkResponse({ description: 'Get category by ID', type: CategoryResponseWithChildrenDto })
  async getCategoryById(@Param('id') id: string) {
    return ok(await this.categoryservice.findOne(id));
  }

  @Patch(':id')
  @Roles(Role.SuperAdmin)
  @ApiOkResponse({ description: 'Update category by ID', type: CategoryResponseWithParentDto })
  async updateCategory(@Param('id') id: string, @Body() body: CategoryCreateDto) {
    return ok(await this.categoryservice.update(id, body));
  }

  @Delete(':id')
  @Roles(Role.SuperAdmin)
  @ApiQuery({ name: 'deleteChild', required: false, type: Boolean, description: 'Delete all child categories as well' })
  @ApiOkResponse({ description: 'Delete category by ID', type: CategoryResponseWithChildrenDto })
  async deleteCategory(@Param('id') id: string, @Query('deleteChild') deleteChild?: string) {
    return ok(await this.categoryservice.remove(id, deleteChild === 'true' || deleteChild === '1'));
  }
}
