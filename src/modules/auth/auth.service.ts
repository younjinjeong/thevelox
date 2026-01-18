import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export interface OAuthUserData {
  providerId: string;
  provider: string;
  email: string;
  name: string;
  displayName: string;
  photo: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    username?: string;
    role: 'user' | 'admin';
    roles: string[];
    locale: string;
    storageQuota: number;
    storageUsed: number;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Create user via UsersService
    const user = await this.usersService.create({
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      locale: 'en-US',
    });

    this.logger.log(`New user registered: ${user.email}`);

    // Generate tokens
    return this.generateTokens(user);
  }

  /**
   * Login with email and password
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    // Find user by email
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await this.usersService.validatePassword(user, loginDto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 1) {
      throw new UnauthorizedException('User account is inactive');
    }

    this.logger.log(`User logged in: ${user.email}`);

    // Update last login
    await this.usersService.updateLastLogin(user._id, 'unknown'); // IP will be set from controller

    // Generate tokens
    return this.generateTokens(user);
  }

  /**
   * Validate OAuth user (Google, etc.)
   * Find existing user or create new one
   */
  async validateOAuthUser(oauthData: OAuthUserData): Promise<User> {
    // Try to find user by email
    let user = await this.usersService.findByEmail(oauthData.email);

    if (user) {
      this.logger.log(`Existing user logging in via ${oauthData.provider}: ${user.email}`);
      // Update last login
      await this.usersService.updateLastLogin(user._id, 'unknown');
      return user;
    }

    // Create new user from OAuth data
    this.logger.log(`Creating new user from ${oauthData.provider} OAuth: ${oauthData.email}`);

    user = (await this.usersService.create({
      name: oauthData.name,
      username: oauthData.displayName,
      email: oauthData.email,
      password: this.generateRandomPassword(), // Random password for OAuth users
      locale: 'en-US',
    })) as any;

    return user;
  }

  /**
   * Generate JWT access and refresh tokens
   */
  async generateTokens(user: any): Promise<AuthResponse> {
    const payload = {
      sub: user._id,
      email: user.email,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('app.jwt.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('app.jwt.refreshExpiresIn'),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.roles?.includes('admin') ? 'admin' : 'user',
        roles: user.roles || ['user'],
        locale: user.locale || 'en-US',
        storageQuota: user.availableSize || 0,
        storageUsed: user.usedSize || 0,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.status !== 1) {
        throw new UnauthorizedException('User account is inactive');
      }

      return this.generateTokens(user);
    } catch (error: any) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate user by ID (used by JWT strategy)
   */
  async validateUser(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 1) {
      throw new UnauthorizedException('User account is inactive');
    }

    return user;
  }

  /**
   * Generate random password for OAuth users
   */
  private generateRandomPassword(): string {
    const length = 32;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
}
