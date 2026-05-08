import { Role } from '@app/auth/role/role.enum';
import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class EmployeeGetDto extends PaginatedGetAllDto {
  @ApiProperty({ required: false, description: 'Search by firstName, lastName, or nickname' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: Role })
  @IsOptional()
  @IsEnum(Role)
  department?: Role;

  @ApiProperty({ required: false, description: 'true = active only, false = inactive only' })
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
