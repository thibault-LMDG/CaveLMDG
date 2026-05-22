'use client'

import Link from 'next/link'
import { T, wineTypeColor } from '@/lib/theme'
import type { Wine } from '@/types'

interface WineCardProps {
  wine: Wine & { cave_domains?: { nom: string } }
}

export default function WineCard({ wine }: WineCardProps) {
  const borderColor = wineTypeColor[wine.type] || T.gold
  const isLowStock = wine.quantite_stock > 0 && wine.quantite_stock <= wine.stock_minimum
  const isOutOfStock = wine.quantite_stock <= 0
  const isNew = (Date.now() - new Date(wine.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000

  return (
    <Link
      href={`/cave/${wine.id}`}
      style={{
        display: 'block',
        background: T.deep,
        borderRadius: 10,
        borderLeft: `4px solid ${borderColor}`,
        padding: '12px 14px',
        textDecoration: 'none',
        color: T.text,
        transition: 'background 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text, lineHeight: 1.3 }}>
            {wine.cave_domains?.nom || '—'}
          </div>
          <div style={{ fontSize: 12, color: T.text2, marginTop: 2, lineHeight: 1.3 }}>
            {wine.cuvee || wine.nom_appellation || ''}
            {wine.cepage ? ` · ${wine.cepage}` : ''}
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 3, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span>{wine.region}</span>
            {wine.type_appellation && <span>{wine.type_appellation}</span>}
            {wine.millesime && <span>{wine.millesime}</span>}
            {isNew && (
              <span style={{
                fontSize: 10,
                background: `${T.teal}20`,
                color: T.teal,
                padding: '1px 6px',
                borderRadius: 8,
                fontWeight: 500,
              }}>
                new
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: T.text }}>
            {wine.prix_vente}€
          </div>
          <div style={{
            fontSize: 11,
            marginTop: 3,
            fontWeight: 500,
            color: isOutOfStock ? T.down : isLowStock ? T.down : T.up,
          }}>
            {isOutOfStock ? 'Épuisé' : `${wine.quantite_stock} btl`}
          </div>
        </div>
      </div>
    </Link>
  )
}
