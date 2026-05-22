'use client'

import { T } from '@/lib/theme'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = 'Chercher un vin…' }: SearchBarProps) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: T.muted, pointerEvents: 'none' }}>
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: T.deep,
          border: `0.5px solid ${T.border}`,
          borderRadius: 10,
          padding: '10px 14px 10px 40px',
          fontSize: 14,
          color: T.text,
          outline: 'none',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: T.muted,
            fontSize: 16,
            cursor: 'pointer',
            padding: 4,
          }}
        >
          ✕
        </button>
      )}
    </div>
  )
}
