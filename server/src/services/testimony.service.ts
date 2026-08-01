import { prisma } from '../utils/prisma';
import { uploadToCloudinary } from '../utils/cloudinary';
import { AppError } from '../middleware/errorHandler';

export interface CreateTestimonyInput {
  authorName: string;
  designation?: string;
  content: string;
  imageUrl?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export interface UpdateTestimonyInput {
  authorName?: string;
  designation?: string;
  content?: string;
  imageUrl?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export class TestimonyService {
  /**
   * Get all published testimonies for public/member mobile app
   */
  static async listPublishedTestimonies() {
    return prisma.testimony.findMany({
      where: { isPublished: true },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Admin list all testimonies with optional search filter
   */
  static async listAllTestimonies(search?: string) {
    const where: any = {};
    if (search && search.trim() !== '') {
      where.OR = [
        { authorName: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    return prisma.testimony.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Get single testimony by ID
   */
  static async getTestimonyById(id: string) {
    const testimony = await prisma.testimony.findUnique({ where: { id } });
    if (!testimony) {
      throw new AppError('Testimony not found', 404);
    }
    return testimony;
  }

  /**
   * Create a new testimony with optional image upload to Cloudinary
   */
  static async createTestimony(
    input: CreateTestimonyInput,
    imageFile?: Express.Multer.File,
    adminUserId?: string
  ) {
    let imageUrl = input.imageUrl;

    if (imageFile) {
      imageUrl = await uploadToCloudinary(imageFile.buffer, 'mys-connect/testimonies');
    }

    // Determine default sortOrder if not provided
    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      const maxSort = await prisma.testimony.aggregate({ _max: { sortOrder: true } });
      sortOrder = (maxSort._max.sortOrder ?? 0) + 1;
    }

    const testimony = await prisma.testimony.create({
      data: {
        authorName: input.authorName,
        designation: input.designation || null,
        content: input.content,
        imageUrl: imageUrl || null,
        sortOrder,
        isPublished: input.isPublished !== undefined ? input.isPublished : true,
        createdById: adminUserId || null,
      },
    });

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'TESTIMONY_CREATED',
          entity: 'Testimony',
          entityId: testimony.id,
          metadata: { authorName: testimony.authorName },
        },
      });
    }

    return testimony;
  }

  /**
   * Update an existing testimony
   */
  static async updateTestimony(
    id: string,
    input: UpdateTestimonyInput,
    imageFile?: Express.Multer.File,
    adminUserId?: string
  ) {
    const existing = await this.getTestimonyById(id);

    let imageUrl = existing.imageUrl;
    if (imageFile) {
      imageUrl = await uploadToCloudinary(imageFile.buffer, 'mys-connect/testimonies');
    } else if (input.imageUrl !== undefined) {
      imageUrl = input.imageUrl;
    }

    const updated = await prisma.testimony.update({
      where: { id },
      data: {
        ...(input.authorName !== undefined && { authorName: input.authorName }),
        ...(input.designation !== undefined && { designation: input.designation }),
        ...(input.content !== undefined && { content: input.content }),
        imageUrl,
        ...(input.sortOrder !== undefined && { sortOrder: Number(input.sortOrder) }),
        ...(input.isPublished !== undefined && { isPublished: Boolean(input.isPublished) }),
      },
    });

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'TESTIMONY_UPDATED',
          entity: 'Testimony',
          entityId: updated.id,
          metadata: { authorName: updated.authorName },
        },
      });
    }

    return updated;
  }

  /**
   * Delete a testimony
   */
  static async deleteTestimony(id: string, adminUserId?: string) {
    const testimony = await this.getTestimonyById(id);

    await prisma.testimony.delete({ where: { id } });

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'TESTIMONY_DELETED',
          entity: 'Testimony',
          entityId: id,
          metadata: { authorName: testimony.authorName },
        },
      });
    }

    return { id, success: true };
  }

  /**
   * Reorder testimonies by array of IDs
   */
  static async reorderTestimonies(ids: string[], adminUserId?: string) {
    const updates = ids.map((id, index) =>
      prisma.testimony.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })
    );

    await prisma.$transaction(updates);

    if (adminUserId) {
      await prisma.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'TESTIMONY_REORDERED',
          entity: 'Testimony',
          metadata: { count: ids.length },
        },
      });
    }

    return { success: true, count: ids.length };
  }
}
