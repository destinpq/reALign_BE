import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
  SetMetadata,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles, Public } from '../../decorators/roles.decorator';
import { WearablesService } from './wearables.service';
import { CreateWearableDto, UpdateWearableDto } from './dto/wearables.dto';

@ApiTags('Wearables')
@Controller('wearables')
export class WearablesController {
  constructor(private readonly wearablesService: WearablesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Create new wearable item',
    description: 'Admin only - Create a new wearable item in the catalog',
  })
  @ApiResponse({
    status: 201,
    description: 'Wearable item created successfully',
  })
  async create(@Body() createWearableDto: CreateWearableDto) {
    return this.wearablesService.create(createWearableDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all wearable items',
    description: 'Get paginated list of wearable items with optional filtering',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Wearable items retrieved successfully',
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.wearablesService.findAll({
      page,
      limit,
      category,
      search,
    });
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get wearable categories',
    description: 'Get list of all available wearable categories with counts',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async getCategories() {
    return this.wearablesService.getCategories();
  }

  @Get('user/selections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user wearable selections',
    description: 'Get current user\'s selected wearable items',
  })
  @ApiResponse({
    status: 200,
    description: 'User selections retrieved successfully',
  })
  async getUserSelections(@Request() req) {
    return this.wearablesService.getUserSelections(req.user.id);
  }

  @Post('user/selections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update user wearable selections',
    description: 'Update the current user\'s selected wearable items',
  })
  @ApiResponse({
    status: 200,
    description: 'User selections updated successfully',
  })
  async updateUserSelections(
    @Request() req,
    @Body() body: { wearableIds: string[] },
  ) {
    return this.wearablesService.updateUserSelections(req.user.id, body.wearableIds);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get wearable item by ID',
    description: 'Get detailed information about a specific wearable item',
  })
  @ApiParam({
    name: 'id',
    description: 'Wearable item ID',
    example: 'W00001',
  })
  @ApiResponse({
    status: 200,
    description: 'Wearable item retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Wearable item not found',
  })
  async findOne(@Param("id") id: string) {
    return this.wearablesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Update wearable item',
    description: 'Admin only - Update an existing wearable item',
  })
  @ApiResponse({
    status: 200,
    description: 'Wearable item updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateWearableDto: UpdateWearableDto,
  ) {
    return this.wearablesService.update(id, updateWearableDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Delete wearable item',
    description: 'Admin only - Delete a wearable item from the catalog',
  })
  @ApiResponse({
    status: 200,
    description: 'Wearable item deleted successfully',
  })
  async remove(@Param("id") id: string) {
    return this.wearablesService.remove(id);
  }

  @Post('bulk/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Bulk import wearables',
    description: 'Admin only - Bulk import wearable items from CSV or array',
  })
  @ApiResponse({
    status: 201,
    description: 'Wearables imported successfully',
  })
  async bulkImport(@Body() body: { wearables: CreateWearableDto[] }) {
    return this.wearablesService.bulkImport(body.wearables);
  }
} 