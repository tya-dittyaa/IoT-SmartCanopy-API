import { IsEnum, IsNotEmpty, IsNumber } from 'class-validator';

export class SensorTelemetryDto {
  @IsNumber()
  @IsNotEmpty()
  humidity: number;

  @IsNumber()
  @IsNotEmpty()
  temperature: number;

  @IsNumber()
  @IsNotEmpty()
  lightIntensity: number;

  @IsEnum(['DRY', 'RAIN'])
  @IsNotEmpty()
  rainStatus: 'DRY' | 'RAIN';

  @IsEnum(['OPEN', 'CLOSED'])
  @IsNotEmpty()
  servoStatus: 'OPEN' | 'CLOSED';

  @IsEnum(['AUTO', 'MANUAL'])
  @IsNotEmpty()
  mode: 'AUTO' | 'MANUAL';
}
