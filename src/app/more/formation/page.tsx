'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { T } from '@/lib/theme'

const CULTURE_LEVELS = [
  'Les bases', 'Les familles', 'Les régions', 'Les cépages', 'La dégustation',
  'Accords', 'Vinification', 'Appellations', 'Le service', 'Expert',
]
const CAVE_LEVELS = [
  'Découvrir', 'Les couleurs', 'Nos domaines', 'Les cuvées', 'Nos cépages',
  'En parler', 'Nos accords', 'Argumenter', 'Nos histoires', 'Sommelier',
]

function getProgress(key: string): { level: number; scores: Record<number, number> } {
  if (typeof window === 'undefined') return { level: 1, scores: {} }
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { level: 1, scores: {} }
}

export default function FormationPage() {
  const router = useRouter()
  const [cultureProgress, setCultureProgress] = useState({ level: 1, scores: {} as Record<number, number> })
  const [caveProgress, setCaveProgress] = useState({ level: 1, scores: {} as Record<number, number> })

  useEffect(() => {
    setCultureProgress(getProgress('cave_lmdg_quiz_culture'))
    setCaveProgress(getProgress('cave_lmdg_quiz_cave'))
  }, [])

  const culturePct = Math.round(((cultureProgress.level - 1) / 10) * 100)
  const cavePct = Math.round(((caveProgress.level - 1) / 10) * 100)

  return (
    <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => router.push('/more')}
          style={{ background: 'none', border: 'none', color: T.text2, fontSize: 22, cursor: 'pointer', padding: 4 }}
        >
          ←
        </button>
        <div style={{ fontSize: 24, fontWeight: 500, color: T.text }}>Formation</div>
      </div>

      {/* Parcours Culture Vin */}
      <div
        onClick={() => router.push('/more/formation/quiz?parcours=culture')}
        style={{
          background: T.deep,
          borderRadius: 14,
          border: `0.5px solid ${T.border}`,
          overflow: 'hidden',
          cursor: 'pointer',
          marginBottom: 14,
          transition: 'border-color 0.2s',
        }}
      >
        {/* Image header */}
        <div style={{
          height: 120,
          background: 'linear-gradient(135deg, #1a1040 0%, #2d1854 40%, #1a2848 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <span style={{ fontSize: 52, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>🍇</span>
          {/* Decorative dots */}
          <div style={{ position: 'absolute', top: 15, right: 20, width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(176,122,232,0.15)' }} />
          <div style={{ position: 'absolute', bottom: 20, left: 30, width: 24, height: 24, borderRadius: '50%', background: 'rgba(176,122,232,0.06)' }} />
          <div style={{ position: 'absolute', bottom: 10, left: 14, fontSize: 10, color: 'rgba(176,122,232,0.5)', letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
            10 niveaux
          </div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: T.text, marginBottom: 4 }}>Culture vin</div>
          <div style={{ fontSize: 12, color: T.text2, marginBottom: 12, lineHeight: 1.4 }}>
            Des bases absolues jusqu&apos;au niveau expert. Cépages, régions, dégustation et service.
          </div>
          <div style={{ width: '100%', height: 6, background: T.surface, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${culturePct}%`, background: T.purple, borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted }}>
            <span>Niveau {cultureProgress.level} / 10 · {CULTURE_LEVELS[cultureProgress.level - 1]}</span>
            <span style={{ color: T.purple }}>{culturePct}%</span>
          </div>
        </div>
      </div>

      {/* Parcours Notre Cave */}
      <div
        onClick={() => router.push('/more/formation/quiz?parcours=cave')}
        style={{
          background: T.deep,
          borderRadius: 14,
          border: `0.5px solid ${T.border}`,
          overflow: 'hidden',
          cursor: 'pointer',
          marginBottom: 14,
          transition: 'border-color 0.2s',
        }}
      >
        <div style={{
          height: 120,
          background: 'linear-gradient(135deg, #0d2a3d 0%, #0a1628 40%, #162840 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <span style={{ fontSize: 52, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>🏠</span>
          <div style={{ position: 'absolute', top: 18, left: 25, width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(91,196,176,0.12)' }} />
          <div style={{ position: 'absolute', bottom: 25, right: 30, width: 20, height: 20, borderRadius: '50%', background: 'rgba(91,196,176,0.06)' }} />
          <div style={{ position: 'absolute', bottom: 10, left: 14, fontSize: 10, color: 'rgba(91,196,176,0.5)', letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
            10 niveaux
          </div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 17, fontWeight: 500, color: T.text, marginBottom: 4 }}>Notre cave</div>
          <div style={{ fontSize: 12, color: T.text2, marginBottom: 12, lineHeight: 1.4 }}>
            Devenez expert de nos vins. Domaines, cuvées, accords avec notre carte, histoires à raconter.
          </div>
          <div style={{ width: '100%', height: 6, background: T.surface, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${cavePct}%`, background: T.teal, borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted }}>
            <span>Niveau {caveProgress.level} / 10 · {CAVE_LEVELS[caveProgress.level - 1]}</span>
            <span style={{ color: T.teal }}>{cavePct}%</span>
          </div>
        </div>
      </div>

      {/* Brief pré-service */}
      <div
        onClick={() => router.push('/more/formation/brief')}
        style={{
          padding: 14,
          background: T.deep,
          borderRadius: 12,
          border: `0.5px solid ${T.border}`,
          cursor: 'pointer',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: T.text }}>Brief du soir</span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 10,
            background: 'rgba(232,200,122,0.12)',
            color: T.gold,
          }}>
            Quotidien
          </span>
        </div>
        <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.4 }}>
          Vins à pousser, ruptures du jour et anecdote sur un domaine
        </div>
      </div>

      {/* Quiz collectif */}
      <div
        onClick={() => router.push('/more/formation/collectif')}
        style={{
          padding: 14,
          background: T.deep,
          borderRadius: 12,
          border: `0.5px solid ${T.border}`,
          cursor: 'pointer',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>👥</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: T.text }}>Quiz collectif</span>
        </div>
        <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.4 }}>
          5 questions à poser à voix haute avant le service
        </div>
      </div>
    </div>
  )
}
