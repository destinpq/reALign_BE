import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomizationsService } from './customizations.service';
import { CreateCustomizationDto, UpdateCustomizationDto } from './dto/customizations.dto';

@ApiTags('Customizations')
@Controller('customizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomizationsController {
  constructor(private readonly customizationsService: CustomizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new avatar customization' })
  @ApiResponse({ status: 201, description: 'Customization created successfully' })
  async create(
    @Request() req,
    @Body() createCustomizationDto: CreateCustomizationDto,
  ) {
    return this.customizationsService.create(req.user.id, createCustomizationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customizations for the current user' })
  @ApiResponse({ status: 200, description: 'Customizations retrieved successfully' })
  async findAll(@Request() req) {
    return this.customizationsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customization by ID' })
  @ApiResponse({ status: 200, description: 'Customization retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customization not found' })
  async findOne(@Request() req, @Param("id") id: string) {
    return this.customizationsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customization' })
  @ApiResponse({ status: 200, description: 'Customization updated successfully' })
  @ApiResponse({ status: 404, description: 'Customization not found' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCustomizationDto: UpdateCustomizationDto,
  ) {
    return this.customizationsService.update(req.user.id, id, updateCustomizationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customization' })
  @ApiResponse({ status: 200, description: 'Customization deleted successfully' })
  @ApiResponse({ status: 404, description: 'Customization not found' })
  async remove(@Request() req, @Param("id") id: string) {
    return this.customizationsService.remove(req.user.id, id);
  }
} 