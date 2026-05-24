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
  tiller_verre_product_name: string | null
  tiller_verre_product_id: number | null
  wine_id: string | null
  is_au_verre: boolean
}

type WineWithDomain = Wine & { cave_domains?: { nom: string } }

// === Auto-matching logic ===
function normalizeStr(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`]/g, ' ').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function getTypeAbbrev(wineType: string): string {
  const map: Record<string, string> = { 'BLANC': 'blc', 'ROUGE': 'rge', 'ROSÉ': 'rose', 'BULLE': 'bulle', 'DEMI-SEC': 'doux' }
  return map[wineType] || ''
}

const WINE_CATEGORIES = new Set([
  'Blancs New', 'Blancs', 'Rouges', 'Rouges New', 'Rose', 'Rose New',
  'Champagnes', 'Bulles New', 'Vin Verre'
])

const BTL_CATEGORIES = new Set([
  'Blancs New', 'Blancs', 'Rouges', 'Rouges New', 'Rose', 'Rose New',
  'Champagnes', 'Bulles New'
])

function scoreTillerMatch(wine: WineWithDomain, tillerProduct: CatalogProduct): number {
  const domaine = normalizeStr(wine.cave_domains?.nom || '')
  const cuvee = normalizeStr(wine.cuvee || '')
  const tillerName = normalizeStr(tillerProduct.name)
  const wineTypeAbbr = getTypeAbbrev(wine.type)
  let score = 0
  if (wineTypeAbbr && tillerName.includes(wineTypeAbbr)) score += 10
  else if (wineTypeAbbr && !tillerName.endsWith('champ')) score -= 20
  const priceDiff = Math.abs(wine.prix_vente - tillerProduct.price)
  if (priceDiff === 0) score += 15
  else if (priceDiff <= 2) score += 8
  else if (priceDiff <= 5) score += 3
  const domaineWords = domaine.split(' ').filter(w => w.length > 2)
  for (const word of domaineWords) { if (tillerName.includes(word)) score += 5 }
  const cuveeWords = cuvee.split(' ').filter(w => w.length > 2)
  for (const word of cuveeWords) { if (tillerName.includes(word)) score += 4 }
  return score
}

function findBestMatch(wine: WineWithDomain, catalog: CatalogProduct[], categories: Set<string>): { product: CatalogProduct; score: number } | null {
  const filtered = catalog.filter(p => categories.has(p.category_name) && p.is_active)
  let best: CatalogProduct | null = null, bestScore = 0
  for (const p of filtered) { const s = scoreTillerMatch(wine, p); if (s > bestScore) { bestScore = s; best = p } }
  return best && bestScore >= 15 ? { product: best, score: bestScore } : null
}

function findVerreMatch(wine: WineWithDomain, catalog: CatalogProduct[]): CatalogProduct | null {
  const verreProducts = catalog.filter(p => p.category_name === 'Vin Verre' && p.is_active)
  const tillerName = normalizeStr(wine.cave_domains?.nom || '')
  const typeAbbr = getTypeAbbrev(wine.type)
  let best: CatalogProduct | null = null, bestScore = 0
  for (const p of verreProducts) {
    const pName = normalizeStr(p.name)
    let score = 0
    const domaineWords = tillerName.split(' ').filter(w => w.length > 2)
    for (const word of domaineWords) { if (pName.includes(word)) score += 5 }
    if (typeAbbr && pName.includes(typeAbbr)) score += 10
    if (wine.prix_verre && Math.abs(wine.prix_verre - p.price) <= 1) score += 15
    if (score > bestScore) { bestScore = score; best = p }
  }
  return best && bestScore >= 10 ? best : null
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
  const [editingField, setEditingField] = useState<'btl' | 'verre'>('btl')
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

  const mappingByWine = useMemo(() => {
    const map: Record<string, Mapping> = {}
    for (const m of mappings) { if (m.wine_id) map[m.wine_id] = m }
    return map
  }, [mappings])

  const catalogById = useMemo(() => {
    const map: Record<number, CatalogProduct> = {}
    for (const p of catalog) map[p.tiller_product_id] = p
    return map
  }, [catalog])

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

  const filteredCatalog = useMemo(() => {
    const cats = editingField === 'verre' ? new Set(['Vin Verre']) : BTL_CATEGORIES
    const wineCat = catalog.filter(p => cats.has(p.category_name) && p.is_active)
    if (!tillerSearch) return wineCat
    const q = tillerSearch.toLowerCase()
    return wineCat.filter(p => p.name.toLowerCase().includes(q))
  }, [catalog, tillerSearch, editingField])

  async function mapProduct(wineId: string, product: CatalogProduct, field: 'btl' | 'verre') {
    setSaving(true)
    const existing = mappingByWine[wineId]
    const updates = field === 'verre'
      ? { tiller_verre_product_name: product.name, tiller_verre_product_id: product.tiller_product_id }
      : { tiller_product_name: product.name, tiller_product_id: product.tiller_product_id, wine_id: wineId, is_au_verre: false }
    if (existing) {
      await supabase.from('cave_tiller_mapping').update(updates).eq('id', existing.id)
    } else {
      await supabase.from('cave_tiller_mapping').insert({ ...updates, wine_id: wineId, tiller_product_name: product.name, tiller_product_id: product.tiller_product_id })
    }
    setEditingWine(null); setTillerSearch(''); setSaving(false); loadData()
  }

  async function unmapField(wineId: string, field: 'btl' | 'verre') {
    const existing = mappingByWine[wineId]
    if (!existing) return
    if (field === 'verre') {
      await supabase.from('cave_tiller_mapping').update({ tiller_verre_product_name: null, tiller_verre_product_id: null }).eq('id', existing.id)
    } else {
      await supabase.from('cave_tiller_mapping').delete().eq('id', existing.id)
    }
    loadData()
  }

  const typeEmoji: Record<string, string> = { BLANC: '⚪', ROUGE: '🔴', ROSÉ: '🩷', BULLE: '🫧', 'DEMI-SEC': '🍯' }

  return (
    <div style={{ padding: '16px 16px 80px', minHeight: '100vh', background: T.sea }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Retour</button>
      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 4 }}>Mapping Tiller</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Associer les vins de la cave aux produits de la caisse</div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Vins cave', value: wines.length, color: T.gold },
          { label: 'Mappés', value: mapped.length, color: T.up },
          { label: 'Non liés', value: unmapped.length, color: unmapped.length > 0 ? T.down : T.up },
          { label: 'Produits', value: catalog.filter(p => WINE_CATEGORIES.has(p.category_name)).length, color: T.teal },
        ].map((kpi) => (
          <div key={kpi.label} style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.label}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: kpi.color, marginTop: 2 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Chercher un vin de la cave…" />

      <div style={{ display: 'flex', gap: 6, marginTop: 12, marginBottom: 14 }}>
        {([['all', 'Tous'], ['unmapped', 'Non liés'], ['mapped', 'Mappés']] as [string, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key as typeof filter)} style={{
            padding: '5px 12px', borderRadius: 16, fontSize: 12,
            border: `0.5px solid ${filter === key ? T.gold + '60' : T.border}`,
            background: filter === key ? T.gold + '18' : 'transparent',
            color: filter === key ? T.gold : T.text2, cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Chargement…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((wine) => {
            const mapping = mappingByWine[wine.id]
            const btlProduct = mapping?.tiller_product_id ? catalogById[mapping.tiller_product_id] : null
            const verreProduct = mapping?.tiller_verre_product_id ? catalogById[mapping.tiller_verre_product_id] : null
            const isEditing = editingWine === wine.id
            const suggestion = !mapping ? findBestMatch(wine, catalog, BTL_CATEGORIES) : null
            const verreSuggestion = wine.au_verre && mapping && !mapping.tiller_verre_product_id ? findVerreMatch(wine, catalog) : null

            return (
              <div key={wine.id} style={{
                background: T.deep, borderRadius: 10, border: `0.5px solid ${T.border}`,
                borderLeft: `3px solid ${mapping ? T.up : suggestion ? T.gold : T.down}`,
                overflow: 'hidden',
              }}>
                {/* Wine header */}
                <div style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => {
                  if (isEditing) { setEditingWine(null); setTillerSearch('') }
                  else { setEditingWine(wine.id); setEditingField('btl'); setTillerSearch('') }
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{typeEmoji[wine.type] || '🍷'}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wine.cave_domains?.nom || '—'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>
                        {wine.cuvee || wine.nom_appellation} · {wine.prix_vente}€
                        {wine.au_verre && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 6, background: T.purple + '18', color: T.purple, fontSize: 10 }}>🥂 verre</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                      {mapping ? (
                        <>
                          <div style={{ fontSize: 11, color: T.up, fontWeight: 500 }}>✓ Mappé</div>
                          <div style={{ fontSize: 10, color: T.muted, marginTop: 1, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            🍾 {mapping.tiller_product_name}
                          </div>
                          {wine.au_verre && (
                            <div style={{ fontSize: 10, marginTop: 1, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: mapping.tiller_verre_product_name ? T.up : T.gold }}>
                              {mapping.tiller_verre_product_name ? `🥂 ${mapping.tiller_verre_product_name}` : '🥂 verre non lié'}
                            </div>
                          )}
                        </>
                      ) : suggestion ? (
                        <div style={{ fontSize: 11, color: T.gold }}>💡 Suggestion</div>
                      ) : (
                        <div style={{ fontSize: 11, color: T.down }}>⚠ Non lié</div>
                      )}
                    </div>
                  </div>

                  {/* Auto-suggestion preview (bouteille) */}
                  {!isEditing && !mapping && suggestion && (
                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: T.gold + '0a', border: `0.5px solid ${T.gold}25`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, color: T.gold, fontWeight: 500 }}>🍾 {suggestion.product.name}</div>
                        <div style={{ fontSize: 10, color: T.muted }}>{suggestion.product.category_name} · {suggestion.product.price}€</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); mapProduct(wine.id, suggestion.product, 'btl') }} disabled={saving}
                        style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: T.gold + '20', border: `0.5px solid ${T.gold}40`, color: T.gold, cursor: 'pointer' }}>Lier</button>
                    </div>
                  )}

                  {/* Auto-suggestion verre */}
                  {!isEditing && verreSuggestion && (
                    <div style={{ marginTop: 6, padding: '8px 10px', borderRadius: 8, background: T.purple + '0a', border: `0.5px solid ${T.purple}25`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, color: T.purple, fontWeight: 500 }}>🥂 {verreSuggestion.name}</div>
                        <div style={{ fontSize: 10, color: T.muted }}>Vin Verre · {verreSuggestion.price}€</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); mapProduct(wine.id, verreSuggestion, 'verre') }} disabled={saving}
                        style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: T.purple + '20', border: `0.5px solid ${T.purple}40`, color: T.purple, cursor: 'pointer' }}>Lier verre</button>
                    </div>
                  )}
                </div>

                {/* Editing panel */}
                {isEditing && (
                  <div style={{ padding: '0 14px 14px', borderTop: `0.5px solid ${T.border}20` }}>
                    {/* Tab btl / verre */}
                    {wine.au_verre && (
                      <div style={{ display: 'flex', gap: 0, marginTop: 10, marginBottom: 8 }}>
                        {(['btl', 'verre'] as const).map((f) => (
                          <button key={f} onClick={() => { setEditingField(f); setTillerSearch('') }} style={{
                            flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                            background: editingField === f ? (f === 'btl' ? T.gold + '18' : T.purple + '18') : 'transparent',
                            color: editingField === f ? (f === 'btl' ? T.gold : T.purple) : T.muted,
                            borderBottom: `2px solid ${editingField === f ? (f === 'btl' ? T.gold : T.purple) : 'transparent'}`,
                          }}>
                            {f === 'btl' ? '🍾 Bouteille' : '🥂 Verre'}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Current mapping info */}
                    {editingField === 'btl' && btlProduct && (
                      <div style={{ padding: '8px 10px', borderRadius: 8, background: T.up + '0a', border: `0.5px solid ${T.up}25`, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Produit bouteille :</div>
                        <div style={{ fontSize: 13, color: T.up, fontWeight: 500 }}>{btlProduct.name}</div>
                        <div style={{ fontSize: 10, color: T.text2 }}>{btlProduct.category_name} · {btlProduct.price}€ · ID {btlProduct.tiller_product_id}</div>
                      </div>
                    )}
                    {editingField === 'verre' && verreProduct && (
                      <div style={{ padding: '8px 10px', borderRadius: 8, background: T.purple + '0a', border: `0.5px solid ${T.purple}25`, marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Produit verre :</div>
                        <div style={{ fontSize: 13, color: T.purple, fontWeight: 500 }}>{verreProduct.name}</div>
                        <div style={{ fontSize: 10, color: T.text2 }}>Vin Verre · {verreProduct.price}€ · ID {verreProduct.tiller_product_id}</div>
                      </div>
                    )}

                    <input type="text" value={tillerSearch} onChange={(e) => setTillerSearch(e.target.value)}
                      placeholder={editingField === 'verre' ? 'Chercher un produit verre…' : 'Chercher un produit Tiller…'}
                      autoFocus style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `0.5px solid ${T.border}`, background: T.sea, color: T.text, fontSize: 13, outline: 'none', marginBottom: 6, boxSizing: 'border-box' }} />

                    <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                      {filteredCatalog.slice(0, 20).map((p) => {
                        const isActive = editingField === 'btl'
                          ? mapping?.tiller_product_id === p.tiller_product_id
                          : mapping?.tiller_verre_product_id === p.tiller_product_id
                        return (
                          <button key={p.tiller_product_id} onClick={() => mapProduct(wine.id, p, editingField)} disabled={saving || isActive}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: isActive ? T.up + '08' : 'transparent', border: 'none', borderBottom: `0.5px solid ${T.border}15`, color: T.text, fontSize: 12, cursor: isActive ? 'default' : 'pointer', textAlign: 'left' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500 }}>{p.name}</div>
                              <div style={{ fontSize: 11, color: T.text2 }}>{p.category_name} · {p.price}€</div>
                            </div>
                            {isActive && <span style={{ fontSize: 11, color: T.up }}>✓ actif</span>}
                          </button>
                        )
                      })}
                    </div>

                    {/* Unmap */}
                    {editingField === 'btl' && mapping && (
                      <button onClick={() => unmapField(wine.id, 'btl')} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: T.rose + '12', color: T.rose, fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
                        Dissocier la bouteille
                      </button>
                    )}
                    {editingField === 'verre' && mapping?.tiller_verre_product_id && (
                      <button onClick={() => unmapField(wine.id, 'verre')} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: T.rose + '12', color: T.rose, fontSize: 12, cursor: 'pointer', marginTop: 8 }}>
                        Dissocier le verre
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
