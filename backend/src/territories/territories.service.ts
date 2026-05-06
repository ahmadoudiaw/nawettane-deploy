import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommuneDto } from './dto/create-commune.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateCommuneDto } from './dto/update-commune.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@Injectable()
export class TerritoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Regions ─────────────────────────────────────────────────────────────

  async listRegions() {
    return this.prisma.region.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { departments: true } } },
    });
  }

  async createRegion(dto: CreateRegionDto) {
    return this.prisma.region.create({
      data: { name: dto.name, code: dto.code ?? null },
      include: { _count: { select: { departments: true } } },
    });
  }

  async updateRegion(id: string, dto: UpdateRegionDto) {
    await this.findRegionOrThrow(id);
    return this.prisma.region.update({
      where: { id },
      data: { name: dto.name, code: dto.code },
      include: { _count: { select: { departments: true } } },
    });
  }

  async deleteRegion(id: string) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      include: { _count: { select: { departments: true } } },
    });
    if (!region) throw new NotFoundException('Région introuvable.');
    if (region._count.departments > 0) {
      throw new ConflictException(
        `Impossible de supprimer cette région : elle contient ${region._count.departments} département(s).`,
      );
    }
    return this.prisma.region.delete({ where: { id } });
  }

  private async findRegionOrThrow(id: string) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Région introuvable.');
    return region;
  }

  // ─── Departments ─────────────────────────────────────────────────────────

  async listDepartments(regionId?: string) {
    return this.prisma.department.findMany({
      where: regionId ? { regionId } : undefined,
      orderBy: [{ region: { name: 'asc' } }, { name: 'asc' }],
      include: {
        region: true,
        _count: { select: { communes: true } },
      },
    });
  }

  async createDepartment(dto: CreateDepartmentDto) {
    await this.findRegionOrThrow(dto.regionId);
    return this.prisma.department.create({
      data: { name: dto.name, code: dto.code ?? null, regionId: dto.regionId },
      include: { region: true, _count: { select: { communes: true } } },
    });
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Département introuvable.');
    if (dto.regionId) await this.findRegionOrThrow(dto.regionId);
    return this.prisma.department.update({
      where: { id },
      data: { name: dto.name, code: dto.code, regionId: dto.regionId },
      include: { region: true, _count: { select: { communes: true } } },
    });
  }

  async deleteDepartment(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { communes: true } } },
    });
    if (!dept) throw new NotFoundException('Département introuvable.');
    if (dept._count.communes > 0) {
      throw new ConflictException(
        `Impossible de supprimer ce département : il contient ${dept._count.communes} commune(s).`,
      );
    }
    return this.prisma.department.delete({ where: { id } });
  }

  // ─── Communes ─────────────────────────────────────────────────────────────

  async listCommunes(departmentId?: string) {
    return this.prisma.commune.findMany({
      where: departmentId ? { departmentId } : undefined,
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
      include: {
        department: { include: { region: true } },
        _count: { select: { organizations: true } },
      },
    });
  }

  async createCommune(dto: CreateCommuneDto) {
    const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
    if (!dept) throw new NotFoundException('Département introuvable.');
    return this.prisma.commune.create({
      data: { name: dto.name, code: dto.code ?? null, departmentId: dto.departmentId },
      include: { department: { include: { region: true } }, _count: { select: { organizations: true } } },
    });
  }

  async updateCommune(id: string, dto: UpdateCommuneDto) {
    const existing = await this.prisma.commune.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Commune introuvable.');
    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) throw new NotFoundException('Département introuvable.');
    }
    return this.prisma.commune.update({
      where: { id },
      data: { name: dto.name, code: dto.code, departmentId: dto.departmentId },
      include: { department: { include: { region: true } }, _count: { select: { organizations: true } } },
    });
  }

  async deleteCommune(id: string) {
    const commune = await this.prisma.commune.findUnique({
      where: { id },
      include: { _count: { select: { organizations: true } } },
    });
    if (!commune) throw new NotFoundException('Commune introuvable.');
    if (commune._count.organizations > 0) {
      throw new ConflictException(
        `Impossible de supprimer cette commune : elle est liée à ${commune._count.organizations} organisation(s).`,
      );
    }
    return this.prisma.commune.delete({ where: { id } });
  }
}
