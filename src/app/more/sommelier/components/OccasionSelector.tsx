'use client'

import { T } from '@/lib/theme'
import { OCCASIONS, Occasion } from '../lib/vibeMapping'

export default function OccasionSelector({ selected, onSelect }: { selected: Occasion | null; onSelect: (o: Occasion) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 500, color: T.text, marginBottom: 10 }}>
        Une occasion particulière ?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {OCCASIONS.map(o => {
          const active = selected === o.id
          return (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
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
              <span style={{ fontSize: 20, flexShrink: 0 }}>{o.emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: active ? T.gold : T.text }}>{o.label}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>{o.sub}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
