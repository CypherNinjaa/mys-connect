/**
 * One-off backfill: Album.category was previously derived at read time by
 * keyword-matching the album title/description inside GalleryService.getGallery.
 * That heuristic is gone now that the column exists, so replay it once over
 * existing rows to keep the mobile gallery tabs showing the same grouping.
 *
 * Run with: npx tsx scripts/backfill-album-category.ts
 */
import { AlbumCategory } from '@prisma/client';
import { prisma } from '../src/utils/prisma';

const CELEBRATION_WORDS = ['celebration', 'navami', 'diwali', 'fest', 'cultural'];
const OTHER_WORDS = ['other', 'misc', 'workshop', 'camp'];

function inferCategory(title: string, description: string | null): AlbumCategory {
  const text = `${title} ${description || ''}`.toLowerCase();
  if (CELEBRATION_WORDS.some((w) => text.includes(w))) return AlbumCategory.CELEBRATIONS;
  if (OTHER_WORDS.some((w) => text.includes(w))) return AlbumCategory.OTHERS;
  return AlbumCategory.EVENTS;
}

async function main() {
  const albums = await prisma.album.findMany({
    select: { id: true, title: true, description: true, category: true },
  });

  let updated = 0;
  for (const album of albums) {
    const category = inferCategory(album.title, album.description);
    if (category === album.category) continue;

    await prisma.album.update({ where: { id: album.id }, data: { category } });
    console.log(`  ${album.title} -> ${category}`);
    updated++;
  }

  console.log(`\nBackfilled ${updated} of ${albums.length} album(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
