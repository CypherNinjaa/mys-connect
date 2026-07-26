import { prisma } from '../utils/prisma';
import { UserStatus } from '@prisma/client';

export class MemberService {
  /**
   * Get paginated member directory list with search & city filters
   */
  static async getMembers(query: {
    page?: number;
    limit?: number;
    search?: string;
    cityId?: string;
    cityName?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      status: UserStatus.ACTIVE,
    };

    if (query.search && query.search.trim().length >= 2) {
      const searchTerm = query.search.trim();
      where.OR = [
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
        {
          profile: {
            OR: [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { occupation: { contains: searchTerm, mode: 'insensitive' } },
              { organization: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (query.cityId) {
      where.profile = { ...where.profile, cityId: query.cityId };
    } else if (query.cityName && query.cityName !== 'All') {
      where.profile = {
        ...where.profile,
        city: {
          name: { equals: query.cityName, mode: 'insensitive' },
        },
      };
    }

    const [total, members] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
        select: {
          id: true,
          fullName: true,
          memberId: true,
          avatarUrl: true,
          role: true,
          status: true,
          profile: {
            select: {
              occupation: true,
              organization: true,
              designation: true,
              city: { select: { id: true, name: true, state: true } },
              state: true,
            },
          },
        },
      }),
    ]);

    return {
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
      },
    };
  }

  /**
   * Get single member details by User ID
   */
  static async getMemberById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        memberId: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        profile: {
          include: {
            city: true,
          },
        },
      },
    });
  }
}
