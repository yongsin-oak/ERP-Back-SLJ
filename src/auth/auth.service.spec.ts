import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './user/user.entity';
import { Role } from './role/role.enum';
import { Terminal } from '@app/modules/terminal/terminal.entity';
import { Employee } from '@app/modules/employee/entities/employee.entity';

// bcrypt is a native module and non-deterministic; mock it so tests assert the
// auth *logic* (which branch runs, what gets persisted) without real hashing.
jest.mock('bcrypt');
const compare = bcrypt.compare as jest.Mock;
const hash = bcrypt.hash as jest.Mock;

const repoMock = () => ({
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// Same generic message the service returns for both "no such user" and "wrong
// password" — asserting on it guards the anti-enumeration behavior.
const INVALID_CREDENTIALS = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
const INVALID_TERMINAL = 'รหัสเครื่องหรือรหัสผ่านไม่ถูกต้อง';

const userRow = () => ({
  id: 'u1',
  username: 'superadmin',
  password: 'hashed-password',
  role: Role.Operator,
  refreshTokenHash: 'old-refresh-hash',
});

const terminalRow = () => ({
  id: 'TERM1',
  terminalCode: 'POS-01',
  name: 'POS หน้าร้าน',
  role: Role.Operator,
  passwordHash: 'hashed-terminal-password',
  isActive: true,
});

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: ReturnType<typeof repoMock>;
  let terminalRepo: ReturnType<typeof repoMock>;
  let jwt: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token'), verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwt },
        { provide: getRepositoryToken(User), useFactory: repoMock },
        { provide: getRepositoryToken(Terminal), useFactory: repoMock },
        { provide: getRepositoryToken(Employee), useFactory: repoMock },
      ],
    }).compile();

    service = module.get(AuthService);
    usersRepo = module.get(getRepositoryToken(User));
    terminalRepo = module.get(getRepositoryToken(Terminal));

    compare.mockReset();
    hash.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── User login: validateUser ─────────────────────────────────────────────
  describe('validateUser', () => {
    it('throws Unauthorized with the generic message when the user does not exist', async () => {
      usersRepo.findOneBy.mockResolvedValue(null);

      await expect(service.validateUser('nobody', 'pw')).rejects.toThrow(
        new UnauthorizedException(INVALID_CREDENTIALS),
      );
      expect(usersRepo.findOneBy).toHaveBeenCalledWith({ username: 'nobody' });
      // Never reaches the password check when the user is missing.
      expect(compare).not.toHaveBeenCalled();
    });

    it('throws the same generic message when the password is wrong', async () => {
      usersRepo.findOneBy.mockResolvedValue(userRow());
      compare.mockResolvedValue(false);

      await expect(service.validateUser('superadmin', 'wrong')).rejects.toThrow(
        new UnauthorizedException(INVALID_CREDENTIALS),
      );
      expect(compare).toHaveBeenCalledWith('wrong', 'hashed-password');
    });

    it('returns the user without password / refreshTokenHash on success', async () => {
      usersRepo.findOneBy.mockResolvedValue(userRow());
      compare.mockResolvedValue(true);

      const result = await service.validateUser('superadmin', 'correct');

      expect(result).toEqual({ id: 'u1', username: 'superadmin', role: Role.Operator });
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('refreshTokenHash');
    });
  });

  // ─── User login: issue tokens ─────────────────────────────────────────────
  describe('login', () => {
    it('signs access + refresh tokens and persists the refresh-token hash', async () => {
      jwt.sign.mockReturnValueOnce('access.token').mockReturnValueOnce('refresh.token');
      hash.mockResolvedValue('hashed-refresh');

      const result = await service.login({
        id: 'u1',
        username: 'superadmin',
        role: Role.Operator,
      });

      expect(result).toEqual({
        token: 'access.token',
        refreshToken: 'refresh.token',
        role: Role.Operator,
        username: 'superadmin',
      });
      // The raw refresh token is hashed before being stored on the user row.
      expect(hash).toHaveBeenCalledWith('refresh.token', 10);
      expect(usersRepo.update).toHaveBeenCalledWith(
        { id: 'u1' },
        { refreshTokenHash: 'hashed-refresh' },
      );
    });
  });

  // ─── Terminal login: validateTerminal ─────────────────────────────────────
  describe('validateTerminal', () => {
    it('looks up only active terminals and throws the generic message when none match', async () => {
      terminalRepo.findOneBy.mockResolvedValue(null);

      await expect(service.validateTerminal('POS-01', 'pw')).rejects.toThrow(
        new UnauthorizedException(INVALID_TERMINAL),
      );
      expect(terminalRepo.findOneBy).toHaveBeenCalledWith({
        terminalCode: 'POS-01',
        isActive: true,
      });
    });

    it('throws the same generic message when the terminal password is wrong', async () => {
      terminalRepo.findOneBy.mockResolvedValue(terminalRow());
      compare.mockResolvedValue(false);

      await expect(service.validateTerminal('POS-01', 'wrong')).rejects.toThrow(
        new UnauthorizedException(INVALID_TERMINAL),
      );
    });

    it('returns the terminal on valid code + password', async () => {
      const terminal = terminalRow();
      terminalRepo.findOneBy.mockResolvedValue(terminal);
      compare.mockResolvedValue(true);

      await expect(service.validateTerminal('POS-01', 'correct')).resolves.toBe(terminal);
      expect(compare).toHaveBeenCalledWith('correct', 'hashed-terminal-password');
    });
  });

  // ─── Terminal login: issue token ──────────────────────────────────────────
  describe('loginAsTerminal', () => {
    it('signs a terminal-typed token and returns terminal identity', async () => {
      jwt.sign.mockReturnValue('terminal.token');

      const result = await service.loginAsTerminal(terminalRow() as Terminal);

      expect(result).toEqual({
        token: 'terminal.token',
        role: Role.Operator,
        terminalCode: 'POS-01',
        name: 'POS หน้าร้าน',
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'TERM1',
          terminalCode: 'POS-01',
          role: Role.Operator,
          type: 'terminal',
        }),
        expect.any(Object),
      );
    });
  });
});
