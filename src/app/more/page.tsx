'use client'

import Link from 'next/link'
import { T } from '@/lib/theme'

const menuItems = [
  { href: '/more/agents', emoji: '📞', label: 'Fournisseurs & Agents', desc: 'Annuaire, conditions franco' },
  { href: '/more/pricing', emoji: '💰', label: 'Grille de pricing', desc: 'Coefficients et BevCost' },
  { href: '#', emoji: '🖨️', label: 'Carte des vins', desc: 'Génération PDF imprimable', disabled: true },
  { href: '#', emoji: '⚠️', label: 'Alertes', desc: 'Stock bas, dormant, ruptures', disabled: true },
  { href: '/more/tiller', emoji: '🔗', label: 'Mapping Tiller', desc: 'Associer vins et caisse' },
  { href: '#', emoji: '📚', label: 'Formation', desc: 'Quiz et parcours vin', disabled: true },
  { href: '#', emoji: '⚙️', label: 'Paramètres', desc: 'Rôles, seuils, sync', disabled: true },
]

export default function MorePage() {
  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 16 }}>
        Plus
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {menuItems.map((item) => {
          const Wrapper = item.disabled ? 'div' : Link
          return (
            <Wrapper
              key={item.label}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 14px',
                background: T.deep,
                borderRadius: 10,
                border: `0.5px solid ${T.border}`,
                textDecoration: 'none',
                color: T.text,
                opacity: item.disabled ? 0.4 : 1,
                cursor: item.disabled ? 'default' : 'pointer',
              }}
            >
              <span style={{ fontSize: 22 }}>{item.emoji}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{item.label}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{item.desc}</div>
              </div>
              {!item.disabled && <span style={{ marginLeft: 'auto', color: T.muted, fontSize: 14 }}>›</span>}
              {item.disabled && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: T.surface,
                  color: T.muted,
                }}>
                  Bientôt
                </span>
              )}
            </Wrapper>
          )
        })}
      </div>

      <div style={{ textAlign: 'center', padding: '30px 0', fontSize: 11, color: T.muted }}>
        Cave LMDG v0.1 · La Marine des Goudes
      </div>
    </div>
  )
}
