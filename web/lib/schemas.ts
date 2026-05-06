import { z } from 'zod';

const phoneRegex = /^\+?[\d\s\-]{7,15}$/;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  identifier: z.string().min(1, 'Identifiant requis.'),
  password: z.string().min(6, 'Mot de passe requis (min. 6 caractères).'),
});

// ── Season ────────────────────────────────────────────────────────────────────
export const seasonSchema = z.object({
  name: z.string().min(2, 'Nom de la saison requis (min. 2 caractères).'),
  year: z.number().int().min(2020, 'Année trop ancienne.').max(2040, 'Année trop lointaine.'),
});

// Edit: same shape, year validated the same way
export const seasonEditSchema = seasonSchema;

// ── Team ──────────────────────────────────────────────────────────────────────
export const ageCategories = ['CADET', 'SENIOR'] as const;

export const teamSchema = z.object({
  name: z.string().min(2, "Nom de l'équipe requis (min. 2 caractères)."),
  organizationId: z.string().min(1, 'Veuillez sélectionner une zone.'),
  category: z.enum(ageCategories, { message: 'Veuillez choisir Cadet ou Senior.' }),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
});

// Edit: no zone change allowed
export const teamEditSchema = z.object({
  name: z.string().min(2, "Nom de l'équipe requis (min. 2 caractères)."),
  category: z.enum(ageCategories, { message: 'Veuillez choisir Cadet ou Senior.' }),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
});

// ── Venue ─────────────────────────────────────────────────────────────────────
export const venueSchema = z.object({
  name: z.string().min(2, 'Nom du stade requis (min. 2 caractères).'),
  communeId: z.string().min(1, 'Veuillez sélectionner une commune.'),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
});

// Edit: communeId optional (can stay unlinked)
export const venueEditSchema = z.object({
  name: z.string().min(2, 'Nom du stade requis (min. 2 caractères).'),
  communeId: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
});

// ── User ──────────────────────────────────────────────────────────────────────
const userRoles = z.enum([
  'SUPER_ADMIN',
  'ONCAV_ADMIN',
  'ORCAV_ADMIN',
  'ODCAV_ADMIN',
  'ZONE_ADMIN',
  'GUICHET_AGENT',
  'AGENT_MAIRIE',
]);

const userStatuses = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);

export const userSchema = z.object({
  fullName: z.string().min(2, 'Nom complet requis (min. 2 caractères).'),
  email: z.string().email('Adresse email invalide.').optional().or(z.literal('')),
  phone: z
    .string()
    .min(7, 'Numéro de téléphone requis.')
    .regex(phoneRegex, 'Format de téléphone invalide.'),
  password: z
    .string()
    .min(6, 'Mot de passe (min. 6 caractères).')
    .optional()
    .or(z.literal('')),
  role: userRoles,
  status: userStatuses,
});

// Edit: adds flat organizationId
export const userEditSchema = userSchema.extend({
  organizationId: z.string().optional(),
});

// ── Match ─────────────────────────────────────────────────────────────────────
export const matchSchema = z
  .object({
    seasonId: z.string().min(1, 'Veuillez choisir une saison.'),
    matchDate: z.string().min(1, "Veuillez saisir la date et l'heure du match."),
    venueCommuneId: z.string().min(1, 'Veuillez sélectionner une commune.'),
    venueId: z.string().min(1, 'Veuillez choisir un stade.'),
    homeZoneId: z.string().min(1, "Veuillez choisir la zone domicile."),
    homeTeamId: z.string().min(1, "Veuillez choisir l'équipe domicile."),
    awayZoneId: z.string().min(1, "Veuillez choisir la zone extérieure."),
    awayTeamId: z.string().min(1, "Veuillez choisir l'équipe extérieure."),
    competitionName: z.string().optional(),
    stage: z.string().optional(),
  })
  .refine((d) => !d.homeTeamId || !d.awayTeamId || d.homeTeamId !== d.awayTeamId, {
    message: 'Les deux équipes doivent être différentes.',
    path: ['awayTeamId'],
  });

// Edit: only editable fields (teams/venue/season locked)
export const matchEditSchema = z.object({
  competitionName: z.string().min(1, 'Compétition requise.'),
  category: z.enum(ageCategories, { message: 'Veuillez choisir Cadet ou Senior.' }),
  stage: z.string().optional(),
  matchDate: z.string().min(1, 'Date et heure requises.'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED']),
});

// ── Inferred types ─────────────────────────────────────────────────────────────
export type LoginFormData = z.infer<typeof loginSchema>;
export type SeasonFormData = z.infer<typeof seasonSchema>;
export type TeamFormData = z.infer<typeof teamSchema>;
export type TeamEditFormData = z.infer<typeof teamEditSchema>;
export type VenueFormData = z.infer<typeof venueSchema>;
export type VenueEditFormData = z.infer<typeof venueEditSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type UserEditFormData = z.infer<typeof userEditSchema>;
export type MatchFormData = z.infer<typeof matchSchema>;
export type MatchEditFormData = z.infer<typeof matchEditSchema>;
