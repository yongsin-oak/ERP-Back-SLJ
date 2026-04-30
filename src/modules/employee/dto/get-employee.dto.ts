import { Role } from '@app/auth/role/role.enum';
import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class EmployeeGetDto extends PaginatedGetAllDto {
  @ApiProperty({ required: false, description: 'Search by firstName, lastName, or nickname' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: Role })
  @IsOptional()
  @IsEnum(Role)
  department?: Role;
}
