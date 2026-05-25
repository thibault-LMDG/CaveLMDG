'use client'

import { T } from '@/lib/theme'
import { VIBES, Vibe } from '../lib/vibeMapping'

export default function VibeSelector({ selected, onSelect }: { selected: Vibe | null; onSelect: (v: Vibe) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 500, color: T.text, marginBottom: 10 }}>
        Quelle envie ?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {VIBES.map(v => {
          const active = selected === v.id
          return (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: active ? `${T.gold}1f` : T.deep,
                border: `1px solid ${active ? `${T.gold}4d` : T.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{v.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: active ? T.gold : T.text }}>{v.label}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{v.sub}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
