import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class MockPaymentWebhookDto {
  @ApiProperty({ example: 'mock_123456789' })
  @IsString()
  providerReference!: string;
}
