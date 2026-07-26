import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export class GalleryService {
  static async getAlbums() {
    return prisma.album.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { photos: true },
        },
      },
    });
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
