import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class CreateAvailabilitySlotDto {
  @ApiProperty({ example: '2026-10-01T10:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @ApiProperty({ example: '2026-10-01T11:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  endsAt!: Date;
}
