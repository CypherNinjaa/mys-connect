import { AlbumCategory, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

/** A single photo flattened out of its album, shaped for the mobile gallery grid. */
interface GalleryItem {
  id: string;
  albumId: string;
  albumTitle: string;
  category: string;
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  createdAt: Date;
}

/**
 * Map an incoming category query value onto the enum.
 * Accepts the mobile tab labels ('Celebrations'), the enum form ('CELEBRATIONS'),
 * and treats 'All'/absent/unknown as "no filter".
 */
function normalizeCategory(value?: string): AlbumCategory | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  if (upper === 'ALL' || upper === '') return null;
  return upper in AlbumCategory ? AlbumCategory[upper as keyof typeof AlbumCategory] : null;
}

/** 'CELEBRATIONS' -> 'Celebrations', matching the mobile tab labels. */
function toCategoryLabel(category: AlbumCategory): string {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

export class GalleryService {
  static async getGallery(query?: { category?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 30));
    const skip = (page - 1) * limit;

    const where: Prisma.AlbumWhereInput = { isPublished: true };

    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filter at the database level so pagination counts stay accurate
    const category = normalizeCategory(query?.category);
    if (category) {
      where.category = category;
    }

    const [total, albums] = await Promise.all([
      prisma.album.count({ where }),
      prisma.album.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          photos: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: { photos: true },
          },
        },
      }),
    ]);

    // Flatten photos into gallery items the mobile grid can render directly.
    // The category label is title-cased to match the mobile tab labels.
    const items: GalleryItem[] = [];
    albums.forEach((album) => {
      const categoryLabel = toCategoryLabel(album.category);

      if (album.photos.length > 0) {
        album.photos.forEach((photo) => {
          items.push({
            id: photo.id,
            albumId: album.id,
            albumTitle: album.title,
            category: categoryLabel,
            title: photo.caption || album.title,
            imageUrl: photo.imageUrl,
            thumbnailUrl: photo.thumbnailUrl || photo.imageUrl,
            createdAt: photo.createdAt,
          });
        });
      } else if (album.coverImageUrl) {
        // Cover-only album — surface the cover so the album isn't invisible
        items.push({
          id: album.id,
          albumId: album.id,
          albumTitle: album.title,
          category: categoryLabel,
          title: album.title,
          imageUrl: album.coverImageUrl,
          thumbnailUrl: album.coverImageUrl,
          createdAt: album.createdAt,
        });
      }
    });

    return {
      albums,
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getAlbumById(id: string) {
    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        photos: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!album) throw new AppError('Album not found', 404);
    return album;
  }
}
