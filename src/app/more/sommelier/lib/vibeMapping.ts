// Sommelier — Vibe & scoring definitions
// Vocabulaire contrôlé pour les profil_vibes des vins

export type Vibe = 'festif' | 'frais' | 'fin' | 'fruité' | 'puissant' | 'doux' | 'surprise'
export type Intensity = 'léger' | 'équilibré' | 'costaud'
export type Budget = 'doux' | 'milieu' | 'plaisir' | 'any'
export type Occasion = 'fête' | 'tranquille' | 'découverte' | 'soif'

export const VIBES: { id: Vibe; emoji: string; label: string; sub: string }[] = [
  { id: 'festif', emoji: '🫧', label: 'Festif', sub: 'Pétillant, apéro, célébration' },
  { id: 'frais', emoji: '☀️', label: 'Frais & désaltérant', sub: 'Vif, léger, soif' },
  { id: 'fin', emoji: '🌿', label: 'Fin & élégant', sub: 'Minéral, floral, délicat' },
  { id: 'fruité', emoji: '🍇', label: 'Fruité & gourmand', sub: 'Rond, souple, généreux' },
  { id: 'puissant', emoji: '🔥', label: 'Puissant & charpenté', sub: 'Tannique, boisé, épicé' },
  { id: 'doux', emoji: '🍯', label: 'Doux & moelleux', sub: 'Sucré, liquoreux, miel' },
  { id: 'surprise', emoji: '🤷', label: 'Surprise moi !', sub: 'Le sommelier choisit' },
]

export const INTENSITIES: { id: Intensity; emoji: string; label: string; sub: string }[] = [
  { id: 'léger', emoji: '🪶', label: 'Léger & délicat', sub: 'Facile à boire' },
  { id: 'équilibré', emoji: '⚖️', label: 'Équilibré', sub: 'Ni trop, ni trop peu' },
  { id: 'costaud', emoji: '💪', label: 'Costaud & généreux', sub: 'Du caractère !' },
]

export const BUDGETS: { id: Budget; emoji: string; label: string; range: [number, number] }[] = [
  { id: 'doux', emoji: '💰', label: 'Prix doux', range: [0, 35] },
  { id: 'milieu', emoji: '💰', label: 'Milieu de carte', range: [35, 55] },
  { id: 'plaisir', emoji: '💰', label: 'Se faire plaisir', range: [55, 999] },
  { id: 'any', emoji: '🤷', label: 'Pas de préférence', range: [0, 999] },
]

export const OCCASIONS: { id: Occasion; emoji: string; label: string; sub: string }[] = [
  { id: 'fête', emoji: '🥂', label: 'On fête quelque chose', sub: 'Belle bouteille, histoire à raconter' },
  { id: 'tranquille', emoji: '🌊', label: 'Repas tranquille', sub: 'Valeur sûre, sans risque' },
  { id: 'découverte', emoji: '🌟', label: 'Veut découvrir', sub: 'Original, cépage rare, surprise' },
  { id: 'soif', emoji: '🏃', label: 'Juste soif', sub: 'Simple, frais, accessible' },
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
