import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { Role } from '../role/role.enum';

export class LoginDto {
  @ApiPropertyOptional({ example: 'superadmin', description: 'Username (user login)' })
  @IsString()
  @ValidateIf((o) => !o.terminalCode)
  @IsNotEmpty({ message: 'username is required when terminalCode is not provided' })
  username?: string;

  @ApiPropertyOptional({ example: 'POS-01', description: 'Terminal code (terminal login)' })
  @IsString()
  @ValidateIf((o) => !o.username)
  @IsNotEmpty({ message: 'terminalCode is required when username is not provided' })
  terminalCode?: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty({ message: 'password is required' })
  password: string;
}

/** @deprecated Use LoginDto */
export class AuthPayloadDto extends LoginDto {}

export class PinVerifyDto {
  @ApiProperty({ example: 'EMP-ABCD123456', description: 'Employee ID' })
  @IsNotEmpty({ message: 'employeeId is required' })
  @IsString()
  employeeId: string;

  @ApiProperty({ example: '1234', description: '4–6 digit numeric PIN' })
  @IsNotEmpty({ message: 'PIN is required' })
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4–6 digits' })
  pin: string;
}

export class UpdatePasswordDto {
  @ApiProperty({ example: 'oldpassword' })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({ example: 'newpassword' })
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'Login successful' })
  message: string;

  @ApiPropertyOptional({ example: { username: 'admin', role: Role.Operator } })
  user?: { username: string; role: Role };

  @ApiPropertyOptional({ example: { terminalCode: 'POS-01', name: 'POS หน้าร้าน', role: Role.Operator } })
  terminal?: { terminalCode: string; name: string; role: Role };
}

export class GetMeDto {
  @ApiProperty()
  sub: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional({ example: 'POS-01' })
  terminalCode?: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ example: 'user', enum: ['user', 'terminal'] })
  type: string;
}

export class PinVerifyResponseDto {
  @ApiProperty({ description: 'Short-lived actor JWT (include as X-Actor-Token header)' })
  actorToken: string;

  @ApiProperty({ example: 300, description: 'Token lifetime in seconds' })
  expiresIn: number;

  @ApiProperty()
  employee: {
    id: string;
    name: string;
    role: Role;
  };
}
