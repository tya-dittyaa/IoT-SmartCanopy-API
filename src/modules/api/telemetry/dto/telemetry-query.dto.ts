export class TelemetryQueryDto {
  deviceKey: string;

  // minutes is optional; provided as string in query params and parsed by controller
  minutes?: string;
}
