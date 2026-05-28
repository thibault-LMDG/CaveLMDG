'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import SearchBar from '@/components/SearchBar'

interface DomainWithWines {
  id: string
  nom: string
  region: string | null
  commentaire_domaine: string | null
  wine_count: number
  total_stock: number
}

export default function DomainsPage() {
  const router = useRouter()
  const [domains, setDomains] = useState<DomainWithWines[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: domainData } = await supabase
        .from('cave_domains')
        .select('id, nom, region, commentaire_domaine')
        .order('nom')

      if (domainData) {
        // Get wine counts per domain
        const { data: wineData } = await supabase
          .from('cave_wines')
          .select('domain_id, quantite_stock')
          .neq('statut', 'archive')

        const countByDomain: Record<string, { count: number; stock: number }> = {}
        for (const w of (wineData || [])) {
          if (!w.domain_id) continue
          if (!countByDomain[w.domain_id]) countByDomain[w.domain_id] = { count: 0, stock: 0 }
          countByDomain[w.domain_id].count++
          countByDomain[w.domain_id].stock += w.quantite_stock || 0
        }

        const enriched: DomainWithWines[] = domainData.map((d) => ({
          ...d,
          wine_count: countByDomain[d.id]?.count || 0,
          total_stock: countByDomain[d.id]?.stock || 0,
        }))

        // Sort: domains with wines first, then alphabetical
        enriched.sort((a, b) => {
          if (a.wine_count > 0 && b.wine_count === 0) return -1
          if (a.wine_count === 0 && b.wine_count > 0) return 1
          return a.nom.localeCompare(b.nom)
        })

        setDomains(enriched)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = search
    ? domains.filter((d) =>
      d.nom.toLowerCase().includes(search.toLowerCase()) ||
      (d.region || '').toLowerCase().includes(search.toLowerCase())
    )
    : domains

  const withWines = filtered.filter((d) => d.wine_count > 0)
  const withoutWines = filtered.filter((d) => d.wine_count === 0)

  return (
    <div style={{ padding: '16px 16px 80px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Retour</button>

      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 6 }}>Domaines</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>{domains.length} domaines · {domains.filter(d => d.wine_count > 0).length} avec des vins en cave</div>

      <SearchBar value={search} onChange={setSearch} placeholder="Chercher un domaine…" />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Chargement…</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
            {withWines.map((d) => (
              <Link key={d.id} href={`/more/domains/${d.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '12px 14px', borderRadius: 10, background: T.deep,
                  border: `0.5px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{d.nom}</div>
                    {d.region && <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>{d.region}</div>}
                    {d.commentaire_domaine && (
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                        {d.commentaire_domaine}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 12, flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: T.gold }}>{d.wine_count}</div>
                    <div style={{ fontSize: 10, color: T.muted }}>vin{d.wine_count > 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 10, color: d.total_stock > 0 ? T.up : T.down, marginTop: 2 }}>{d.total_stock} btl</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {withoutWines.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 8 }}>
                Sans vins en cave ({withoutWines.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {withoutWines.map((d) => (
                  <Link key={d.id} href={`/more/domains/${d.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ padding: '8px 14px', borderRadius: 8, background: T.deep, border: `0.5px solid ${T.border}15`, opacity: 0.6 }}>
                      <div style={{ fontSize: 13, color: T.text2 }}>{d.nom}</div>
                      {d.region && <div style={{ fontSize: 10, color: T.muted }}>{d.region}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* FAB — Ajouter un domaine */}
      <Link
        href="/more/domains/new"
        style={{
          position: 'fixed',
          bottom: 76,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 26,
          background: T.gold,
          color: T.sea,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 26,
          fontWeight: 300,
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          zIndex: 30,
        }}
      >
        +
      </Link>
    </div>
  )
}
