import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@/database/prisma.service';

import { slugify } from './category.utils';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.category.findMany({
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { experts: true, services: true } },
      },
    });
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name.trim(),
          slug: slugify(dto.slug ?? dto.name),
          parentId: dto.parentId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Category with this name or slug already exists');
      }

      throw error;
    }
  }
}
