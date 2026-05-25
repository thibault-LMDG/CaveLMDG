// Sommelier — Moteur de scoring client-side
// Flow: Couleur (filtre hard) → Style (scoring vibes) → Budget → Occasion

import type { Wine } from '@/types'
import { WineColor, StyleOption, Budget, Occasion, STYLES_BY_COLOR, BUDGETS } from './vibeMapping'

export interface ScoredWine {
  wine: Wine & { cave_domains?: { nom: string; commentaire_domaine: string | null } }
  score: number
  label: 'accord' | 'rapport' | 'coeur'
  labelEmoji: string
  labelText: string
}

export interface SommelierFilters {
  color: WineColor | null
  style: StyleOption | null
  budget: Budget | null
  occasion: Occasion | null
  // Affinages optionnels
  regions?: string[]
  cepage?: string | null
  plat?: string | null
  bio?: boolean
}

type ScoredWineRaw = {
  wine: Wine & { cave_domains?: { nom: string; commentaire_domaine: string | null } }
  score: number
  styleScore: number
  budgetScore: number
  occasionScore: number
}

// --- Score par style ---

function scoreStyle(wine: Wine, style: StyleOption): number {
  // Surprise = random pondéré
  if (style.id === 'surprise') return 10 + Math.random() * 15

  const vibes = wine.profil_vibes || []
  const targetVibes = style.vibes

  // Match direct dans profil_vibes
  const directMatches = targetVibes.filter(v => vibes.includes(v)).length
  if (directMatches >= 2) return 40
  if (directMatches === 1) return 30

  // Match partiel — le vin a des vibes proches
  const proximity: Record<string, string[]> = {
    frais: ['vif', 'minéral', 'salin', 'léger', 'fin'],
    minéral: ['frais', 'vif', 'salin', 'tendu'],
    fin: ['élégant', 'délicat', 'floral', 'soyeux'],
    fruité: ['gourmand', 'croquant', 'rond', 'souple'],
    rond: ['généreux', 'ample', 'gras', 'boisé'],
    puissant: ['costaud', 'tannique', 'charpenté', 'structuré'],
    léger: ['frais', 'aérien', 'facile', 'souple'],
    doux: ['moelleux', 'sucré', 'miel'],
    élégant: ['fin', 'soyeux', 'délicat'],
  }

  let proxScore = 0
  for (const target of targetVibes) {
    const related = proximity[target] || []
    if (vibes.some(v => related.includes(v))) proxScore += 8
  }
  if (proxScore > 0) return Math.min(proxScore, 25)

  return 5 // fallback minimal
}

// --- Score budget ---

function scoreBudget(wine: Wine, budget: Budget): number {
  const prix = wine.prix_vente

  if (budget === 'any') {
    if (prix >= 90) return 25
    if (prix >= 55) return 22
    return 18
  }

  if (budget === 'plaisir') {
    if (prix >= 90 && prix <= 150) return 25
    if (prix >= 55) return 20
    if (prix >= 45) return 10
    return 0
  }

  const budgetDef = BUDGETS.find(b => b.id === budget)
  if (!budgetDef) return 0
  const [min, max] = budgetDef.range

  if (prix >= min && prix <= max) return 20
  const dist = prix < min ? min - prix : prix - max
  if (dist <= 10) return 10
  return 0
}

// --- Score occasion ---

function scoreOccasion(wine: Wine, occasion: Occasion): number {
  const vibes = wine.profil_vibes || []

  switch (occasion) {
    case 'fête': {
      let s = 0
      if (wine.prix_vente > 50) s += 8
      if (wine.prix_vente > 80) s += 5
      if (wine.cave_domains?.commentaire_domaine) s += 3
      return s
    }
    case 'tranquille': {
      let s = 0
      if ((wine.bevcost_pct || 50) < 35) s += 5
      if (wine.quantite_stock > 3) s += 5
      if (wine.prix_vente < 50) s += 5
      return s
    }
    case 'découverte': {
      let s = 0
      if (vibes.includes('original') || vibes.includes('rare')) s += 8
      if (wine.quantite_stock > 6) s += 4
      if (wine.certification && wine.certification !== 'conventionnel') s += 3
      return s
    }
    case 'soif': {
      let s = 0
      if (wine.prix_vente < 35) s += 5
      if (vibes.includes('frais') || vibes.includes('léger')) s += 5
      return s
    }
    default:
      return 0
  }
}

// --- Bonus push ---

function pushBonus(wine: Wine, pushWineIds: Set<string>): number {
  let bonus = 0
  if (pushWineIds.has(wine.id)) bonus += 10
  if (wine.quantite_stock > 8 && !(wine.profil_vibes || []).includes('rare')) bonus += 3
  return bonus
}

// --- Filtres hard ---

function passesFilters(wine: Wine, filters: SommelierFilters): boolean {
  // Filtre couleur — hard filter
  if (filters.color && wine.type !== filters.color) return false
  // Affinages
  if (filters.regions && filters.regions.length > 0) {
    if (!filters.regions.includes(wine.region)) return false
  }
  if (filters.cepage) {
    const wCepage = (wine.cepage || '').toLowerCase()
    if (!wCepage.includes(filters.cepage.toLowerCase())) return false
  }
  if (filters.plat) {
    const accords = (wine.accords_carte || '').toLowerCase()
    if (!accords.includes(filters.plat.toLowerCase())) return false
  }
  if (filters.bio) {
    const isBio = wine.certification && wine.certification !== 'conventionnel'
    const isNature = wine.sans_sulfites || wine.non_filtre || wine.levures_indigenes
    if (!isBio && !isNature) return false
  }
  return true
}

// --- Bonus région LMDG ---

const REGION_WEIGHTS: Record<string, number> = {
  'Provence': 15,
  'Bourgogne': 10,
  'Loire': 9,
  'Vallée du Rhône': 8,
  'Rhône': 8,
  'Languedoc': 7,
  'Languedoc-Roussillon': 7,
  'Bordeaux': 6,
  'Corse': 5,
  'Sud-Ouest': 4,
  'Champagne': 4,
  'Roussillon': 4,
  'Beaujolais': 3,
  'Savoie': 1,
  'Jura': 1,
  'Alsace': 0,
}

function scoreRegion(wine: Wine): number {
  const region = wine.region || ''
  for (const [key, weight] of Object.entries(REGION_WEIGHTS)) {
    if (region.toLowerCase().includes(key.toLowerCase())) return weight
  }
  return 3
}

// --- Moteur principal ---

export function scoreWines(
  wines: (Wine & { cave_domains?: { nom: string; commentaire_domaine: string | null } })[],
  filters: SommelierFilters,
  pushWineIds: Set<string> = new Set()
): ScoredWine[] {
  const available = wines.filter(w => w.quantite_stock > 0 && w.statut === 'actif')
  const filtered = available.filter(w => passesFilters(w, filters))

  // Il faut au moins la couleur pour commencer
  if (!filters.color) return []

  const scored: ScoredWineRaw[] = filtered.map(wine => {
    const styleScore = filters.style ? scoreStyle(wine, filters.style) : 10 // base si pas encore choisi
    const budgetScore = filters.budget ? scoreBudget(wine, filters.budget) : 0
    const occasionScore = filters.occasion ? scoreOccasion(wine, filters.occasion) : 0
    const push = pushBonus(wine, pushWineIds)

    return {
      wine,
      score: styleScore + budgetScore + occasionScore + push + scoreRegion(wine),
      styleScore,
      budgetScore,
      occasionScore,
    }
  })

  scored.sort((a, b) => b.score - a.score)
  if (scored.length === 0) return []

  const results: ScoredWine[] = []

  // 🎯 Meilleur accord
  if (scored[0]) {
    results.push({
      wine: scored[0].wine,
      score: scored[0].score,
      label: 'accord',
      labelEmoji: '🎯',
      labelText: 'Meilleur accord',
    })
  }

  // 💎 Rapport qualité-prix
  const top10 = scored.slice(0, 10)
  const bestRatio = top10
    .filter(s => s.wine.id !== results[0]?.wine.id)
    .sort((a, b) => {
      const ratioA = a.score / (a.wine.prix_vente || 1)
      const ratioB = b.score / (b.wine.prix_vente || 1)
      return ratioB - ratioA
    })[0]

  if (bestRatio) {
    results.push({
      wine: bestRatio.wine,
      score: bestRatio.score,
      label: 'rapport',
      labelEmoji: '💎',
      labelText: 'Rapport qualité-prix',
    })
  }

  // ⭐ Coup de cœur de Thibault
  const usedIds = new Set(results.map(r => r.wine.id))
  const pushWine = scored.find(s => pushWineIds.has(s.wine.id) && !usedIds.has(s.wine.id) && s.score > 15)
  const coeur = pushWine || scored.find(s => !usedIds.has(s.wine.id))

  if (coeur) {
    results.push({
      wine: coeur.wine,
      score: coeur.score,
      label: 'coeur',
      labelEmoji: '⭐',
      labelText: 'Coup de cœur de Thibault',
    })
  }

  return results
}

// --- Extraction des filtres disponibles ---

export function extractAvailableFilters(wines: Wine[]) {
  const active = wines.filter(w => w.quantite_stock > 0 && w.statut === 'actif')

  const regions = [...new Set(active.map(w => w.region).filter(Boolean))].sort()

  const cepageSet = new Set<string>()
  active.forEach(w => {
    if (!w.cepage) return
    w.cepage.split(/[,;]/).forEach(c => {
      const name = c.replace(/\d+%?\s*/g, '').trim()
      if (name.length > 1) cepageSet.add(name)
    })
  })
  const cepages = [...cepageSet].sort()

  const platSet = new Set<string>()
  active.forEach(w => {
    if (!w.accords_carte) return
    w.accords_carte.split(/[,;·•\n]/).forEach(p => {
      const name = p.trim()
      if (name.length > 2) platSet.add(name)
    })
  })
  const plats = [...platSet].sort()

  return { regions, cepages, plats }
}
