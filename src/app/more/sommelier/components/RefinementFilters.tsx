'use client'

import { useState } from 'react'
import { T } from '@/lib/theme'

interface Props {
  regions: string[]
  cepages: string[]
  plats: string[]
  selectedRegions: string[]
  selectedCepage: string | null
  selectedPlat: string | null
  selectedBio: boolean
  onRegions: (r: string[]) => void
  onCepage: (c: string | null) => void
  onPlat: (p: string | null) => void
  onBio: (b: boolean) => void
}

function ChipRow({ label, items, selected, onSelect }: {
  label: string
  items: string[]
  selected: string | null
  onSelect: (v: string | null) => void
}) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(item => {
          const active = selected === item
          return (
            <button
              key={item}
              onClick={() => onSelect(active ? null : item)}
              style={{
                padding: '5px 12px',
                fontSize: 12,
                background: active ? `${T.teal}20` : 'transparent',
                border: `1px solid ${active ? `${T.teal}4d` : T.border}`,
                borderRadius: 20,
                color: active ? T.teal : T.text2,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {item}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MultiChipRow({ label, items, selected, onToggle }: {
  label: string
  items: string[]
  selected: string[]
  onToggle: (v: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map(item => {
          const active = selected.includes(item)
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              style={{
                padding: '5px 12px',
                fontSize: 12,
                background: active ? `${T.teal}20` : 'transparent',
                border: `1px solid ${active ? `${T.teal}4d` : T.border}`,
                borderRadius: 20,
                color: active ? T.teal : T.text2,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {active ? '✓ ' : ''}{item}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function RefinementFilters(props: Props) {
  const [open, setOpen] = useState(false)
  
  const hasActive = props.selectedRegions.length > 0 || props.selectedCepage || props.selectedPlat || props.selectedBio
  
  const toggleRegion = (r: string) => {
    if (props.selectedRegions.includes(r)) {
      props.onRegions(props.selectedRegions.filter(x => x !== r))
    } else {
      props.onRegions([...props.selectedRegions, r])
    }
  }
  
  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          background: hasActive ? `${T.teal}12` : T.deep,
          border: `1px solid ${hasActive ? `${T.teal}30` : T.border}`,
          borderRadius: 10,
          color: hasActive ? T.teal : T.text2,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          width: '100%',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        🔍 Affiner la recherche {hasActive && '·'} {hasActive && <span style={{ fontSize: 11 }}>filtres actifs</span>}
        <span style={{ marginLeft: 'auto', fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      
      {open && (
        <div style={{
          marginTop: 10,
          padding: 14,
          background: T.deep,
          borderRadius: 12,
          border: `0.5px solid ${T.border}`,
        }}>
          <MultiChipRow label="🗺️ Région (multi-sélection)" items={props.regions} selected={props.selectedRegions} onToggle={toggleRegion} />
          <ChipRow label="🍇 Cépage" items={props.cepages} selected={props.selectedCepage} onSelect={props.onCepage} />
          <ChipRow label="🍽️ Plat de la carte" items={props.plats} selected={props.selectedPlat} onSelect={props.onPlat} />
          
          <div style={{ marginBottom: 0 }}>
            <button
              onClick={() => props.onBio(!props.selectedBio)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                fontSize: 12,
                background: props.selectedBio ? `${T.teal}20` : 'transparent',
                border: `1px solid ${props.selectedBio ? `${T.teal}4d` : T.border}`,
                borderRadius: 20,
                color: props.selectedBio ? T.teal : T.text2,
                cursor: 'pointer',
              }}
            >
              🌿 Bio / Nature / Sans sulfites
            </button>
          </div>
          
          {hasActive && (
            <button
              onClick={() => {
                props.onRegions([])
                props.onCepage(null)
                props.onPlat(null)
                props.onBio(false)
              }}
              style={{
                marginTop: 12,
                padding: '6px 12px',
                fontSize: 11,
                background: 'transparent',
                border: `1px solid ${T.border}`,
                borderRadius: 8,
                color: T.muted,
                cursor: 'pointer',
              }}
            >
              Effacer les filtres
            </button>
          )}
        </div>
      )}
    </div>
  )
}
