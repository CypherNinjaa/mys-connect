import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Cities ─────────────────────────────
  const cities = [
    { name: 'Ranchi', state: 'Jharkhand', sortOrder: 1 },
    { name: 'Jamshedpur', state: 'Jharkhand', sortOrder: 2 },
    { name: 'Dhanbad', state: 'Jharkhand', sortOrder: 3 },
    { name: 'Bokaro', state: 'Jharkhand', sortOrder: 4 },
    { name: 'Hazaribagh', state: 'Jharkhand', sortOrder: 5 },
    { name: 'Deoghar', state: 'Jharkhand', sortOrder: 6 },
    { name: 'Giridih', state: 'Jharkhand', sortOrder: 7 },
    { name: 'Ramgarh', state: 'Jharkhand', sortOrder: 8 },
    { name: 'Other', state: 'Other', sortOrder: 99 },
  ];

  for (const city of cities) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: {},
      create: city,
    });
  }
  console.log(`  ✅ Seeded ${cities.length} cities`);

  // ─── App Settings ───────────────────────
  const settings = [
    { key: 'app.name', value: 'MYS CONNECT', group: 'general' },
    { key: 'app.tagline', value: 'Connecting Every Member, Digitally', group: 'general' },
    { key: 'app.org_full_name', value: 'Maheshwari Yuva Sangathan', group: 'general' },
    { key: 'app.city', value: 'Ranchi', group: 'general' },
    { key: 'app.motto_hindi', value: 'सेवा · त्याग · सदाचार', group: 'general' },
    { key: 'app.contact_email', value: 'contact@mysranchi.org', group: 'contact' },
    { key: 'app.contact_phone', value: '+91-XXXXXXXXXX', group: 'contact' },
    { key: 'registration.requires_approval', value: 'true', type: 'boolean', group: 'registration' },
    { key: 'registration.default_role', value: 'MEMBER', group: 'registration' },
    { key: 'upload.max_image_size_mb', value: '5', type: 'number', group: 'upload' },
    { key: 'upload.max_images_per_album', value: '50', type: 'number', group: 'upload' },
    { key: 'upload.allowed_image_types', value: 'image/jpeg,image/png,image/webp', group: 'upload' },
    { key: 'notification.enable_push', value: 'true', type: 'boolean', group: 'notification' },
  ];

  for (const setting of settings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: {
        key: setting.key,
        value: setting.value,
        type: setting.type || 'string',
        group: setting.group,
      },
    });
  }
  console.log(`  ✅ Seeded ${settings.length} app settings`);

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
