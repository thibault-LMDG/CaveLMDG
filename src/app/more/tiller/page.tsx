'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T, wineTypeColor } from '@/lib/theme'
import type { Wine } from '@/types'
import SearchBar from '@/components/SearchBar'

interface CatalogProduct {
  tiller_product_id: number
  name: string
  category_name: string
  category_type: string
  product_type: string
  price: number
  is_active: boolean
}

interface Mapping {
  id: string
  tiller_product_name: string
  tiller_product_id: number | null
  wine_id: string | null
  is_au_verre: boolean
}

type WineWithDomain = Wine & { cave_domains?: { nom: string } }

// === Auto-matching logic ===
// Tiller names follow: "Domaine Cuvee - Type" (Blc/Rge/Rose/Bulle/Doux/Champ)
// We score based on matching words from domaine + cuvée
function normalizeStr(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getTypeAbbrev(wineType: string): string {
  const map: Record<string, string> = {
    'BLANC': 'blc', 'ROUGE': 'rge', 'ROSÉ': 'rose', 'BULLE': 'bulle', 'DEMI-SEC': 'doux'
  }
  return map[wineType] || ''
}

const WINE_CATEGORIES = new Set([
  'Blancs New', 'Blancs', 'Rouges', 'Rouges New', 'Rose', 'Rose New',
  'Champagnes', 'Bulles New', 'Vin Verre'
])

function scoreTillerMatch(wine: WineWithDomain, tillerProduct: CatalogProduct): number {
  const domaine = normalizeStr(wine.cave_domains?.nom || '')
  const cuvee = normalizeStr(wine.cuvee || '')
  const tillerName = normalizeStr(tillerProduct.name)
  const wineTypeAbbr = getTypeAbbrev(wine.type)

  let score = 0

  // Type check (blc/rge/rose/bulle) — must match for non-verre products
  if (wineTypeAbbr && tillerName.includes(wineTypeAbbr)) score += 10
  else if (wineTypeAbbr && !tillerName.endsWith('champ')) score -= 20

  // Price match — boost if same price (strong signal)
  const priceDiff = Math.abs(wine.prix_vente - tillerProduct.price)
  if (priceDiff === 0) score += 15
  else if (priceDiff <= 2) score += 8
  else if (priceDiff <= 5) score += 3

  // Domaine words matching
  const domaineWords = domaine.split(' ').filter(w => w.length > 2)
  for (const word of domaineWords) {
    if (tillerName.includes(word)) score += 5
  }

  // Cuvée words matching
  const cuveeWords = cuvee.split(' ').filter(w => w.length > 2)
  for (const word of cuveeWords) {
    if (tillerName.includes(word)) score += 4
  }

  return score
}

function findBestMatch(wine: WineWithDomain, catalog: CatalogProduct[]): { product: CatalogProduct; score: number } | null {
  // Only consider wine categories
  const wineCatalog = catalog.filter(p => WINE_CATEGORIES.has(p.category_name) && p.is_active)
  if (wineCatalog.length === 0) return null

  let best: CatalogProduct | null = null
  let bestScore = 0

  for (const p of wineCatalog) {
    const s = scoreTillerMatch(wine, p)
    if (s > bestScore) { bestScore = s; best = p }
  }

  return best && bestScore >= 15 ? { product: best, score: bestScore } : null
}

export default function TillerMappingPage() {
  const router = useRouter()
  const [catalog, setCatalog] = useState<CatalogProduct[]>([])
  const [wines, setWines] = useState<WineWithDomain[]>([])
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'mapped' | 'unmapped'>('all')
  const [editingWine, setEditingWine] = useState<string | null>(null)
  const [tillerSearch, setTillerSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const [catalogRes, wineRes, mappingRes] = await Promise.all([
      supabase.from('cave_tiller_catalog').select('tiller_product_id, name, category_name, category_type, product_type, price, is_active').eq('is_active', true),
      supabase.from('cave_wines').select('*, cave_domains(nom)').neq('statut', 'archive').order('type').order('region'),
      supabase.from('cave_tiller_mapping').select('*'),
    ])
    setCatalog((catalogRes.data as CatalogProduct[]) || [])
    setWines((wineRes.data as WineWithDomain[]) || [])
    setMappings((mappingRes.data as Mapping[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Index mappings by wine_id
  const mappingByWine = useMemo(() => {
    const map: Record<string, Mapping> = {}
    for (const m of mappings) { if (m.wine_id) map[m.wine_id] = m }
    return map
  }, [mappings])

  // Index catalog by tiller_product_id
  const catalogById = useMemo(() => {
    const map: Record<number, CatalogProduct> = {}
    for (const p of catalog) map[p.tiller_product_id] = p
    return map
  }, [catalog])

  // Already mapped tiller IDs (to show which are taken)
  const mappedTillerIds = useMemo(() => new Set(mappings.map(m => m.tiller_product_id).filter(Boolean)), [mappings])

  const mapped = wines.filter(w => mappingByWine[w.id])
  const unmapped = wines.filter(w => !mappingByWine[w.id])

  const filtered = wines.filter(w => {
    if (filter === 'mapped' && !mappingByWine[w.id]) return false
    if (filter === 'unmapped' && mappingByWine[w.id]) return false
    if (search) {
      const q = search.toLowerCase()
      const domaine = (w.cave_domains?.nom || '').toLowerCase()
      const cuvee = (w.cuvee || '').toLowerCase()
      if (!domaine.includes(q) && !cuvee.includes(q) && !w.region.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Filtered catalog for selection panel
  const filteredCatalog = useMemo(() => {
    const wineCat = catalog.filter(p => WINE_CATEGORIES.has(p.category_name) && p.is_active)
    if (!tillerSearch) return wineCat
    const q = tillerSearch.toLowerCase()
    return wineCat.filter(p => p.name.toLowerCase().includes(q))
  }, [catalog, tillerSearch])

  async function mapWineToProduct(wineId: string, product: CatalogProduct, isAuVerre: boolean) {
    setSaving(true)
    const existing = mappingByWine[wineId]
    if (existing) {
      await supabase.from('cave_tiller_mapping')
        .update({ tiller_product_name: product.name, tiller_product_id: product.tiller_product_id, wine_id: wineId, is_au_verre: isAuVerre })
        .eq('id', existing.id)
    } else {
      await supabase.from('cave_tiller_mapping')
        .insert({ tiller_product_name: product.name, tiller_product_id: product.tiller_product_id, wine_id: wineId, is_au_verre: isAuVerre })
    }
    setEditingWine(null)
    setTillerSearch('')
    setSaving(false)
    loadData()
  }

  async function unmapWine(wineId: string) {
    const existing = mappingByWine[wineId]
    if (existing) {
      await supabase.from('cave_tiller_mapping').delete().eq('id', existing.id)
      loadData()
    }
  }

  const typeEmoji: Record<string, string> = { BLANC: '⚪', ROUGE: '🔴', ROSÉ: '🩷', BULLE: '🫧', 'DEMI-SEC': '🍯' }

  return (
    <div style={{ padding: '16px 16px 80px', minHeight: '100vh', background: T.sea }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Retour</button>

      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 4 }}>Mapping Tiller</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Associer les vins de la cave aux produits de la caisse</div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Vins cave</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.gold, marginTop: 2 }}>{wines.length}</div>
        </div>
        <div style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mappés</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.up, marginTop: 2 }}>{mapped.length}</div>
        </div>
        <div style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Non liés</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: unmapped.length > 0 ? T.down : T.up, marginTop: 2 }}>{unmapped.length}</div>
        </div>
        <div style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Produits Tiller</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.teal, marginTop: 2 }}>{catalog.filter(p => WINE_CATEGORIES.has(p.category_name)).length}</div>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Chercher un vin de la cave…" />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12, marginBottom: 14 }}>
        {([['all', 'Tous'], ['unmapped', 'Non liés'], ['mapped', 'Mappés']] as [string, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key as typeof filter)}
            style={{
              padding: '5px 12px', borderRadius: 16, fontSize: 12,
              border: `0.5px solid ${filter === key ? T.gold + '60' : T.border}`,
              background: filter === key ? T.gold + '18' : 'transparent',
              color: filter === key ? T.gold : T.text2, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Chargement…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((wine) => {
            const mapping = mappingByWine[wine.id]
            const linkedProduct = mapping?.tiller_product_id ? catalogById[mapping.tiller_product_id] : null
            const isEditing = editingWine === wine.id
            const suggestion = !mapping ? findBestMatch(wine, catalog) : null

            return (
              <div key={wine.id} style={{
                background: T.deep, borderRadius: 10, border: `0.5px solid ${T.border}`,
                borderLeft: `3px solid ${mapping ? T.up : suggestion ? T.gold : T.down}`,
                overflow: 'hidden',
              }}>
                {/* Wine header */}
                <div
                  style={{ padding: '12px 14px', cursor: 'pointer' }}
                  onClick={() => {
                    if (isEditing) { setEditingWine(null); setTillerSearch('') }
                    else { setEditingWine(wine.id); setTillerSearch('') }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{typeEmoji[wine.type] || '🍷'}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wine.cave_domains?.nom || '—'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>
                        {wine.cuvee || wine.nom_appellation} · {wine.prix_vente}€
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                      {mapping ? (
                        <>
                          <div style={{ fontSize: 11, color: T.up, fontWeight: 500 }}>✓ Mappé</div>
                          <div style={{ fontSize: 10, color: T.muted, marginTop: 1, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mapping.tiller_product_name}
                            {mapping.is_au_verre ? ' 🥂' : ''}
                          </div>
                        </>
                      ) : suggestion ? (
                        <div style={{ fontSize: 11, color: T.gold }}>💡 Suggestion</div>
                      ) : (
                        <div style={{ fontSize: 11, color: T.down }}>⚠ Non lié</div>
                      )}
                    </div>
                  </div>

                  {/* Auto-suggestion preview (non-editing) */}
                  {!isEditing && !mapping && suggestion && (
                    <div style={{
                      marginTop: 8, padding: '8px 10px', borderRadius: 8,
                      background: T.gold + '0a', border: `0.5px solid ${T.gold}25`,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 12, color: T.gold, fontWeight: 500 }}>{suggestion.product.name}</div>
                        <div style={{ fontSize: 10, color: T.muted }}>{suggestion.product.category_name} · {suggestion.product.price}€</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          mapWineToProduct(wine.id, suggestion.product, wine.au_verre)
                        }}
                        disabled={saving}
                        style={{
                          padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                          background: T.gold + '20', border: `0.5px solid ${T.gold}40`,
                          color: T.gold, cursor: 'pointer',
                        }}
                      >
                        Lier
                      </button>
                    </div>
                  )}
                </div>

                {/* Editing panel */}
                {isEditing && (
                  <div style={{ padding: '0 14px 14px', borderTop: `0.5px solid ${T.border}20` }}>
                    {/* Current mapping info */}
                    {mapping && linkedProduct && (
                      <div style={{
                        marginTop: 10, padding: '8px 10px', borderRadius: 8,
                        background: T.up + '0a', border: `0.5px solid ${T.up}25`,
                      }}>
                        <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Produit Tiller actuel :</div>
                        <div style={{ fontSize: 13, color: T.up, fontWeight: 500 }}>{linkedProduct.name}</div>
                        <div style={{ fontSize: 10, color: T.text2 }}>
                          {linkedProduct.category_name} · {linkedProduct.price}€ · ID {linkedProduct.tiller_product_id}
                          {mapping.is_au_verre ? ' · 🥂 au verre' : ' · 🍾 bouteille'}
                        </div>
                      </div>
                    )}

                    {/* Search Tiller products */}
                    <input
                      type="text"
                      value={tillerSearch}
                      onChange={(e) => setTillerSearch(e.target.value)}
                      placeholder="Chercher un produit Tiller…"
                      autoFocus
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: `0.5px solid ${T.border}`, background: T.sea,
                        color: T.text, fontSize: 13, outline: 'none', marginTop: 10, marginBottom: 6,
                        boxSizing: 'border-box',
                      }}
                    />

                    {/* Suggestion banner at top of list */}
                    {!tillerSearch && !mapping && suggestion && (
                      <div style={{
                        padding: '8px 10px', marginBottom: 4, borderRadius: 8,
                        background: T.gold + '10', border: `0.5px solid ${T.gold}30`,
                      }}>
                        <div style={{ fontSize: 10, color: T.gold, marginBottom: 4, fontWeight: 500 }}>💡 Meilleure correspondance :</div>
                        <button
                          onClick={() => mapWineToProduct(wine.id, suggestion.product, wine.au_verre)}
                          disabled={saving}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '6px 8px', background: 'transparent',
                            border: 'none', color: T.text, fontSize: 12, cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 500 }}>{suggestion.product.name}</div>
                            <div style={{ fontSize: 11, color: T.text2 }}>{suggestion.product.category_name} · {suggestion.product.price}€</div>
                          </div>
                          <span style={{ color: T.gold, fontSize: 11, fontWeight: 500 }}>Lier →</span>
                        </button>
                      </div>
                    )}

                    {/* Product list */}
                    <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                      {filteredCatalog.slice(0, 20).map((p) => {
                        const isCurrentlyMapped = mappedTillerIds.has(p.tiller_product_id)
                        const isThisWine = mapping?.tiller_product_id === p.tiller_product_id
                        return (
                          <button
                            key={p.tiller_product_id}
                            onClick={() => mapWineToProduct(wine.id, p, wine.au_verre)}
                            disabled={saving || isThisWine}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                              padding: '8px 10px', background: isThisWine ? T.up + '08' : 'transparent',
                              border: 'none', borderBottom: `0.5px solid ${T.border}15`,
                              color: T.text, fontSize: 12, cursor: isThisWine ? 'default' : 'pointer',
                              textAlign: 'left', opacity: (isCurrentlyMapped && !isThisWine) ? 0.5 : 1,
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500 }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: T.text2 }}>
                                {p.category_name} · {p.price}€
                                {isCurrentlyMapped && !isThisWine && <span style={{ marginLeft: 4, color: T.muted }}>(déjà lié)</span>}
                              </div>
                            </div>
                            {isThisWine && <span style={{ fontSize: 11, color: T.up }}>✓ actif</span>}
                          </button>
                        )
                      })}
                    </div>

                    {/* Unmap button */}
                    {mapping && (
                      <button
                        onClick={() => unmapWine(wine.id)}
                        style={{
                          width: '100%', padding: '8px 0', borderRadius: 8, border: 'none',
                          background: T.rose + '12', color: T.rose, fontSize: 12,
                          cursor: 'pointer', marginTop: 8,
                        }}
                      >
                        Dissocier ce produit Tiller
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
