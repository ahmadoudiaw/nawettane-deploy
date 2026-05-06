import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { RolesGuard } from './common/guards/roles.guard';
import { ScopeGuard } from './common/guards/scope.guard';
import { MatchesModule } from './matches/matches.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportingModule } from './reporting/reporting.module';
import { ScansModule } from './scans/scans.module';
import { SeasonsModule } from './seasons/seasons.module';
import { TicketsModule } from './tickets/tickets.module';
import { TeamsModule } from './teams/teams.module';
import { UsersModule } from './users/users.module';
import { VenuesModule } from './venues/venues.module';
import { ImportModule } from './import/import.module';
import { AdminTicketsModule } from './admin-tickets/admin-tickets.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { SettingsModule } from './settings/settings.module';
import { TerritoriesModule } from './territories/territories.module';
import { DeletePreviewModule } from './delete-preview/delete-preview.module';
import { SearchModule } from './search/search.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    SeasonsModule,
    MatchesModule,
    OrdersModule,
    PaymentsModule,
    TicketsModule,
    ScansModule,
    ReportingModule,
    TeamsModule,
    VenuesModule,
    ImportModule,
    AdminTicketsModule,
    AuditLogsModule,
    SettingsModule,
    TerritoriesModule,
    DeletePreviewModule,
    SearchModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ScopeGuard,
    },
  ],
})
export class AppModule {}
