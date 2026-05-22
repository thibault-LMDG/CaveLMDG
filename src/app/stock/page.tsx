'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { T, wineTypeColor } from '@/lib/theme'
import type { StockMovement, Wine } from '@/types'
import StockModal from '@/components/StockModal'

const mvtLabels: Record<string, { emoji: string; label: string; color: string }> = {
  entree: { emoji: '📥', label: 'Entrée', color: T.up },
  vente: { emoji: '🛒', label: 'Vente', color: T.text2 },
  offert: { emoji: '🎁', label: 'Offert', color: T.gold },
  casse: { emoji: '💔', label: 'Casse', color: T.rose },
  cuisine: { emoji: '👨‍🍳', label: 'Cuisine', color: T.blue },
  degustation: { emoji: '🥂', label: 'Dégustation', color: T.purple },
  inventaire: { emoji: '📋', label: 'Inventaire', color: T.teal },
}

export default function StockPage() {
  const [movements, setMovements] = useState<(StockMovement & { cave_wines?: { cuvee: string; region: string; cave_domains?: { nom: string } } })[]>([])
  const [wines, setWines] = useState<(Wine & { cave_domains?: { nom: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [showQuickEntry, setShowQuickEntry] = useState(false)
  const [searchWine, setSearchWine] = useState('')
  const [selectedWine, setSelectedWine] = useState<(Wine & { cave_domains?: { nom: string } }) | null>(null)
  const [entryMode, setEntryMode] = useState<'entree' | 'sortie'>('entree')

  const loadData = useCallback(async () => {
    const { data: mvts } = await supabase
      .from('cave_stock_movements')
      .select('*, cave_wines(cuvee, region, cave_domains(nom))')
      .order('created_at', { ascending: false })
      .limit(50)
    setMovements((mvts as typeof movements) || [])

    const { data: w } = await supabase
      .from('cave_wines')
      .select('*, cave_domains(nom)')
      .neq('statut', 'archive')
      .order('region')
    setWines((w as typeof wines) || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredWines = searchWine.length >= 1
    ? wines.filter((w) => {
        const q = searchWine.toLowerCase()
        return (w.cave_domains?.nom || '').toLowerCase().includes(q) ||
          (w.cuvee || '').toLowerCase().includes(q) ||
          (w.cepage || '').toLowerCase().includes(q) ||
          (w.region || '').toLowerCase().includes(q)
      })
    : []

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 16 }}>
        Stock
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => { setEntryMode('entree'); setShowQuickEntry(true) }}
          style={{
            flex: 1,
            padding: '14px 0',
            borderRadius: 10,
            border: 'none',
            background: T.gold,
            color: T.sea,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          📥 Réceptionner
        </button>
        <button
          onClick={() => { setEntryMode('sortie'); setShowQuickEntry(true) }}
          style={{
            flex: 1,
            padding: '14px 0',
            borderRadius: 10,
            border: `0.5px solid ${T.border}`,
            background: T.surface,
            color: T.text,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          📤 Sortie
        </button>
      </div>

      {/* Quick entry — wine picker */}
      {showQuickEntry && !selectedWine && (
        <div style={{ marginBottom: 20, padding: 16, background: T.deep, borderRadius: 12, border: `0.5px solid ${T.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: entryMode === 'entree' ? T.up : T.rose }}>
              {entryMode === 'entree' ? '📥 Choisir le vin à réceptionner' : '📤 Choisir le vin'}
            </div>
            <button onClick={() => setShowQuickEntry(false)} style={{ background: 'none', border: 'none', color: T.muted, fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>
          <input
            type="text"
            value={searchWine}
            onChange={(e) => setSearchWine(e.target.value)}
            placeholder="Tapez pour chercher…"
            autoFocus
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: `0.5px solid ${T.border}`,
              background: T.sea,
              color: T.text,
              fontSize: 14,
              outline: 'none',
              marginBottom: 8,
            }}
          />
          {filteredWines.length > 0 && (
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {filteredWines.slice(0, 15).map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWine(w)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '10px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `0.5px solid ${T.border}20`,
                    color: T.text,
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 3, height: 28, borderRadius: 2, background: wineTypeColor[w.type] || T.gold, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{w.cave_domains?.nom}</div>
                    <div style={{ fontSize: 11, color: T.text2 }}>{w.cuvee || w.nom_appellation} · {w.region}</div>
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>{w.quantite_stock} btl</div>
                </button>
              ))}
            </div>
          )}
          {searchWine.length >= 1 && filteredWines.length === 0 && (
            <div style={{ padding: 12, textAlign: 'center', color: T.muted, fontSize: 12 }}>Aucun vin trouvé</div>
          )}
        </div>
      )}

      {/* Mouvements */}
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
        Mouvements récents
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Chargement…</div>
      ) : movements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>
          Aucun mouvement de stock enregistré
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {movements.map((m) => {
            const info = mvtLabels[m.type] || { emoji: '?', label: m.type, color: T.text2 }
            return (
              <div key={m.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: T.deep,
                borderRadius: 8,
                border: `0.5px solid ${T.border}`,
              }}>
                <span style={{ fontSize: 18 }}>{info.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>
                    {m.cave_wines?.cave_domains?.nom || ''}
                    {m.cave_wines?.cuvee ? ` — ${m.cave_wines.cuvee}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted }}>
                    {info.label}{m.motif ? ` · ${m.motif}` : ''}{m.commentaire ? ` · ${m.commentaire}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: m.quantite > 0 ? T.up : T.down,
                  }}>
                    {m.quantite > 0 ? '+' : ''}{m.quantite}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted }}>
                    {new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Stock Modal */}
      {selectedWine && (
        <StockModal
          wineId={selectedWine.id}
          wineName={`${selectedWine.cave_domains?.nom || ''} — ${selectedWine.cuvee || selectedWine.nom_appellation || ''}`}
          currentStock={selectedWine.quantite_stock}
          mode={entryMode}
          onClose={() => { setSelectedWine(null); setShowQuickEntry(false); setSearchWine('') }}
          onSuccess={() => {
            setSelectedWine(null)
            setShowQuickEntry(false)
            setSearchWine('')
            loadData()
          }}
        />
      )}
    </div>
  )
}
