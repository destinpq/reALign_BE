import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateWearableDto {
  @ApiProperty({ example: 'W00001' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Tops' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'Striped Polo Shirt' })
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdateWearableDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SelectWearableDto {
  @ApiProperty({ example: ['wearable-id-1', 'wearable-id-2'] })
  @IsArray()
  @IsString({ each: true })
  wearableIds: string[];
}

export class BulkCreateWearableDto {
  @ApiProperty({
    example: [
      { id: 'W00001', category: 'Tops', name: 'Striped Polo Shirt' },
      { id: 'W00002', category: 'Tops', name: 'Anime Logo Tee' },
    ]
  })
  @IsArray()
  wearables: CreateWearableDto[];
}

export class WearableQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
} 