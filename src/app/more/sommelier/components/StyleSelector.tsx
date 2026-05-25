'use client'

import { T } from '@/lib/theme'
import { WineColor, StyleOption, STYLES_BY_COLOR } from '../lib/vibeMapping'

const COLOR_QUESTIONS: Record<WineColor, string> = {
  BLANC: 'Quel style de blanc ?',
  ROUGE: 'Quel style de rouge ?',
  ROSÉ: 'Quel style de rosé ?',
  BULLE: 'Quel style de bulles ?',
  'DEMI-SEC': 'Quel style de douceur ?',
}

export default function StyleSelector({ color, selected, onSelect }: {
  color: WineColor
  selected: StyleOption | null
  onSelect: (s: StyleOption) => void
}) {
  const styles = STYLES_BY_COLOR[color]
  const question = COLOR_QUESTIONS[color]

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 500, color: T.text, marginBottom: 10 }}>
        {question}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {styles.map(s => {
          const active = selected?.id === s.id
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: active ? `${T.gold}1f` : T.deep,
                border: `1px solid ${active ? `${T.gold}4d` : T.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>{s.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: active ? T.gold : T.text }}>{s.label}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{s.sub}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
