import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateExpertDto {
  @ApiProperty({ example: 'clx_category_id' })
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: 'Senior backend engineer and API architect' })
  @IsString()
  @MaxLength(160)
  headline!: string;

  @ApiProperty({ example: 'I help teams design and ship reliable APIs at scale.' })
  @IsString()
  @MaxLength(5000)
  bio!: string;

  @ApiPropertyOptional({ example: 8, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  @ApiPropertyOptional({ example: 500000, description: 'Minor currency units, e.g. kobo/cents' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  hourlyRateMinor?: number;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}
