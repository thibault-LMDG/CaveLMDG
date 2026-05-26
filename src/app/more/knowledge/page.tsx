'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    not_started: { bg: `${T.muted}15`, text: T.muted, label: '—' },
    pending: { bg: `${T.muted}20`, text: T.muted, label: 'en attente' },
    enriching: { bg: `${T.gold}20`, text: T.gold, label: 'en cours...' },
    ready: { bg: `${T.teal}20`, text: T.teal, label: 'à valider' },
    validated: { bg: `${T.up}20`, text: T.up, label: '✓ validé' },
    rejected: { bg: `${T.rose}20`, text: T.rose, label: '✗ rejeté' },
  }
  const c = colors[status] || colors.not_started
  return (
    <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 10, fontWeight: 500, background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
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

function getWineName(w: WineWithDomain): string {
  const domain = Array.isArray(w.cave_domains) ? w.cave_domains[0] : w.cave_domains
  return `${(domain as { nom: string } | null)?.nom || ''} ${w.cuvee || ''}`.trim()
}

export default function KnowledgePage() {
  const [wines, setWines] = useState<WineWithDomain[]>([])
  const [knowledgeMap, setKnowledgeMap] = useState<Record<string, WineKnowledge>>({})
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedWineId, setSelectedWineId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Multi-select + queue
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [queue, setQueue] = useState<string[]>([])
  const [currentEnriching, setCurrentEnriching] = useState<string | null>(null)
  const [queueProgress, setQueueProgress] = useState({ done: 0, total: 0, errors: 0 })
  const abortRef = useRef(false)

  const loadData = useCallback(async () => {
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

    const res = await fetch('/api/enrich-wine')
    if (res.ok) setStats(await res.json())
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const selectedWine = wines.find(w => w.id === selectedWineId)
  const selectedKnowledge = selectedWineId ? knowledgeMap[selectedWineId] : null
  const isQueueRunning = queue.length > 0 || currentEnriching !== null

  // Toggle checkbox
  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Select all not_started
  const selectAllNotStarted = () => {
    const ids = wines.filter(w => {
      const k = knowledgeMap[w.id]
      return !k || k.status === 'pending' || k.status === 'rejected'
    }).map(w => w.id)
    setCheckedIds(new Set(ids))
  }

  const clearSelection = () => setCheckedIds(new Set())

  // Enrich a single wine
  const enrichOne = async (wineId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/enrich-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wine_id: wineId }),
      })
      const data = await res.json()
      return !!data.success
    } catch {
      return false
    }
  }

  // Start queue processing
  const startQueue = async () => {
    const ids = [...checkedIds]
    if (ids.length === 0) return

    setQueue(ids)
    setQueueProgress({ done: 0, total: ids.length, errors: 0 })
    abortRef.current = false
    setCheckedIds(new Set())

    for (let i = 0; i < ids.length; i++) {
      if (abortRef.current) break

      const wineId = ids[i]
      setCurrentEnriching(wineId)
      setQueue(ids.slice(i + 1))

      const success = await enrichOne(wineId)
      setQueueProgress(prev => ({
        ...prev,
        done: prev.done + 1,
        errors: prev.errors + (success ? 0 : 1),
      }))

      // Refresh data after each wine
      await loadData()
    }

    setCurrentEnriching(null)
    setQueue([])
  }

  const stopQueue = () => {
    abortRef.current = true
  }

  // Single enrich (from detail panel)
  const handleEnrichSingle = async (wineId: string) => {
    setCurrentEnriching(wineId)
    setQueueProgress({ done: 0, total: 1, errors: 0 })
    const success = await enrichOne(wineId)
    setQueueProgress({ done: 1, total: 1, errors: success ? 0 : 1 })
    setCurrentEnriching(null)
    if (!success) alert('Erreur lors de l\'enrichissement')
    await loadData()
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
    await handleEnrichSingle(wineId)
  }

  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center', color: T.muted, marginTop: 40 }}>Chargement...</div>
  }

  const currentWineName = currentEnriching ? getWineName(wines.find(w => w.id === currentEnriching)!) : ''

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
          display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
          padding: 12, background: T.deep, borderRadius: 10, border: `0.5px solid ${T.border}`,
        }}>
          <Stat label="Total" value={stats.total_wines} />
          <Stat label="À traiter" value={stats.not_started + stats.pending} color={T.muted} />
          <Stat label="À valider" value={stats.ready} color={T.teal} />
          <Stat label="Validés" value={stats.validated} color={T.up} />
          <Stat label="Rejetés" value={stats.rejected} color={T.rose} />
        </div>
      )}

      {/* Queue progress bar */}
      {isQueueRunning && (
        <div style={{
          marginBottom: 16, padding: 14, background: `${T.gold}10`,
          borderRadius: 12, border: `1px solid ${T.gold}30`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.gold }}>
              ⏳ Enrichissement {queueProgress.done}/{queueProgress.total}
              {queueProgress.errors > 0 && <span style={{ color: T.rose }}> · {queueProgress.errors} erreur{queueProgress.errors > 1 ? 's' : ''}</span>}
            </div>
            <button
              onClick={stopQueue}
              style={{
                padding: '4px 12px', fontSize: 11, background: T.surface,
                border: `1px solid ${T.border}`, borderRadius: 6, color: T.muted, cursor: 'pointer',
              }}
            >
              ⏹ Arrêter
            </button>
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: T.surface, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: T.gold, borderRadius: 2,
              width: `${(queueProgress.done / queueProgress.total) * 100}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ fontSize: 12, color: T.text, marginTop: 8 }}>
            En cours : <strong>{currentWineName}</strong>
          </div>
          {queue.length > 0 && (
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
              Suivant{queue.length > 1 ? 's' : ''} : {queue.slice(0, 3).map(id => getWineName(wines.find(w => w.id === id)!)).join(', ')}
              {queue.length > 3 && ` +${queue.length - 3} autres`}
            </div>
          )}
        </div>
      )}

      {/* Selection actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {checkedIds.size > 0 && !isQueueRunning ? (
          <>
            <button
              onClick={startQueue}
              style={{
                padding: '10px 16px', background: T.teal, color: '#fff', border: 'none',
                borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              🚀 Enrichir {checkedIds.size} vin{checkedIds.size > 1 ? 's' : ''}
            </button>
            <button
              onClick={clearSelection}
              style={{
                padding: '10px 16px', background: T.surface, color: T.muted,
                border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, cursor: 'pointer',
              }}
            >
              Désélectionner
            </button>
          </>
        ) : !isQueueRunning ? (
          <button
            onClick={selectAllNotStarted}
            style={{
              padding: '10px 16px', background: T.deep, color: T.text2,
              border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, cursor: 'pointer',
            }}
          >
            ☑ Tout sélectionner (non traités)
          </button>
        ) : null}
      </div>

      {/* Wine list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {wines.map(w => {
          const k = knowledgeMap[w.id]
          const status = k?.status || 'not_started'
          const isSelected = selectedWineId === w.id
          const isChecked = checkedIds.has(w.id)
          const isCurrent = currentEnriching === w.id
          const isInQueue = queue.includes(w.id)

          return (
            <div
              key={w.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px',
                background: isCurrent ? `${T.gold}12` : isSelected ? `${T.gold}08` : T.deep,
                border: `1px solid ${isCurrent ? `${T.gold}50` : isSelected ? `${T.gold}30` : T.border}`,
                borderRadius: 10,
                transition: 'all 0.15s',
              }}
            >
              {/* Checkbox */}
              {!isQueueRunning && (
                <div
                  onClick={(e) => { e.stopPropagation(); toggleCheck(w.id) }}
                  style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                    border: `2px solid ${isChecked ? T.teal : T.border}`,
                    background: isChecked ? `${T.teal}30` : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: T.teal,
                  }}
                >
                  {isChecked && '✓'}
                </div>
              )}

              {/* Queue indicator */}
              {isQueueRunning && (
                <div style={{ width: 22, flexShrink: 0, textAlign: 'center', fontSize: 14 }}>
                  {isCurrent ? '⏳' : isInQueue ? '🕐' : ''}
                </div>
              )}

              {/* Wine info — click to view detail */}
              <div
                onClick={() => setSelectedWineId(isSelected ? null : w.id)}
                style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
              >
                <div style={{
                  fontSize: 13, fontWeight: 500, color: isCurrent ? T.gold : T.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {getWineName(w)}
                </div>
                <div style={{ fontSize: 11, color: T.muted }}>{w.type} · {w.region}</div>
              </div>

              <StatusBadge status={isCurrent ? 'enriching' : status} />
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {selectedWine && (
        <div style={{
          marginTop: 20, padding: 16, background: T.deep,
          borderRadius: 14, border: `0.5px solid ${T.border}`,
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: T.text }}>
              {getWineName(selectedWine)}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
              {selectedWine.type} · {selectedWine.region} · {selectedWine.millesime || ''} · {selectedWine.prix_vente}€
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Fiche actuelle */}
            <div style={{ padding: 12, background: T.surface, borderRadius: 10, border: `0.5px solid ${T.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>📋 Fiche actuelle</div>
              <Field label="Commentaire cuvée" value={selectedWine.commentaire_cuvee} />
              <Field label="Commentaire client" value={selectedWine.commentaire_client} />
              <Field label="Accords carte" value={selectedWine.accords_carte} />
              <Field label="Cépages" value={selectedWine.cepage} />
              <Field label="Note domaine" value={(selectedWine.cave_domains as { commentaire_domaine: string | null } | null)?.commentaire_domaine || null} />
            </div>

            {/* Proposition Claude */}
            {selectedKnowledge && !['pending', 'not_started'].includes(selectedKnowledge.status) ? (
              <div style={{ padding: 12, background: `${T.teal}08`, borderRadius: 10, border: `0.5px solid ${T.teal}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.teal, textTransform: 'uppercase', letterSpacing: 0.5 }}>🧠 Proposition Claude</div>
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
                    <button onClick={() => handleValidate(selectedWine.id)}
                      style={{ flex: 1, padding: '10px 16px', background: T.up, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                      ✓ Valider
                    </button>
                    <button onClick={() => handleReject(selectedWine.id)}
                      style={{ flex: 1, padding: '10px 16px', background: T.rose, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                      ✗ Rejeter
                    </button>
                  </div>
                )}

                {(selectedKnowledge.status === 'rejected' || selectedKnowledge.status === 'validated') && (
                  <button onClick={() => handleRegenerate(selectedWine.id)}
                    disabled={isQueueRunning}
                    style={{ marginTop: 12, width: '100%', padding: '8px 12px', background: 'transparent', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.muted, cursor: 'pointer' }}>
                    🔄 Régénérer la fiche
                  </button>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <button
                  onClick={() => handleEnrichSingle(selectedWine.id)}
                  disabled={isQueueRunning}
                  style={{
                    padding: '12px 24px',
                    background: isQueueRunning ? T.surface : T.teal,
                    color: isQueueRunning ? T.muted : '#fff',
                    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500,
                    cursor: isQueueRunning ? 'not-allowed' : 'pointer',
                  }}
                >
                  {currentEnriching === selectedWine.id ? '⏳ En cours...' : '🧠 Lancer la recherche'}
                </button>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>
                  Claude va rechercher et compiler les infos sur ce vin
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
