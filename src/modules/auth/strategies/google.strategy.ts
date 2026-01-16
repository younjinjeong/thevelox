import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('app.google.clientId'),
      clientSecret: configService.get<string>('app.google.clientSecret'),
      callbackURL: configService.get<string>('app.google.callbackURL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    try {
      const { id, name, emails, photos } = profile;

      const email = emails && emails.length > 0 ? emails[0].value : null;
      if (!email) {
        return done(new Error('No email found in Google profile'), null);
      }

      this.logger.log(`Google OAuth login attempt: ${email}`);

      // Find or create user based on Google profile
      const user = await this.authService.validateOAuthUser({
        providerId: id,
        provider: 'google',
        email,
        name: email.split('@')[0], // Use email prefix as username
        displayName: name?.givenName && name?.familyName
          ? `${name.givenName} ${name.familyName}`
          : name?.givenName || email.split('@')[0],
        photo: photos && photos.length > 0 ? photos[0].value : null,
      });

      done(null, user);
    } catch (error) {
      this.logger.error(`Google OAuth validation error: ${error.message}`);
      done(error, null);
    }
  }
}
