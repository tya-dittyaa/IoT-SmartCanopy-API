export interface ISensorTelemetry {
  humidity: number;
  temperature: number;
  rainStatus: 'DRY' | 'RAIN';
  servoStatus: 'OPEN' | 'CLOSED';
  mode: 'AUTO' | 'MANUAL';
}
