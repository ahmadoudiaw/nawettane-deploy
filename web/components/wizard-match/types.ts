import type { Commune, Department, Organization, Region, Season, Team, Venue } from '@/lib/types';
import type { VenueAvailabilityResult } from '@/lib/api';

export interface WizardCategory {
  _id: string;
  name: string;
  price: string;
  quota: string;
  badgeColor: string;
}

export interface WizardData {
  // Step 1 — Général
  competitionName: string;
  category: string;
  stage: string;
  matchDate: string;
  matchTime: string;
  seasonId: string;

  // Step 2 — Équipes (cascade: region → odcav → zone → team)
  homeRegionId: string;
  homeOdcavId: string;
  homeZoneId: string;
  homeTeamId: string;
  awayRegionId: string;
  awayOdcavId: string;
  awayZoneId: string;
  awayTeamId: string;

  // Step 3 — Lieu (cascade: region → dept → commune → venue)
  venueRegionId: string;
  venueDeptId: string;
  venueCommuneId: string;
  venueId: string;

  // Step 4 — Billetterie
  categories: WizardCategory[];
}

export interface RefData {
  seasons: Season[];
  odcavs: Organization[];
  zones: Organization[];
  teams: Team[];
  venues: Venue[];
  regions: Region[];
  departments: Department[];
  communes: Commune[];
}

export interface StepProps {
  data: WizardData;
  onChange: (patch: Partial<WizardData>) => void;
  errors: Record<string, string>;
  refData: RefData;
  venueAvailability?: VenueAvailabilityResult | null;
  venueAvailabilityLoading?: boolean;
}

export const BADGE_COLORS = [
  '#0f766e',
  '#d97706',
  '#7c3aed',
  '#dc2626',
  '#0284c7',
  '#16a34a',
  '#ea580c',
  '#0e7490',
];

export const WIZARD_STORAGE_KEY = 'nawettane_wizard_match_draft';

export function defaultData(): WizardData {
  return {
    competitionName: 'Nawettane Populaire',
    category: 'SENIOR',
    stage: 'Poule',
    matchDate: '',
    matchTime: '15:00',
    seasonId: '',
    homeRegionId: '',
    homeOdcavId: '',
    homeZoneId: '',
    homeTeamId: '',
    awayRegionId: '',
    awayOdcavId: '',
    awayZoneId: '',
    awayTeamId: '',
    venueRegionId: '',
    venueDeptId: '',
    venueCommuneId: '',
    venueId: '',
    categories: [
      { _id: 'cat-init-1', name: 'Populaire', price: '1000', quota: '300', badgeColor: '#0f766e' },
      { _id: 'cat-init-2', name: 'Tribune', price: '1500', quota: '120', badgeColor: '#d97706' },
    ],
  };
}

export function validateStep(step: number, data: WizardData): Record<string, string> {
  const e: Record<string, string> = {};

  if (step === 0) {
    if (!data.competitionName.trim()) e.competitionName = 'Le nom de la compétition est requis.';
    if (!data.category || !['CADET', 'SENIOR'].includes(data.category)) e.category = 'Veuillez choisir une catégorie (Cadet ou Senior).';
    if (!data.seasonId) e.seasonId = 'Veuillez choisir une saison.';
    if (!data.matchDate) e.matchDate = 'Veuillez saisir la date du match.';
    if (!data.matchTime) e.matchTime = "Veuillez saisir l'heure du match.";
  }

  if (step === 1) {
    if (!data.homeZoneId) e.homeZoneId = 'Veuillez choisir la zone domicile.';
    if (!data.homeTeamId) e.homeTeamId = "Veuillez choisir l'équipe domicile.";
    if (!data.awayZoneId) e.awayZoneId = 'Veuillez choisir la zone extérieure.';
    if (!data.awayTeamId) e.awayTeamId = "Veuillez choisir l'équipe extérieure.";
    if (data.homeTeamId && data.awayTeamId && data.homeTeamId === data.awayTeamId) {
      e.awayTeamId = 'Les deux équipes doivent être différentes.';
    }
  }

  if (step === 2) {
    if (!data.venueId) e.venueId = 'Veuillez choisir un stade.';
  }

  if (step === 3) {
    if (data.categories.length === 0) {
      e._categories = 'Ajoutez au moins une catégorie de billet.';
    } else {
      data.categories.forEach((cat, i) => {
        if (!cat.name.trim()) e[`cat_${i}_name`] = 'Le nom est requis.';
        const price = Number(cat.price);
        if (!cat.price || isNaN(price) || price <= 0) e[`cat_${i}_price`] = 'Prix invalide (> 0).';
        if (cat.quota !== '') {
          const quota = Number(cat.quota);
          if (isNaN(quota) || quota < 1) e[`cat_${i}_quota`] = 'Quantité invalide (≥ 1).';
        }
      });
    }
  }

  return e;
}
