import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class TelemetryQueryDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 128)
  deviceKey: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(60 * 24 * 30)
  minutes: number;
}
