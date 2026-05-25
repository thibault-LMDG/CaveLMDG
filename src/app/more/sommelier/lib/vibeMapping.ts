// Sommelier — Vocabulaire & definitions
// Ton: sommelier chaleureux de restaurant bord de mer, accessible mais précis

export type Vibe = 'festif' | 'frais' | 'fin' | 'fruité' | 'puissant' | 'doux' | 'surprise'
export type Intensity = 'léger' | 'équilibré' | 'costaud'
export type Budget = 'doux' | 'milieu' | 'plaisir' | 'any'
export type Occasion = 'fête' | 'tranquille' | 'découverte' | 'soif'

// Q1 — L'envie du moment (le cœur de la recommandation)
export const VIBES: { id: Vibe; emoji: string; label: string; sub: string }[] = [
  { id: 'festif', emoji: '🫧', label: 'Des bulles', sub: 'Pour trinquer, fêter, ou juste le plaisir' },
  { id: 'frais', emoji: '💧', label: 'Fraîcheur', sub: 'Vif, salin, un vin qui désaltère' },
  { id: 'fin', emoji: '🌸', label: 'Finesse', sub: 'Délicat, floral, tout en nuances' },
  { id: 'fruité', emoji: '🍒', label: 'Fruit & gourmandise', sub: 'Rond, croquant, généreux' },
  { id: 'puissant', emoji: '🪵', label: 'Caractère', sub: 'Structuré, profond, de la matière' },
  { id: 'doux', emoji: '🍯', label: 'Douceur', sub: 'Moelleux, liquoreux, sur le miel' },
  { id: 'surprise', emoji: '✨', label: 'Laissez-moi choisir', sub: 'Faites-moi confiance' },
]

// Q2 — Le registre (complémente Q1 sans redondance)
export const INTENSITIES: { id: Intensity; emoji: string; label: string; sub: string }[] = [
  { id: 'léger', emoji: '🪶', label: 'Tout en légèreté', sub: 'Un vin aérien, facile' },
  { id: 'équilibré', emoji: '⚖️', label: 'Bel équilibre', sub: 'Juste comme il faut' },
  { id: 'costaud', emoji: '🏔️', label: 'Avec de la mâche', sub: 'Du corps, de la présence' },
]

// Q3 — Le budget
export const BUDGETS: { id: Budget; emoji: string; label: string; range: [number, number] }[] = [
  { id: 'doux', emoji: '💰', label: 'Prix doux', range: [0, 35] },
  { id: 'milieu', emoji: '💰', label: 'Milieu de carte', range: [35, 55] },
  { id: 'plaisir', emoji: '💰', label: 'Se faire plaisir', range: [55, 999] },
  { id: 'any', emoji: '🤷', label: 'Pas de limite', range: [0, 999] },
]

// Q4 — L'occasion / le contexte
export const OCCASIONS: { id: Occasion; emoji: string; label: string; sub: string }[] = [
  { id: 'fête', emoji: '🥂', label: 'Un moment à marquer', sub: 'Anniversaire, grande tablée, belle bouteille' },
  { id: 'tranquille', emoji: '🌊', label: 'Repas tranquille', sub: 'Une valeur sûre, on ne prend pas de risque' },
  { id: 'découverte', emoji: '🧭', label: 'Envie de découvrir', sub: 'Sortir des sentiers, un vin inattendu' },
  { id: 'soif', emoji: '☀️', label: 'On a surtout soif', sub: 'Frais, simple, on ne se prend pas la tête' },
]

// Mapping vibe → types de vin principaux (pour fallback si profil_vibes vide)
export const VIBE_TYPE_MAP: Record<Vibe, string[]> = {
  festif: ['BULLE', 'BLANC'],
  frais: ['BLANC', 'ROSÉ'],
  fin: ['BLANC', 'ROUGE'],
  fruité: ['ROUGE', 'ROSÉ'],
  puissant: ['ROUGE'],
  doux: ['DEMI-SEC'],
  surprise: ['BLANC', 'ROUGE', 'ROSÉ', 'BULLE', 'DEMI-SEC'],
}

// Mapping intensité → profil_vibes attendus
export const INTENSITY_VIBE_MAP: Record<Intensity, string[]> = {
  léger: ['léger', 'frais', 'fin', 'festif'],
  équilibré: ['équilibré', 'fruité', 'fin'],
  costaud: ['costaud', 'puissant'],
}
