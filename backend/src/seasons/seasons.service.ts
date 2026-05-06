import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';

@Injectable()
export class SeasonsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.season.findMany({
      orderBy: [{ year: 'desc' }, { name: 'asc' }],
    });
  }

  async create(dto: CreateSeasonDto) {
    return this.prisma.season.create({
      data: {
        name: dto.name,
        year: dto.year,
        active: dto.active ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateSeasonDto) {
    const existing = await this.prisma.season.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Season not found.');
    }

    return this.prisma.season.update({
      where: { id },
      data: {
        name: dto.name,
        year: dto.year,
        active: dto.active,
      },
    });
  }

  async activate(id: string) {
    const existing = await this.prisma.season.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Season not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.season.updateMany({ data: { active: false } });
      return tx.season.update({ where: { id }, data: { active: true } });
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.season.findUnique({
      where: { id },
      include: { _count: { select: { matches: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Season not found.');
    }

    if (existing._count.matches > 0) {
      throw new ConflictException('Cannot delete a season that has matches.');
    }

    return this.prisma.season.delete({ where: { id } });
  }
}
