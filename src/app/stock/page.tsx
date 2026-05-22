'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { StockMovement, Wine } from '@/types'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('cave_stock_movements')
        .select('*, cave_wines(cuvee, region, cave_domains(nom))')
        .order('created_at', { ascending: false })
        .limit(50)
      setMovements((data as typeof movements) || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 16 }}>
        Stock
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button style={{
          flex: 1,
          padding: '14px 0',
          borderRadius: 10,
          border: 'none',
          background: T.gold,
          color: T.sea,
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}>
          📥 Réceptionner
        </button>
        <button style={{
          flex: 1,
          padding: '14px 0',
          borderRadius: 10,
          border: `0.5px solid ${T.border}`,
          background: T.surface,
          color: T.text,
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}>
          📋 Inventaire
        </button>
      </div>

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
                    {new Date(m.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
