// auth.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  AuthPayloadDto,
  AuthResponseDto,
  GetMeDto,
  UpdatePasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { Role } from './role/role.enum';
import { Roles } from './role/roles.decorator';
import { RolesGuard } from './role/roles.guard';

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOkResponse({
    description: 'Login successful',
    type: AuthResponseDto,
  })
  async login(@Body() body: AuthPayloadDto) {
    const user = await this.authService.validateUser(body);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.authService.login(user);
  }

  @Post('update-password')
  async updatePassword(@Body() body: UpdatePasswordDto) {
    const { username, currentPass, newPass } = body;
    return this.authService.updatePassword(username, currentPass, newPass);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SuperAdmin, Role.Operator)
  @Get('auth/me')
  @ApiOkResponse({
    description: 'User information',
    type: GetMeDto,
  })
  getme(@Req() req: Request) {
    return req.user;
  }
}
