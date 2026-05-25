// Sommelier — Moteur de scoring client-side
// Objectif: < 1ms pour 78 vins, recalcul à chaque tap

import type { Wine } from '@/types'
import { Vibe, Intensity, Budget, Occasion, VIBE_TYPE_MAP, INTENSITY_VIBE_MAP, BUDGETS } from './vibeMapping'

export interface ScoredWine {
  wine: Wine & { cave_domains?: { nom: string; commentaire_domaine: string | null } }
  score: number
  label: 'accord' | 'rapport' | 'coeur'
  labelEmoji: string
  labelText: string
}

export interface SommelierFilters {
  vibe: Vibe | null
  intensity: Intensity | null
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
  vibeScore: number
  intensityScore: number
  budgetScore: number
  occasionScore: number
}

// --- Score individuel par critère ---

function scoreVibe(wine: Wine, vibe: Vibe): number {
  if (vibe === 'surprise') return 10 + Math.random() * 5 // random pondéré

  const vibes = wine.profil_vibes || []
  
  // Match direct dans profil_vibes
  if (vibes.includes(vibe)) return 40
  
  // Match partiel (le vin a une vibe proche)
  const related: Record<string, string[]> = {
    festif: ['frais', 'léger'],
    frais: ['festif', 'léger', 'fin'],
    fin: ['frais', 'élégant', 'minéral'],
    fruité: ['gourmand', 'rond', 'souple'],
    puissant: ['costaud', 'tannique', 'charpenté'],
    doux: ['moelleux', 'sucré'],
  }
  const relatedVibes = related[vibe] || []
  if (vibes.some(v => relatedVibes.includes(v))) return 25
  
  // Fallback sur le type de vin
  const allowedTypes = VIBE_TYPE_MAP[vibe]
  if (allowedTypes.includes(wine.type)) return 15
  
  return 0
}

function scoreIntensity(wine: Wine, intensity: Intensity): number {
  const vibes = wine.profil_vibes || []
  const expectedVibes = INTENSITY_VIBE_MAP[intensity]
  
  // Match direct
  if (vibes.some(v => expectedVibes.includes(v))) return 25
  
  // Heuristique par type si pas de vibes
  if (vibes.length === 0) {
    const typeIntensity: Record<string, Intensity> = {
      BULLE: 'léger',
      BLANC: 'léger',
      ROSÉ: 'léger',
      ROUGE: 'costaud',
      'DEMI-SEC': 'équilibré',
    }
    if (typeIntensity[wine.type] === intensity) return 15
    if (intensity === 'équilibré') return 10 // équilibré match un peu tout
  }
  
  return 0
}

function scoreBudget(wine: Wine, budget: Budget): number {
  const prix = wine.prix_vente
  
  if (budget === 'any') {
    // Pas de limite → léger bonus aux vins premium (belles bouteilles)
    if (prix >= 90) return 25
    if (prix >= 55) return 22
    return 18
  }
  
  const budgetDef = BUDGETS.find(b => b.id === budget)
  if (!budgetDef) return 0
  
  const [min, max] = budgetDef.range
  
  if (budget === 'plaisir') {
    // Se faire plaisir (>55€) → favoriser les vins 90-150€ aussi
    if (prix >= 90 && prix <= 150) return 25
    if (prix >= 55) return 20
    if (prix >= 45) return 10
    return 0
  }
  
  // Fourchettes classiques
  if (prix >= min && prix <= max) return 20
  
  // Proche (±10€) = score partiel
  const dist = prix < min ? min - prix : prix - max
  if (dist <= 10) return 10
  
  return 0
}

function scoreOccasion(wine: Wine, occasion: Occasion): number {
  const vibes = wine.profil_vibes || []
  const bevcost = wine.bevcost_pct || 50
  
  switch (occasion) {
    case 'fête':
      // Biais vers les belles bouteilles, prix élevé, histoire à raconter
      let feteScore = 0
      if (wine.prix_vente > 50) feteScore += 8
      if (wine.prix_vente > 80) feteScore += 5
      if (wine.cave_domains?.commentaire_domaine) feteScore += 3
      return feteScore
      
    case 'tranquille':
      // Valeur sûre, bon rapport, stock confortable
      let tranqScore = 0
      if (bevcost < 35) tranqScore += 5
      if (wine.quantite_stock > 3) tranqScore += 5
      if (wine.prix_vente < 50) tranqScore += 5
      return tranqScore
      
    case 'découverte':
      // Original, cépages rares, vins qu'on vend peu
      let decScore = 0
      if (vibes.includes('original') || vibes.includes('rare')) decScore += 8
      // Vins avec un stock élevé = moins vendus = plus "découverte"
      if (wine.quantite_stock > 6) decScore += 4
      // Certification bio/nature = souvent plus original
      if (wine.certification && wine.certification !== 'conventionnel') decScore += 3
      return decScore
      
    case 'soif':
      // Simple, prix bas, frais, léger
      let soifScore = 0
      if (wine.prix_vente < 35) soifScore += 5
      if (vibes.includes('frais') || vibes.includes('léger')) soifScore += 5
      if (wine.type === 'BLANC' || wine.type === 'ROSÉ') soifScore += 3
      return soifScore
      
    default:
      return 0
  }
}

// --- Bonus push (cave_brief_push, stock dormant) ---

function pushBonus(wine: Wine, pushWineIds: Set<string>): number {
  let bonus = 0
  if (pushWineIds.has(wine.id)) bonus += 10
  // Stock dormant (> 8 btl sans vibe 'rare') → léger bonus pour écouler
  if (wine.quantite_stock > 8 && !(wine.profil_vibes || []).includes('rare')) bonus += 3
  return bonus
}

// --- Filtres hard (affinages) ---

function passesRefinements(wine: Wine, filters: SommelierFilters): boolean {
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
// Pondération des régions adaptée au contexte de La Marine des Goudes (Marseille)
// Les clients d'un restaurant de bord de mer à Marseille cherchent en priorité
// du Provence, puis Bourgogne/Loire (gastronomie), Rhône (terroir proche), etc.
// Les régions très pointues (Alsace, Jura, Savoie) sont pénalisées car moins
// demandées par la clientèle classique d'un restaurant de bord de mer.

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
  // Cherche la correspondance exacte ou partielle
  for (const [key, weight] of Object.entries(REGION_WEIGHTS)) {
    if (region.toLowerCase().includes(key.toLowerCase())) return weight
  }
  // Régions non listées = score neutre
  return 3
}

// --- Moteur principal ---

export function scoreWines(
  wines: (Wine & { cave_domains?: { nom: string; commentaire_domaine: string | null } })[],
  filters: SommelierFilters,
  pushWineIds: Set<string> = new Set()
): ScoredWine[] {
  // Uniquement les vins en stock et actifs
  const available = wines.filter(w => w.quantite_stock > 0 && w.statut === 'actif')
  
  // Appliquer les filtres hard (affinages)
  const filtered = available.filter(w => passesRefinements(w, filters))
  
  // Si aucune question n'est encore répondue, retourner vide
  if (!filters.vibe) return []
  
  // Scorer chaque vin
  const scored: ScoredWineRaw[] = filtered.map(wine => {
    const vibeScore = filters.vibe ? scoreVibe(wine, filters.vibe) : 0
    const intensityScore = filters.intensity ? scoreIntensity(wine, filters.intensity) : 0
    const budgetScore = filters.budget ? scoreBudget(wine, filters.budget) : 0
    const occasionScore = filters.occasion ? scoreOccasion(wine, filters.occasion) : 0
    const push = pushBonus(wine, pushWineIds)
    
    return {
      wine,
      score: vibeScore + intensityScore + budgetScore + occasionScore + push + scoreRegion(wine),
      vibeScore,
      intensityScore,
      budgetScore,
      occasionScore,
    }
  })
  
  // Trier par score décroissant
  scored.sort((a, b) => b.score - a.score)
  
  if (scored.length === 0) return []
  
  // Sélectionner les 3 picks avec labels distincts
  const results: ScoredWine[] = []
  
  // 🎯 Meilleur accord = meilleur score global
  if (scored[0]) {
    results.push({
      wine: scored[0].wine,
      score: scored[0].score,
      label: 'accord',
      labelEmoji: '🎯',
      labelText: 'Meilleur accord',
    })
  }
  
  // 💎 Rapport qualité-prix = meilleur ratio score/prix parmi le top 10
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
  
  // ⭐ Coup de cœur Thibault = vin push OU prochain meilleur score
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

// --- Extraction des filtres disponibles depuis les vins ---

export function extractAvailableFilters(wines: Wine[]) {
  const active = wines.filter(w => w.quantite_stock > 0 && w.statut === 'actif')
  
  const regions = [...new Set(active.map(w => w.region).filter(Boolean))].sort()
  
  // Extraire les cépages individuels (parsés depuis le champ texte)
  const cepageSet = new Set<string>()
  active.forEach(w => {
    if (!w.cepage) return
    // Parse "60% Grenache, 30% Syrah" → ['Grenache', 'Syrah']
    w.cepage.split(/[,;]/).forEach(c => {
      const name = c.replace(/\d+%?\s*/g, '').trim()
      if (name.length > 1) cepageSet.add(name)
    })
  })
  const cepages = [...cepageSet].sort()
  
  // Extraire les plats depuis accords_carte
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
