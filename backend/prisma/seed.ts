import * as bcrypt from 'bcrypt';
import {
  AgeCategory,
  AssignmentType,
  MatchStatus,
  OrderStatus,
  OrganizationStatus,
  OrganizationType,
  PaymentProvider,
  PaymentStatus,
  Prisma,
  PrismaClient,
  Role,
  ScanResult,
  TicketStatus,
  UserStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Nawettane2026!';

type SeedOrganization = {
  id: string;
  name: string;
  type: OrganizationType;
  parentId: string | null;
  regionId?: string;
  departmentId?: string;
  communeId?: string;
};

async function clearDatabase(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.ticketScan.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.matchTicketCategory.deleteMany();
  await prisma.matchAssignment.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.zoneAgentAssignment.deleteMany();
  await prisma.userOrganizationAssignment.deleteMany();
  await prisma.supporterProfile.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.user.deleteMany();
  await prisma.season.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.commune.deleteMany();
  await prisma.department.deleteMany();
  await prisma.region.deleteMany();
}

async function createGeography() {
  const region = await prisma.region.create({
    data: {
      name: 'Dakar',
      code: 'SN-DK',
    },
  });

  const department = await prisma.department.create({
    data: {
      name: 'Dakar',
      code: 'DK-DPT',
      regionId: region.id,
    },
  });

  const communeNames = [
    'Plateau',
    'Medina',
    'Grand Dakar',
    'Parcelles Assainies',
    'Guediawaye',
  ];

  const communes = await Promise.all(
    communeNames.map((name, index) =>
      prisma.commune.create({
        data: {
          name,
          code: `DK-COM-${index + 1}`,
          departmentId: department.id,
        },
      }),
    ),
  );

  return { region, department, communes };
}

async function createOrganizations(input: {
  regionId: string;
  departmentId: string;
  communeIds: string[];
}) {
  const oncav = await prisma.organization.create({
    data: {
      name: 'ONCAV Senegal',
      type: OrganizationType.ONCAV,
      status: OrganizationStatus.ACTIVE,
    },
  });

  const orcav = await prisma.organization.create({
    data: {
      name: 'ORCAV Dakar',
      type: OrganizationType.ORCAV,
      parentId: oncav.id,
      regionId: input.regionId,
      status: OrganizationStatus.ACTIVE,
    },
  });

  const odcav = await prisma.organization.create({
    data: {
      name: 'ODCAV Dakar',
      type: OrganizationType.ODCAV,
      parentId: orcav.id,
      regionId: input.regionId,
      departmentId: input.departmentId,
      status: OrganizationStatus.ACTIVE,
    },
  });

  const zoneNames = [
    'Zone Plateau',
    'Zone Medina',
    'Zone Gueule Tapee',
    'Zone Fass',
    'Zone Colobane',
    'Zone Grand Dakar',
    'Zone Biscuiterie',
    'Zone HLM',
    'Zone Parcelles 1',
    'Zone Parcelles 2',
    'Zone Parcelles 3',
    'Zone Cambrene',
    'Zone Yoff',
    'Zone Ouakam',
    'Zone Mermoz',
    'Zone Sacre-Coeur',
    'Zone Patte d\'Oie',
    'Zone Pikine',
    'Zone Guediawaye',
    'Zone Rufisque',
  ];

  const zones = await Promise.all(
    zoneNames.map((name, index) =>
      prisma.organization.create({
        data: {
          name,
          type: OrganizationType.ZONE,
          parentId: odcav.id,
          regionId: input.regionId,
          departmentId: input.departmentId,
          communeId: input.communeIds[index % input.communeIds.length],
          status: OrganizationStatus.ACTIVE,
        },
      }),
    ),
  );

  return { oncav, orcav, odcav, zones };
}

async function createUsers(input: {
  oncavId: string;
  orcavId: string;
  odcavId: string;
  zoneIds: string[];
}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = [
    {
      fullName: 'Super Admin Nawettane',
      phone: '770000001',
      email: 'superadmin@nawettane.sn',
      role: Role.SUPER_ADMIN,
      organizationIds: [],
    },
    {
      fullName: 'Admin ONCAV',
      phone: '770000002',
      email: 'oncav.admin@nawettane.sn',
      role: Role.ONCAV_ADMIN,
      organizationIds: [input.oncavId],
    },
    {
      fullName: 'Admin ORCAV Dakar',
      phone: '770000003',
      email: 'orcav.dakar@nawettane.sn',
      role: Role.ORCAV_ADMIN,
      organizationIds: [input.orcavId],
    },
    {
      fullName: 'Admin ODCAV Dakar',
      phone: '770000004',
      email: 'odcav.dakar@nawettane.sn',
      role: Role.ODCAV_ADMIN,
      organizationIds: [input.odcavId],
    },
    {
      fullName: 'Zone Admin Plateau',
      phone: '770000005',
      email: 'zone.plateau@nawettane.sn',
      role: Role.ZONE_ADMIN,
      organizationIds: [input.zoneIds[0]],
    },
    {
      fullName: 'Zone Admin Medina',
      phone: '770000006',
      email: 'zone.medina@nawettane.sn',
      role: Role.ZONE_ADMIN,
      organizationIds: [input.zoneIds[1]],
    },
    {
      fullName: 'Zone Admin Grand Dakar',
      phone: '770000007',
      email: 'zone.granddakar@nawettane.sn',
      role: Role.ZONE_ADMIN,
      organizationIds: [input.zoneIds[5]],
    },
    {
      fullName: 'Agent Guichet 1',
      phone: '770000101',
      email: 'agent1@nawettane.sn',
      role: Role.GUICHET_AGENT,
      organizationIds: [],
    },
    {
      fullName: 'Agent Guichet 2',
      phone: '770000102',
      email: 'agent2@nawettane.sn',
      role: Role.GUICHET_AGENT,
      organizationIds: [],
    },
    {
      fullName: 'Agent Guichet 3',
      phone: '770000103',
      email: 'agent3@nawettane.sn',
      role: Role.GUICHET_AGENT,
      organizationIds: [],
    },
    {
      fullName: 'Agent Guichet 4',
      phone: '770000104',
      email: 'agent4@nawettane.sn',
      role: Role.GUICHET_AGENT,
      organizationIds: [],
    },
    {
      fullName: 'Agent Guichet 5',
      phone: '770000105',
      email: 'agent5@nawettane.sn',
      role: Role.GUICHET_AGENT,
      organizationIds: [],
    },
  ];

  const createdUsers = [];

  for (const user of users) {
    const created = await prisma.user.create({
      data: {
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        passwordHash,
        role: user.role,
        status: UserStatus.ACTIVE,
      },
    });

    createdUsers.push(created);

    for (const [index, organizationId] of user.organizationIds.entries()) {
      await prisma.userOrganizationAssignment.create({
        data: {
          userId: created.id,
          organizationId,
          isPrimary: index === 0,
        },
      });
    }
  }

  const userByEmail = new Map(createdUsers.map((user) => [user.email ?? '', user]));

  const agentAssignments = [
    { email: 'agent1@nawettane.sn', zoneId: input.zoneIds[0] },
    { email: 'agent2@nawettane.sn', zoneId: input.zoneIds[1] },
    { email: 'agent3@nawettane.sn', zoneId: input.zoneIds[5] },
    { email: 'agent4@nawettane.sn', zoneId: input.zoneIds[8] },
    { email: 'agent5@nawettane.sn', zoneId: input.zoneIds[12] },
  ];

  for (const assignment of agentAssignments) {
    const user = userByEmail.get(assignment.email);

    if (!user) {
      continue;
    }

    await prisma.zoneAgentAssignment.create({
      data: {
        userId: user.id,
        organizationId: assignment.zoneId,
        assignmentType: AssignmentType.BOTH,
      },
    });
  }

  return {
    users: createdUsers,
    userByEmail,
    password: DEMO_PASSWORD,
  };
}

async function createSeasons() {
  const currentSeason = await prisma.season.create({
    data: {
      name: 'Saison Nawettane 2026',
      year: 2026,
      active: true,
    },
  });

  const previousSeason = await prisma.season.create({
    data: {
      name: 'Saison Nawettane 2025',
      year: 2025,
      active: false,
    },
  });

  return { currentSeason, previousSeason };
}

async function createVenuesAndTeams(zoneIds: string[]) {
  const venues = new Map<string, { id: string; name: string }>();
  const teams = new Map<string, { homeId: string; awayId: string }>();

  for (const [index, zoneId] of zoneIds.entries()) {
    const venue = await prisma.venue.create({
      data: {
        organizationId: zoneId,
        name: `Stade Zone ${index + 1}`,
        address: `Quartier ${index + 1}, Dakar`,
        capacity: 1200 + index * 50,
      },
    });

    venues.set(zoneId, { id: venue.id, name: venue.name });

    const homeTeam = await prisma.team.create({
      data: {
        organizationId: zoneId,
        name: `ASC ${index + 1} A`,
        category: AgeCategory.SENIOR,
      },
    });

    const awayTeam = await prisma.team.create({
      data: {
        organizationId: zoneId,
        name: `ASC ${index + 1} B`,
        category: AgeCategory.SENIOR,
      },
    });

    teams.set(zoneId, {
      homeId: homeTeam.id,
      awayId: awayTeam.id,
    });
  }

  return { venues, teams };
}

async function createMatches(input: {
  zoneIds: string[];
  currentSeasonId: string;
  previousSeasonId: string;
  venues: Map<string, { id: string; name: string }>;
  teams: Map<string, { homeId: string; awayId: string }>;
  zoneAdminIds: string[];
  agentIds: string[];
}) {
  const matches = [];

  for (let index = 0; index < 20; index += 1) {
    const zoneId = input.zoneIds[index % input.zoneIds.length];
    const venue = input.venues.get(zoneId);
    const teamPair = input.teams.get(zoneId);
    const seasonId = index < 14 ? input.currentSeasonId : input.previousSeasonId;
    const createdById =
      input.zoneAdminIds[index % input.zoneAdminIds.length] ?? input.zoneAdminIds[0];

    if (!venue || !teamPair) {
      continue;
    }

    const basePrice = 1000 + (index % 4) * 500;
    const categoryBlueprints = [
      {
        name: 'Populaire',
        price: new Prisma.Decimal(basePrice),
        quota: 320 + index * 6,
        badgeColor: '#0F766E',
      },
      {
        name: 'Tribune',
        price: new Prisma.Decimal(basePrice + 500),
        quota: 140 + index * 3,
        badgeColor: '#D97706',
      },
      {
        name: 'VIP',
        price: new Prisma.Decimal(basePrice + 1500),
        quota: 40 + (index % 5) * 5,
        badgeColor: '#7C3AED',
      },
    ];

    const match = await prisma.match.create({
      data: {
        seasonId,
        organizationId: zoneId,
        venueId: venue.id,
        homeTeamId: teamPair.homeId,
        awayTeamId: teamPair.awayId,
        competitionName: 'Nawettane Populaire',
        stage: index % 2 === 0 ? 'Poule' : 'Elimination directe',
        matchDate: new Date(Date.UTC(2026, 6, 1 + index, 16, 0, 0)),
        status: MatchStatus.PUBLISHED,
        ticketPrice: categoryBlueprints[0].price,
        ticketQuota: categoryBlueprints.reduce((sum, category) => sum + category.quota, 0),
        createdById,
        ticketCategories: {
          create: categoryBlueprints,
        },
      },
      include: {
        ticketCategories: true,
      },
    });

    matches.push(match);

    const assignedAgentId = input.agentIds[index % input.agentIds.length];

    await prisma.matchAssignment.create({
      data: {
        matchId: match.id,
        userId: assignedAgentId,
        assignmentType: AssignmentType.BOTH,
      },
    });
  }

  return matches;
}

async function createOrdersTicketsAndScans(input: {
  matches: Array<{
    id: string;
    matchDate: Date;
    ticketCategories: Array<{
      id: string;
      name: string;
      price: Prisma.Decimal;
      quota: number | null;
    }>;
  }>;
  agentIds: string[];
}) {
  let orderSequence = 1;

  for (const [index, match] of input.matches.entries()) {
    const paidOrdersForMatch = index < 10 ? 2 : 1;

    for (let orderIndex = 0; orderIndex < paidOrdersForMatch; orderIndex += 1) {
      const category =
        match.ticketCategories[orderIndex % match.ticketCategories.length] ??
        match.ticketCategories[0];
      const quantity = orderIndex === 0 ? 3 : 2;
      const totalAmount = new Prisma.Decimal(category.price).mul(quantity);

      const order = await prisma.order.create({
        data: {
          reference: `ORD-DEMO-${String(orderSequence).padStart(4, '0')}`,
          matchId: match.id,
          ticketCategoryId: category.id,
          buyerName: `Supporter Demo ${orderSequence}`,
          buyerPhone: `78000${String(orderSequence).padStart(4, '0')}`,
          buyerEmail: `supporter${orderSequence}@demo.sn`,
          quantity,
          unitPrice: category.price,
          totalAmount,
          status: OrderStatus.PAID,
        },
      });

      await prisma.matchTicketCategory.update({
        where: { id: category.id },
        data: {
          soldCount: {
            increment: quantity,
          },
        },
      });

      await prisma.payment.create({
        data: {
          orderId: order.id,
          provider:
            orderIndex % 2 === 0
              ? PaymentProvider.WAVE_MOCK
              : PaymentProvider.ORANGE_MONEY_MOCK,
          providerReference: `PAY-DEMO-${orderSequence}`,
          amount: totalAmount,
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(match.matchDate.getTime() - 86_400_000),
        },
      });

      for (let ticketIndex = 0; ticketIndex < quantity; ticketIndex += 1) {
        const ticketCode = `TCK-DEMO-${orderSequence}-${ticketIndex + 1}`;
        const isUsed = ticketIndex === 0;

        const ticket = await prisma.ticket.create({
          data: {
            orderId: order.id,
            matchId: match.id,
            ticketCategoryId: category.id,
            ticketCode,
            qrPayload: JSON.stringify({
              ticketCode,
              matchId: match.id,
              orderReference: order.reference,
              ticketCategory: category.name,
            }),
            holderName: order.buyerName,
            status: isUsed ? TicketStatus.USED : TicketStatus.GENERATED,
            usedAt: isUsed ? new Date(match.matchDate.getTime() - 3_600_000) : null,
          },
        });

        if (isUsed) {
          const scannedById = input.agentIds[index % input.agentIds.length];

          await prisma.ticketScan.create({
            data: {
              ticketId: ticket.id,
              matchId: match.id,
              scannedById,
              scanResult: ScanResult.VALID,
              scannedAt: new Date(match.matchDate.getTime() - 3_600_000),
              deviceLabel: `Scanner-${(index % input.agentIds.length) + 1}`,
            },
          });

          await prisma.ticketScan.create({
            data: {
              ticketId: ticket.id,
              matchId: match.id,
              scannedById,
              scanResult: ScanResult.ALREADY_USED,
              scannedAt: new Date(match.matchDate.getTime() - 1_800_000),
              deviceLabel: `Scanner-${(index % input.agentIds.length) + 1}`,
            },
          });
        }
      }

      orderSequence += 1;
    }
  }
}

async function seed(): Promise<void> {
  await clearDatabase();

  const geography = await createGeography();
  const organizations = await createOrganizations({
    regionId: geography.region.id,
    departmentId: geography.department.id,
    communeIds: geography.communes.map((commune) => commune.id),
  });

  const users = await createUsers({
    oncavId: organizations.oncav.id,
    orcavId: organizations.orcav.id,
    odcavId: organizations.odcav.id,
    zoneIds: organizations.zones.map((zone) => zone.id),
  });

  const seasons = await createSeasons();
  const infra = await createVenuesAndTeams(organizations.zones.map((zone) => zone.id));

  const zoneAdminIds = [
    users.userByEmail.get('zone.plateau@nawettane.sn')?.id ?? '',
    users.userByEmail.get('zone.medina@nawettane.sn')?.id ?? '',
    users.userByEmail.get('zone.granddakar@nawettane.sn')?.id ?? '',
  ].filter((id) => id.length > 0);

  const agentIds = [
    users.userByEmail.get('agent1@nawettane.sn')?.id ?? '',
    users.userByEmail.get('agent2@nawettane.sn')?.id ?? '',
    users.userByEmail.get('agent3@nawettane.sn')?.id ?? '',
    users.userByEmail.get('agent4@nawettane.sn')?.id ?? '',
    users.userByEmail.get('agent5@nawettane.sn')?.id ?? '',
  ].filter((id) => id.length > 0);

  const matches = await createMatches({
    zoneIds: organizations.zones.map((zone) => zone.id),
    currentSeasonId: seasons.currentSeason.id,
    previousSeasonId: seasons.previousSeason.id,
    venues: infra.venues,
    teams: infra.teams,
    zoneAdminIds,
    agentIds,
  });

  await createOrdersTicketsAndScans({
    matches: matches.map((match) => ({
      id: match.id,
      matchDate: match.matchDate,
      ticketCategories: match.ticketCategories.map((category) => ({
        id: category.id,
        name: category.name,
        price: category.price,
        quota: category.quota,
      })),
    })),
    agentIds,
  });

  console.log('NAWETTANE demo seed completed successfully.');
  console.log(`Password for all demo admins and agents: ${users.password}`);
  console.log(`Organizations seeded: ${organizations.zones.length + 3}`);
  console.log(`Matches seeded: ${matches.length}`);
}

void seed()
  .catch(async (error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
