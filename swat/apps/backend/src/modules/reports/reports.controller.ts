import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { type SessionUser } from '../../common/auth/session.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { GenerateReportDto } from './dto/generate-report.dto';
import { type ReportType } from './report.types';
import { type ReportJobView, ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post('tonnage/generate')
  @HttpCode(202)
  @RequirePermissions('report:generate')
  @ApiOperation({ summary: 'Queue a tonnage report (async)' })
  generateTonnage(@Body() dto: GenerateReportDto, @CurrentUser() user: SessionUser) {
    return this.queue('tonnage', dto, user);
  }

  @Post('fuel/generate')
  @HttpCode(202)
  @RequirePermissions('report:generate')
  @ApiOperation({ summary: 'Queue a fuel report (async)' })
  generateFuel(@Body() dto: GenerateReportDto, @CurrentUser() user: SessionUser) {
    return this.queue('fuel', dto, user);
  }

  @Post('route/generate')
  @HttpCode(202)
  @RequirePermissions('report:generate')
  @ApiOperation({ summary: 'Queue a route-activity report (async)' })
  generateRoute(@Body() dto: GenerateReportDto, @CurrentUser() user: SessionUser) {
    return this.queue('route', dto, user);
  }

  @Post('levy/generate')
  @HttpCode(202)
  @RequirePermissions('report:generate')
  @ApiOperation({ summary: 'Queue a levy (retribusi) report (async)' })
  generateLevy(@Body() dto: GenerateReportDto, @CurrentUser() user: SessionUser) {
    return this.queue('levy', dto, user);
  }

  @Get('jobs/:jobId')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Poll a report job status' })
  getJob(@Param('jobId') jobId: string, @CurrentUser() user: SessionUser): Promise<ReportJobView> {
    return this.reports.getJob(jobId, user.id);
  }

  @Get('download/:jobId')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Get a presigned download URL for a completed report' })
  download(
    @Param('jobId') jobId: string,
    @CurrentUser() user: SessionUser,
  ): Promise<{ url: string; expiresIn: number }> {
    return this.reports.getDownloadUrl(jobId, user.id);
  }

  @Delete('jobs/:jobId')
  @HttpCode(204)
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Cancel/delete a report job and its artifact' })
  async remove(@Param('jobId') jobId: string, @CurrentUser() user: SessionUser): Promise<void> {
    await this.reports.remove(jobId, user.id);
  }

  private queue(reportType: ReportType, dto: GenerateReportDto, user: SessionUser) {
    return this.reports.generate(reportType, dto, user.id);
  }
}
