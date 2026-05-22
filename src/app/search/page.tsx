'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { Wine } from '@/types'
import SearchBar from '@/components/SearchBar'
import WineCard from '@/components/WineCard'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<(Wine & { cave_domains?: { nom: string } })[]>([])
  const [loading, setLoading] = useState(false)

  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('cave_wines')
      .select('*, cave_domains(nom)')
      .neq('statut', 'archive')
      .or(`cuvee.ilike.%${q}%,cepage.ilike.%${q}%,region.ilike.%${q}%,nom_appellation.ilike.%${q}%`)
      .order('prix_vente')
      .limit(30)

    // Also search by domain name (can't do cross-table ilike in or())
    const { data: byDomain } = await supabase
      .from('cave_wines')
      .select('*, cave_domains!inner(nom)')
      .neq('statut', 'archive')
      .ilike('cave_domains.nom', `%${q}%`)
      .limit(20)

    const all = [...(data || []), ...(byDomain || [])]
    const unique = Array.from(new Map(all.map((w) => [w.id, w])).values())
    setResults(unique as typeof results)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 250)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 16 }}>
        Rechercher
      </div>

      <SearchBar value={query} onChange={setQuery} placeholder="Domaine, cépage, région, appellation…" />

      <div style={{ marginTop: 16 }}>
        {!query ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>
            Tapez pour chercher un vin
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Recherche…</div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>
            Aucun résultat pour « {query} »
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>{results.length} résultat{results.length > 1 ? 's' : ''}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map((wine) => (
                <WineCard key={wine.id} wine={wine} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
