import { Controller, Get, Param, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/placeholder/:width/:height')
  @ApiOperation({ summary: 'Generate placeholder image' })
  async getPlaceholderImage(
    @Param('width') width: string,
    @Param('height') height: string,
    @Res() res: Response,
  ) {
    // Redirect to a placeholder image service
    const placeholderUrl = `https://via.placeholder.com/${width}x${height}/cccccc/666666?text=Loading...`;
    res.redirect(placeholderUrl);
  }
} 