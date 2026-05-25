'use client'

import { T } from '@/lib/theme'
import { BUDGETS, Budget } from '../lib/vibeMapping'

export default function BudgetSelector({ selected, onSelect }: { selected: Budget | null; onSelect: (b: Budget) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 500, color: T.text, marginBottom: 10 }}>
        Quel budget pour la bouteille ?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {BUDGETS.map((b, idx) => {
          const active = selected === b.id
          const priceHint = b.id === 'doux' ? '< 35€' : b.id === 'milieu' ? '35-55€' : b.id === 'plaisir' ? '> 55€' : ''
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 10px',
                background: active ? `${T.gold}1f` : T.deep,
                border: `1px solid ${active ? `${T.gold}4d` : T.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.15s',
                gridColumn: idx === 3 ? 'span 2' : undefined,
              }}
            >
              <span style={{ fontSize: 14 }}>{b.emoji.repeat(b.id === 'milieu' ? 2 : b.id === 'plaisir' ? 3 : 1)}</span>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: active ? T.gold : T.text }}>{b.label}</span>
                {priceHint && <span style={{ fontSize: 11, color: T.muted, marginLeft: 6 }}>{priceHint}</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
