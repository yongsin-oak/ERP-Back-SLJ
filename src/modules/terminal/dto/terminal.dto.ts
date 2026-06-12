import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@app/auth/role/role.enum';
import { PaginatedListQueryDto } from '@app/common/dto/paginated.dto';

export class GetTerminalDto extends PaginatedListQueryDto {}

export class CreateTerminalDto {
  @ApiProperty({ example: 'POS-01', description: 'Unique terminal code' })
  @IsNotEmpty()
  @IsString()
  terminalCode: string;

  @ApiProperty({ example: 'POS หน้าร้าน 1' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: Role, example: Role.Operator })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({ example: 'terminal1234', description: 'At least 8 characters' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}

export class UpdateTerminalDto extends PartialType(CreateTerminalDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
