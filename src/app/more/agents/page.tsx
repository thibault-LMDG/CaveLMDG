'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { Agent, Wine } from '@/types'

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<(Agent & { wine_count: number })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: agentData } = await supabase.from('cave_agents').select('*').order('nom')
      const { data: wines } = await supabase.from('cave_wines').select('agent_id').neq('statut', 'archive')

      const counts: Record<string, number> = {}
      wines?.forEach((w) => {
        if (w.agent_id) counts[w.agent_id] = (counts[w.agent_id] || 0) + 1
      })

      setAgents(
        (agentData || []).map((a) => ({ ...a, wine_count: counts[a.id] || 0 })).sort((a, b) => b.wine_count - a.wine_count)
      )
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

      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 16 }}>
        Fournisseurs & Agents
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Chargement…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px',
                background: T.deep,
                borderRadius: 10,
                border: `0.5px solid ${T.border}`,
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: T.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                color: T.teal,
                fontWeight: 500,
                flexShrink: 0,
              }}>
                {agent.nom.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{agent.nom}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {agent.wine_count} vin{agent.wine_count > 1 ? 's' : ''} sur la carte
                </div>
              </div>
              {agent.telephone && (
                <a
                  href={`tel:${agent.telephone.replace(/\s/g, '')}`}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: T.teal + '18',
                    color: T.teal,
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  📞
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
