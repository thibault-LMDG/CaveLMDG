'use client'

import { T } from '@/lib/theme'
import { INTENSITIES, Intensity } from '../lib/vibeMapping'

export default function IntensitySelector({ selected, onSelect }: { selected: Intensity | null; onSelect: (i: Intensity) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 500, color: T.text, marginBottom: 10 }}>
        Plutôt léger ou costaud ?
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {INTENSITIES.map(i => {
          const active = selected === i.id
          return (
            <button
              key={i.id}
              onClick={() => onSelect(i.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '14px 8px',
                background: active ? `${T.gold}1f` : T.deep,
                border: `1px solid ${active ? `${T.gold}4d` : T.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{i.emoji}</span>
              <div style={{ fontSize: 12, fontWeight: 500, color: active ? T.gold : T.text }}>{i.label}</div>
              <div style={{ fontSize: 10, color: T.muted }}>{i.sub}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
