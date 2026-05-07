import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PaymentConfig, Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateAppSettingsDto } from './dto/update-app-settings.dto';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';

const PAYMENT_CONFIG_ID = 'singleton';
const APP_SETTINGS_ID = 'singleton';

const SUPER_ADMIN_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  status: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Payment config ───────────────────────────────────────────────────────

  async getPaymentConfig() {
    const config = await this.prisma.paymentConfig.upsert({
      where: { id: PAYMENT_CONFIG_ID },
      create: { id: PAYMENT_CONFIG_ID },
      update: {},
    });
    return this.maskSecrets(config);
  }

  async updatePaymentConfig(dto: UpdatePaymentConfigDto) {
    await this.prisma.paymentConfig.upsert({
      where: { id: PAYMENT_CONFIG_ID },
      create: { id: PAYMENT_CONFIG_ID },
      update: {},
    });

    const data: Prisma.PaymentConfigUpdateInput = {};

    if (dto.waveEnabled !== undefined) data.waveEnabled = dto.waveEnabled;
    if (dto.waveMerchantId !== undefined && dto.waveMerchantId.trim() !== '') data.waveMerchantId = dto.waveMerchantId;
    if (dto.waveApiKey !== undefined && dto.waveApiKey.trim() !== '') data.waveApiKey = dto.waveApiKey;
    if (dto.omEnabled !== undefined) data.omEnabled = dto.omEnabled;
    if (dto.omClientId !== undefined && dto.omClientId.trim() !== '') data.omClientId = dto.omClientId;
    if (dto.omClientSecret !== undefined && dto.omClientSecret.trim() !== '') data.omClientSecret = dto.omClientSecret;
    if (dto.omMerchantKey !== undefined && dto.omMerchantKey.trim() !== '') data.omMerchantKey = dto.omMerchantKey;
    if (dto.sandbox !== undefined) data.sandbox = dto.sandbox;

    data.updatedAt = new Date();

    const updated = await this.prisma.paymentConfig.update({
      where: { id: PAYMENT_CONFIG_ID },
      data,
    });

    return this.maskSecrets(updated);
  }

  async testPaymentConfig() {
    const config = await this.prisma.paymentConfig.findUnique({
      where: { id: PAYMENT_CONFIG_ID },
    });

    if (!config) {
      return { ok: false, message: 'Configuration non initialisée.' };
    }

    const waveStatus = config.waveEnabled
      ? config.waveApiKey && config.waveMerchantId
        ? 'configured'
        : 'incomplete'
      : 'disabled';

    const omStatus = config.omEnabled
      ? config.omClientId && config.omClientSecret && config.omMerchantKey
        ? 'configured'
        : 'incomplete'
      : 'disabled';

    const ok =
      (!config.waveEnabled || waveStatus === 'configured') &&
      (!config.omEnabled || omStatus === 'configured');

    return {
      ok,
      mode: config.sandbox ? 'sandbox' : 'production',
      wave: waveStatus,
      om: omStatus,
    };
  }

  private maskSecrets(config: PaymentConfig) {
    return {
      waveEnabled: config.waveEnabled,
      waveApiKey: config.waveApiKey ? '***' : null,
      waveMerchantId: config.waveMerchantId ? '***' : null,
      omEnabled: config.omEnabled,
      omClientId: config.omClientId ? '***' : null,
      omClientSecret: config.omClientSecret ? '***' : null,
      omMerchantKey: config.omMerchantKey ? '***' : null,
      sandbox: config.sandbox,
    };
  }

  // ─── App settings ────────────────────────────────────────────────────────

  async getAppSettings() {
    return this.prisma.appSettings.upsert({
      where: { id: APP_SETTINGS_ID },
      create: { id: APP_SETTINGS_ID },
      update: {},
    });
  }

  async updateAppSettings(dto: UpdateAppSettingsDto) {
    await this.prisma.appSettings.upsert({
      where: { id: APP_SETTINGS_ID },
      create: { id: APP_SETTINGS_ID },
      update: {},
    });

    const data: Prisma.AppSettingsUpdateInput = {};
    if (dto.applicationTitle !== undefined) data.applicationTitle = dto.applicationTitle;
    if (dto.contactLabel !== undefined) data.contactLabel = dto.contactLabel;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone;
    if (dto.developerName !== undefined) data.developerName = dto.developerName;
    if (dto.developerWebsite !== undefined) data.developerWebsite = dto.developerWebsite;
    if (dto.appDownloadAndroidUrl !== undefined) data.appDownloadAndroidUrl = dto.appDownloadAndroidUrl || null;
    if (dto.appDownloadIosUrl !== undefined) data.appDownloadIosUrl = dto.appDownloadIosUrl || null;
    if (dto.appDownloadHelpText !== undefined) data.appDownloadHelpText = dto.appDownloadHelpText || null;

    return this.prisma.appSettings.update({
      where: { id: APP_SETTINGS_ID },
      data,
    });
  }

  // ─── Super admins ─────────────────────────────────────────────────────────

  async listSuperAdmins() {
    return this.prisma.user.findMany({
      where: { role: Role.SUPER_ADMIN },
      select: SUPER_ADMIN_SELECT,
      orderBy: { fullName: 'asc' },
    });
  }

  async createSuperAdmin(dto: CreateSuperAdminDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      },
      select: SUPER_ADMIN_SELECT,
    });
  }

  async updateSuperAdmin(id: string, dto: UpdateSuperAdminDto) {
    await this.requireSuperAdmin(id);

    if (dto.status === UserStatus.INACTIVE) {
      await this.ensureNotLastActiveSuperAdmin(id);
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;

    return this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        ...(passwordHash ? { passwordHash } : {}),
        status: dto.status,
      },
      select: SUPER_ADMIN_SELECT,
    });
  }

  async deactivateSuperAdmin(id: string) {
    await this.requireSuperAdmin(id);
    await this.ensureNotLastActiveSuperAdmin(id);

    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE, updatedAt: new Date() },
      select: SUPER_ADMIN_SELECT,
    });
  }

  private async requireSuperAdmin(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user || user.role !== Role.SUPER_ADMIN) {
      throw new NotFoundException('Super Admin introuvable.');
    }

    return user;
  }

  private async ensureNotLastActiveSuperAdmin(excludeId: string) {
    const activeCount = await this.prisma.user.count({
      where: {
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        id: { not: excludeId },
      },
    });

    if (activeCount === 0) {
      throw new ForbiddenException('Impossible de désactiver le dernier Super Admin actif.');
    }
  }
}
