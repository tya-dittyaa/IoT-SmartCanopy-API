export class SensorTelemetryDto {
  humidity: number;
  temperature: number;
  rainStatus: 'DRY' | 'RAIN';
  servoStatus: 'OPEN' | 'CLOSED';
  mode: 'AUTO' | 'MANUAL';
}
