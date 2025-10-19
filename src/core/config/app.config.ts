import { registerAs } from '@nestjs/config';

function parseCorsOrigin(raw?: string): string | string[] {
  const value = raw ?? '*';
  const trimmed = value.trim();

  // wildcard origin
  if (trimmed === '*') return '*';

  // comma-separated origins
  if (trimmed.includes(',')) {
    const splitted = trimmed.split(',');
    const mapped = splitted.map((s) => s.trim());
    const parts = mapped.filter(Boolean);
    return parts;
  }

  // single origin
  return trimmed;
}

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN),
}));
