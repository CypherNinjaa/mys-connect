import { PrismaClient, EventStatus, AlbumCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── 1. Cities ─────────────────────────────────────────────────────────────
  const cities = [
    { name: 'Ranchi', state: 'Jharkhand', sortOrder: 1 },
    { name: 'Jamshedpur', state: 'Jharkhand', sortOrder: 2 },
    { name: 'Dhanbad', state: 'Jharkhand', sortOrder: 3 },
    { name: 'Bokaro', state: 'Jharkhand', sortOrder: 4 },
    { name: 'Hazaribagh', state: 'Jharkhand', sortOrder: 5 },
    { name: 'Deoghar', state: 'Jharkhand', sortOrder: 6 },
    { name: 'Giridih', state: 'Jharkhand', sortOrder: 7 },
    { name: 'Ramgarh', state: 'Jharkhand', sortOrder: 8 },
    { name: 'Jaipur', state: 'Rajasthan', sortOrder: 9 },
    { name: 'Other', state: 'Other', sortOrder: 99 },
  ];

  const cityMap = new Map<string, string>();
  for (const city of cities) {
    const created = await prisma.city.upsert({
      where: { name: city.name },
      update: {},
      create: city,
    });
    cityMap.set(city.name, created.id);
  }
  console.log(`  ✅ Seeded ${cities.length} cities`);

  // ─── 2. System Admin User ──────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mysranchi.org' },
    update: {},
    create: {
      clerkId: 'user_system_admin_seed',
      email: 'admin@mysranchi.org',
      fullName: 'MYS Executive Admin',
      phone: '+91-9876543210',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      profileComplete: true,
      memberId: 'MYS/00001',
    },
  });
  console.log(`  ✅ Seeded system admin user (${adminUser.fullName})`);

  // ─── 3. App Settings ───────────────────────────────────────────────────────
  const settings = [
    { key: 'app.name', value: 'MYS CONNECT', group: 'general' },
    { key: 'app.tagline', value: 'Connecting Every Member, Digitally', group: 'general' },
    { key: 'app.org_full_name', value: 'Maheshwari Yuva Sangathan', group: 'general' },
    { key: 'app.city', value: 'Ranchi', group: 'general' },
    { key: 'app.motto_hindi', value: 'सेवा · त्याग · सदाचार', group: 'general' },
    { key: 'app.contact_email', value: 'contact@mysranchi.org', group: 'contact' },
    { key: 'app.contact_phone', value: '+91-9876543210', group: 'contact' },
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

  // ─── 4. Actual Events (Featured Carousel & Upcoming Events) ───────────────
  const events = [
    {
      title: 'Annual General Meeting',
      shortDesc: 'Annual General Body Meeting of Maheshwari Yuva Sangathan.',
      description:
        'Annual General Body Meeting of Maheshwari Yuva Sangathan to discuss community initiatives, annual financial reports, and upcoming executive committee elections.',
      startDate: new Date('2026-08-15T10:00:00.000Z'),
      endDate: new Date('2026-08-15T17:00:00.000Z'),
      startTime: '10:00 AM',
      endTime: '05:00 PM',
      venue: 'Shree Maheshwari Bhawan, Jaipur',
      address: 'Near Central Park, M.I. Road, Jaipur',
      cityId: cityMap.get('Jaipur'),
      coverImageUrl:
        'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
      status: EventStatus.PUBLISHED,
      isPublic: true,
      createdById: adminUser.id,
    },
    {
      title: 'Mahesh Navami Mahotsav 2026',
      shortDesc: 'Grand celebration of Mahesh Navami with cultural programs.',
      description:
        'Grand celebration of Mahesh Navami featuring devotional bhajan evening, shobha yatra, blood donation drive, and community Mahaprasad.',
      startDate: new Date('2026-06-20T09:00:00.000Z'),
      endDate: new Date('2026-06-20T21:00:00.000Z'),
      startTime: '09:00 AM',
      endTime: '09:00 PM',
      venue: 'Maheshwari Bhavan, Ranchi',
      address: 'Main Road, Overbridge Square, Ranchi',
      cityId: cityMap.get('Ranchi'),
      coverImageUrl:
        'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      status: EventStatus.PUBLISHED,
      isPublic: true,
      createdById: adminUser.id,
    },
    {
      title: 'Youth Leadership & Business Summit',
      shortDesc: 'Empowering young Maheshwari entrepreneurs and professionals.',
      description:
        'Empowering young Maheshwari entrepreneurs and professionals with industry keynotes, startup pitch sessions, and networking lunch.',
      startDate: new Date('2026-10-10T11:00:00.000Z'),
      endDate: new Date('2026-10-10T18:00:00.000Z'),
      startTime: '11:00 AM',
      endTime: '06:00 PM',
      venue: 'Convention Center, Jaipur',
      address: 'Tonk Road, Jaipur',
      cityId: cityMap.get('Jaipur'),
      coverImageUrl:
        'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
      status: EventStatus.PUBLISHED,
      isPublic: true,
      createdById: adminUser.id,
    },
    {
      title: 'Diwali Sneh Milan & Cultural Night',
      shortDesc: 'Festive Diwali gathering with music and dinner.',
      description:
        'Festive family gathering celebrating Diwali with cultural music, youth dance performances, fireworks display, and dinner.',
      startDate: new Date('2026-11-05T18:00:00.000Z'),
      endDate: new Date('2026-11-05T22:30:00.000Z'),
      startTime: '06:00 PM',
      endTime: '10:30 PM',
      venue: 'Community Hall, Ranchi',
      address: 'Kanke Road, Ranchi',
      cityId: cityMap.get('Ranchi'),
      coverImageUrl:
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
      status: EventStatus.PUBLISHED,
      isPublic: true,
      createdById: adminUser.id,
    },
    {
      title: 'Blood Donation Camp',
      shortDesc: 'Voluntary blood donation drive organized by MYS Ranchi.',
      description:
        'Voluntary blood donation camp organized by MYS Ranchi in collaboration with Red Cross Society and local hospitals.',
      startDate: new Date('2026-11-10T09:00:00.000Z'),
      endDate: new Date('2026-11-10T15:00:00.000Z'),
      startTime: '09:00 AM',
      endTime: '03:00 PM',
      venue: 'Shree Maheshwari Bhawan',
      address: 'Ranchi, Jharkhand',
      cityId: cityMap.get('Ranchi'),
      coverImageUrl:
        'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&q=80',
      status: EventStatus.PUBLISHED,
      isPublic: true,
      createdById: adminUser.id,
    },
    {
      title: 'Free Health Checkup Drive',
      shortDesc: 'Comprehensive health checkup camp for all members.',
      description:
        'Comprehensive health checkup drive offering free blood sugar tests, ECG, eye checkups, and consultations with senior physicians.',
      startDate: new Date('2026-11-25T10:00:00.000Z'),
      endDate: new Date('2026-11-25T16:00:00.000Z'),
      startTime: '10:00 AM',
      endTime: '04:00 PM',
      venue: 'Maheshwari Hospital, Jaipur',
      address: 'Jaipur, Rajasthan',
      cityId: cityMap.get('Jaipur'),
      coverImageUrl:
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
      status: EventStatus.PUBLISHED,
      isPublic: true,
      createdById: adminUser.id,
    },
    {
      title: 'Career Guidance Seminar',
      shortDesc: 'Career counseling for students and young graduates.',
      description:
        'Interactive career counseling seminar for high school & college students featuring experienced industry leaders, Civil Services mentors, and career strategists.',
      startDate: new Date('2026-12-05T16:00:00.000Z'),
      endDate: new Date('2026-12-05T19:00:00.000Z'),
      startTime: '04:00 PM',
      endTime: '07:00 PM',
      venue: 'Youth Center, Ranchi',
      address: 'Ranchi, Jharkhand',
      cityId: cityMap.get('Ranchi'),
      coverImageUrl:
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
      status: EventStatus.PUBLISHED,
      isPublic: true,
      createdById: adminUser.id,
    },
  ];

  for (const evt of events) {
    const existing = await prisma.event.findFirst({
      where: { title: evt.title },
    });

    if (existing) {
      await prisma.event.update({
        where: { id: existing.id },
        data: evt,
      });
    } else {
      await prisma.event.create({
        data: evt,
      });
    }
  }
  console.log(`  ✅ Seeded ${events.length} home carousel & upcoming events`);

  // ─── 5. Gallery Albums & Photo Items ───────────────────────────────────────
  const galleryAlbums = [
    {
      title: 'Mahesh Navami Mahotsav Celebrations',
      category: AlbumCategory.CELEBRATIONS,
      description: 'Grand cultural celebration photos, deep daan, and aarti.',
      coverImageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      isPublished: true,
      createdById: adminUser.id,
      photos: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
          caption: 'Executive Committee Lighting Lamp Ceremony',
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
          caption: 'Mahesh Navami Community Delegation Gathering',
        },
      ],
    },
    {
      title: 'Annual Executive Committee Meeting',
      category: AlbumCategory.EVENTS,
      description: 'Executive committee annual conference and lamp lighting.',
      coverImageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
      isPublished: true,
      createdById: adminUser.id,
      photos: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
          caption: 'MYS Youth Executive Committee Delegation',
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80',
          caption: 'Annual Strategic Planning Meeting',
        },
      ],
    },
    {
      title: 'Blood Donation Camp Ranchi',
      category: AlbumCategory.OTHERS,
      description: 'Community members participating in voluntary blood donation.',
      coverImageUrl: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&q=80',
      isPublished: true,
      createdById: adminUser.id,
      photos: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&q=80',
          caption: 'Voluntary Blood Donors Recognition Award',
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
          caption: 'Medical Team & Volunteers Team Photo',
        },
      ],
    },
    {
      title: 'Diwali Cultural Night & Sneh Milan',
      category: AlbumCategory.CELEBRATIONS,
      description: 'Festive cultural performances, traditional feast, and music.',
      coverImageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
      isPublished: true,
      createdById: adminUser.id,
      photos: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
          caption: 'Diwali Sneh Milan Musical Night',
        },
      ],
    },
  ];

  for (const albumData of galleryAlbums) {
    const existing = await prisma.album.findFirst({
      where: { title: albumData.title },
    });

    if (existing) {
      await prisma.album.update({
        where: { id: existing.id },
        data: {
          description: albumData.description,
          category: albumData.category,
          coverImageUrl: albumData.coverImageUrl,
          isPublished: true,
        },
      });
    } else {
      const created = await prisma.album.create({
        data: {
          title: albumData.title,
          description: albumData.description,
          category: albumData.category,
          coverImageUrl: albumData.coverImageUrl,
          isPublished: true,
          createdById: adminUser.id,
        },
      });

      for (let i = 0; i < albumData.photos.length; i++) {
        const photo = albumData.photos[i];
        await prisma.albumPhoto.create({
          data: {
            albumId: created.id,
            imageUrl: photo.imageUrl,
            caption: photo.caption,
            sortOrder: i + 1,
          },
        });
      }
    }
  }
  console.log(`  ✅ Seeded ${galleryAlbums.length} gallery albums & photos`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
