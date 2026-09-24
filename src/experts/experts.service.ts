import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpertStatus, Prisma, UserRole } from '@prisma/client';

import { buildPaginationMeta, getPagination } from '@/common/utils/pagination';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import { PrismaService } from '@/database/prisma.service';

import { CreateExpertDto } from './dto/create-expert.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { ListExpertsQueryDto } from './dto/list-experts-query.dto';
import { UpdateExpertDto } from './dto/update-expert.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { serializeExpert, serializeReview, serializeService } from './experts.serializer';

@Injectable()
export class ExpertsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListExpertsQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.ExpertProfileWhereInput = {
      status: ExpertStatus.PUBLISHED,
      deletedAt: null,
      ...(query.q
        ? {
            OR: [
              { headline: { contains: query.q, mode: 'insensitive' } },
              { bio: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.categorySlug ? { category: { slug: query.categorySlug } } : {}),
      ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
      ...(query.country ? { country: { equals: query.country, mode: 'insensitive' } } : {}),
      ...(query.minRateMinor !== undefined || query.maxRateMinor !== undefined
        ? {
            hourlyRateMinor: {
              ...(query.minRateMinor !== undefined ? { gte: query.minRateMinor } : {}),
              ...(query.maxRateMinor !== undefined ? { lte: query.maxRateMinor } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.expertProfile.findMany({
        where,
        skip,
        take,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: this.expertListInclude(),
      }),
      this.prisma.expertProfile.count({ where }),
    ]);
    const ratings = await this.getRatings(items.map((item) => item.id));

    return {
      items: items.map((item) => serializeExpert(item, ratings.get(item.id))),
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  async create(user: AuthenticatedUser, dto: CreateExpertDto) {
    await this.assertCategoryExists(dto.categoryId);

    const expert = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.expertProfile.create({
        data: {
          userId: user.id,
          categoryId: dto.categoryId,
          headline: dto.headline.trim(),
          bio: dto.bio.trim(),
          yearsExperience: dto.yearsExperience ?? 0,
          hourlyRateMinor: dto.hourlyRateMinor,
          currency: dto.currency?.toUpperCase() ?? 'NGN',
          city: dto.city?.trim(),
          country: dto.country?.trim(),
          status: ExpertStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        include: this.expertListInclude(),
      });

      if (user.role === UserRole.USER) {
        await tx.user.update({ where: { id: user.id }, data: { role: UserRole.EXPERT } });
      }

      return profile;
    });

    return serializeExpert(expert, { average: null, count: 0 });
  }

  async getById(id: string) {
    const expert = await this.prisma.expertProfile.findFirst({
      where: { id, status: ExpertStatus.PUBLISHED, deletedAt: null },
      include: {
        ...this.expertListInclude(),
        services: { where: { isActive: true, deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!expert) {
      throw new NotFoundException('Expert not found');
    }

    const rating = (await this.getRatings([expert.id])).get(expert.id);

    return {
      ...serializeExpert(expert, rating),
      services: expert.services.map(serializeService),
    };
  }

  async update(user: AuthenticatedUser, expertId: string, dto: UpdateExpertDto) {
    const existing = await this.getOwnedOrAdminExpert(user, expertId);

    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    const expert = await this.prisma.expertProfile.update({
      where: { id: expertId },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.headline !== undefined ? { headline: dto.headline.trim() } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio.trim() } : {}),
        ...(dto.yearsExperience !== undefined ? { yearsExperience: dto.yearsExperience } : {}),
        ...(dto.hourlyRateMinor !== undefined ? { hourlyRateMinor: dto.hourlyRateMinor } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency.toUpperCase() } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
        ...(dto.country !== undefined ? { country: dto.country.trim() || null } : {}),
      },
      include: this.expertListInclude(),
    });
    const rating = (await this.getRatings([expert.id])).get(expert.id);

    return serializeExpert(expert, rating);
  }

  async listServices(expertId: string) {
    await this.assertPublishedExpert(expertId);

    const services = await this.prisma.expertService.findMany({
      where: { expertId, isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return services.map(serializeService);
  }

  async createService(user: AuthenticatedUser, expertId: string, dto: CreateServiceDto) {
    const expert = await this.getOwnedOrAdminExpert(user, expertId);
    const service = await this.prisma.expertService.create({
      data: {
        expertId,
        categoryId: expert.categoryId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        durationMinutes: dto.durationMinutes,
        priceMinor: dto.priceMinor,
        currency: dto.currency?.toUpperCase() ?? expert.currency,
      },
    });

    return serializeService(service);
  }

  async updateService(user: AuthenticatedUser, expertId: string, serviceId: string, dto: UpdateServiceDto) {
    await this.getOwnedOrAdminExpert(user, expertId);
    const existing = await this.prisma.expertService.findFirst({
      where: { id: serviceId, expertId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Expert service not found');
    }

    const service = await this.prisma.expertService.update({
      where: { id: serviceId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.priceMinor !== undefined ? { priceMinor: dto.priceMinor } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency.toUpperCase() } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return serializeService(service);
  }

  async listReviews(expertId: string) {
    await this.assertPublishedExpert(expertId);
    const reviews = await this.prisma.review.findMany({
      where: { expertId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    return reviews.map(serializeReview);
  }

  async createReview(user: AuthenticatedUser, expertId: string, dto: CreateReviewDto) {
    const expert = await this.assertPublishedExpert(expertId);

    if (expert.userId === user.id) {
      throw new ForbiddenException('You cannot review your own expert profile');
    }

    const review = await this.prisma.review.upsert({
      where: { userId_expertId: { userId: user.id, expertId } },
      update: {
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      },
      create: {
        userId: user.id,
        expertId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    return serializeReview(review);
  }

  async favorite(user: AuthenticatedUser, expertId: string) {
    await this.assertPublishedExpert(expertId);
    const favorite = await this.prisma.favorite.upsert({
      where: { userId_expertId: { userId: user.id, expertId } },
      update: {},
      create: { userId: user.id, expertId },
      include: { expert: { include: this.expertListInclude() } },
    });

    return { id: favorite.id, expert: serializeExpert(favorite.expert) };
  }

  async unfavorite(user: AuthenticatedUser, expertId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId: user.id, expertId } });

    return { message: 'Expert removed from favorites' };
  }

  async listMyFavorites(user: AuthenticatedUser) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { expert: { include: this.expertListInclude() } },
    });

    return favorites.map((favorite) => ({
      id: favorite.id,
      createdAt: favorite.createdAt,
      expert: serializeExpert(favorite.expert),
    }));
  }

  private expertListInclude() {
    return {
      category: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { reviews: true, favorites: true, services: true } },
    } satisfies Prisma.ExpertProfileInclude;
  }

  private async getRatings(expertIds: string[]) {
    if (expertIds.length === 0) {
      return new Map<string, { average: number | null; count: number }>();
    }

    const rows = await this.prisma.review.groupBy({
      by: ['expertId'],
      where: { expertId: { in: expertIds } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return new Map(
      rows.map((row) => [
        row.expertId,
        {
          average: row._avg.rating,
          count: row._count.rating,
        },
      ]),
    );
  }

  private async getOwnedOrAdminExpert(user: AuthenticatedUser, expertId: string) {
    const expert = await this.prisma.expertProfile.findFirst({ where: { id: expertId, deletedAt: null } });

    if (!expert) {
      throw new NotFoundException('Expert not found');
    }

    if (user.role !== UserRole.ADMIN && expert.userId !== user.id) {
      throw new ForbiddenException('You do not own this expert profile');
    }

    return expert;
  }

  private async assertCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async assertPublishedExpert(expertId: string) {
    const expert = await this.prisma.expertProfile.findFirst({
      where: { id: expertId, status: ExpertStatus.PUBLISHED, deletedAt: null },
    });

    if (!expert) {
      throw new NotFoundException('Expert not found');
    }

    return expert;
  }
}
