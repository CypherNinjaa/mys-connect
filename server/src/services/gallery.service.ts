import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class GalleryService {
  static async getGallery(query?: { category?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 30));
    const skip = (page - 1) * limit;

    const where: any = { isPublished: true };

    if (query?.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
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

    // Flatten photos into structured gallery items with category tags
    const allPhotos: any[] = [];
    albums.forEach((album) => {
      let category = 'Events';
      const text = `${album.title} ${album.description || ''}`.toLowerCase();
      if (
        text.includes('celebration') ||
        text.includes('navami') ||
        text.includes('diwali') ||
        text.includes('fest') ||
        text.includes('cultural')
      ) {
        category = 'Celebrations';
      } else if (
        text.includes('other') ||
        text.includes('misc') ||
        text.includes('workshop') ||
        text.includes('camp')
      ) {
        category = 'Others';
      }

      if (album.photos && album.photos.length > 0) {
        album.photos.forEach((photo) => {
          allPhotos.push({
            id: photo.id,
            albumId: album.id,
            albumTitle: album.title,
            category,
            title: photo.caption || album.title,
            imageUrl: photo.imageUrl,
            thumbnailUrl: photo.thumbnailUrl || photo.imageUrl,
            createdAt: photo.createdAt,
          });
        });
      } else if (album.coverImageUrl) {
        allPhotos.push({
          id: album.id,
          albumId: album.id,
          albumTitle: album.title,
          category,
          title: album.title,
          imageUrl: album.coverImageUrl,
          thumbnailUrl: album.coverImageUrl,
          createdAt: album.createdAt,
        });
      }
    });

    // Filter by category if specified
    let filteredPhotos = allPhotos;
    if (query?.category && query.category !== 'All' && query.category !== 'ALL') {
      filteredPhotos = allPhotos.filter(
        (p) => p.category.toLowerCase() === query.category?.toLowerCase()
      );
    }

    return {
      albums,
      items: filteredPhotos,
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
