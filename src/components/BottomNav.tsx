'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { T } from '@/lib/theme'

const tabs = [
  { href: '/cave', label: 'Cave', emoji: '🍷' },
  { href: '/stock', label: 'Stock', emoji: '📦' },
  { href: '/search', label: 'Chercher', emoji: '🔍' },
  { href: '/more', label: 'Plus', emoji: '☰' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: T.deep,
        borderTop: `0.5px solid ${T.border}`,
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 56,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              textDecoration: 'none',
              color: isActive ? T.gold : T.muted,
              fontSize: 10,
              fontWeight: isActive ? 600 : 400,
              minWidth: 64,
              padding: '6px 0',
              borderRadius: 8,
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{tab.emoji}</span>
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
