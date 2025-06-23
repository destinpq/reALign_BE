import { IsString, IsOptional, IsNotEmpty, IsUrl, IsArray, ValidateNested, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateHeadshotDto {
  @ApiProperty({
    description: 'Name for the headshot project',
    example: 'Professional headshot for John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'URL of the image to process',
    example: 'https://example.com/user-photo.jpg',
  })
  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Custom style prompt for the headshot',
    example: 'professional passport photo, business attire, smiling, good posture, light blue background, centered, plain background',
  })
  @IsString()
  @IsOptional()
  stylePrompt?: string;
}

export class HeadshotStyleDto {
  @ApiProperty({
    description: 'Style prompt for the headshot generation',
    example: 'professional passport photo, business attire, smiling, good posture, light blue background, centered, plain background',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}

export class HeadshotAssetsDto {
  @ApiProperty({
    description: 'Path to the image file in Magic Hour assets format',
    example: 'api-assets/id/1234.png',
  })
  @IsString()
  @IsNotEmpty()
  image_file_path: string;
}

export class MagicHourHeadshotRequestDto {
  @ApiProperty({
    description: 'Name for the headshot project',
    example: 'AI Headshot image',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Style configuration for the headshot',
    type: HeadshotStyleDto,
  })
  style: HeadshotStyleDto;

  @ApiProperty({
    description: 'Assets configuration for the headshot',
    type: HeadshotAssetsDto,
  })
  assets: HeadshotAssetsDto;
}

export class MagicHourHeadshotResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the generated headshot',
    example: 'clx7uu86w0a5qp55yxz315r6r',
  })
  id: string;

  @ApiProperty({
    description: 'Credits cost per frame',
    example: 50,
  })
  frame_cost: number;

  @ApiProperty({
    description: 'Total credits charged for this request',
    example: 50,
  })
  credits_charged: number;
}

export class HeadshotStatusDto {
  @ApiProperty({
    description: 'Processing status of the headshot',
    example: 'completed',
  })
  status: string;

  @ApiProperty({
    description: 'URL of the generated headshot (when completed)',
    example: 'https://magic-hour-assets.s3.amazonaws.com/generated/headshot.jpg',
    required: false,
  })
  output_url?: string;

  @ApiProperty({
    description: 'Error message if generation failed',
    required: false,
  })
  error?: string;
}

export class WearableItemDto {
  @ApiProperty({
    description: 'Unique identifier for the wearable item',
    example: 'W00001',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Name of the wearable item',
    example: 'Striped Polo Shirt',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Category of the wearable item',
    example: 'tops',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({
    description: 'Image URL of the wearable item',
    example: 'https://example.com/shirt.jpg',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}

export class CreateAvatarDto {
  @ApiProperty({
    description: 'Name for the avatar project',
    example: 'Custom Avatar for John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'URL or data URL of the base image to process',
    example: 'https://example.com/user-photo.jpg',
  })
  @IsString()
  @IsNotEmpty()
  baseImageUrl: string;

  @ApiProperty({
    description: 'Selected scenery/background ID',
    example: 'studio',
  })
  @IsString()
  @IsNotEmpty()
  sceneryId: string;

  @ApiProperty({
    description: 'Array of selected wearable items',
    type: [WearableItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WearableItemDto)
  selectedItems: WearableItemDto[];

  @ApiPropertyOptional({
    description: 'Color overrides for specific items',
    example: { 'W00001': '#ff0000', 'W00002': '#00ff00' }
  })
  @IsOptional()
  colorOverrides?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Custom style prompt for the avatar',
    example: 'professional portrait, high quality, photorealistic, well-lit',
  })
  @IsString()
  @IsOptional()
  stylePrompt?: string;

  @ApiPropertyOptional({
    description: 'Gender preference for styling',
    example: 'unisex',
  })
  @IsString()
  @IsOptional()
  @IsIn(['male', 'female', 'unisex'])
  gender?: 'male' | 'female' | 'unisex';

  @ApiPropertyOptional({
    description: 'AI-detected accessories to include in avatar (e.g., turban, glasses, jewelry)',
    example: ['turban', 'glasses', 'beard'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessories?: string[];
}

export class AvatarStyleDto {
  @ApiProperty({
    description: 'Complete style prompt for avatar generation',
    example: 'Professional avatar photo of a person wearing Striped Polo Shirt (Tops), Distressed Jeans (Bottoms) in a Studio Background setting, high quality, detailed, photorealistic, well-lit, centered composition, modern photography style',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}

export class MagicHourAvatarRequestDto {
  @ApiProperty({
    description: 'Name for the avatar project',
    example: 'Custom Avatar Generation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Style configuration for the avatar',
    type: AvatarStyleDto,
  })
  style: AvatarStyleDto;

  @ApiProperty({
    description: 'Assets configuration for the avatar',
    type: HeadshotAssetsDto,
  })
  assets: HeadshotAssetsDto;
}

export class MagicHourAvatarResponseDto {
  @ApiProperty({
    description: 'Magic Hour job ID for the avatar generation',
    example: 'mh_avatar_12345',
  })
  id: string;

  @ApiProperty({
    description: 'Current status of the avatar generation',
    example: 'processing',
  })
  status: string;

  @ApiProperty({
    description: 'Credits charged for this avatar generation',
    example: 75,
  })
  credits_charged: number;

  @ApiProperty({
    description: 'Estimated completion time in seconds',
    example: 120,
  })
  estimated_time?: number;
} 