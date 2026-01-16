import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetricsService } from '../../common/services/metrics.service';

/**
 * Metrics Controller
 * Provides endpoints for monitoring application performance
 */
@ApiTags('metrics')
@Controller('metrics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Get request metrics statistics
   */
  @Get('requests')
  @ApiOperation({ summary: 'Get request metrics statistics' })
  getRequestStats() {
    return {
      stats: this.metricsService.getRequestStats(),
      slowRequests: this.metricsService.getSlowRequests(10),
    };
  }

  /**
   * Get system metrics statistics
   */
  @Get('system')
  @ApiOperation({ summary: 'Get system metrics statistics' })
  getSystemStats() {
    return this.metricsService.getSystemStats();
  }

  /**
   * Get all metrics
   */
  @Get()
  @ApiOperation({ summary: 'Get all metrics data' })
  getAllMetrics() {
    return {
      requests: this.metricsService.getRequestStats(),
      system: this.metricsService.getSystemStats(),
      slowRequests: this.metricsService.getSlowRequests(20),
    };
  }

  /**
   * Export all metrics as JSON
   */
  @Get('export')
  @ApiOperation({ summary: 'Export all metrics data' })
  exportMetrics() {
    return this.metricsService.exportMetrics();
  }
}
