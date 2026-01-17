import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const clientId = this.configService.get<string>('app.google.clientId');

    if (!clientId) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message:
            'Google OAuth is not configured. Please contact the administrator to set up Google OAuth credentials.',
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    // Handle the case when Google strategy is not registered
    if (err) {
      if (
        err.message &&
        err.message.includes('Unknown authentication strategy')
      ) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message:
              'Google OAuth is not configured. Please contact the administrator to set up Google OAuth credentials.',
            error: 'Service Unavailable',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw err;
    }
    return user;
  }
}
