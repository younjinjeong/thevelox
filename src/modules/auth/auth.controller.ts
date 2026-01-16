import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Request() req) {
    // Get client IP for logging
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return req.user;
  }

  // ============================================
  // Google OAuth Routes
  // ============================================

  @Public()
  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({ status: 302, description: 'Redirect to Google OAuth' })
  async googleAuth(@Request() req) {
    // Initiates Google OAuth flow
    // This endpoint will redirect to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Google OAuth successful' })
  @ApiResponse({ status: 401, description: 'Google OAuth failed' })
  async googleAuthCallback(@Request() req, @Response() res) {
    // After successful Google OAuth, generate JWT tokens
    const tokens = await this.authService.generateTokens(req.user);

    // Option 1: Redirect to frontend with tokens in URL (for web apps)
    // You can customize this based on your frontend URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const redirectUrl = `${frontendUrl}/auth/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`;

    // Option 2: Return JSON (for API-only flow)
    // return tokens;

    // For web apps, redirect to frontend
    return res.redirect(redirectUrl);
  }

  @Public()
  @Get('google/mobile')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Google OAuth for mobile apps (returns JSON)' })
  @ApiResponse({ status: 200, description: 'Google OAuth successful' })
  async googleAuthMobile(@Request() req) {
    // For mobile apps, return JSON instead of redirect
    return this.authService.generateTokens(req.user);
  }

  // ============================================
  // Logout (optional - mainly for clearing client-side tokens)
  // ============================================

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (clear client-side tokens)' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout() {
    // With JWT, logout is mainly handled client-side by removing tokens
    // You could implement token blacklisting here if needed
    return { message: 'Logout successful' };
  }
}
