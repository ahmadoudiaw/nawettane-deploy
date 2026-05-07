import { API_BASE_URL, PUBLIC_DEMO_EMAIL, PUBLIC_DEMO_PASSWORD } from './config';
import {
  AdminTicket,
  AdminTicketsResult,
  AnalyticsData,
  AppSettings,
  AuditLogFilters,
  AuditLogsResult,
  Commune,
  DashboardMetrics,
  DeletePreview,
  Department,
  AdminUser,
  ImportResult,
  LoginResponse,
  Match,
  MatchFilters,
  Order,
  Organization,
  PaymentConfig,
  PaymentConfigTestResult,
  PaymentConfirmationResponse,
  Region,
  ScanValidationResponse,
  SearchResults,
  Season,
  SuperAdmin,
  Team,
  Ticket,
  TicketFilters,
  Venue,
} from './types';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  token?: string;
  body?: unknown;
  cache?: RequestCache;
};

class ApiError extends Error {
  status: number;
  payload: unknown;
  globallyHandled: boolean;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.globallyHandled = false;
  }
}

// ── Global error handler ──────────────────────────────────────────────────────

type ApiErrorHandler = {
  onUnauthorized: () => void;
  onForbidden:    () => void;
  onServerError:  () => void;
  onNetworkError: () => void;
};

let _errorHandler: ApiErrorHandler | null = null;

export function registerApiErrorHandler(h: ApiErrorHandler): void {
  _errorHandler = h;
}

// ── Global loading counter ────────────────────────────────────────────────────

let _loadingHandler: ((active: boolean) => void) | null = null;
let _requestCount = 0;

export function registerLoadingHandler(h: (active: boolean) => void): void {
  _loadingHandler = h;
}

function incrementRequests() {
  _requestCount++;
  if (_requestCount === 1) _loadingHandler?.(true);
}

function decrementRequests() {
  _requestCount = Math.max(0, _requestCount - 1);
  if (_requestCount === 0) _loadingHandler?.(false);
}

// ── Error formatter ───────────────────────────────────────────────────────────

export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Session expirée. Veuillez vous reconnecter.';
    if (err.status === 403) return 'Accès non autorisé.';
    if (err.status === 404) return 'Ressource introuvable.';
    if (err.status >= 500) return 'Erreur serveur. Réessayez plus tard.';
    if (err.status === 0)  return 'Impossible de joindre le serveur.';
    // 409, 422, 400 — extract business message from payload
    const payload = err.payload as Record<string, unknown> | null;
    const m = payload?.message;
    if (Array.isArray(m)) return m.join(' · ');
    if (typeof m === 'string' && m) return m;
    return err.message || 'Une erreur est survenue.';
  }
  if (err instanceof Error) return err.message;
  return 'Une erreur est survenue.';
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const isJsonResponse = contentType.toLowerCase().includes('application/json');

  let payload: unknown = null;

  if (text) {
    if (isJsonResponse) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        throw new ApiError(
          'Invalid JSON received from API.',
          response.status,
          { contentType, preview: text.slice(0, 200) },
        );
      }
    } else {
      throw new ApiError(
        'API returned a non-JSON response. Verify NEXT_PUBLIC_API_BASE_URL points to the Nest backend API.',
        response.status,
        { contentType, preview: text.slice(0, 200) },
      );
    }
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : `API request failed with status ${response.status}`;

    const err = new ApiError(message, response.status, payload);

    if (response.status === 401) {
      err.globallyHandled = true;
      _errorHandler?.onUnauthorized();
    } else if (response.status === 403) {
      err.globallyHandled = true;
      _errorHandler?.onForbidden();
    } else if (response.status >= 500) {
      err.globallyHandled = true;
      _errorHandler?.onServerError();
    }

    throw err;
  }

  return payload as T;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  incrementRequests();
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      cache: options.cache ?? 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    return await parseApiResponse<T>(response);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Network / fetch-level failure
    const netErr = new ApiError('Connexion perdue. Vérifiez votre connexion internet.', 0, null);
    netErr.globallyHandled = true;
    _errorHandler?.onNetworkError();
    throw netErr;
  } finally {
    decrementRequests();
  }
}

function buildQueryString(filters?: MatchFilters): string {
  if (!filters) {
    return '';
  }

  const searchParams = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

let publicTokenPromise: Promise<string> | null = null;


export async function getPublicReadToken(): Promise<string> {
  if (!publicTokenPromise) {
    publicTokenPromise = apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: {
        identifier: PUBLIC_DEMO_EMAIL,
        password: PUBLIC_DEMO_PASSWORD,
      },
    })
      .then((payload) => payload.accessToken)
      .catch((error) => {
        publicTokenPromise = null;
        throw error;
      });
  }

  return publicTokenPromise;
}


export async function loginAdmin(identifier: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
}

export async function getPublicMatches(filters?: MatchFilters): Promise<Match[]> {
  const token = await getPublicReadToken();
  const matches = await apiRequest<Match[]>(`/matches${buildQueryString(filters)}`, { token });
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return matches.filter(
    (match) => match.status === 'PUBLISHED' && new Date(match.matchDate) >= startOfToday,
  );
}

export async function getPublicMatch(id: string): Promise<Match> {
  const token = await getPublicReadToken();
  return apiRequest<Match>(`/matches/${id}`, { token });
}

export async function getTicket(id: string): Promise<Ticket> {
  return apiRequest<Ticket>(`/tickets/${id}`);
}

export async function createOrder(input: {
  matchId: string;
  ticketCategoryId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  quantity: number;
}): Promise<Order> {
  return apiRequest<Order>('/orders', {
    method: 'POST',
    body: input,
  });
}

export async function confirmMockPayment(
  orderId: string,
  provider: 'WAVE_MOCK' | 'ORANGE_MONEY_MOCK',
): Promise<PaymentConfirmationResponse> {
  return apiRequest<PaymentConfirmationResponse>(`/payments/${orderId}/mock-confirm`, {
    method: 'POST',
    body: {
      provider,
      providerReference: `${provider}-WEB-DEMO-${Date.now()}`,
    },
  });
}

export async function getAdminMatches(token: string, filters?: MatchFilters): Promise<Match[]> {
  return apiRequest<Match[]>(`/matches${buildQueryString(filters)}`, { token });
}

export async function getAdminMatch(id: string, token: string): Promise<Match> {
  return apiRequest<Match>(`/matches/${id}`, { token });
}

export interface VenueAvailabilityResult {
  available: boolean;
  conflict?: {
    id: string;
    label: string;
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
    status: string;
  };
  message: string;
}

export async function checkVenueAvailability(
  token: string,
  params: {
    venueId: string;
    matchDate: string;
    durationMinutes?: number;
    bufferMinutes?: number;
    excludeMatchId?: string;
  },
): Promise<VenueAvailabilityResult> {
  const qs = new URLSearchParams({ venueId: params.venueId, matchDate: params.matchDate });
  if (params.durationMinutes != null) qs.set('durationMinutes', String(params.durationMinutes));
  if (params.bufferMinutes != null) qs.set('bufferMinutes', String(params.bufferMinutes));
  if (params.excludeMatchId) qs.set('excludeMatchId', params.excludeMatchId);
  return apiRequest<VenueAvailabilityResult>(`/matches/availability?${qs}`, { token });
}

export async function updateMatch(
  token: string,
  id: string,
  input: {
    competitionName?: string;
    category?: string;
    stage?: string;
    matchDate?: string;
    status?: string;
  },
): Promise<Match> {
  return apiRequest<Match>(`/matches/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export async function publishMatch(token: string, id: string): Promise<Match> {
  return apiRequest<Match>(`/matches/${id}/publish`, {
    method: 'POST',
    token,
  });
}

export async function deactivateMatch(token: string, id: string): Promise<Match> {
  return apiRequest<Match>(`/matches/${id}/cancel`, {
    method: 'PATCH',
    token,
  });
}

export async function deleteMatch(token: string, id: string): Promise<Match> {
  return apiRequest<Match>(`/matches/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function createMatch(
  token: string,
  input: {
    seasonId: string;
    organizationId: string;
    venueId: string;
    homeTeamId: string;
    awayTeamId: string;
    competitionName: string;
    category: string;
    stage?: string;
    matchDate: string;
    ticketCategories: Array<{
      name: string;
      price: string;
      quota: number | null;
      badgeColor: string;
    }>;
  },
): Promise<Match> {
  return apiRequest<Match>('/matches', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function getOrganizationsTree(token: string): Promise<Organization[]> {
  return apiRequest<Organization[]>('/organizations/tree', { token });
}

export async function getDashboard(token: string): Promise<DashboardMetrics> {
  return apiRequest<DashboardMetrics>('/reports/dashboard', { token });
}

export async function getFilteredDashboard(
  token: string,
  filters: Record<string, string | undefined>,
): Promise<DashboardMetrics> {
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return apiRequest<DashboardMetrics>(`/reports/dashboard${query ? `?${query}` : ''}`, {
    token,
  });
}

export async function getAnalytics(
  token: string,
  filters: Record<string, string | undefined> = {},
): Promise<AnalyticsData> {
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return apiRequest<AnalyticsData>(`/reports/analytics${query ? `?${query}` : ''}`, { token });
}

export async function downloadReportExport(
  token: string,
  exportType:
    | 'matches'
    | 'sales-by-match'
    | 'tickets'
    | 'payments'
    | 'revenue'
    | 'dashboard',
  filters: Record<string, string | undefined>,
): Promise<{ blob: Blob; filename: string }> {
  const searchParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  const response = await fetch(
    `${API_BASE_URL}/reports/exports/${exportType}${query ? `?${query}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    await parseApiResponse(response);
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const filenameMatch = disposition.match(/filename="([^"]+)"/i);

  return {
    blob: await response.blob(),
    filename: filenameMatch?.[1] ?? `nawettane-${exportType}.xlsx`,
  };
}

export async function getTeams(token: string): Promise<Team[]> {
  return apiRequest<Team[]>('/teams', { token });
}

export async function getTeam(token: string, id: string): Promise<Team> {
  return apiRequest<Team>(`/teams/${id}`, { token });
}

export async function createTeam(
  token: string,
  input: {
    organizationId: string;
    name: string;
    category?: string;
    status?: string;
  },
): Promise<Team> {
  return apiRequest<Team>('/teams', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function updateTeam(
  token: string,
  id: string,
  input: {
    organizationId?: string;
    name?: string;
    category?: string;
    status?: string;
  },
): Promise<Team> {
  return apiRequest<Team>(`/teams/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export async function deleteTeam(token: string, id: string): Promise<Team> {
  return apiRequest<Team>(`/teams/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function getVenues(token: string): Promise<Venue[]> {
  return apiRequest<Venue[]>('/venues', { token });
}

export async function getVenue(token: string, id: string): Promise<Venue> {
  return apiRequest<Venue>(`/venues/${id}`, { token });
}

export async function createVenue(
  token: string,
  input: {
    communeId?: string;
    organizationId?: string;
    name: string;
    address?: string;
    capacity?: number;
    status?: string;
  },
): Promise<Venue> {
  return apiRequest<Venue>('/venues', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function updateVenue(
  token: string,
  id: string,
  input: {
    communeId?: string;
    organizationId?: string;
    name?: string;
    address?: string;
    capacity?: number;
    status?: string;
  },
): Promise<Venue> {
  return apiRequest<Venue>(`/venues/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export async function deleteVenue(token: string, id: string): Promise<Venue> {
  return apiRequest<Venue>(`/venues/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function validateScan(
  token: string,
  input: {
    ticketCode: string;
    matchId: string;
    deviceLabel?: string;
  },
): Promise<ScanValidationResponse> {
  return apiRequest<ScanValidationResponse>('/scan/validate', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function getUsers(token: string): Promise<AdminUser[]> {
  return apiRequest<AdminUser[]>('/users', { token });
}

export async function getUser(token: string, id: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}`, { token });
}

export async function createUser(
  token: string,
  input: {
    fullName: string;
    email?: string;
    phone: string;
    password?: string;
    role: string;
    status?: string;
    organizationIds?: string[];
  },
): Promise<AdminUser> {
  return apiRequest<AdminUser>('/users', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function updateUser(
  token: string,
  id: string,
  input: {
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    role?: string;
    status?: string;
    organizationIds?: string[];
  },
): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export async function deleteUser(token: string, id: string): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/users/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function getSeasons(token: string): Promise<Season[]> {
  return apiRequest<Season[]>('/seasons', { token });
}

export async function createSeason(
  token: string,
  input: { name: string; year: number; active?: boolean },
): Promise<Season> {
  return apiRequest<Season>('/seasons', { method: 'POST', token, body: input });
}

export async function updateSeason(
  token: string,
  id: string,
  input: { name?: string; year?: number; active?: boolean },
): Promise<Season> {
  return apiRequest<Season>(`/seasons/${id}`, { method: 'PATCH', token, body: input });
}

export async function activateSeason(token: string, id: string): Promise<Season> {
  return apiRequest<Season>(`/seasons/${id}/activate`, { method: 'POST', token });
}

export async function deleteSeason(token: string, id: string): Promise<void> {
  await apiRequest<unknown>(`/seasons/${id}`, { method: 'DELETE', token });
}

export async function getZones(token: string): Promise<Organization[]> {
  return apiRequest<Organization[]>('/organizations?type=ZONE', { token });
}

export async function getZone(token: string, id: string): Promise<Organization> {
  return apiRequest<Organization>(`/organizations/${id}`, { token });
}

export async function createZone(
  token: string,
  input: {
    name: string;
    parentId?: string;
    communeId?: string;
    regionId?: string;
    departmentId?: string;
    status?: string;
  },
): Promise<Organization> {
  return apiRequest<Organization>('/organizations', {
    method: 'POST',
    token,
    body: { ...input, type: 'ZONE' },
  });
}

export async function updateZone(
  token: string,
  id: string,
  input: {
    name?: string;
    parentId?: string;
    communeId?: string;
    regionId?: string;
    departmentId?: string;
    status?: string;
  },
): Promise<Organization> {
  return apiRequest<Organization>(`/organizations/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export async function deleteZone(token: string, id: string): Promise<Organization> {
  return apiRequest<Organization>(`/organizations/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function permanentDeleteZone(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/organizations/${id}/permanent`, {
    method: 'DELETE',
    token,
  });
}

export async function getOdcavs(token: string): Promise<Organization[]> {
  return apiRequest<Organization[]>('/organizations?type=ODCAV', { token });
}

export async function createOdcav(
  token: string,
  input: {
    name: string;
    code?: string;
    departmentId: string;
    status?: string;
  },
): Promise<Organization> {
  return apiRequest<Organization>('/organizations', {
    method: 'POST',
    token,
    body: { name: input.name, type: 'ODCAV', departmentId: input.departmentId, status: input.status },
  });
}

export async function updateOdcav(
  token: string,
  id: string,
  input: {
    name?: string;
    departmentId?: string;
    status?: string;
  },
): Promise<Organization> {
  return apiRequest<Organization>(`/organizations/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export async function deleteOdcav(token: string, id: string): Promise<Organization> {
  return apiRequest<Organization>(`/organizations/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function downloadImportTemplate(
  token: string,
  type: 'regions' | 'departments' | 'communes' | 'odcav' | 'zones' | 'venues' | 'teams',
): Promise<void> {
  const filenames: Record<string, string> = {
    regions: 'modele_import_regions.xlsx',
    departments: 'modele_import_departements.xlsx',
    communes: 'modele_import_communes.xlsx',
    odcav: 'modele_import_odcav.xlsx',
    zones: 'modele_import_zones.xlsx',
    venues: 'modele_import_stades.xlsx',
    teams: 'modele_import_equipes.xlsx',
  };

  const response = await fetch(`${API_BASE_URL}/import/templates/${type}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    await parseApiResponse(response);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filenames[type];
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function uploadImport(token: string, endpoint: string, file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  return parseApiResponse<ImportResult>(response);
}

export async function importRegions(token: string, file: File): Promise<ImportResult> {
  return uploadImport(token, '/import/regions', file);
}

export async function importDepartments(token: string, file: File): Promise<ImportResult> {
  return uploadImport(token, '/import/departments', file);
}

export async function importCommunes(token: string, file: File): Promise<ImportResult> {
  return uploadImport(token, '/import/communes', file);
}

export async function importOdcav(token: string, file: File): Promise<ImportResult> {
  return uploadImport(token, '/import/odcav', file);
}

export async function importZones(token: string, file: File): Promise<ImportResult> {
  return uploadImport(token, '/import/zones', file);
}

export async function importVenues(token: string, file: File): Promise<ImportResult> {
  return uploadImport(token, '/import/venues', file);
}

export async function importTeams(token: string, file: File): Promise<ImportResult> {
  return uploadImport(token, '/import/teams', file);
}

// ─── Settings — App settings ─────────────────────────────────────────────

export async function getPublicAppSettings(): Promise<AppSettings> {
  return apiRequest<AppSettings>('/public/app-settings');
}

export async function getAppSettings(token: string): Promise<AppSettings> {
  return apiRequest<AppSettings>('/admin/settings/app', { token });
}

export async function updateAppSettings(
  token: string,
  input: Partial<Omit<AppSettings, 'id'>>,
): Promise<AppSettings> {
  return apiRequest<AppSettings>('/admin/settings/app', {
    method: 'PUT',
    token,
    body: input,
  });
}

// ─── Settings — Payment config ────────────────────────────────────────────

export async function getPaymentConfig(token: string): Promise<PaymentConfig> {
  return apiRequest<PaymentConfig>('/admin/settings/payments', { token });
}

export async function updatePaymentConfig(
  token: string,
  input: Partial<{
    waveEnabled: boolean;
    waveApiKey: string;
    waveMerchantId: string;
    omEnabled: boolean;
    omClientId: string;
    omClientSecret: string;
    omMerchantKey: string;
    sandbox: boolean;
  }>,
): Promise<PaymentConfig> {
  return apiRequest<PaymentConfig>('/admin/settings/payments', {
    method: 'PUT',
    token,
    body: input,
  });
}

export async function testPaymentConfig(token: string): Promise<PaymentConfigTestResult> {
  return apiRequest<PaymentConfigTestResult>('/admin/settings/payments/test', {
    method: 'POST',
    token,
  });
}

// ─── Settings — Super admins ──────────────────────────────────────────────

export async function getSuperAdmins(token: string): Promise<SuperAdmin[]> {
  return apiRequest<SuperAdmin[]>('/admin/settings/super-admins', { token });
}

export async function createSuperAdmin(
  token: string,
  input: { fullName: string; email?: string; phone: string; password: string },
): Promise<SuperAdmin> {
  return apiRequest<SuperAdmin>('/admin/settings/super-admins', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function updateSuperAdmin(
  token: string,
  id: string,
  input: { fullName?: string; email?: string; phone?: string; password?: string; status?: string },
): Promise<SuperAdmin> {
  return apiRequest<SuperAdmin>(`/admin/settings/super-admins/${id}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export async function deactivateSuperAdmin(token: string, id: string): Promise<SuperAdmin> {
  return apiRequest<SuperAdmin>(`/admin/settings/super-admins/${id}`, {
    method: 'DELETE',
    token,
  });
}

// ─── Territories — Regions ────────────────────────────────────────────────

export async function getRegions(token: string): Promise<Region[]> {
  return apiRequest<Region[]>('/territories/regions', { token });
}

export async function createRegion(
  token: string,
  input: { name: string; code?: string },
): Promise<Region> {
  return apiRequest<Region>('/territories/regions', { method: 'POST', token, body: input });
}

export async function updateRegion(
  token: string,
  id: string,
  input: { name?: string; code?: string },
): Promise<Region> {
  return apiRequest<Region>(`/territories/regions/${id}`, { method: 'PATCH', token, body: input });
}

export async function deleteRegion(token: string, id: string): Promise<Region> {
  return apiRequest<Region>(`/territories/regions/${id}`, { method: 'DELETE', token });
}

// ─── Territories — Departments ────────────────────────────────────────────

export async function getDepartments(token: string, regionId?: string): Promise<Department[]> {
  const q = regionId ? `?regionId=${regionId}` : '';
  return apiRequest<Department[]>(`/territories/departments${q}`, { token });
}

export async function createDepartment(
  token: string,
  input: { name: string; code?: string; regionId: string },
): Promise<Department> {
  return apiRequest<Department>('/territories/departments', { method: 'POST', token, body: input });
}

export async function updateDepartment(
  token: string,
  id: string,
  input: { name?: string; code?: string; regionId?: string },
): Promise<Department> {
  return apiRequest<Department>(`/territories/departments/${id}`, { method: 'PATCH', token, body: input });
}

export async function deleteDepartment(token: string, id: string): Promise<Department> {
  return apiRequest<Department>(`/territories/departments/${id}`, { method: 'DELETE', token });
}

// ─── Territories — Communes ───────────────────────────────────────────────

export async function getCommunes(token: string, departmentId?: string): Promise<Commune[]> {
  const q = departmentId ? `?departmentId=${departmentId}` : '';
  return apiRequest<Commune[]>(`/territories/communes${q}`, { token });
}

export async function createCommune(
  token: string,
  input: { name: string; code?: string; departmentId: string },
): Promise<Commune> {
  return apiRequest<Commune>('/territories/communes', { method: 'POST', token, body: input });
}

export async function updateCommune(
  token: string,
  id: string,
  input: { name?: string; code?: string; departmentId?: string },
): Promise<Commune> {
  return apiRequest<Commune>(`/territories/communes/${id}`, { method: 'PATCH', token, body: input });
}

export async function deleteCommune(token: string, id: string): Promise<Commune> {
  return apiRequest<Commune>(`/territories/communes/${id}`, { method: 'DELETE', token });
}

// ─── Admin — Tickets ─────────────────────────────────────────────────────────

export async function getAdminTickets(
  token: string,
  filters: TicketFilters & { page?: number; limit?: number } = {},
): Promise<AdminTicketsResult> {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.matchId) params.set('matchId', filters.matchId);
  if (filters.ticketCategoryId) params.set('ticketCategoryId', filters.ticketCategoryId);
  if (filters.status) params.set('status', filters.status);
  if (filters.fromDate) params.set('fromDate', filters.fromDate);
  if (filters.toDate) params.set('toDate', filters.toDate);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return apiRequest<AdminTicketsResult>(`/admin/tickets${qs ? `?${qs}` : ''}`, { token });
}

export async function cancelAdminTicket(
  token: string,
  ticketId: string,
  cancelReason: string,
): Promise<AdminTicket> {
  return apiRequest<AdminTicket>(`/admin/tickets/${ticketId}/cancel`, {
    method: 'PATCH',
    token,
    body: { cancelReason },
  });
}

// ─── Admin — Audit logs ───────────────────────────────────────────────────────

export async function getAuditLogs(
  token: string,
  filters: AuditLogFilters & { page?: number; limit?: number } = {},
): Promise<AuditLogsResult> {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.action) params.set('action', filters.action);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.fromDate) params.set('fromDate', filters.fromDate);
  if (filters.toDate) params.set('toDate', filters.toDate);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return apiRequest<AuditLogsResult>(`/admin/audit-logs${qs ? `?${qs}` : ''}`, { token });
}

// ─── Admin — Delete preview ───────────────────────────────────────────────────

export async function getDeletePreview(
  token: string,
  entity: string,
  id: string,
): Promise<DeletePreview> {
  return apiRequest<DeletePreview>(`/admin/delete-preview/${entity}/${id}`, { token });
}

// ─── Admin — Global search ────────────────────────────────────────────────────

export async function searchAdmin(token: string, q: string): Promise<SearchResults> {
  return apiRequest<SearchResults>(`/admin/search?q=${encodeURIComponent(q)}`, { token });
}

export { ApiError };
