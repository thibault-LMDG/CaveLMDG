// Sommelier — Vocabulaire & definitions
// Flow: Couleur → Style (adapté par couleur) → Budget → Occasion

export type WineColor = 'BLANC' | 'ROUGE' | 'ROSÉ' | 'BULLE' | 'DEMI-SEC'
export type Style = string // dynamique selon la couleur
export type Budget = 'doux' | 'milieu' | 'plaisir' | 'any'
export type Occasion = 'fête' | 'tranquille' | 'découverte' | 'soif'

// Q1 — Couleur
export const COLORS: { id: WineColor; emoji: string; label: string; sub: string }[] = [
  { id: 'BLANC', emoji: '🥂', label: 'Blanc', sub: '' },
  { id: 'ROUGE', emoji: '🍷', label: 'Rouge', sub: '' },
  { id: 'ROSÉ', emoji: '🌸', label: 'Rosé', sub: '' },
  { id: 'BULLE', emoji: '🫧', label: 'Bulles', sub: '' },
  { id: 'DEMI-SEC', emoji: '🍯', label: 'Demi-sec', sub: '' },
]

// Q2 — Style adapté par couleur
export type StyleOption = { id: string; emoji: string; label: string; sub: string; vibes: string[] }

export const STYLES_BY_COLOR: Record<WineColor, StyleOption[]> = {
  BLANC: [
    { id: 'frais-mineral', emoji: '💧', label: 'Frais & minéral', sub: 'Vif, salin, tendu', vibes: ['frais', 'minéral', 'vif', 'salin'] },
    { id: 'floral-delicat', emoji: '🌸', label: 'Floral & délicat', sub: 'Aromatique, fin, tout en nuances', vibes: ['fin', 'floral', 'délicat', 'léger'] },
    { id: 'rond-genereux', emoji: '🍑', label: 'Rond & généreux', sub: 'Gras, boisé, ample', vibes: ['rond', 'généreux', 'boisé', 'ample', 'costaud'] },
    { id: 'surprise', emoji: '✨', label: 'Surprenez-moi', sub: 'Faites-moi confiance', vibes: [] },
  ],
  ROUGE: [
    { id: 'fruit-souple', emoji: '🍒', label: 'Fruité & souple', sub: 'Croquant, léger, sur le fruit', vibes: ['fruité', 'léger', 'souple', 'frais'] },
    { id: 'elegant-soyeux', emoji: '🌿', label: 'Élégant & soyeux', sub: 'Fin, équilibré, soyeux', vibes: ['fin', 'élégant', 'équilibré', 'soyeux'] },
    { id: 'puissant-charpente', emoji: '🪵', label: 'Puissant & charpenté', sub: 'Structuré, tannique, de la matière', vibes: ['puissant', 'costaud', 'tannique', 'charpenté'] },
    { id: 'surprise', emoji: '✨', label: 'Surprenez-moi', sub: 'Faites-moi confiance', vibes: [] },
  ],
  ROSÉ: [
    { id: 'pale-mineral', emoji: '💧', label: 'Pâle & minéral', sub: 'Sec, tendu, gastronomique', vibes: ['frais', 'minéral', 'fin', 'sec'] },
    { id: 'fruit-gourmand', emoji: '🍓', label: 'Fruité & gourmand', sub: 'Rondeur, petits fruits, facile', vibes: ['fruité', 'gourmand', 'rond', 'léger'] },
    { id: 'surprise', emoji: '✨', label: 'Surprenez-moi', sub: 'Faites-moi confiance', vibes: [] },
  ],
  BULLE: [
    { id: 'brut-vif', emoji: '⚡', label: 'Brut & vif', sub: 'Frais, nerveux, apéritif', vibes: ['frais', 'vif', 'festif', 'léger'] },
    { id: 'cremeux-elegant', emoji: '🥂', label: 'Crémeux & élégant', sub: 'Vineux, complexe, gastronomique', vibes: ['fin', 'élégant', 'rond', 'généreux'] },
    { id: 'surprise', emoji: '✨', label: 'Surprenez-moi', sub: 'Faites-moi confiance', vibes: [] },
  ],
  'DEMI-SEC': [
    { id: 'doux-fruite', emoji: '🍑', label: 'Doux & fruité', sub: 'Sucrosité discrète, fruité', vibes: ['doux', 'fruité', 'léger'] },
    { id: 'liquoreux-riche', emoji: '🍯', label: 'Liquoreux & riche', sub: 'Opulent, miel, épices douces', vibes: ['doux', 'puissant', 'rond', 'généreux'] },
    { id: 'surprise', emoji: '✨', label: 'Surprenez-moi', sub: 'Faites-moi confiance', vibes: [] },
  ],
}

// Q3 — Budget
export const BUDGETS: { id: Budget; emoji: string; label: string; range: [number, number] }[] = [
  { id: 'doux', emoji: '💰', label: 'Prix doux', range: [0, 35] },
  { id: 'milieu', emoji: '💰', label: 'Milieu de carte', range: [35, 55] },
  { id: 'plaisir', emoji: '💰', label: 'Se faire plaisir', range: [55, 999] },
  { id: 'any', emoji: '🤷', label: 'Pas de limite', range: [0, 999] },
]

// Q4 — Occasion
export const OCCASIONS: { id: Occasion; emoji: string; label: string; sub: string }[] = [
  { id: 'fête', emoji: '🥂', label: 'Un moment à marquer', sub: 'Anniversaire, grande tablée, belle bouteille' },
  { id: 'tranquille', emoji: '🌊', label: 'Repas tranquille', sub: 'Une valeur sûre, on ne prend pas de risque' },
  { id: 'découverte', emoji: '🧭', label: 'Envie de découvrir', sub: 'Sortir des sentiers, un vin inattendu' },
  { id: 'soif', emoji: '☀️', label: 'On a surtout soif', sub: 'Frais, simple, on ne se prend pas la tête' },
]
