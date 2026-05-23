'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { T } from '@/lib/theme'

interface PushWine {
  rank: number
  id: string
  name: string
  type: string
  region: string
  cepage: string | null
  commentaire_client: string | null
  prix: number
  stock: number
  reason: string
  reasonType: 'margin' | 'stock' | 'forced'
}

interface Rupture {
  id: string
  name: string
  stock: number
  label: string
}

interface BriefData {
  date: string
  pushWines: PushWine[]
  ruptures: Rupture[]
  anecdote: { domaine: string; texte: string } | null
  totalRefs: number
}

const REASON_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  margin: { bg: 'rgba(91,196,122,0.12)', color: T.up, label: 'Bonne marge' },
  stock: { bg: 'rgba(91,196,176,0.12)', color: T.teal, label: 'Stock élevé' },
  forced: { bg: 'rgba(232,200,122,0.12)', color: T.gold, label: '' }, // label dynamique
}

export default function BriefPage() {
  const router = useRouter()
  const [brief, setBrief] = useState<BriefData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/brief')
      .then(r => r.json())
      .then(data => {
        if (!data.error) setBrief(data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => router.push('/more/formation')} style={{ background: 'none', border: 'none', color: T.text2, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 500, color: T.text }}>Brief du soir</span>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 42, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 14, color: T.text2 }}>Préparation du brief...</div>
        </div>
      </div>
    )
  }

  if (!brief) {
    return (
      <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginTop: 40, marginBottom: 16 }}>😔</div>
        <div style={{ fontSize: 14, color: T.text2 }}>Impossible de charger le brief</div>
        <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '10px 20px', background: T.gold, color: T.sea, border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <button onClick={() => router.push('/more/formation')} style={{ background: 'none', border: 'none', color: T.text2, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 500, color: T.text }}>Brief du soir</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: T.muted }}>{brief.date}</span>
      </div>

      {/* Stats rapides */}
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 16, paddingLeft: 36 }}>
        {brief.totalRefs} vins en stock · {brief.ruptures.length} rupture{brief.ruptures.length > 1 ? 's' : ''}
      </div>

      {/* Section : À pousser ce soir */}
      <div style={{ fontSize: 12, color: T.gold, textTransform: 'uppercase' as const, letterSpacing: 1.2, marginBottom: 10, fontWeight: 500 }}>
        À pousser ce soir
      </div>

      {brief.pushWines.map(wine => {
        const style = REASON_STYLES[wine.reasonType] || REASON_STYLES.stock
        return (
          <div
            key={wine.id}
            onClick={() => router.push(`/cave/${wine.id}`)}
            style={{
              background: T.deep,
              borderRadius: 12,
              border: `0.5px solid ${T.border}`,
              padding: 14,
              marginBottom: 10,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(232,200,122,0.15)', color: T.gold,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 500, flexShrink: 0,
            }}>
              {wine.rank}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 3 }}>{wine.name}</div>
              <div style={{ fontSize: 12, color: T.text2 }}>
                {wine.region}{wine.cepage ? ` — ${wine.cepage}` : ''}
              </div>
              {wine.commentaire_client && (
                <div style={{ fontSize: 12, color: T.text, marginTop: 5, fontStyle: 'italic' }}>
                  &ldquo;{wine.commentaire_client}&rdquo;
                </div>
              )}
              <div style={{ marginTop: 6 }}>
                <span style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 10,
                  background: style.bg, color: style.color,
                }}>
                  {wine.reasonType === 'forced' ? wine.reason : style.label}
                </span>
              </div>
            </div>
          </div>
        )
      })}

      {/* Section : Ruptures */}
      {brief.ruptures.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: T.rose, textTransform: 'uppercase' as const, letterSpacing: 1.2, marginTop: 20, marginBottom: 10, fontWeight: 500 }}>
            Ruptures
          </div>
          {brief.ruptures.map(r => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderBottom: `0.5px solid rgba(30,58,95,0.4)`,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.stock === 0 ? T.rose : T.gold, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: T.text2 }}>
                {r.name} — <span style={{ color: r.stock === 0 ? T.rose : T.gold }}>{r.label}</span>
              </span>
            </div>
          ))}
        </>
      )}

      {/* Section : Le saviez-vous */}
      {brief.anecdote && (
        <>
          <div style={{ fontSize: 12, color: T.teal, textTransform: 'uppercase' as const, letterSpacing: 1.2, marginTop: 20, marginBottom: 10, fontWeight: 500 }}>
            Le saviez-vous ?
          </div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(91,196,176,0.06), rgba(13,31,56,0.6))',
            border: `0.5px solid rgba(91,196,176,0.15)`,
            borderRadius: 12,
            padding: 16,
          }}>
            <div style={{ fontSize: 14, color: T.teal, fontWeight: 500, marginBottom: 6 }}>
              {brief.anecdote.domaine}
            </div>
            <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>
              {brief.anecdote.texte}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
