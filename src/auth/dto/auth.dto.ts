import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { Role } from '../role/role.enum';

export class AuthPayloadDto {
  @ApiProperty({ example: 'admin', description: 'Username for authentication' })
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password for authentication',
  })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

export class UpdatePasswordDto {
  @ApiProperty({ example: 'admin', description: 'Username for authentication' })
  @IsNotEmpty({ message: 'Username is required' })
  username: number;

  @ApiProperty({ example: 'oldpassword', description: 'Current password' })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPass: string;

  @ApiProperty({ example: 'newpassword', description: 'New password' })
  @IsNotEmpty({ message: 'New password is required' })
  newPass: string;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT token',
  })
  token: string;
}

export class GetMeDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  role: Role;
}
