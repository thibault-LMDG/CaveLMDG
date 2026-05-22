'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T, wineTypeColor } from '@/lib/theme'
import type { Wine } from '@/types'
import SearchBar from '@/components/SearchBar'

interface TillerProduct {
  produit: string
  nb_ventes: number
  ca_total: number
}

interface Mapping {
  id: string
  tiller_product_name: string
  wine_id: string | null
  is_au_verre: boolean
}

export default function TillerMappingPage() {
  const router = useRouter()
  const [tillerProducts, setTillerProducts] = useState<TillerProduct[]>([])
  const [wines, setWines] = useState<(Wine & { cave_domains?: { nom: string } })[]>([])
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'mapped' | 'unmapped'>('all')
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [wineSearch, setWineSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    // Produits Tiller vin distincts
    const { data: tillerData } = await supabase.rpc('cave_get_tiller_products').select('*')

    // Fallback: query directe si la RPC n'existe pas
    let products: TillerProduct[] = []
    if (!tillerData) {
      const { data: rawData } = await supabase
        .from('lignes_produits')
        .select('produit, ca_ht')
        .eq('categorie', 'BOISSON_VIN')

      if (rawData) {
        const grouped: Record<string, { nb: number; ca: number }> = {}
        rawData.forEach((r: { produit: string; ca_ht: number }) => {
          if (!grouped[r.produit]) grouped[r.produit] = { nb: 0, ca: 0 }
          grouped[r.produit].nb++
          grouped[r.produit].ca += Number(r.ca_ht) || 0
        })
        products = Object.entries(grouped)
          .map(([produit, stats]) => ({ produit, nb_ventes: stats.nb, ca_total: Math.round(stats.ca) }))
          .sort((a, b) => b.nb_ventes - a.nb_ventes)
      }
    } else {
      products = tillerData as TillerProduct[]
    }
    setTillerProducts(products)

    // Vins cave
    const { data: wineData } = await supabase
      .from('cave_wines')
      .select('*, cave_domains(nom)')
      .neq('statut', 'archive')
      .order('region')
    setWines((wineData as typeof wines) || [])

    // Mappings existants
    const { data: mappingData } = await supabase
      .from('cave_tiller_mapping')
      .select('*')
    setMappings((mappingData as Mapping[]) || [])

    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const mappingByProduct = Object.fromEntries(mappings.map((m) => [m.tiller_product_name, m]))
  const wineById = Object.fromEntries(wines.map((w) => [w.id, w]))

  const mapped = tillerProducts.filter((p) => mappingByProduct[p.produit]?.wine_id)
  const unmapped = tillerProducts.filter((p) => !mappingByProduct[p.produit]?.wine_id)

  const filtered = tillerProducts.filter((p) => {
    if (filter === 'mapped' && !mappingByProduct[p.produit]?.wine_id) return false
    if (filter === 'unmapped' && mappingByProduct[p.produit]?.wine_id) return false
    if (search && !p.produit.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredWines = wineSearch
    ? wines.filter((w) =>
      (w.cave_domains?.nom || '').toLowerCase().includes(wineSearch.toLowerCase()) ||
      (w.cuvee || '').toLowerCase().includes(wineSearch.toLowerCase()) ||
      (w.region || '').toLowerCase().includes(wineSearch.toLowerCase())
    )
    : wines

  async function mapProduct(tillerProductName: string, wineId: string, isAuVerre: boolean) {
    setSaving(true)
    const existing = mappingByProduct[tillerProductName]
    if (existing) {
      await supabase.from('cave_tiller_mapping')
        .update({ wine_id: wineId, is_au_verre: isAuVerre })
        .eq('id', existing.id)
    } else {
      await supabase.from('cave_tiller_mapping')
        .insert({ tiller_product_name: tillerProductName, wine_id: wineId, is_au_verre: isAuVerre })
    }
    setEditingProduct(null)
    setWineSearch('')
    setSaving(false)
    loadData()
  }

  async function unmapProduct(tillerProductName: string) {
    const existing = mappingByProduct[tillerProductName]
    if (existing) {
      await supabase.from('cave_tiller_mapping').delete().eq('id', existing.id)
      loadData()
    }
  }

  // Detect au verre from product name
  function isLikelyAuVerre(name: string): boolean {
    const lower = name.toLowerCase()
    return lower.startsWith('v-') || lower.startsWith('v ') || lower.includes('verre') || lower.includes('coupe') || lower.includes('ballon')
  }

  return (
    <div style={{ padding: '16px 16px 80px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Retour</button>

      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 6 }}>Mapping Tiller</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Associer chaque produit vin de la caisse à une référence de la cave</div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Produits Tiller</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.gold, marginTop: 2 }}>{tillerProducts.length}</div>
        </div>
        <div style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mappés</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.up, marginTop: 2 }}>{mapped.length}</div>
        </div>
        <div style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Non liés</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: unmapped.length > 0 ? T.down : T.up, marginTop: 2 }}>{unmapped.length}</div>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Chercher un produit Tiller…" />

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
          {filtered.map((product) => {
            const mapping = mappingByProduct[product.produit]
            const linkedWine = mapping?.wine_id ? wineById[mapping.wine_id] : null
            const isEditing = editingProduct === product.produit
            const auVerre = isLikelyAuVerre(product.produit)

            return (
              <div key={product.produit} style={{
                background: T.deep, borderRadius: 10, border: `0.5px solid ${T.border}`,
                borderLeft: `3px solid ${linkedWine ? T.up : T.down}`,
                overflow: 'hidden',
              }}>
                {/* Product header */}
                <div
                  style={{ padding: '12px 14px', cursor: 'pointer' }}
                  onClick={() => {
                    if (isEditing) { setEditingProduct(null); setWineSearch('') }
                    else { setEditingProduct(product.produit); setWineSearch('') }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{product.produit}</div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                        {product.nb_ventes} ventes · {product.ca_total}€ CA
                        {auVerre && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 6, background: T.purple + '18', color: T.purple, fontSize: 10 }}>verre</span>}
                      </div>
                    </div>
                    {linkedWine ? (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: T.up, fontWeight: 500 }}>✓ Mappé</div>
                        <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>
                          {linkedWine.cave_domains?.nom}
                        </div>
                        <div style={{ fontSize: 10, color: T.muted }}>
                          {linkedWine.cuvee || linkedWine.nom_appellation}
                          {mapping?.is_au_verre ? ' (verre)' : ' (btl)'}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: T.down }}>⚠ Non lié</div>
                    )}
                  </div>
                </div>

                {/* Editing panel */}
                {isEditing && (
                  <div style={{ padding: '0 14px 14px', borderTop: `0.5px solid ${T.border}20` }}>
                    <input
                      type="text"
                      value={wineSearch}
                      onChange={(e) => setWineSearch(e.target.value)}
                      placeholder="Chercher un vin de la cave…"
                      autoFocus
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 8,
                        border: `0.5px solid ${T.border}`, background: T.sea,
                        color: T.text, fontSize: 13, outline: 'none', marginTop: 10, marginBottom: 6,
                      }}
                    />
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {filteredWines.slice(0, 12).map((w) => (
                        <button
                          key={w.id}
                          onClick={() => mapProduct(product.produit, w.id, auVerre)}
                          disabled={saving}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                            padding: '8px 10px', background: 'transparent', border: 'none',
                            borderBottom: `0.5px solid ${T.border}15`, color: T.text,
                            fontSize: 12, cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <span style={{ width: 3, height: 24, borderRadius: 2, background: wineTypeColor[w.type] || T.gold, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{w.cave_domains?.nom}</div>
                            <div style={{ fontSize: 11, color: T.text2 }}>{w.cuvee || w.nom_appellation} · {w.region}</div>
                          </div>
                          <div style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>{w.prix_vente}€</div>
                        </button>
                      ))}
                    </div>
                    {linkedWine && (
                      <button
                        onClick={() => unmapProduct(product.produit)}
                        style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: 'none', background: T.rose + '12', color: T.rose, fontSize: 12, cursor: 'pointer', marginTop: 8 }}
                      >
                        Dissocier ce vin
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
