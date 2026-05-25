'use client'

import { T } from '@/lib/theme'
import { COLORS, WineColor } from '../lib/vibeMapping'

const COLOR_TINT: Record<WineColor, string> = {
  BLANC: '#e8d44d',
  ROUGE: '#c0392b',
  ROSÉ: '#e88dad',
  BULLE: '#f0c27f',
  'DEMI-SEC': '#d4a855',
}

export default function ColorSelector({ selected, onSelect, counts }: {
  selected: WineColor | null
  onSelect: (c: WineColor) => void
  counts: Record<WineColor, number>
}) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 500, color: T.text, marginBottom: 10 }}>
        Plutôt envie de quoi ?
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {COLORS.map(c => {
          const active = selected === c.id
          const count = counts[c.id] || 0
          if (count === 0) return null // ne pas montrer une couleur sans stock
          const tint = COLOR_TINT[c.id]
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                flex: '1 1 0',
                minWidth: 60,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '14px 6px',
                background: active ? `${tint}20` : T.deep,
                border: `1.5px solid ${active ? `${tint}80` : T.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 24 }}>{c.emoji}</span>
              <div style={{ fontSize: 13, fontWeight: 500, color: active ? tint : T.text }}>{c.label}</div>
              <div style={{ fontSize: 10, color: T.muted }}>{count} vins</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
