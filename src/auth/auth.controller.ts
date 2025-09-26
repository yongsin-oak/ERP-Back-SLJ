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
import { CookieOptions, Request, Response } from 'express';
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
import { NoCache } from '@app/common/decorator/cache-control.decorator';

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
    const user: { id: string; username: string; role: Role } =
      await this.authService.validateUser(body);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const authUser = await this.authService.login(user);
    const cookieOptions: CookieOptions =
      process.env.NODE_ENV === 'production'
        ? {
            httpOnly: true,
            secure: true, // true ใน production + HTTPS เท่านั้น
            sameSite: 'none', // บน production ควรใช้ 'strict' หรือ 'none' ขึ้นอยู่กับการใช้งาน
            domain: '.sljsupply-center.com',
            path: '/',
          }
        : {
            httpOnly: true,
            secure: false, // ใน development สามารถใช้ false ได้
            sameSite: 'lax', // ใน development สามารถใช้ lax ได้
          };
    res.cookie('token', authUser.token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 10, // 10 ชั่วโมง
    });
    res.cookie('refreshToken', authUser.refreshToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 วัน
    });

    return res.send({
      message: 'Login successful',
      user: {
        username: user.username,
        role: user.role,
      },
    });
  }

  @Post('refresh-token')
  @NoCache()
  @ApiOkResponse({ description: 'Refresh successful' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken =
      (req.cookies && (req.cookies as any).refreshToken) ||
      req.body?.refreshToken;
    if (!refreshToken)
      throw new UnauthorizedException('Unauthorized');

    const { token, refreshToken: newRefreshToken } =
      await this.authService.refresh(refreshToken);

    const cookieOptions: CookieOptions =
      process.env.NODE_ENV === 'production'
        ? {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            domain: '.sljsupply-center.com',
            path: '/',
          }
        : {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
          };

    res.cookie('token', token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 10,
    });
    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.send({ message: 'Refresh successful' });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('update-password')
  @NoCache() // ไม่ cache การเปลี่ยนรหัสผ่าน
  @Roles('*')
  async updatePassword(@Body() body: UpdatePasswordDto) {
    const { username, currentPass, newPass } = body;
    return this.authService.updatePassword(username, currentPass, newPass);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('*')
  @Get('me')
  @NoCache() // ไม่ cache ข้อมูลผู้ใช้
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
  @NoCache() // ไม่ cache การ logout
  @ApiOkResponse({ description: 'Logout successful' })
  logout(@Res({ passthrough: true }) res: Response) {
    // ล้าง cookie ชื่อ 'token'
    const cookieOptions: CookieOptions =
      process.env.NODE_ENV === 'production'
        ? {
            httpOnly: true,
            secure: true, // true ใน production + HTTPS เท่านั้น
            sameSite: 'none', // บน production ควรใช้ 'strict' หรือ 'none' ขึ้นอยู่กับการใช้งาน
            domain: '.sljsupply-center.com',
            path: '/',
          }
        : {
            httpOnly: true,
            secure: false, // ใน development สามารถใช้ false ได้
            sameSite: 'lax', // ใน development สามารถใช้ lax ได้
          };
    res.clearCookie('token', {
      ...cookieOptions,
    });
    res.clearCookie('refreshToken', {
      ...cookieOptions,
    });
    return { message: 'Logout successful' };
  }
}
