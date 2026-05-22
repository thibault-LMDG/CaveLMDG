'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'

type Mode = 'entree' | 'sortie'
type SortieType = 'offert' | 'casse' | 'cuisine' | 'degustation'
type OffertMotif = 'client' | 'equipe' | 'presse'

interface StockModalProps {
  wineId: string
  wineName: string
  currentStock: number
  mode: Mode
  onClose: () => void
  onSuccess: () => void
}

export default function StockModal({ wineId, wineName, currentStock, mode, onClose, onSuccess }: StockModalProps) {
  const [quantite, setQuantite] = useState(1)
  const [sortieType, setSortieType] = useState<SortieType>('offert')
  const [offertMotif, setOffertMotif] = useState<OffertMotif>('client')
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEntree = mode === 'entree'
  const maxSortie = currentStock

  async function handleSubmit() {
    if (quantite <= 0) return
    if (!isEntree && quantite > maxSortie) {
      setError(`Stock insuffisant (${maxSortie} en stock)`)
      return
    }

    setSaving(true)
    setError('')

    const mvtType = isEntree ? 'entree' : sortieType
    const mvtQuantite = isEntree ? quantite : -quantite
    const motif = !isEntree && sortieType === 'offert' ? offertMotif : null

    const { error: err } = await supabase
      .from('cave_stock_movements')
      .insert({
        wine_id: wineId,
        type: mvtType,
        quantite: mvtQuantite,
        motif,
        commentaire: commentaire.trim() || null,
      })

    if (err) {
      setError('Erreur : ' + err.message)
      setSaving(false)
    } else {
      onSuccess()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: T.deep,
          borderRadius: '16px 16px 0 0',
          padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          animation: 'slideUp 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: isEntree ? T.up : T.rose }}>
            {isEntree ? '📥 Entrée stock' : '📤 Sortie stock'}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: T.muted, fontSize: 22, cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Wine name */}
        <div style={{ fontSize: 13, color: T.text2, marginBottom: 16, padding: '8px 12px', background: T.sea, borderRadius: 8 }}>
          {wineName} · <span style={{ color: T.muted }}>{currentStock} btl en stock</span>
        </div>

        {/* Sortie type selector */}
        {!isEntree && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Type de sortie
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([
                { value: 'offert', label: '🎁 Offert' },
                { value: 'casse', label: '💔 Casse' },
                { value: 'cuisine', label: '👨‍🍳 Cuisine' },
                { value: 'degustation', label: '🥂 Dégustation' },
              ] as { value: SortieType; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortieType(opt.value)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    border: `0.5px solid ${sortieType === opt.value ? T.rose + '60' : T.border}`,
                    background: sortieType === opt.value ? T.rose + '18' : 'transparent',
                    color: sortieType === opt.value ? T.rose : T.text2,
                    cursor: 'pointer',
                    fontWeight: sortieType === opt.value ? 500 : 400,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Offert motif */}
        {!isEntree && sortieType === 'offert' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Motif
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {([
                { value: 'client', label: 'Client' },
                { value: 'equipe', label: 'Équipe' },
                { value: 'presse', label: 'Presse' },
              ] as { value: OffertMotif; label: string }[]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOffertMotif(opt.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 12,
                    border: `0.5px solid ${offertMotif === opt.value ? T.gold + '60' : T.border}`,
                    background: offertMotif === opt.value ? T.gold + '18' : 'transparent',
                    color: offertMotif === opt.value ? T.gold : T.text2,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity stepper */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Quantité
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
            <button
              onClick={() => setQuantite(Math.max(1, quantite - 1))}
              style={{
                width: 52,
                height: 52,
                borderRadius: '10px 0 0 10px',
                border: `0.5px solid ${T.border}`,
                background: T.surface,
                color: T.text,
                fontSize: 22,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={quantite}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                if (!isNaN(v) && v >= 0) setQuantite(v)
              }}
              style={{
                width: 80,
                height: 52,
                textAlign: 'center',
                fontSize: 24,
                fontWeight: 500,
                color: T.text,
                background: T.sea,
                border: `0.5px solid ${T.border}`,
                borderLeft: 'none',
                borderRight: 'none',
                outline: 'none',
              }}
            />
            <button
              onClick={() => setQuantite(quantite + 1)}
              style={{
                width: 52,
                height: 52,
                borderRadius: '0 10px 10px 0',
                border: `0.5px solid ${T.border}`,
                background: T.surface,
                color: T.text,
                fontSize: 22,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +
            </button>
          </div>
          {/* Quick buttons */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
            {[3, 6, 12, 24].map((n) => (
              <button
                key={n}
                onClick={() => setQuantite(n)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  border: `0.5px solid ${T.border}`,
                  background: quantite === n ? T.surface : 'transparent',
                  color: quantite === n ? T.text : T.muted,
                  cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Commentaire */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Commentaire (optionnel)"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: `0.5px solid ${T.border}`,
              background: T.sea,
              color: T.text,
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 12, color: T.rose, marginBottom: 12, textAlign: 'center' }}>{error}</div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving || quantite <= 0}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 10,
            border: 'none',
            background: isEntree ? T.up : T.rose,
            color: '#fff',
            fontSize: 15,
            fontWeight: 500,
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving || quantite <= 0 ? 0.5 : 1,
          }}
        >
          {saving
            ? 'Enregistrement…'
            : isEntree
              ? `+ ${quantite} bouteille${quantite > 1 ? 's' : ''}`
              : `− ${quantite} bouteille${quantite > 1 ? 's' : ''}`
          }
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
