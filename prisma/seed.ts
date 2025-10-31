import { PrismaClient } from '../generated/prisma';
const prisma = new PrismaClient();

async function main() {
  const data = await prisma.device.create({
    data: {
      deviceKey: 'raph_device',
      deviceName: 'Raph ESP32 Device',
    },
  });

  console.log('Seed: created device', data.deviceKey);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
