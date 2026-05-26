'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { Wine } from '@/types'

type WineWithDomain = Wine & { cave_domains?: { nom: string; commentaire_domaine: string | null; notes: string | null } }

interface WineKnowledge {
  id: string
  wine_id: string
  status: string
  degustation_nez: string | null
  degustation_bouche: string | null
  degustation_finale: string | null
  temperature_service: string | null
  potentiel_garde: string | null
  accords_detailles: string | null
  histoire_domaine: string | null
  histoire_cuvee: string | null
  terroir: string | null
  vinification: string | null
  pitch_serveur: string | null
  anecdote: string | null
  notes_critiques: string | null
  sources: { url: string; title: string }[]
  generated_at: string
  generation_model: string
}

interface Stats {
  total_wines: number
  pending: number
  enriching: number
  ready: number
  validated: number
  rejected: number
  not_started: number
}

function Field({ label, value, color }: { label: string; value: string | null; color?: string }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: T.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13, color: color || T.text, lineHeight: 1.5 }}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    pending: { bg: `${T.muted}20`, text: T.muted },
    enriching: { bg: `${T.gold}20`, text: T.gold },
    ready: { bg: `${T.teal}20`, text: T.teal },
    validated: { bg: `${T.up}20`, text: T.up },
    rejected: { bg: `${T.rose}20`, text: T.rose },
  }
  const c = colors[status] || colors.pending
  return (
    <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 500, background: c.bg, color: c.text }}>
      {status}
    </span>
  )
}

export default function KnowledgePage() {
  const [wines, setWines] = useState<WineWithDomain[]>([])
  const [knowledgeMap, setKnowledgeMap] = useState<Record<string, WineKnowledge>>({})
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null)
  const [enriching, setEnriching] = useState(false)
  const [batchRunning, setBatchRunning] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    const [{ data: wineData }, { data: knowledgeData }] = await Promise.all([
      supabase
        .from('cave_wines')
        .select('*, cave_domains(nom, commentaire_domaine, notes)')
        .eq('statut', 'actif')
        .gt('quantite_stock', 0)
        .order('type')
        .order('region'),
      supabase
        .from('cave_wine_knowledge')
        .select('*'),
    ])

    setWines((wineData || []) as WineWithDomain[])
    const map: Record<string, WineKnowledge> = {}
    for (const k of knowledgeData || []) {
      map[k.wine_id] = k as WineKnowledge
    }
    setKnowledgeMap(map)
    setLoading(false)

    // Stats
    const res = await fetch('/api/enrich-wine')
    if (res.ok) setStats(await res.json())
  }

  useEffect(() => { loadData() }, [])

  const selectedWine = wines.find(w => w.id === selectedWineId)
  const selectedKnowledge = selectedWineId ? knowledgeMap[selectedWineId] : null

  const handleEnrich = async (wineId: string) => {
    setEnriching(true)
    try {
      const res = await fetch('/api/enrich-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wine_id: wineId }),
      })
      const data = await res.json()
      if (data.success) {
        await loadData()
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (e) {
      alert('Erreur réseau')
    }
    setEnriching(false)
  }

  const handleBatchNext = async () => {
    setBatchRunning(true)
    try {
      const res = await fetch('/api/enrich-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: true }),
      })
      const data = await res.json()
      if (data.success) {
        setSelectedWineId(data.wine_id)
        await loadData()
      } else if (data.done) {
        alert('Tous les vins sont enrichis !')
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (e) {
      alert('Erreur réseau')
    }
    setBatchRunning(false)
  }

  const handleValidate = async (wineId: string) => {
    await supabase
      .from('cave_wine_knowledge')
      .update({ status: 'validated', validated_at: new Date().toISOString(), validated_by: 'thibault' })
      .eq('wine_id', wineId)
    await loadData()
  }

  const handleReject = async (wineId: string) => {
    await supabase
      .from('cave_wine_knowledge')
      .update({ status: 'rejected' })
      .eq('wine_id', wineId)
    await loadData()
  }

  const handleRegenerate = async (wineId: string) => {
    await supabase
      .from('cave_wine_knowledge')
      .update({ status: 'pending' })
      .eq('wine_id', wineId)
    handleEnrich(wineId)
  }

  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center', color: T.muted, marginTop: 40 }}>Chargement...</div>
  }

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link href="/more" style={{ color: T.muted, textDecoration: 'none', fontSize: 20 }}>‹</Link>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500, color: T.text }}>🧠 Fiches augmentées</div>
          <div style={{ fontSize: 12, color: T.muted }}>Enrichissement IA + validation humaine</div>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 16,
          padding: 12,
          background: T.deep,
          borderRadius: 10,
          border: `0.5px solid ${T.border}`,
        }}>
          <Stat label="Total" value={stats.total_wines} />
          <Stat label="À traiter" value={stats.not_started + stats.pending} color={T.muted} />
          <Stat label="En cours" value={stats.enriching} color={T.gold} />
          <Stat label="À valider" value={stats.ready} color={T.teal} />
          <Stat label="Validés" value={stats.validated} color={T.up} />
          <Stat label="Rejetés" value={stats.rejected} color={T.rose} />
        </div>
      )}

      {/* Batch action */}
      <button
        onClick={handleBatchNext}
        disabled={batchRunning}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: batchRunning ? T.surface : T.teal,
          color: batchRunning ? T.muted : '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 500,
          cursor: batchRunning ? 'not-allowed' : 'pointer',
          marginBottom: 16,
        }}
      >
        {batchRunning ? '⏳ Enrichissement en cours...' : '🚀 Enrichir le prochain vin'}
      </button>

      {/* Wine list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {wines.map(w => {
          const k = knowledgeMap[w.id]
          const domain = Array.isArray(w.cave_domains) ? w.cave_domains[0] : w.cave_domains
          const isSelected = selectedWineId === w.id
          return (
            <button
              key={w.id}
              onClick={() => setSelectedWineId(isSelected ? null : w.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: isSelected ? `${T.gold}15` : T.deep,
                border: `1px solid ${isSelected ? `${T.gold}40` : T.border}`,
                borderRadius: 10,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(domain as { nom: string } | null)?.nom || ''} {w.cuvee || ''}
                </div>
                <div style={{ fontSize: 11, color: T.muted }}>{w.type} · {w.region}</div>
              </div>
              <StatusBadge status={k?.status || 'not_started'} />
            </button>
          )
        })}
      </div>

      {/* Detail panel */}
      {selectedWine && (
        <div style={{
          marginTop: 20,
          padding: 16,
          background: T.deep,
          borderRadius: 14,
          border: `0.5px solid ${T.border}`,
        }}>
          {/* Wine header */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: T.text }}>
              {(selectedWine.cave_domains as { nom: string } | null)?.nom || ''} {selectedWine.cuvee || ''}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
              {selectedWine.type} · {selectedWine.region} · {selectedWine.millesime || ''} · {selectedWine.prix_vente}€
            </div>
          </div>

          {/* Two columns on desktop, stacked on mobile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Fiche actuelle */}
            <div style={{
              padding: 12,
              background: T.surface,
              borderRadius: 10,
              border: `0.5px solid ${T.border}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>📋 Fiche actuelle</div>
              <Field label="Commentaire cuvée" value={selectedWine.commentaire_cuvee} />
              <Field label="Commentaire client" value={selectedWine.commentaire_client} />
              <Field label="Accords carte" value={selectedWine.accords_carte} />
              <Field label="Cépages" value={selectedWine.cepage} />
              <Field label="Note domaine" value={(selectedWine.cave_domains as { commentaire_domaine: string | null } | null)?.commentaire_domaine || null} />
            </div>

            {/* Proposition Claude */}
            {selectedKnowledge && selectedKnowledge.status !== 'pending' ? (
              <div style={{
                padding: 12,
                background: `${T.teal}08`,
                borderRadius: 10,
                border: `0.5px solid ${T.teal}30`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.teal, textTransform: 'uppercase', letterSpacing: 0.5 }}>🧠 Proposition Claude Opus</div>
                  <StatusBadge status={selectedKnowledge.status} />
                </div>

                <Field label="🍷 Pitch serveur" value={selectedKnowledge.pitch_serveur} color={T.gold} />
                <Field label="👃 Nez" value={selectedKnowledge.degustation_nez} />
                <Field label="👅 Bouche" value={selectedKnowledge.degustation_bouche} />
                <Field label="🎵 Finale" value={selectedKnowledge.degustation_finale} />
                <Field label="🌡️ Service" value={selectedKnowledge.temperature_service} />
                <Field label="⏳ Garde" value={selectedKnowledge.potentiel_garde} />
                <Field label="🍽️ Accords détaillés" value={selectedKnowledge.accords_detailles} />
                <Field label="🏠 Histoire domaine" value={selectedKnowledge.histoire_domaine} />
                <Field label="🍇 Histoire cuvée" value={selectedKnowledge.histoire_cuvee} />
                <Field label="🗺️ Terroir" value={selectedKnowledge.terroir} />
                <Field label="⚗️ Vinification" value={selectedKnowledge.vinification} />
                <Field label="💡 Anecdote" value={selectedKnowledge.anecdote} color={T.gold} />
                <Field label="⭐ Notes critiques" value={selectedKnowledge.notes_critiques} />

                {selectedKnowledge.sources?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>Sources ({selectedKnowledge.sources.length})</div>
                    {selectedKnowledge.sources.slice(0, 5).map((s, i) => (
                      <div key={i} style={{ fontSize: 10, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.title || s.url}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {selectedKnowledge.status === 'ready' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button
                      onClick={() => handleValidate(selectedWine.id)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: T.up,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      ✓ Valider
                    </button>
                    <button
                      onClick={() => handleReject(selectedWine.id)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: T.rose,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      ✗ Rejeter
                    </button>
                  </div>
                )}

                {(selectedKnowledge.status === 'rejected' || selectedKnowledge.status === 'validated') && (
                  <button
                    onClick={() => handleRegenerate(selectedWine.id)}
                    disabled={enriching}
                    style={{
                      marginTop: 12,
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      fontSize: 12,
                      color: T.muted,
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Régénérer la fiche
                  </button>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <button
                  onClick={() => handleEnrich(selectedWine.id)}
                  disabled={enriching}
                  style={{
                    padding: '12px 24px',
                    background: enriching ? T.surface : T.teal,
                    color: enriching ? T.muted : '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: enriching ? 'not-allowed' : 'pointer',
                  }}
                >
                  {enriching ? '⏳ Opus travaille...' : '🧠 Lancer la recherche'}
                </button>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>
                  Claude Opus va rechercher et compiler les infos sur ce vin
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: 'center', flex: '1 1 0', minWidth: 50 }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: color || T.text }}>{value}</div>
      <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}
