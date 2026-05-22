'use client'

import { T } from '@/lib/theme'

interface FilterPillsProps {
  options: string[]
  selected: string | null
  onSelect: (value: string | null) => void
}

export default function FilterPills({ options, selected, onSelect }: FilterPillsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      paddingBottom: 4,
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }}>
      <button
        onClick={() => onSelect(null)}
        style={{
          flexShrink: 0,
          padding: '5px 12px',
          borderRadius: 16,
          fontSize: 12,
          fontWeight: selected === null ? 500 : 400,
          border: `0.5px solid ${selected === null ? T.gold + '4d' : T.border}`,
          background: selected === null ? T.gold + '1f' : 'transparent',
          color: selected === null ? T.gold : T.text2,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Tous
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(selected === opt ? null : opt)}
          style={{
            flexShrink: 0,
            padding: '5px 12px',
            borderRadius: 16,
            fontSize: 12,
            fontWeight: selected === opt ? 500 : 400,
            border: `0.5px solid ${selected === opt ? T.gold + '4d' : T.border}`,
            background: selected === opt ? T.gold + '1f' : 'transparent',
            color: selected === opt ? T.gold : T.text2,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
