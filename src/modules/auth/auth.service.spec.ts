import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    _id: 'user_123',
    name: 'testuser',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword',
    status: 1,
  };

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    validatePassword: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      name: 'newuser',
      email: 'new@example.com',
      password: 'password123',
    };

    it('should successfully register a new user', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt_token');
      mockConfigService.get.mockReturnValue('1h');

      const result = await service.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith({
        name: registerDto.name,
        email: registerDto.email,
        password: registerDto.password,
        locale: 'en-US',
      });
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(result).toHaveProperty('user');
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(true);
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);
      mockJwtService.sign.mockReturnValue('jwt_token');
      mockConfigService.get.mockReturnValue('1h');

      const result = await service.login(loginDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(usersService.validatePassword).toHaveBeenCalledWith(mockUser, loginDto.password);
      expect(result).toHaveProperty('access_token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, status: 2 });
      mockUsersService.validatePassword.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      mockJwtService.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');
      mockConfigService.get.mockReturnValueOnce('1h').mockReturnValueOnce('7d');

      const result = await service.generateTokens(mockUser);

      expect(result.access_token).toBe('access_token');
      expect(result.refresh_token).toBe('refresh_token');
      expect(result.user.id).toBe(mockUser._id);
      expect(result.user.email).toBe(mockUser.email);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const payload = { sub: 'user_123', email: 'test@example.com', name: 'testuser' };
      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new_token');
      mockConfigService.get.mockReturnValue('1h');

      const result = await service.refreshToken('valid_refresh_token');

      expect(jwtService.verify).toHaveBeenCalledWith('valid_refresh_token');
      expect(usersService.findById).toHaveBeenCalledWith(payload.sub);
      expect(result).toHaveProperty('access_token');
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid_token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = { sub: 'user_123', email: 'test@example.com', name: 'testuser' };
      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.refreshToken('valid_refresh_token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should validate and return active user', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateUser('user_123');

      expect(result).toEqual(mockUser);
      expect(usersService.findById).toHaveBeenCalledWith('user_123');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findById.mockRejectedValue(new Error('User not found'));

      await expect(service.validateUser('nonexistent')).rejects.toThrow();
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockUsersService.findById.mockResolvedValue({ ...mockUser, status: 2 });

      await expect(service.validateUser('user_123')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateOAuthUser', () => {
    const oauthData = {
      providerId: '12345',
      provider: 'google',
      email: 'oauth@example.com',
      name: 'oauthuser',
      displayName: 'OAuth User',
      photo: 'https://example.com/photo.jpg',
    };

    it('should return existing user if found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.validateOAuthUser(oauthData);

      expect(result).toEqual(mockUser);
      expect(usersService.findByEmail).toHaveBeenCalledWith(oauthData.email);
    });

    it('should create new user if not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.validateOAuthUser(oauthData);

      expect(usersService.create).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });
  });
});
