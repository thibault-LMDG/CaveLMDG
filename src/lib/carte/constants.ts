// Carte des vins LMDG — Design constants (VERROUILLÉ)
// Source: skill Charlotte / charte WEAREMB

export const GREEN = '#1C5733'
export const GREEN_MED = '#5e7e6c'
export const GREEN_PALE = '#8aa194'
export const GREEN_DESC = '#3d5c4a'
export const GREEN_FOOT = '#b9c8bd'
export const GREEN_RULE = '#cdd9d0'

// Mapping type Supabase → chapitre carte
export const TYPE_TO_CHAPTER: Record<string, { nom: string; numero: string; order: number }> = {
  BULLE: { nom: 'BULLES', numero: 'CHAPITRE I', order: 1 },
  BLANC: { nom: 'BLANCS', numero: 'CHAPITRE II', order: 2 },
  ROSÉ: { nom: 'ROSÉS', numero: 'CHAPITRE III', order: 3 },
  'DEMI-SEC': { nom: 'DEMI-SEC', numero: 'CHAPITRE IV', order: 4 },
  ROUGE: { nom: 'ROUGES', numero: 'CHAPITRE V', order: 5 },
}

// Ordre des régions dans chaque chapitre (même ordre que vins.json de Charlotte)
export const REGION_ORDER: Record<string, number> = {
  'Champagne': 1,
  'Loire': 2,
  'Vénétie': 3,
  'Languedoc-Roussillon': 4,
  'Provence & Corse': 5,
  'Vallée du Rhône': 6,
  'Bourgogne': 7,
  'Alsace': 8,
  'Sud-Ouest': 9,
  'Bordeaux': 10,
}

// Région order spécifique par chapitre (le skill de Charlotte a un ordre fixe par chapitre)
// BULLES: Champagne, Loire, Vénétie, Languedoc-Roussillon
// BLANCS: Provence & Corse, Vallée du Rhône, Loire, Bourgogne, Alsace, Languedoc-Roussillon, Sud-Ouest
// ROSÉS: Provence & Corse, Vallée du Rhône
// DEMI-SEC: Sud-Ouest
// ROUGES: Provence & Corse, Vallée du Rhône, Bourgogne, Alsace, Bordeaux, Sud-Ouest
export const REGION_ORDER_BY_TYPE: Record<string, string[]> = {
  BULLE: ['Champagne', 'Loire', 'Vénétie', 'Languedoc-Roussillon', 'Provence & Corse', 'Vallée du Rhône', 'Bourgogne', 'Alsace', 'Sud-Ouest', 'Bordeaux'],
  BLANC: ['Provence & Corse', 'Vallée du Rhône', 'Loire', 'Bourgogne', 'Alsace', 'Languedoc-Roussillon', 'Sud-Ouest', 'Bordeaux', 'Champagne', 'Vénétie'],
  ROSÉ: ['Provence & Corse', 'Vallée du Rhône', 'Loire', 'Languedoc-Roussillon', 'Bourgogne', 'Alsace', 'Sud-Ouest', 'Bordeaux', 'Champagne', 'Vénétie'],
  'DEMI-SEC': ['Sud-Ouest', 'Provence & Corse', 'Vallée du Rhône', 'Loire', 'Bourgogne', 'Alsace', 'Languedoc-Roussillon', 'Bordeaux', 'Champagne', 'Vénétie'],
  ROUGE: ['Provence & Corse', 'Vallée du Rhône', 'Bourgogne', 'Alsace', 'Bordeaux', 'Sud-Ouest', 'Loire', 'Languedoc-Roussillon', 'Champagne', 'Vénétie'],
}

// Textes fixes
export const MOT_MAISON = `Nos vins sont choisis comme nos produits — pour leur honnêteté, leur lien au terroir et leur capacité à dialoguer avec la mer. La Provence et la Corse occupent une place privilégiée, en bonnes voisines, mais nous avons tenu à ouvrir la cave aux grandes maisons de France : du Sancerre au Châteauneuf, du Chablis au Bandol.`

export const CITATION = `« Le vin que l'on partage face à la mer a toujours un peu le goût du large. »`

export const CLOTURE_TEXT = `Santé, et merci d'être venus jusqu'au bout du monde.`

export const MENTION_LEGALE = `L'abus d'alcool est dangereux pour la santé. À consommer avec modération.`

// Dimensions page A4 en mm
export const PAGE_W = 210
export const PAGE_H = 297
export const PAD_LEFT = 22
export const PAD_RIGHT = 22
export const PAD_TOP = 22
export const PAD_BOTTOM = 24
