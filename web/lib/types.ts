export type MatchStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED';
export type AgeCategory = 'CADET' | 'SENIOR';
export type ScanResult = 'VALID' | 'ALREADY_USED' | 'INVALID' | 'OUT_OF_SCOPE';
export type Role =
  | 'SUPER_ADMIN'
  | 'ONCAV_ADMIN'
  | 'ORCAV_ADMIN'
  | 'ODCAV_ADMIN'
  | 'ZONE_ADMIN'
  | 'GUICHET_AGENT'
  | 'AGENT_MAIRIE'
  | 'SUPPORTER';

export interface ApiUser {
  id: string;
  fullName?: string;
  role: Role;
  email: string | null;
  phone: string;
}

export interface UserOrganizationAssignment {
  id: string;
  userId: string;
  organizationId: string;
  isPrimary: boolean;
  organization: Organization;
}

export interface AdminUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  organizationAssignments: UserOrganizationAssignment[];
}

export interface LoginResponse {
  accessToken: string;
  user: ApiUser;
}

export interface Season {
  id: string;
  name: string;
  year: number;
  active: boolean;
}

export interface GeographyNode {
  id: string;
  name: string;
  code?: string | null;
}

export interface Region {
  id: string;
  name: string;
  code: string | null;
  createdAt: string;
  _count?: { departments: number };
}

export interface Department {
  id: string;
  name: string;
  code: string | null;
  regionId: string;
  region?: Region;
  createdAt: string;
  _count?: { communes: number };
}

export interface Commune {
  id: string;
  name: string;
  code: string | null;
  departmentId: string;
  department?: Department & { region?: Region; organizations?: { id: string; name: string; type: string }[] };
  createdAt: string;
  _count?: { organizations: number };
}

export interface Organization {
  id: string;
  name: string;
  type: 'ONCAV' | 'ORCAV' | 'ODCAV' | 'ZONE';
  parentId: string | null;
  regionId: string | null;
  departmentId: string | null;
  communeId: string | null;
  status: string;
  parent?: { id: string; name: string; type: string } | null;
  children?: Organization[];
  region?: GeographyNode | null;
  department?: GeographyNode | null;
  commune?: Commune | null;
}

export interface Venue {
  id: string;
  organizationId: string | null;
  communeId: string | null;
  name: string;
  address: string | null;
  capacity: number | null;
  status: string;
  organization?: Organization;
  commune?: Commune;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  category: AgeCategory | null;
  status: string;
  organization?: Organization;
}

export interface MatchTicketCategory {
  id: string;
  matchId: string;
  name: string;
  price: string;
  quota: number;
  soldCount: number;
  badgeColor: string;
}

export interface Match {
  id: string;
  seasonId: string;
  organizationId: string;
  venueId: string;
  homeTeamId: string;
  awayTeamId: string;
  competitionName: string;
  category: AgeCategory | null;
  stage: string | null;
  matchDate: string;
  status: MatchStatus;
  ticketPrice: string;
  ticketQuota: number;
  createdById: string;
  season: Season;
  organization: Organization;
  venue: Venue;
  homeTeam: Team;
  awayTeam: Team;
  ticketCategories: MatchTicketCategory[];
}

export interface Payment {
  id: string;
  provider: 'WAVE_MOCK' | 'ORANGE_MONEY_MOCK';
  providerReference: string | null;
  amount: string;
  status: string;
  paidAt: string | null;
}

export interface Order {
  id: string;
  reference: string;
  matchId: string;
  ticketCategoryId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string | null;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  match?: Match;
  ticketCategory?: MatchTicketCategory;
  payments?: Payment[];
  tickets?: Ticket[];
}

export interface Ticket {
  id: string;
  orderId: string;
  matchId: string;
  ticketCategoryId: string;
  ticketCode: string;
  qrPayload: string;
  status: string;
  holderName: string | null;
  usedAt: string | null;
  createdAt: string;
  updatedAt: string;
  order?: Order;
  match?: Match;
  ticketCategory?: MatchTicketCategory;
}

export interface DashboardMetrics {
  reportType?: string;
  filters?: Record<string, string | undefined>;
  matchesCount: number;
  ticketsSold: number;
  revenue: string;
  ticketsScanned: number;
  ticketsUnused: number;
  rows?: Array<{
    key: string;
    label: string;
    matchesCount: number;
    ticketsSold: number;
    revenue: string;
    ticketsScanned: number;
    ticketsUnused: number;
  }>;
}

export interface PaymentConfirmationResponse {
  order: Order;
  payment: Payment;
}

export interface ScanValidationResponse {
  result: ScanResult;
  ticketId?: string;
  scanId?: string;
}

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

export interface AppSettings {
  id: string;
  applicationTitle: string;
  contactLabel: string;
  contactPhone: string;
  developerName: string;
  developerWebsite: string;
  appDownloadAndroidUrl: string | null;
  appDownloadIosUrl: string | null;
  appDownloadHelpText: string | null;
}

export interface PaymentConfig {
  waveEnabled: boolean;
  waveApiKey: string | null;
  waveMerchantId: string | null;
  omEnabled: boolean;
  omClientId: string | null;
  omClientSecret: string | null;
  omMerchantKey: string | null;
  sandbox: boolean;
}

export interface PaymentConfigTestResult {
  ok: boolean;
  mode?: 'sandbox' | 'production';
  wave?: 'configured' | 'incomplete' | 'disabled';
  om?: 'configured' | 'incomplete' | 'disabled';
  message?: string;
}

export interface SuperAdmin {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export type TicketStatus = 'GENERATED' | 'USED' | 'CANCELLED';

export interface AdminTicket {
  id: string;
  ticketCode: string;
  status: TicketStatus;
  holderName: string | null;
  usedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  order: {
    id: string;
    reference: string;
    buyerName: string;
    buyerPhone: string;
    totalAmount: string;
  };
  match: {
    id: string;
    matchDate: string;
    competitionName: string;
    homeTeam: { name: string };
    awayTeam: { name: string };
  };
  ticketCategory: {
    id: string;
    name: string;
    price: string;
  };
  cancelledByAdmin?: { id: string; fullName: string } | null;
}

export interface AdminTicketsResult {
  data: AdminTicket[];
  total: number;
  page: number;
  limit: number;
}

export interface TicketFilters {
  q?: string;
  matchId?: string;
  ticketCategoryId?: string;
  status?: TicketStatus | '';
  fromDate?: string;
  toDate?: string;
}

export interface MatchFilters {
  q?: string;
  regionId?: string;
  departmentId?: string;
  communeId?: string;
  zoneId?: string;
  seasonId?: string;
  status?: MatchStatus;
  fromDate?: string;
  toDate?: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; fullName: string; role: string } | null;
}

export interface AuditLogsResult {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLogFilters {
  q?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface AnalyticsMatchStat {
  matchId: string;
  label: string;
  zone: string;
  matchDate: string;
  status: string;
  ticketsSold: number;
  revenue: number;
  ticketsScanned: number;
  ticketQuota: number;
  fillRate: number;
}

export interface AnalyticsCategoryStat {
  name: string;
  ticketsSold: number;
  revenue: number;
}

export interface AnalyticsAgentStat {
  agentId: string;
  agentName: string;
  agentRole: string;
  totalScans: number;
  validScans: number;
  invalidScans: number;
  alreadyUsedScans: number;
  lastScan: string | null;
}

export interface AnalyticsData {
  matchStats: AnalyticsMatchStat[];
  categoryStats: AnalyticsCategoryStat[];
  agentStats: AnalyticsAgentStat[];
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchResultMatch {
  id: string;
  matchDate: string;
  status: string;
  competitionName: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  organization: { name: string };
}

export interface SearchResultTeam {
  id: string;
  name: string;
  category: string | null;
  status: string;
}

export interface SearchResultZone {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface SearchResultTicket {
  id: string;
  ticketCode: string;
  status: string;
  match: { homeTeam: { name: string }; awayTeam: { name: string } };
}

export interface SearchResultUser {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  status: string;
}

export interface SearchResults {
  matches: SearchResultMatch[];
  teams: SearchResultTeam[];
  zones: SearchResultZone[];
  tickets: SearchResultTicket[];
  users: SearchResultUser[];
}

export interface DeletePreviewDependency {
  label: string;
  count: number;
}

export type DeletePreviewActionType = 'DELETE' | 'DEACTIVATE' | 'CANCEL' | 'BLOCKED';

export interface DeletePreview {
  entityName: string;
  actionType: DeletePreviewActionType;
  allowDelete: boolean;
  allowDeactivate: boolean;
  dependencies: DeletePreviewDependency[];
  warningMessage: string;
}
