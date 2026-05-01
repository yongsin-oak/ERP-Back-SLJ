import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Role } from '@app/auth/role/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'password1234' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: Role, example: Role.Operator })
  @IsEnum(Role)
  role: Role;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Role, example: Role.Admin })
  @IsEnum(Role)
  role: Role;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ enum: Role })
  role: Role;
}
