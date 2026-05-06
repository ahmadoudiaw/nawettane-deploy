import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { AgeCategory, OrganizationStatus, OrganizationType, Prisma } from '@prisma/client';
import { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: ImportRowError[];
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  // ── Régions ──────────────────────────────────────────────────────────────

  async importRegions(file: Express.Multer.File, user: AuthenticatedUser): Promise<ImportResult> {
    this.assertFile(file);
    const rows = await this.parseFile(file);
    const result: ImportResult = { total: 0, created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const name = this.str(row[0]);
      const code = this.str(row[1]) || null;

      result.total++;

      if (!name) {
        result.errors.push({ row: rowNum, message: 'Colonne "name" manquante ou vide.' });
        continue;
      }

      const exists = await this.prisma.region.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      });
      if (exists) { result.skipped++; continue; }

      try {
        await this.prisma.region.create({ data: { name, code } });
        result.created++;
      } catch (err) {
        if (this.isUniqueViolation(err)) { result.skipped++; } else {
          this.logger.error(`Import region row ${rowNum}`, err);
          result.errors.push({ row: rowNum, message: this.errMsg(err) });
        }
      }
    }

    this.auditLogs.log({
      userId: user.id,
      action: 'REGIONS_IMPORTED',
      entityType: 'Region',
      entityId: 'bulk',
      metadata: { total: result.total, created: result.created, skipped: result.skipped, errors: result.errors.length },
    });

    return result;
  }

  // ── Départements ──────────────────────────────────────────────────────────

  async importDepartments(file: Express.Multer.File, user: AuthenticatedUser): Promise<ImportResult> {
    this.assertFile(file);
    const rows = await this.parseFile(file);
    const result: ImportResult = { total: 0, created: 0, skipped: 0, errors: [] };
    const regionCache = new Map<string, string | null>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const name = this.str(row[0]);
      const code = this.str(row[1]) || null;
      const regionName = this.str(row[2]);

      result.total++;

      if (!name) {
        result.errors.push({ row: rowNum, message: 'Colonne "name" manquante.' });
        continue;
      }
      if (!regionName) {
        result.errors.push({ row: rowNum, message: 'Colonne "regionName" manquante.' });
        continue;
      }

      const regionId = await this.resolveRegion(regionName, regionCache);
      if (!regionId) {
        result.errors.push({ row: rowNum, message: `Région introuvable : "${regionName}".` });
        continue;
      }

      const exists = await this.prisma.department.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, regionId },
        select: { id: true },
      });
      if (exists) { result.skipped++; continue; }

      try {
        await this.prisma.department.create({ data: { name, code, regionId } });
        result.created++;
      } catch (err) {
        if (this.isUniqueViolation(err)) { result.skipped++; } else {
          this.logger.error(`Import dept row ${rowNum}`, err);
          result.errors.push({ row: rowNum, message: this.errMsg(err) });
        }
      }
    }

    this.auditLogs.log({
      userId: user.id,
      action: 'DEPARTMENTS_IMPORTED',
      entityType: 'Department',
      entityId: 'bulk',
      metadata: { total: result.total, created: result.created, skipped: result.skipped, errors: result.errors.length },
    });

    return result;
  }

  // ── Communes ──────────────────────────────────────────────────────────────

  async importCommunes(file: Express.Multer.File, user: AuthenticatedUser): Promise<ImportResult> {
    this.assertFile(file);
    const rows = await this.parseFile(file);
    const result: ImportResult = { total: 0, created: 0, skipped: 0, errors: [] };
    const regionCache = new Map<string, string | null>();
    const deptCache = new Map<string, string | null>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const name = this.str(row[0]);
      const code = this.str(row[1]) || null;
      const departmentName = this.str(row[2]);
      const regionName = this.str(row[3]);

      result.total++;

      if (!name) {
        result.errors.push({ row: rowNum, message: 'Colonne "name" manquante.' });
        continue;
      }
      if (!departmentName) {
        result.errors.push({ row: rowNum, message: 'Colonne "departmentName" manquante.' });
        continue;
      }

      const regionId = regionName ? await this.resolveRegion(regionName, regionCache) : null;
      const departmentId = await this.resolveDepartment(departmentName, regionId, deptCache);
      if (!departmentId) {
        result.errors.push({ row: rowNum, message: `Département introuvable : "${departmentName}"${regionName ? ` (région : "${regionName}")` : ''}.` });
        continue;
      }

      const exists = await this.prisma.commune.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, departmentId },
        select: { id: true },
      });
      if (exists) { result.skipped++; continue; }

      try {
        await this.prisma.commune.create({ data: { name, code, departmentId } });
        result.created++;
      } catch (err) {
        if (this.isUniqueViolation(err)) { result.skipped++; } else {
          this.logger.error(`Import commune row ${rowNum}`, err);
          result.errors.push({ row: rowNum, message: this.errMsg(err) });
        }
      }
    }

    this.auditLogs.log({
      userId: user.id,
      action: 'COMMUNES_IMPORTED',
      entityType: 'Commune',
      entityId: 'bulk',
      metadata: { total: result.total, created: result.created, skipped: result.skipped, errors: result.errors.length },
    });

    return result;
  }

  // ── ODCAV ─────────────────────────────────────────────────────────────────

  async importOdcav(file: Express.Multer.File, user: AuthenticatedUser): Promise<ImportResult> {
    this.assertFile(file);
    const rows = await this.parseFile(file);
    const result: ImportResult = { total: 0, created: 0, skipped: 0, errors: [] };
    const regionCache = new Map<string, string | null>();
    const deptCache = new Map<string, string | null>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const name = this.str(row[0]);
      const departmentName = this.str(row[1]);
      const regionName = this.str(row[2]);
      const status = (this.str(row[3]) || 'ACTIVE').toUpperCase();

      result.total++;

      if (!name) {
        result.errors.push({ row: rowNum, message: 'Colonne "name" manquante.' });
        continue;
      }
      if (!departmentName) {
        result.errors.push({ row: rowNum, message: 'Colonne "departmentName" manquante.' });
        continue;
      }
      if (!this.validStatus(status)) {
        result.errors.push({ row: rowNum, message: `Statut invalide : "${status}".` });
        continue;
      }

      const regionId = regionName ? await this.resolveRegion(regionName, regionCache) : null;
      const departmentId = await this.resolveDepartment(departmentName, regionId, deptCache);
      if (!departmentId) {
        result.errors.push({ row: rowNum, message: `Département introuvable : "${departmentName}".` });
        continue;
      }

      const exists = await this.prisma.organization.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, type: OrganizationType.ODCAV, departmentId },
        select: { id: true },
      });
      if (exists) { result.skipped++; continue; }

      try {
        await this.prisma.organization.create({
          data: { name, type: OrganizationType.ODCAV, departmentId, status: status as OrganizationStatus },
        });
        result.created++;
      } catch (err) {
        if (this.isUniqueViolation(err)) { result.skipped++; } else {
          this.logger.error(`Import ODCAV row ${rowNum}`, err);
          result.errors.push({ row: rowNum, message: this.errMsg(err) });
        }
      }
    }

    this.auditLogs.log({
      userId: user.id,
      action: 'ODCAV_IMPORTED',
      entityType: 'Organization',
      entityId: 'bulk',
      metadata: { total: result.total, created: result.created, skipped: result.skipped, errors: result.errors.length },
    });

    return result;
  }

  // ── Zones ─────────────────────────────────────────────────────────────────
  // Columns: name | communeName | departmentName | regionName | odcavName | status

  async importZones(file: Express.Multer.File, user: AuthenticatedUser): Promise<ImportResult> {
    this.assertFile(file);
    const rows = await this.parseFile(file);
    const result: ImportResult = { total: 0, created: 0, skipped: 0, errors: [] };
    const regionCache = new Map<string, string | null>();
    const deptCache = new Map<string, string | null>();
    const communeCache = new Map<string, string | null>();
    const odcavCache = new Map<string, string | null>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const name = this.str(row[0]);
      const communeName = this.str(row[1]);
      const departmentName = this.str(row[2]);
      const regionName = this.str(row[3]);
      const odcavName = this.str(row[4]);
      const status = (this.str(row[5]) || 'ACTIVE').toUpperCase();

      result.total++;

      if (!name) {
        result.errors.push({ row: rowNum, message: 'Colonne "name" manquante.' });
        continue;
      }
      if (!communeName) {
        result.errors.push({ row: rowNum, message: 'Colonne "communeName" manquante. La commune est obligatoire pour les nouvelles zones.' });
        continue;
      }
      if (!this.validStatus(status)) {
        result.errors.push({ row: rowNum, message: `Statut invalide : "${status}".` });
        continue;
      }

      const regionId = regionName ? await this.resolveRegion(regionName, regionCache) : null;
      const departmentId = departmentName ? await this.resolveDepartment(departmentName, regionId, deptCache) : null;
      const communeId = await this.resolveCommune(communeName, departmentId, communeCache);
      if (!communeId) {
        result.errors.push({ row: rowNum, message: `Commune introuvable : "${communeName}"${departmentName ? ` (département : "${departmentName}")` : ''}.` });
        continue;
      }

      let parentId: string | null = null;
      if (odcavName) {
        parentId = await this.resolveOdcav(odcavName, odcavCache);
        if (!parentId) {
          result.errors.push({ row: rowNum, message: `ODCAV introuvable : "${odcavName}".` });
          continue;
        }
      }

      const exists = await this.prisma.organization.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, type: OrganizationType.ZONE, communeId },
        select: { id: true },
      });
      if (exists) { result.skipped++; continue; }

      try {
        await this.prisma.organization.create({
          data: { name, type: OrganizationType.ZONE, communeId, parentId, status: status as OrganizationStatus },
        });
        result.created++;
      } catch (err) {
        if (this.isUniqueViolation(err)) { result.skipped++; } else {
          this.logger.error(`Import zone row ${rowNum}`, err);
          result.errors.push({ row: rowNum, message: this.errMsg(err) });
        }
      }
    }

    this.auditLogs.log({
      userId: user.id,
      action: 'ZONES_IMPORTED',
      entityType: 'Organization',
      entityId: 'bulk',
      metadata: { total: result.total, created: result.created, skipped: result.skipped, errors: result.errors.length },
    });

    return result;
  }

  // ── Stades ────────────────────────────────────────────────────────────────
  // Columns: name | communeName | departmentName | regionName | address | capacity | status
  // Legacy compat: if communeName matches a ZONE org name instead of a Commune, use organizationId

  async importVenues(file: Express.Multer.File, user: AuthenticatedUser): Promise<ImportResult> {
    this.assertFile(file);
    const rows = await this.parseFile(file);
    const result: ImportResult = { total: 0, created: 0, skipped: 0, errors: [] };
    const regionCache = new Map<string, string | null>();
    const deptCache = new Map<string, string | null>();
    const communeCache = new Map<string, string | null>();
    const legacyZoneCache = new Map<string, string | null>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const name = this.str(row[0]);
      const communeOrZoneName = this.str(row[1]);
      const departmentName = this.str(row[2]);
      const regionName = this.str(row[3]);
      const address = this.str(row[4]);
      const capacityRaw = this.str(row[5]);
      const status = (this.str(row[6]) || 'ACTIVE').toUpperCase();

      result.total++;

      if (!name) {
        result.errors.push({ row: rowNum, message: 'Colonne "name" manquante.' });
        continue;
      }
      if (!communeOrZoneName) {
        result.errors.push({ row: rowNum, message: 'Colonne "communeName" manquante.' });
        continue;
      }
      if (!this.validStatus(status)) {
        result.errors.push({ row: rowNum, message: `Statut invalide : "${status}".` });
        continue;
      }

      let capacity: number | null = null;
      if (capacityRaw) {
        const parsed = parseInt(capacityRaw, 10);
        if (isNaN(parsed) || parsed < 0) {
          result.errors.push({ row: rowNum, message: `Capacité invalide : "${capacityRaw}".` });
          continue;
        }
        capacity = parsed;
      }

      // Try commune path first
      const regionId = regionName ? await this.resolveRegion(regionName, regionCache) : null;
      const departmentId = departmentName ? await this.resolveDepartment(departmentName, regionId, deptCache) : null;
      const communeId = await this.resolveCommune(communeOrZoneName, departmentId, communeCache);

      if (communeId) {
        // New commune-based path
        const exists = await this.prisma.venue.findFirst({
          where: { name: { equals: name, mode: 'insensitive' }, communeId },
          select: { id: true },
        });
        if (exists) { result.skipped++; continue; }

        try {
          await this.prisma.venue.create({
            data: { name, communeId, address: address || null, capacity, status: status as OrganizationStatus },
          });
          result.created++;
        } catch (err) {
          if (this.isUniqueViolation(err)) { result.skipped++; } else {
            this.logger.error(`Import venue row ${rowNum}`, err);
            result.errors.push({ row: rowNum, message: this.errMsg(err) });
          }
        }
      } else {
        // Legacy fallback: treat col[1] as zoneName
        const organizationId = await this.resolveZone(communeOrZoneName, legacyZoneCache);
        if (!organizationId) {
          result.errors.push({ row: rowNum, message: `Commune introuvable : "${communeOrZoneName}". Si c'est une ancienne zone, elle n'a pas pu être trouvée non plus.` });
          continue;
        }

        const exists = await this.prisma.venue.findFirst({
          where: { name: { equals: name, mode: 'insensitive' }, organizationId },
          select: { id: true },
        });
        if (exists) { result.skipped++; continue; }

        try {
          await this.prisma.venue.create({
            data: { name, organizationId, address: address || null, capacity, status: status as OrganizationStatus },
          });
          result.created++;
        } catch (err) {
          if (this.isUniqueViolation(err)) { result.skipped++; } else {
            this.logger.error(`Import venue (legacy) row ${rowNum}`, err);
            result.errors.push({ row: rowNum, message: this.errMsg(err) });
          }
        }
      }
    }

    this.auditLogs.log({
      userId: user.id,
      action: 'VENUES_IMPORTED',
      entityType: 'Venue',
      entityId: 'bulk',
      metadata: { total: result.total, created: result.created, skipped: result.skipped, errors: result.errors.length },
    });

    return result;
  }

  // ── Équipes ───────────────────────────────────────────────────────────────
  // Columns: name | zoneName | communeName | departmentName | regionName | category | status
  // communeName/departmentName/regionName are informational, zoneName is the lookup key

  private normalizeAgeCategory(value?: string | null): AgeCategory {
    const v = value?.trim().toUpperCase();
    if (v === 'CADET') return AgeCategory.CADET;
    return AgeCategory.SENIOR; // default for empty, null, 'SENIOR', or any unknown value
  }

  async importTeams(file: Express.Multer.File, user: AuthenticatedUser): Promise<ImportResult> {
    this.assertFile(file);
    const rows = await this.parseFile(file);
    const result: ImportResult = { total: 0, created: 0, skipped: 0, errors: [] };
    const zoneCache = new Map<string, string | null>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const name = this.str(row[0]);
      const zoneName = this.str(row[1]);
      // row[2]=communeName, row[3]=departmentName, row[4]=regionName — informational only
      const category = this.str(row[5]);
      const status = (this.str(row[6]) || 'ACTIVE').toUpperCase();

      result.total++;

      if (!name) {
        result.errors.push({ row: rowNum, message: 'Colonne "name" manquante.' });
        continue;
      }
      if (!zoneName) {
        result.errors.push({ row: rowNum, message: 'Colonne "zoneName" manquante.' });
        continue;
      }
      if (!this.validStatus(status)) {
        result.errors.push({ row: rowNum, message: `Statut invalide : "${status}".` });
        continue;
      }

      const organizationId = await this.resolveZone(zoneName, zoneCache);
      if (!organizationId) {
        result.errors.push({ row: rowNum, message: `Zone introuvable : "${zoneName}".` });
        continue;
      }

      const exists = await this.prisma.team.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, organizationId },
        select: { id: true },
      });
      if (exists) { result.skipped++; continue; }

      try {
        await this.prisma.team.create({
          data: { name, organizationId, category: this.normalizeAgeCategory(category), status: status as OrganizationStatus },
        });
        result.created++;
      } catch (err) {
        if (this.isUniqueViolation(err)) { result.skipped++; } else {
          this.logger.error(`Import team row ${rowNum}`, err);
          result.errors.push({ row: rowNum, message: this.errMsg(err) });
        }
      }
    }

    this.auditLogs.log({
      userId: user.id,
      action: 'TEAMS_IMPORTED',
      entityType: 'Team',
      entityId: 'bulk',
      metadata: { total: result.total, created: result.created, skipped: result.skipped, errors: result.errors.length },
    });

    return result;
  }

  // ── Résolution (avec cache) ───────────────────────────────────────────────

  private async resolveRegion(name: string, cache: Map<string, string | null>): Promise<string | null> {
    if (cache.has(name)) return cache.get(name) ?? null;
    const rec = await this.prisma.region.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    });
    const id = rec?.id ?? null;
    cache.set(name, id);
    return id;
  }

  private async resolveDepartment(name: string, regionId: string | null, cache: Map<string, string | null>): Promise<string | null> {
    const key = `${name}||${regionId ?? ''}`;
    if (cache.has(key)) return cache.get(key) ?? null;
    const rec = await this.prisma.department.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(regionId ? { regionId } : {}),
      },
      select: { id: true },
    });
    const id = rec?.id ?? null;
    cache.set(key, id);
    return id;
  }

  private async resolveCommune(name: string, departmentId: string | null, cache: Map<string, string | null>): Promise<string | null> {
    const key = `${name}||${departmentId ?? ''}`;
    if (cache.has(key)) return cache.get(key) ?? null;
    const rec = await this.prisma.commune.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(departmentId ? { departmentId } : {}),
      },
      select: { id: true },
    });
    const id = rec?.id ?? null;
    cache.set(key, id);
    return id;
  }

  private async resolveOdcav(name: string, cache: Map<string, string | null>): Promise<string | null> {
    if (cache.has(name)) return cache.get(name) ?? null;
    const rec = await this.prisma.organization.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, type: OrganizationType.ODCAV },
      select: { id: true },
    });
    const id = rec?.id ?? null;
    cache.set(name, id);
    return id;
  }

  private async resolveZone(name: string, cache: Map<string, string | null>): Promise<string | null> {
    if (cache.has(name)) return cache.get(name) ?? null;
    const org = await this.prisma.organization.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, type: OrganizationType.ZONE },
      select: { id: true },
    });
    const id = org?.id ?? null;
    cache.set(name, id);
    return id;
  }

  // ── Parseur ───────────────────────────────────────────────────────────────

  private async parseFile(file: Express.Multer.File): Promise<unknown[][]> {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      throw new BadRequestException('Format non supporté. Utilisez .xlsx ou .csv.');
    }

    const workbook = new ExcelJS.Workbook();

    if (ext === 'csv') {
      const stream = Readable.from(file.buffer);
      await workbook.csv.read(stream);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (workbook.xlsx.load as (b: any) => Promise<ExcelJS.Workbook>)(file.buffer);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Le fichier est vide ou ne contient aucune feuille.');
    }

    const rows: unknown[][] = [];
    let firstRow = true;

    worksheet.eachRow({ includeEmpty: false }, (row) => {
      if (firstRow) { firstRow = false; return; }
      const cells = (row.values as unknown[]).slice(1);
      if (cells.some((c) => c !== null && c !== undefined && c !== '')) {
        rows.push(cells);
      }
    });

    return rows;
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  async generateRegionsTemplate(): Promise<Buffer> {
    const wb = this.templateWorkbook();
    const ws = wb.addWorksheet('Régions');
    ws.columns = [
      { header: 'name', key: 'name', width: 32 },
      { header: 'code', key: 'code', width: 16 },
    ];
    this.styleTemplateHeader(ws);
    ws.addRow({ name: 'Dakar', code: 'DK' });
    this.styleExampleRow(ws);
    return this.toBuffer(wb);
  }

  async generateDepartmentsTemplate(): Promise<Buffer> {
    const wb = this.templateWorkbook();
    const ws = wb.addWorksheet('Départements');
    ws.columns = [
      { header: 'name', key: 'name', width: 32 },
      { header: 'code', key: 'code', width: 16 },
      { header: 'regionName', key: 'regionName', width: 28 },
    ];
    this.styleTemplateHeader(ws);
    ws.addRow({ name: 'Dakar', code: 'DK-D', regionName: 'Dakar' });
    this.styleExampleRow(ws);
    return this.toBuffer(wb);
  }

  async generateCommunesTemplate(): Promise<Buffer> {
    const wb = this.templateWorkbook();
    const ws = wb.addWorksheet('Communes');
    ws.columns = [
      { header: 'name', key: 'name', width: 32 },
      { header: 'code', key: 'code', width: 16 },
      { header: 'departmentName', key: 'departmentName', width: 28 },
      { header: 'regionName', key: 'regionName', width: 28 },
    ];
    this.styleTemplateHeader(ws);
    ws.addRow({ name: 'Plateau', code: 'DK-PL', departmentName: 'Dakar', regionName: 'Dakar' });
    this.styleExampleRow(ws);
    return this.toBuffer(wb);
  }

  async generateOdcavTemplate(): Promise<Buffer> {
    const wb = this.templateWorkbook();
    const ws = wb.addWorksheet('ODCAV');
    ws.columns = [
      { header: 'name', key: 'name', width: 36 },
      { header: 'departmentName', key: 'departmentName', width: 28 },
      { header: 'regionName', key: 'regionName', width: 28 },
      { header: 'status', key: 'status', width: 18 },
    ];
    this.styleTemplateHeader(ws);
    ws.addRow({ name: 'ODCAV Dakar', departmentName: 'Dakar', regionName: 'Dakar', status: 'ACTIVE' });
    this.styleExampleRow(ws);
    return this.toBuffer(wb);
  }

  async generateZonesTemplate(): Promise<Buffer> {
    const wb = this.templateWorkbook();
    const ws = wb.addWorksheet('Zones');
    ws.columns = [
      { header: 'name', key: 'name', width: 32 },
      { header: 'communeName', key: 'communeName', width: 28 },
      { header: 'departmentName', key: 'departmentName', width: 28 },
      { header: 'regionName', key: 'regionName', width: 28 },
      { header: 'odcavName', key: 'odcavName', width: 30 },
      { header: 'status', key: 'status', width: 18 },
    ];
    this.styleTemplateHeader(ws);
    ws.addRow({ name: 'Zone Nord', communeName: 'Plateau', departmentName: 'Dakar', regionName: 'Dakar', odcavName: 'ODCAV Dakar', status: 'ACTIVE' });
    this.styleExampleRow(ws);
    return this.toBuffer(wb);
  }

  async generateVenuesTemplate(): Promise<Buffer> {
    const wb = this.templateWorkbook();
    const ws = wb.addWorksheet('Stades');
    ws.columns = [
      { header: 'name', key: 'name', width: 32 },
      { header: 'communeName', key: 'communeName', width: 28 },
      { header: 'departmentName', key: 'departmentName', width: 28 },
      { header: 'regionName', key: 'regionName', width: 28 },
      { header: 'address', key: 'address', width: 36 },
      { header: 'capacity', key: 'capacity', width: 14 },
      { header: 'status', key: 'status', width: 18 },
    ];
    this.styleTemplateHeader(ws);
    ws.addRow({ name: 'Stade Municipal', communeName: 'Plateau', departmentName: 'Dakar', regionName: 'Dakar', address: 'Avenue Lamine Guèye', capacity: 8000, status: 'ACTIVE' });
    this.styleExampleRow(ws);
    return this.toBuffer(wb);
  }

  async generateTeamsTemplate(): Promise<Buffer> {
    const wb = this.templateWorkbook();
    const ws = wb.addWorksheet('Équipes');
    ws.columns = [
      { header: 'name', key: 'name', width: 32 },
      { header: 'zoneName', key: 'zoneName', width: 28 },
      { header: 'communeName', key: 'communeName', width: 28 },
      { header: 'departmentName', key: 'departmentName', width: 28 },
      { header: 'regionName', key: 'regionName', width: 28 },
      { header: 'category', key: 'category', width: 22 },
      { header: 'status', key: 'status', width: 18 },
    ];
    this.styleTemplateHeader(ws);
    ws.addRow({ name: 'ASC Jaraaf', zoneName: 'Zone Nord', communeName: 'Plateau', departmentName: 'Dakar', regionName: 'Dakar', category: 'Senior', status: 'ACTIVE' });
    this.styleExampleRow(ws);
    return this.toBuffer(wb);
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────

  private str(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (Array.isArray(obj['richText'])) {
        return (obj['richText'] as Array<{ text?: string }>).map((r) => r.text ?? '').join('').trim();
      }
      if ('result' in obj) return String(obj['result']).trim();
      if ('text' in obj) return String(obj['text']).trim();
    }
    return String(value).trim();
  }

  private validStatus(s: string): boolean {
    return ['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(s);
  }

  private isUniqueViolation(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
  }

  private errMsg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  private assertFile(file: Express.Multer.File): void {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
  }

  private templateWorkbook(): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'NAWETTANE';
    wb.created = new Date();
    return wb;
  }

  private styleTemplateHeader(ws: ExcelJS.Worksheet): void {
    const header = ws.getRow(1);
    header.height = 22;
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F5C8B' } };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    header.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      };
    });
  }

  private styleExampleRow(ws: ExcelJS.Worksheet): void {
    const row = ws.getRow(2);
    row.font = { italic: true, color: { argb: 'FF555555' } };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      };
    });
  }

  private async toBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
