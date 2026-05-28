'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { T, wineTypeEmoji, wineTypeColor } from '@/lib/theme'
import type { Wine } from '@/types'
import SearchBar from '@/components/SearchBar'
import FilterPills from '@/components/FilterPills'
import WineCard from '@/components/WineCard'

const WINE_TYPES = ['BLANC', 'ROUGE', 'ROSÉ', 'BULLE', 'DEMI-SEC']
type ViewMode = 'normal' | 'reappro' | 'inventaire'

export default function CavePage() {
  const [wines, setWines] = useState<(Wine & { cave_domains?: { nom: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'region' | 'prix' | 'stock'>('region')
  const [mode, setMode] = useState<ViewMode>('normal')

  // Batch edit state
  const [edits, setEdits] = useState<Record<string, { stock_critique?: number; commande_standard?: number; quantite_stock?: number }>>({})
  const [savingBatch, setSavingBatch] = useState(false)
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    loadWines()
  }, [])

  async function loadWines() {
    const { data } = await supabase
      .from('cave_wines')
      .select('*, cave_domains(nom)')
      .neq('statut', 'archive')
      .order('region')
      .order('prix_vente')
    setWines((data as typeof wines) || [])
    setLoading(false)
  }

  function switchMode(newMode: ViewMode) {
    if (mode === newMode) {
      setMode('normal')
    } else {
      setMode(newMode)
    }
    setEdits({})
    setSavedCount(0)
  }

  function updateEdit(wineId: string, field: string, value: number) {
    setEdits((prev) => ({
      ...prev,
      [wineId]: { ...prev[wineId], [field]: value },
    }))
  }

  async function saveBatch() {
    const entries = Object.entries(edits).filter(([, v]) => Object.keys(v).length > 0)
    if (entries.length === 0) return
    setSavingBatch(true)

    if (mode === 'reappro') {
      for (const [wineId, changes] of entries) {
        await supabase.from('cave_wines').update({
          ...(changes.stock_critique !== undefined && { stock_critique: changes.stock_critique }),
          ...(changes.commande_standard !== undefined && { commande_standard: changes.commande_standard }),
        }).eq('id', wineId)
      }
    } else if (mode === 'inventaire') {
      for (const [wineId, changes] of entries) {
        if (changes.quantite_stock !== undefined) {
          const wine = wines.find((w) => w.id === wineId)
          if (!wine) continue
          const diff = changes.quantite_stock - wine.quantite_stock
          if (diff !== 0) {
            await supabase.from('cave_stock_movements').insert({
              wine_id: wineId,
              type: 'inventaire',
              quantite: diff,
              motif: 'Inventaire batch',
            })
          }
        }
      }
    }

    setSavedCount(entries.length)
    setEdits({})
    await loadWines()
    setSavingBatch(false)
  }

  const filtered = useMemo(() => {
    let result = wines
    if (typeFilter) result = result.filter((w) => w.type === typeFilter)
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
    if (sortBy === 'prix') result = [...result].sort((a, b) => a.prix_vente - b.prix_vente)
    else if (sortBy === 'stock') result = [...result].sort((a, b) => a.quantite_stock - b.quantite_stock)
    return result
  }, [wines, search, typeFilter, sortBy])

  const totalRefs = wines.filter((w) => w.statut === 'actif').length
  const totalBtl = wines.reduce((s, w) => s + w.quantite_stock, 0)
  const toReorder = wines.filter((w) => w.quantite_stock <= w.stock_critique && w.quantite_stock >= 0).length
  const editCount = Object.keys(edits).length

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 16 }}>Cave</div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Références', value: totalRefs, color: T.gold },
          { label: 'Bouteilles', value: totalBtl, color: T.teal },
          { label: 'À commander', value: toReorder, color: toReorder > 0 ? T.down : T.up },
        ].map((kpi) => (
          <div key={kpi.label} style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: T.muted, fontWeight: 400, textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.label}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: kpi.color, marginTop: 2 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Mode switcher */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {([
          { key: 'normal', label: '📋 Liste', color: T.text2 },
          { key: 'reappro', label: '📦 Réappro', color: T.gold },
          { key: 'inventaire', label: '🔢 Inventaire', color: T.teal },
        ] as { key: ViewMode; label: string; color: string }[]).map((m) => (
          <button
            key={m.key}
            onClick={() => switchMode(m.key)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: mode === m.key ? 600 : 400,
              border: `0.5px solid ${mode === m.key ? m.color + '60' : T.border}`,
              background: mode === m.key ? m.color + '15' : 'transparent',
              color: mode === m.key ? m.color : T.muted,
              cursor: 'pointer',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <FilterPills
          options={WINE_TYPES.map((t) => `${wineTypeEmoji[t] || ''} ${t}`)}
          selected={typeFilter ? `${wineTypeEmoji[typeFilter] || ''} ${typeFilter}` : null}
          onSelect={(v) => setTypeFilter(v ? v.split(' ').pop()! : null)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, fontSize: 11, color: T.muted }}>
        {(['region', 'prix', 'stock'] as const).map((s) => (
          <button key={s} onClick={() => setSortBy(s)}
            style={{ background: 'none', border: 'none', color: sortBy === s ? T.text2 : T.muted, fontSize: 11, cursor: 'pointer', fontWeight: sortBy === s ? 500 : 400, textDecoration: sortBy === s ? 'underline' : 'none', textUnderlineOffset: 3, padding: 0 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: mode === 'normal' ? 8 : 4 }}>
          {filtered.map((wine) => {
            if (mode === 'normal') return <WineCard key={wine.id} wine={wine} />

            const borderColor = wineTypeColor[wine.type] || T.gold
            const edited = edits[wine.id]

            if (mode === 'reappro') {
              const critique = edited?.stock_critique ?? wine.stock_critique
              const commande = edited?.commande_standard ?? wine.commande_standard
              const needsOrder = wine.quantite_stock <= critique
              return (
                <div key={wine.id} style={{
                  background: T.deep, borderRadius: 10, borderLeft: `3px solid ${borderColor}`,
                  padding: '10px 12px', border: `0.5px solid ${T.border}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {wine.cave_domains?.nom || '—'} <span style={{ color: T.text2, fontWeight: 400 }}>· {wine.cuvee || wine.nom_appellation || ''}</span>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: needsOrder ? T.down : T.up, fontWeight: 500 }}>
                        {wine.quantite_stock} btl
                      </span>
                      {needsOrder && (
                        <span style={{ fontSize: 10, background: T.down + '20', color: T.down, padding: '2px 6px', borderRadius: 6, fontWeight: 500 }}>
                          ⚠️ {commande}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: T.muted, display: 'block', marginBottom: 2 }}>Seuil critique</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={() => updateEdit(wine.id, 'stock_critique', Math.max(0, critique - 1))}
                          style={{ width: 28, height: 28, borderRadius: 6, background: T.surface, border: `0.5px solid ${T.border}`, color: T.text2, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontSize: 15, fontWeight: 500, color: edited?.stock_critique !== undefined ? T.gold : T.text, width: 32, textAlign: 'center' }}>{critique}</span>
                        <button onClick={() => updateEdit(wine.id, 'stock_critique', critique + 1)}
                          style={{ width: 28, height: 28, borderRadius: 6, background: T.surface, border: `0.5px solid ${T.border}`, color: T.text2, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 10, color: T.muted, display: 'block', marginBottom: 2 }}>Commande (×6)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={() => updateEdit(wine.id, 'commande_standard', Math.max(6, commande - 6))}
                          style={{ width: 28, height: 28, borderRadius: 6, background: T.surface, border: `0.5px solid ${T.border}`, color: T.text2, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontSize: 15, fontWeight: 500, color: edited?.commande_standard !== undefined ? T.gold : T.text, width: 32, textAlign: 'center' }}>{commande}</span>
                        <button onClick={() => updateEdit(wine.id, 'commande_standard', commande + 6)}
                          style={{ width: 28, height: 28, borderRadius: 6, background: T.surface, border: `0.5px solid ${T.border}`, color: T.text2, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            if (mode === 'inventaire') {
              const currentStock = edited?.quantite_stock ?? wine.quantite_stock
              const hasChanged = edited?.quantite_stock !== undefined && edited.quantite_stock !== wine.quantite_stock
              return (
                <div key={wine.id} style={{
                  background: T.deep, borderRadius: 10, borderLeft: `3px solid ${borderColor}`,
                  padding: '10px 12px', border: `0.5px solid ${T.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {wine.cave_domains?.nom || '—'} <span style={{ color: T.text2, fontWeight: 400 }}>· {wine.cuvee || wine.nom_appellation || ''}</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      Avant : {wine.quantite_stock} btl
                      {hasChanged && <span style={{ color: T.gold, marginLeft: 6 }}>→ {currentStock}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => updateEdit(wine.id, 'quantite_stock', Math.max(0, currentStock - 1))}
                      style={{ width: 32, height: 32, borderRadius: 8, background: T.surface, border: `0.5px solid ${T.border}`, color: T.text2, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <input
                      type="number"
                      value={currentStock}
                      onChange={(e) => updateEdit(wine.id, 'quantite_stock', Math.max(0, parseInt(e.target.value) || 0))}
                      style={{
                        width: 48, height: 32, textAlign: 'center', borderRadius: 8,
                        border: `0.5px solid ${hasChanged ? T.gold + '60' : T.border}`,
                        background: hasChanged ? T.gold + '10' : T.sea,
                        color: hasChanged ? T.gold : T.text,
                        fontSize: 15, fontWeight: 500, outline: 'none',
                      }}
                    />
                    <button onClick={() => updateEdit(wine.id, 'quantite_stock', currentStock + 1)}
                      style={{ width: 32, height: 32, borderRadius: 8, background: T.surface, border: `0.5px solid ${T.border}`, color: T.text2, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )
            }

            return null
          })}
        </div>
      )}

      {/* Batch save bar */}
      {mode !== 'normal' && (
        <div style={{
          position: 'fixed', bottom: 64, left: 0, right: 0,
          padding: '10px 16px', zIndex: 30,
          background: T.sea + 'f0', borderTop: `0.5px solid ${T.border}`,
          backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1, fontSize: 12, color: T.muted }}>
            {savedCount > 0 && editCount === 0
              ? <span style={{ color: T.up }}>✓ {savedCount} vin{savedCount > 1 ? 's' : ''} mis à jour</span>
              : editCount > 0
                ? <span style={{ color: T.gold }}>{editCount} modification{editCount > 1 ? 's' : ''}</span>
                : <span>{mode === 'reappro' ? 'Ajustez les seuils et commandes' : 'Ajustez les stocks réels'}</span>
            }
          </div>
          <button
            onClick={saveBatch}
            disabled={editCount === 0 || savingBatch}
            style={{
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: editCount === 0 ? T.surface : T.gold,
              color: editCount === 0 ? T.muted : T.sea,
              fontSize: 13, fontWeight: 600, cursor: editCount === 0 ? 'default' : 'pointer',
              opacity: savingBatch ? 0.7 : 1,
            }}
          >
            {savingBatch ? 'Sauvegarde…' : `Sauvegarder${editCount > 0 ? ` (${editCount})` : ''}`}
          </button>
        </div>
      )}

      {/* FAB — Ajouter un vin (only in normal mode) */}
      {mode === 'normal' && (
        <Link
          href="/cave/new"
          style={{
            position: 'fixed', bottom: 76, right: 20,
            width: 52, height: 52, borderRadius: 26,
            background: T.gold, color: T.sea,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 300, textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)', zIndex: 30,
          }}
        >+</Link>
      )}
    </div>
  )
}
