export class TelemetryPointDto {
  time: Date;
  value: number;

  constructor(time: Date, value: number) {
    this.time = time;
    this.value = value;
  }
}
