import { ExpertProfile, ExpertService, Review } from '@prisma/client';

type ExpertWithRelations = ExpertProfile & {
  category?: { id: string; name: string; slug: string };
  user?: { id: string; firstName: string; lastName: string };
  _count?: { reviews?: number; favorites?: number; services?: number };
};

export function serializeExpert(expert: ExpertWithRelations, rating?: { average: number | null; count: number }) {
  return {
    id: expert.id,
    userId: expert.userId,
    categoryId: expert.categoryId,
    category: expert.category,
    user: expert.user,
    headline: expert.headline,
    bio: expert.bio,
    yearsExperience: expert.yearsExperience,
    hourlyRateMinor: expert.hourlyRateMinor,
    currency: expert.currency,
    city: expert.city,
    country: expert.country,
    status: expert.status,
    publishedAt: expert.publishedAt,
    counts: expert._count,
    rating,
    createdAt: expert.createdAt,
    updatedAt: expert.updatedAt,
  };
}

export function serializeService(service: ExpertService) {
  return {
    id: service.id,
    expertId: service.expertId,
    categoryId: service.categoryId,
    title: service.title,
    description: service.description,
    durationMinutes: service.durationMinutes,
    priceMinor: service.priceMinor,
    currency: service.currency,
    isActive: service.isActive,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

export function serializeReview(review: Review & { user?: { id: string; firstName: string; lastName: string } }) {
  return {
    id: review.id,
    userId: review.userId,
    expertId: review.expertId,
    user: review.user,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}
