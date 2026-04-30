import {
  Body,
  Controller,
  Get,
  Patch,
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
import { getCookieOptions } from './helpers/cookie-options.helper';
import { JwtAuthGuard } from './jwt/jwt-auth.guard';
import { Roles } from './role/roles.decorator';
import { RolesGuard } from './role/roles.guard';
import { NoCache } from '@app/common/decorator/cache-control.decorator';

const TOKEN_MAX_AGE = 1000 * 60 * 60 * 10;
const REFRESH_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24 * 7;

@Controller({ path: 'auth', version: '1' })
@ApiBearerAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOkResponse({ description: 'Login successful', type: AuthResponseDto })
  async login(@Body() body: AuthPayloadDto, @Res() res: Response) {
    const { username, password } = body;
    const cleanedUsername = username.trim().toLocaleLowerCase();
    const user = await this.authService.validateUser({ username: cleanedUsername, password });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const authUser = await this.authService.login(user);
    const cookieOptions = getCookieOptions();

    res.cookie('token', authUser.token, { ...cookieOptions, maxAge: TOKEN_MAX_AGE });
    res.cookie('refreshToken', authUser.refreshToken, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE });

    return res.send({
      message: 'Login successful',
      user: { username: user.username, role: user.role },
    });
  }

  @Post('refresh-token')
  @NoCache()
  @ApiOkResponse({ description: 'Refresh successful' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const refreshToken =
      (req.cookies && (req.cookies as any).refreshToken) || req.body?.refreshToken;
    if (!refreshToken) throw new UnauthorizedException('Unauthorized');

    const { token, refreshToken: newRefreshToken } = await this.authService.refresh(refreshToken);
    const cookieOptions = getCookieOptions();

    res.cookie('token', token, { ...cookieOptions, maxAge: TOKEN_MAX_AGE });
    res.cookie('refreshToken', newRefreshToken, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE });

    return res.send({ message: 'Refresh successful' });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('update-password')
  @NoCache()
  @Roles('*')
  async updatePassword(@Req() req: Request, @Body() body: UpdatePasswordDto) {
    const username = (req.user as any).username;
    return this.authService.updatePassword(username, body.currentPassword, body.newPassword);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('*')
  @Get('me')
  @NoCache()
  @ApiOkResponse({ description: 'User information', type: GetMeDto })
  getme(@Req() req: Request) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('*')
  @Post('logout')
  @NoCache()
  @ApiOkResponse({ description: 'Logout successful' })
  logout(@Res({ passthrough: true }) res: Response) {
    const cookieOptions = getCookieOptions();
    res.clearCookie('token', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);
    return { message: 'Logout successful' };
  }
}
