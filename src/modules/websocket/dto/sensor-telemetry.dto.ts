import { ISensorTelemetry } from '../interfaces/ISensorTelemetry';

export class SensorTelemetryDto {
  deviceKey: string;
  sensonData: ISensorTelemetry;
}
