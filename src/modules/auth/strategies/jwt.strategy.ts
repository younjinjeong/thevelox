import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 1) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Return user object that will be attached to request.user
    // Include both roles array (backend) and role string (frontend compatibility)
    return {
      id: user._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      username: user.username,
      roles: user.roles,
      role: user.roles?.includes('admin') ? 'admin' : 'user',
      locale: user.locale,
      storageQuota: user.availableSize,
      storageUsed: user.usedSize,
      status: user.status,
    };
  }
}
