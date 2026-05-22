'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { T, wineTypeEmoji } from '@/lib/theme'
import type { Wine } from '@/types'
import SearchBar from '@/components/SearchBar'
import FilterPills from '@/components/FilterPills'
import WineCard from '@/components/WineCard'

const WINE_TYPES = ['BLANC', 'ROUGE', 'ROSÉ', 'BULLE', 'DEMI-SEC']

export default function CavePage() {
  const [wines, setWines] = useState<(Wine & { cave_domains?: { nom: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'region' | 'prix' | 'stock'>('region')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('cave_wines')
        .select('*, cave_domains(nom)')
        .neq('statut', 'archive')
        .order('region')
        .order('prix_vente')
      setWines((data as typeof wines) || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = wines

    if (typeFilter) {
      result = result.filter((w) => w.type === typeFilter)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter((w) =>
        (w.cave_domains?.nom || '').toLowerCase().includes(q) ||
        (w.cuvee || '').toLowerCase().includes(q) ||
        (w.cepage || '').toLowerCase().includes(q) ||
        (w.region || '').toLowerCase().includes(q) ||
        (w.nom_appellation || '').toLowerCase().includes(q)
      )
    }

    if (sortBy === 'prix') {
      result = [...result].sort((a, b) => a.prix_vente - b.prix_vente)
    } else if (sortBy === 'stock') {
      result = [...result].sort((a, b) => a.quantite_stock - b.quantite_stock)
    }

    return result
  }, [wines, search, typeFilter, sortBy])

  // KPIs
  const totalRefs = wines.filter((w) => w.statut === 'actif').length
  const totalBtl = wines.reduce((s, w) => s + w.quantite_stock, 0)
  const lowStock = wines.filter((w) => w.quantite_stock > 0 && w.quantite_stock <= w.stock_minimum).length

  return (
    <div style={{ padding: '16px 16px 0' }}>
      {/* Title */}
      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 16 }}>
        Cave
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Références', value: totalRefs, color: T.gold },
          { label: 'Bouteilles', value: totalBtl, color: T.teal },
          { label: 'Stock bas', value: lowStock, color: lowStock > 0 ? T.down : T.up },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              flex: 1,
              background: T.deep,
              borderRadius: 10,
              padding: '10px 12px',
              border: `0.5px solid ${T.border}`,
            }}
          >
            <div style={{ fontSize: 10, color: T.muted, fontWeight: 400, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color: kpi.color, marginTop: 2 }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <SearchBar value={search} onChange={setSearch} />

      {/* Filters */}
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <FilterPills
          options={WINE_TYPES.map((t) => `${wineTypeEmoji[t] || ''} ${t}`)}
          selected={typeFilter ? `${wineTypeEmoji[typeFilter] || ''} ${typeFilter}` : null}
          onSelect={(v) => setTypeFilter(v ? v.split(' ').pop()! : null)}
        />
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, fontSize: 11, color: T.muted }}>
        {(['region', 'prix', 'stock'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            style={{
              background: 'none',
              border: 'none',
              color: sortBy === s ? T.text2 : T.muted,
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: sortBy === s ? 500 : 400,
              textDecoration: sortBy === s ? 'underline' : 'none',
              textUnderlineOffset: 3,
              padding: 0,
            }}
          >
            {s === 'region' ? 'Par région' : s === 'prix' ? 'Par prix' : 'Par stock'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto' }}>{filtered.length} vins</span>
      </div>

      {/* Wine list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Aucun vin trouvé</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((wine) => (
            <WineCard key={wine.id} wine={wine} />
          ))}
        </div>
      )}

      {/* FAB — Ajouter un vin */}
      <Link
        href="/cave/new"
        style={{
          position: 'fixed',
          bottom: 76,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: T.gold,
          color: T.sea,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          fontWeight: 300,
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          zIndex: 30,
        }}
      >
        +
      </Link>
    </div>
  )
}
