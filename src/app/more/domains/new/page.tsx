'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { Agent } from '@/types'

export default function NewDomainPage() {
  const router = useRouter()
  const [nom, setNom] = useState('')
  const [region, setRegion] = useState('')
  const [regionSuggestions, setRegionSuggestions] = useState<string[]>([])
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [commentaire, setCommentaire] = useState('')
  const [notes, setNotes] = useState('')
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const regionRef = useRef<HTMLDivElement>(null)

  // Load agents + existing regions
  useEffect(() => {
    async function load() {
      const [{ data: agentData }, { data: regionData }] = await Promise.all([
        supabase.from('cave_agents').select('*').order('nom'),
        supabase.from('cave_domains').select('region').not('region', 'is', null),
      ])
      setAgents((agentData || []) as Agent[])
      // Deduplicate regions
      const uniqueRegions = [...new Set((regionData || []).map((r: { region: string }) => r.region))].sort()
      setRegionSuggestions(uniqueRegions)
    }
    load()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) {
        setShowRegionDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredRegions = region
    ? regionSuggestions.filter((r) => r.toLowerCase().includes(region.toLowerCase()))
    : regionSuggestions

  async function handleSave() {
    setError('')
    const trimmedNom = nom.trim()
    if (!trimmedNom) {
      setError('Le nom du domaine est requis')
      return
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('cave_domains')
      .select('id')
      .ilike('nom', trimmedNom)
      .limit(1)

    if (existing && existing.length > 0) {
      setError(`Le domaine "${trimmedNom}" existe déjà`)
      return
    }

    setSaving(true)

    const { data, error: insertError } = await supabase
      .from('cave_domains')
      .insert({
        nom: trimmedNom,
        region: region.trim() || null,
        commentaire_domaine: commentaire.trim() || null,
        notes: notes.trim() || null,
        agent_id: agentId,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(`Erreur : ${insertError.message}`)
      setSaving(false)
      return
    }

    router.push(`/more/domains/${data.id}`)
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `0.5px solid ${T.border}`,
    background: T.deep,
    color: T.text,
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle = {
    fontSize: 11,
    color: T.teal,
    fontWeight: 500 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    display: 'block',
    marginBottom: 6,
  }

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}
      >
        ← Retour
      </button>

      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 4 }}>Nouveau domaine</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 24 }}>Ajouter un domaine viticole à la cave</div>

      {/* Nom du domaine */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Nom du domaine *</label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex : Château de Pibarnon"
          style={inputStyle}
        />
      </div>

      {/* Région — texte libre avec suggestions */}
      <div style={{ marginBottom: 20, position: 'relative' }} ref={regionRef}>
        <label style={labelStyle}>Région</label>
        <input
          type="text"
          value={region}
          onChange={(e) => { setRegion(e.target.value); setShowRegionDropdown(true) }}
          onFocus={() => setShowRegionDropdown(true)}
          placeholder="Ex : Jura, Provence & Corse…"
          style={inputStyle}
        />
        {showRegionDropdown && filteredRegions.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 20,
            background: T.card,
            border: `0.5px solid ${T.border}`,
            borderRadius: 10,
            marginTop: 4,
            maxHeight: 200,
            overflowY: 'auto',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {filteredRegions.map((r) => (
              <button
                key={r}
                onClick={() => { setRegion(r); setShowRegionDropdown(false) }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `0.5px solid ${T.border}30`,
                  color: T.text,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {r}
              </button>
            ))}
          </div>
        )}
        {region && !regionSuggestions.includes(region) && region.trim().length > 1 && (
          <div style={{ fontSize: 11, color: T.blue, marginTop: 4 }}>
            ✨ Nouvelle région — sera créée automatiquement
          </div>
        )}
      </div>

      {/* Agent / Fournisseur */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>🤝 Agent / Fournisseur</label>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
          Les vins de ce domaine hériteront de cet agent par défaut.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Option "Aucun" */}
          <button
            onClick={() => setAgentId(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 10,
              background: agentId === null ? T.teal + '15' : T.deep,
              border: `0.5px solid ${agentId === null ? T.teal + '50' : T.border}`,
              color: agentId === null ? T.teal : T.muted,
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ width: 32, height: 32, borderRadius: 16, background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>—</span>
            Aucun agent
          </button>

          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setAgentId(agentId === agent.id ? null : agent.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 10,
                background: agentId === agent.id ? T.teal + '15' : T.deep,
                border: `0.5px solid ${agentId === agent.id ? T.teal + '50' : T.border}`,
                color: agentId === agent.id ? T.teal : T.text,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: agentId === agent.id ? T.teal + '25' : T.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 500,
                color: agentId === agent.id ? T.teal : T.text2,
                flexShrink: 0,
              }}>
                {agent.nom.charAt(0)}
              </span>
              <div>
                <div style={{ fontWeight: 500 }}>{agent.nom}</div>
                {agent.entreprise && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{agent.entreprise}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Commentaire domaine */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>🏠 Commentaire domaine</label>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
          Histoire, terroir, philosophie du vigneron… Partagé entre tous les vins du domaine.
        </div>
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={4}
          placeholder="Ex : Domaine familial sur les hauteurs de La Cadière. Biodynamie, sols argilo-calcaires…"
          style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.5 }}
        />
      </div>

      {/* Notes internes */}
      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>📝 Notes internes</label>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
          Notes privées (contact, conditions, remarques…)
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ex : Visite prévue en septembre, demander allocations 2025"
          style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.5 }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: T.down + '15',
          border: `0.5px solid ${T.down}30`,
          color: T.down,
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSave}
        disabled={saving || !nom.trim()}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 12,
          background: !nom.trim() ? T.surface : T.gold,
          color: !nom.trim() ? T.muted : T.sea,
          fontSize: 15,
          fontWeight: 600,
          border: 'none',
          cursor: saving || !nom.trim() ? 'default' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Enregistrement…' : 'Ajouter le domaine'}
      </button>
    </div>
  )
}
