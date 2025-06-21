import { IsString, IsOptional, IsHexColor, IsEnum, IsJSON } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum Size {
  XS = 'XS',
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL',
  XXL = 'XXL',
}

export enum Fit {
  SLIM = 'SLIM',
  REGULAR = 'REGULAR',
  LOOSE = 'LOOSE',
}

export class CreateCustomizationDto {
  @ApiProperty({
    description: 'Name of the customization',
    example: 'My Professional Look',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Primary color in hex format',
    example: '#FF5733',
  })
  @IsHexColor()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Secondary color in hex format',
    example: '#33FF57',
  })
  @IsHexColor()
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({
    description: 'Human-readable color name',
    example: 'Royal Blue',
  })
  @IsString()
  @IsOptional()
  colorName?: string;

  @ApiPropertyOptional({
    description: 'Size of the customization',
    enum: Size,
    example: Size.M,
  })
  @IsEnum(Size)
  @IsOptional()
  size?: Size;

  @ApiPropertyOptional({
    description: 'Fit of the customization',
    enum: Fit,
    example: Fit.REGULAR,
  })
  @IsEnum(Fit)
  @IsOptional()
  fit?: Fit;

  @ApiPropertyOptional({
    description: 'Additional custom attributes as JSON',
    example: { texture: 'smooth', pattern: 'solid' },
  })
  @IsJSON()
  @IsOptional()
  customAttributes?: any;
}

export class UpdateCustomizationDto {
  @ApiPropertyOptional({
    description: 'Updated name of the customization',
    example: 'Updated Professional Look',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated primary color in hex format',
    example: '#FF5733',
  })
  @IsHexColor()
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Updated secondary color in hex format',
    example: '#33FF57',
  })
  @IsHexColor()
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({
    description: 'Updated human-readable color name',
    example: 'Updated Royal Blue',
  })
  @IsString()
  @IsOptional()
  colorName?: string;

  @ApiPropertyOptional({
    description: 'Updated size of the customization',
    enum: Size,
    example: Size.L,
  })
  @IsEnum(Size)
  @IsOptional()
  size?: Size;

  @ApiPropertyOptional({
    description: 'Updated fit of the customization',
    enum: Fit,
    example: Fit.SLIM,
  })
  @IsEnum(Fit)
  @IsOptional()
  fit?: Fit;

  @ApiPropertyOptional({
    description: 'Updated custom attributes as JSON',
    example: { texture: 'textured', pattern: 'striped' },
  })
  @IsJSON()
  @IsOptional()
  customAttributes?: any;
} 