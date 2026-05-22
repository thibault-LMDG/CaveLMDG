'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { PricingGrid } from '@/types'

export default function PricingPage() {
  const router = useRouter()
  const [grid, setGrid] = useState<PricingGrid[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('cave_pricing_grid')
        .select('*')
        .order('prix_achat_seuil')
      setGrid((data as PricingGrid[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}
      >
        ← Retour
      </button>

      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 6 }}>
        Grille de pricing
      </div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
        Plus le PA est élevé, plus le coefficient baisse pour rester attractif sur les belles bouteilles.
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Chargement…</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {['PA HT', 'BevCost', 'Coeff.', 'PV TTC'].map((h) => (
                  <th key={h} style={{ textAlign: 'right', padding: '8px 10px', color: T.muted, fontWeight: 400, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr key={row.id} style={{ borderBottom: `0.5px solid ${T.border}10` }}>
                  <td style={{ textAlign: 'right', padding: '8px 10px', color: T.text }}>{row.prix_achat_seuil}€</td>
                  <td style={{ textAlign: 'right', padding: '8px 10px', color: T.blue }}>{(row.bevcost_target * 100).toFixed(0)}%</td>
                  <td style={{ textAlign: 'right', padding: '8px 10px', color: T.teal, fontWeight: 500 }}>x{row.coefficient.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '8px 10px', color: T.gold, fontWeight: 500 }}>{row.prix_vente_theorique}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
