import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Le Sommelier — La Marine des Goudes',
  description: 'Trouvez le vin parfait pour votre repas',
}

export const viewport: Viewport = {
  themeColor: '#FAF8F4',
}

export default function SommelierClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      overflow: 'hidden',
      background: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {children}
    </div>
  )
}
