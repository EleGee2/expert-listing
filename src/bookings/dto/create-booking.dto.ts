import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'clx_expert_service_id' })
  @IsString()
  serviceId!: string;

  @ApiPropertyOptional({ example: 'clx_availability_slot_id' })
  @IsOptional()
  @IsString()
  availabilitySlotId?: string;

  @ApiPropertyOptional({ example: '2026-10-01T10:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional({ example: 'I want to review my API deployment plan.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
