'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { Agent } from '@/types'
import SearchBar from '@/components/SearchBar'

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<(Agent & { wine_count: number; stock_total: number; valeur_achat: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: agentData } = await supabase.from('cave_agents').select('*').order('nom')
      const { data: wines } = await supabase
        .from('cave_wines')
        .select('agent_id, quantite_stock, prix_fp_inclus')
        .neq('statut', 'archive')

      const stats: Record<string, { count: number; stock: number; valeur: number }> = {}
      wines?.forEach((w) => {
        if (w.agent_id) {
          if (!stats[w.agent_id]) stats[w.agent_id] = { count: 0, stock: 0, valeur: 0 }
          stats[w.agent_id].count++
          stats[w.agent_id].stock += w.quantite_stock || 0
          stats[w.agent_id].valeur += (w.quantite_stock || 0) * (w.prix_fp_inclus || 0)
        }
      })

      setAgents(
        (agentData || [])
          .map((a) => ({
            ...a,
            wine_count: stats[a.id]?.count || 0,
            stock_total: stats[a.id]?.stock || 0,
            valeur_achat: stats[a.id]?.valeur || 0,
          }))
          .sort((a, b) => b.wine_count - a.wine_count)
      )
      setLoading(false)
    }
    load()
  }, [])

  const filtered = search
    ? agents.filter((a) => a.nom.toLowerCase().includes(search.toLowerCase()))
    : agents

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}
      >
        ← Retour
      </button>

      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 16 }}>
        Fournisseurs & Agents
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Agents', value: agents.length, color: T.teal },
          { label: 'Références', value: agents.reduce((s, a) => s + a.wine_count, 0), color: T.gold },
          { label: 'En stock', value: agents.reduce((s, a) => s + a.stock_total, 0) + ' btl', color: T.up },
        ].map((kpi) => (
          <div key={kpi.label} style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: T.muted, fontWeight: 400, textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.label}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: kpi.color, marginTop: 2 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Chercher un agent…" />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Chargement…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {filtered.map((agent) => (
            <Link
              key={agent.id}
              href={`/more/agents/${agent.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px',
                background: T.deep,
                borderRadius: 10,
                border: `0.5px solid ${T.border}`,
                textDecoration: 'none',
                color: T.text,
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: T.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
                color: T.teal,
                fontWeight: 500,
                flexShrink: 0,
              }}>
                {agent.nom.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{agent.nom}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {agent.wine_count} vin{agent.wine_count > 1 ? 's' : ''}
                  {agent.stock_total > 0 ? ` · ${agent.stock_total} btl en stock` : ''}
                </div>
                {agent.telephone && (
                  <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>
                    📞 {agent.telephone}
                  </div>
                )}
              </div>
              <span style={{ color: T.muted, fontSize: 16 }}>›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
