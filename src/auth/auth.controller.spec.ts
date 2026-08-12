import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from './role/role.enum';

// A minimal Express Response double: cookie/send/clearCookie are chainable and
// recorded so we can assert what the controller wrote back to the client.
const resMock = () => {
  const res: Partial<Response> = {};
  res.cookie = jest.fn().mockReturnValue(res) as any;
  res.send = jest.fn().mockReturnValue(res) as any;
  res.clearCookie = jest.fn().mockReturnValue(res) as any;
  return res as Response;
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    validateUser: jest.Mock;
    login: jest.Mock;
    validateTerminal: jest.Mock;
    loginAsTerminal: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
      login: jest.fn(),
      validateTerminal: jest.fn(),
      loginAsTerminal: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login (user)', () => {
    it('normalizes the username, sets token + refreshToken cookies, and returns user info', async () => {
      authService.validateUser.mockResolvedValue({
        id: 'u1',
        username: 'superadmin',
        role: Role.Operator,
      });
      authService.login.mockResolvedValue({
        token: 'access.token',
        refreshToken: 'refresh.token',
        role: Role.Operator,
        username: 'superadmin',
      });
      const res = resMock();

      // Mixed case + surrounding spaces to prove the controller trims/lowercases.
      await controller.login({ username: '  SuperAdmin  ', password: 'pw' }, res);

      expect(authService.validateUser).toHaveBeenCalledWith('superadmin', 'pw');
      expect(res.cookie).toHaveBeenCalledWith(
        'token',
        'access.token',
        expect.objectContaining({ maxAge: expect.any(Number) }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh.token',
        expect.objectContaining({ maxAge: expect.any(Number) }),
      );
      expect(res.send).toHaveBeenCalledWith({
        message: 'Login successful',
        user: { username: 'superadmin', role: Role.Operator },
      });
    });
  });

  describe('login (terminal)', () => {
    it('sets only the token cookie and returns terminal info', async () => {
      const terminal = {
        terminalCode: 'POS-01',
        name: 'POS หน้าร้าน',
        role: Role.Operator,
      };
      authService.validateTerminal.mockResolvedValue(terminal);
      authService.loginAsTerminal.mockResolvedValue({ token: 'terminal.token' });
      const res = resMock();

      await controller.login({ terminalCode: ' POS-01 ', password: 'pw' }, res);

      expect(authService.validateTerminal).toHaveBeenCalledWith('POS-01', 'pw');
      expect(authService.loginAsTerminal).toHaveBeenCalledWith(terminal);
      // Terminal sessions get a token but no refresh token.
      expect(res.cookie).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledWith(
        'token',
        'terminal.token',
        expect.objectContaining({ maxAge: expect.any(Number) }),
      );
      expect(res.send).toHaveBeenCalledWith({
        message: 'Login successful',
        terminal: { terminalCode: 'POS-01', name: 'POS หน้าร้าน', role: Role.Operator },
      });
      expect(authService.validateUser).not.toHaveBeenCalled();
    });
  });

  describe('login (invalid input)', () => {
    it('throws BadRequest when neither username nor terminalCode is provided', async () => {
      const res = resMock();

      await expect(
        controller.login({ password: 'pw' } as any, res),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });
});
