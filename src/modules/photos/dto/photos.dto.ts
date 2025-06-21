import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePhotoDto {
  @ApiPropertyOptional({
    description: 'Title of the photo',
    example: 'My Profile Picture',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the photo',
    example: 'Professional headshot for LinkedIn',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdatePhotoDto {
  @ApiPropertyOptional({
    description: 'Updated title of the photo',
    example: 'Updated Profile Picture',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the photo',
    example: 'Updated professional headshot',
  })
  @IsString()
  @IsOptional()
  description?: string;
} 