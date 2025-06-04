// auth.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  AuthPayloadDto,
  AuthResponseDto,
  GetMeDto,
  UpdatePasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { Role } from './role/role.enum';
import { RolesGuard } from './role/roles.guard';
import { Roles } from './role/roles.decorator';

@Controller()
@ApiBearerAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOkResponse({
    description: 'Login successful',
    type: AuthResponseDto,
  })
  async login(@Body() body: AuthPayloadDto, @Res() res: Response) {
    const user: { id: number; username: string; role: Role } =
      await this.authService.validateUser(body);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const authUser = await this.authService.login(user);
    res.cookie('token', authUser.token, {
      httpOnly: false,
      secure: false, // true ใน production + HTTPS เท่านั้น
      sameSite: 'lax', // บน production ควรใช้ 'strict' หรือ 'none' ขึ้นอยู่กับการใช้งาน
      maxAge: 86400000,
    });

    return res.send({ message: 'Login successful', user: authUser });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('update-password')
  @Roles('*')
  async updatePassword(@Body() body: UpdatePasswordDto) {
    const { username, currentPass, newPass } = body;
    return this.authService.updatePassword(username, currentPass, newPass);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('*')
  @Get('me')
  @ApiOkResponse({
    description: 'User information',
    type: GetMeDto,
  })
  getme(@Req() req: Request) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('*')
  @Post('logout')
  @ApiOkResponse({ description: 'Logout successful' })
  logout(@Res({ passthrough: true }) res: Response) {
    // ล้าง cookie ชื่อ 'token'
    res.clearCookie('token', {
      httpOnly: false,
      sameSite: 'lax',
      secure: false, // ใน production ควรเป็น true
    });
    return { message: 'Logout successful' };
  }
}
