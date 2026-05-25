'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { Wine } from '@/types'
import { WineColor, StyleOption, Budget, Occasion } from './lib/vibeMapping'
import { scoreWines, extractAvailableFilters, ScoredWine } from './lib/scoring'
import ColorSelector from './components/ColorSelector'
import StyleSelector from './components/StyleSelector'
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

  // Questions
  const [color, setColor] = useState<WineColor | null>(null)
  const [style, setStyle] = useState<StyleOption | null>(null)
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

  // Count wines per color
  const colorCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    wines.filter(w => w.quantite_stock > 0 && w.statut === 'actif').forEach(w => {
      counts[w.type] = (counts[w.type] || 0) + 1
    })
    return counts as Record<WineColor, number>
  }, [wines])

  // Available filters
  const availableFilters = useMemo(() => extractAvailableFilters(wines), [wines])

  // Scored results
  const results: ScoredWine[] = useMemo(() => {
    if (!color) return []
    return scoreWines(wines, { color, style, budget, occasion, regions, cepage, plat, bio }, pushWineIds)
  }, [wines, color, style, budget, occasion, regions, cepage, plat, bio, pushWineIds])

  const answered = [color, style, budget, occasion].filter(Boolean).length

  // Reset (clear style when color changes)
  const handleColorSelect = (c: WineColor) => {
    setColor(c)
    setStyle(null) // les styles changent selon la couleur
  }

  const handleReset = () => {
    setColor(null)
    setStyle(null)
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
        {/* Q1 — Couleur */}
        <ColorSelector selected={color} onSelect={handleColorSelect} counts={colorCounts} />

        {/* Q2 — Style (adapté à la couleur) */}
        {color && (
          <StyleSelector color={color} selected={style} onSelect={setStyle} />
        )}

        {/* Q3 — Budget */}
        {color && style && (
          <BudgetSelector selected={budget} onSelect={setBudget} />
        )}

        {/* Q4 — Occasion */}
        {color && style && budget && (
          <OccasionSelector selected={occasion} onSelect={setOccasion} />
        )}
      </div>

      {/* Results — dès que la couleur est choisie */}
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
              {answered}/4 critères
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

      {/* No results */}
      {color && results.length === 0 && answered >= 2 && (
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

      {/* AI Sommelier */}
      <AISommelier wines={wines} />
    </div>
  )
}
