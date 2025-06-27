import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { Role } from '../role/role.enum';

export class AuthPayloadDto {
  @ApiProperty({ example: 'admin', description: 'Username for authentication' })
  @IsNotEmpty({ message: 'username is required' })
  username: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password for authentication',
  })
  @IsNotEmpty({ message: 'password is required' })
  password: string;
}

export class UpdatePasswordDto {
  @ApiProperty({ example: 'admin', description: 'Username for authentication' })
  @IsNotEmpty({ message: 'Username is required' })
  username: string;

  @ApiProperty({ example: 'oldpassword', description: 'Current password' })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPass: string;

  @ApiProperty({ example: 'newpassword', description: 'New password' })
  @IsNotEmpty({ message: 'New password is required' })
  newPass: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'Login successful', description: 'Response message' })
  message: string;

  @ApiProperty({
    example: { username: 'admin', role: Role.Operator },
    description: 'User information',
  })
  user: {
    username: string;
    role: Role;
  };
}

export class GetMeDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  role: Role;
}
