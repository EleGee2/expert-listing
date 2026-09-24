import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'API architecture review' })
  @IsString()
  @MaxLength(160)
  title!: string;

  @ApiProperty({ example: 'A focused review of your backend architecture and production readiness.' })
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(15)
  durationMinutes!: number;

  @ApiProperty({ example: 250000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMinor!: number;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
