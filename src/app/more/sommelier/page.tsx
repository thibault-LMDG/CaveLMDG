'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { Wine } from '@/types'
import { Vibe, Intensity, Budget, Occasion } from './lib/vibeMapping'
import { scoreWines, extractAvailableFilters, ScoredWine } from './lib/scoring'
import VibeSelector from './components/VibeSelector'
import IntensitySelector from './components/IntensitySelector'
import BudgetSelector from './components/BudgetSelector'
import OccasionSelector from './components/OccasionSelector'
import RefinementFilters from './components/RefinementFilters'
import WineResultCard from './components/WineResultCard'
import AISommelier from './components/AISommelier'

type WineWithDomain = Wine & { cave_domains?: { nom: string; commentaire_domaine: string | null } }

export default function SommelierPage() {
  const [wines, setWines] = useState<WineWithDomain[]>([])
  const [pushWineIds, setPushWineIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // 4 questions cœur
  const [vibe, setVibe] = useState<Vibe | null>(null)
  const [intensity, setIntensity] = useState<Intensity | null>(null)
  const [budget, setBudget] = useState<Budget | null>(null)
  const [occasion, setOccasion] = useState<Occasion | null>(null)

  // Affinages
  const [regions, setRegions] = useState<string[]>([])
  const [cepage, setCepage] = useState<string | null>(null)
  const [plat, setPlat] = useState<string | null>(null)
  const [bio, setBio] = useState(false)

  // Fetch wines + push wines
  useEffect(() => {
    async function load() {
      const [{ data: wineData }, { data: pushData }] = await Promise.all([
        supabase
          .from('cave_wines')
          .select('*, cave_domains(nom, commentaire_domaine)')
          .eq('statut', 'actif')
          .gt('quantite_stock', 0)
          .order('type')
          .order('region'),
        supabase
          .from('cave_brief_push')
          .select('wine_id')
          .gte('date_brief', new Date().toISOString().split('T')[0]),
      ])

      setWines((wineData || []) as WineWithDomain[])
      setPushWineIds(new Set((pushData || []).map(p => p.wine_id)))
      setLoading(false)
    }
    load()
  }, [])

  // Available filters
  const availableFilters = useMemo(() => extractAvailableFilters(wines), [wines])

  // Scored results
  const results: ScoredWine[] = useMemo(() => {
    if (!vibe) return []
    return scoreWines(wines, { vibe, intensity, budget, occasion, regions, cepage, plat, bio }, pushWineIds)
  }, [wines, vibe, intensity, budget, occasion, regions, cepage, plat, bio, pushWineIds])

  // Count how many questions answered (for progressive reveal)
  const answered = [vibe, intensity, budget, occasion].filter(Boolean).length

  // Reset
  const handleReset = () => {
    setVibe(null)
    setIntensity(null)
    setBudget(null)
    setOccasion(null)
    setRegions([])
    setCepage(null)
    setPlat(null)
    setBio(false)
  }

  if (loading) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: T.muted, marginTop: 40 }}>
        Chargement de la cave... 🍷
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link href="/more" style={{ color: T.muted, textDecoration: 'none', fontSize: 20 }}>‹</Link>
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, color: T.text }}>🍷 Sommelier</div>
          <div style={{ fontSize: 12, color: T.muted }}>{wines.length} vins en cave</div>
        </div>
        {answered > 0 && (
          <button
            onClick={handleReset}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              fontSize: 11,
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              color: T.muted,
              cursor: 'pointer',
            }}
          >
            Recommencer
          </button>
        )}
      </div>

      {/* Question flow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Q1 — Toujours visible */}
        <VibeSelector selected={vibe} onSelect={setVibe} />

        {/* Q2 — Après Q1 */}
        {vibe && (
          <IntensitySelector selected={intensity} onSelect={setIntensity} />
        )}

        {/* Q3 — Après Q2 */}
        {vibe && intensity && (
          <BudgetSelector selected={budget} onSelect={setBudget} />
        )}

        {/* Q4 — Après Q3 */}
        {vibe && intensity && budget && (
          <OccasionSelector selected={occasion} onSelect={setOccasion} />
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 500,
            color: T.gold,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>Nos recommandations</span>
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>
              {answered}/4 questions
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map(r => (
              <WineResultCard key={r.wine.id} result={r} />
            ))}
          </div>

          {/* Refinement filters */}
          <RefinementFilters
            regions={availableFilters.regions}
            cepages={availableFilters.cepages}
            plats={availableFilters.plats}
            selectedRegions={regions}
            selectedCepage={cepage}
            selectedPlat={plat}
            selectedBio={bio}
            onRegions={setRegions}
            onCepage={setCepage}
            onPlat={setPlat}
            onBio={setBio}
          />
        </div>
      )}

      {/* No results message */}
      {vibe && results.length === 0 && answered >= 2 && (
        <div style={{
          marginTop: 24,
          padding: 20,
          background: T.deep,
          borderRadius: 14,
          border: `0.5px solid ${T.border}`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤔</div>
          <div style={{ fontSize: 14, color: T.text, marginBottom: 4 }}>Aucun vin ne correspond</div>
          <div style={{ fontSize: 12, color: T.muted }}>Essaie d'élargir tes critères ou demande au sommelier IA</div>
        </div>
      )}

      {/* AI Sommelier — always visible at the bottom */}
      <AISommelier wines={wines} />
    </div>
  )
}
