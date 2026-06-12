import {
  BadRequestException,
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
  AuthResponseDto,
  GetMeDto,
  LoginDto,
  PinVerifyDto,
  PinVerifyResponseDto,
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
  async login(@Body() body: LoginDto, @Res() res: Response) {
    const cookieOptions = getCookieOptions();

    if (body.terminalCode) {
      const terminal = await this.authService.validateTerminal(
        body.terminalCode.trim(),
        body.password,
      );
      const result = await this.authService.loginAsTerminal(terminal);
      res.cookie('token', result.token, { ...cookieOptions, maxAge: TOKEN_MAX_AGE });
      return res.send({
        message: 'Login successful',
        terminal: { terminalCode: terminal.terminalCode, name: terminal.name, role: terminal.role },
      });
    }

    if (!body.username) throw new BadRequestException('กรุณาระบุชื่อผู้ใช้หรือรหัสเครื่อง');
    const username = body.username.trim().toLocaleLowerCase();
    const user = await this.authService.validateUser(username, body.password);
    const authUser = await this.authService.login(user);
    res.cookie('token', authUser.token, { ...cookieOptions, maxAge: TOKEN_MAX_AGE });
    res.cookie('refreshToken', authUser.refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
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
    if (!refreshToken) throw new UnauthorizedException('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    const { token, refreshToken: newRefreshToken } = await this.authService.refresh(refreshToken);
    const cookieOptions = getCookieOptions();
    res.cookie('token', token, { ...cookieOptions, maxAge: TOKEN_MAX_AGE });
    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
    return res.send({ message: 'Refresh successful' });
  }

  @Post('pin/verify')
  @NoCache()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'PIN verified — actor token issued', type: PinVerifyResponseDto })
  async verifyPin(@Req() req: Request, @Body() body: PinVerifyDto) {
    const user = req.user as any;
    const isBypass =
      process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true';
    if (!isBypass && user.type !== 'terminal') {
      throw new UnauthorizedException('กรุณาเข้าสู่ระบบด้วยเครื่อง (Terminal) ก่อนยืนยัน PIN');
    }
    const terminalId = isBypass ? 'dev-terminal' : user.sub;
    return this.authService.verifyPin(terminalId, body.pin, body.employeeId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch('update-password')
  @NoCache()
  @Roles('*')
  async updatePassword(@Req() req: Request, @Body() body: UpdatePasswordDto) {
    const username = (req.user as any).username;
    if (!username) throw new UnauthorizedException('เฉพาะบัญชีผู้ใช้เท่านั้นที่เปลี่ยนรหัสผ่านได้');
    return this.authService.updatePassword(username, body.currentPassword, body.newPassword);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('*')
  @Get('me')
  @NoCache()
  @ApiOkResponse({ description: 'Current session info', type: GetMeDto })
  getMe(@Req() req: Request) {
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
