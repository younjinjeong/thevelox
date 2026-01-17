import { Module, Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

// Conditionally provide GoogleStrategy only if Google OAuth is configured
const googleStrategyProvider: Provider = {
  provide: GoogleStrategy,
  useFactory: (configService: ConfigService, authService: AuthService) => {
    const clientId = configService.get<string>('app.google.clientId');
    if (clientId) {
      return new GoogleStrategy(configService, authService);
    }
    return null;
  },
  inject: [ConfigService, AuthService],
};

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('app.jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, googleStrategyProvider],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
