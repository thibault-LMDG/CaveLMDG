'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { T, wineTypeColor } from '@/lib/theme'
import type { Domain, Wine, Agent } from '@/types'

type DomainFull = Domain & { cave_agents?: { id: string; nom: string; telephone: string | null; entreprise: string | null } | null }

export default function DomainDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [domain, setDomain] = useState<DomainFull | null>(null)
  const [wines, setWines] = useState<Wine[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [regionSuggestions, setRegionSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editNom, setEditNom] = useState('')
  const [editRegion, setEditRegion] = useState('')
  const [editCommentaire, setEditCommentaire] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editAgentId, setEditAgentId] = useState<string | null>(null)
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const [saving, setSaving] = useState(false)

  // Archive
  const [confirmArchive, setConfirmArchive] = useState(false)

  const regionRef = useRef<HTMLDivElement>(null)

  async function loadDomain() {
    const [{ data: d }, { data: w }, { data: agentData }, { data: regionData }] = await Promise.all([
      supabase.from('cave_domains').select('*, cave_agents(id, nom, telephone, entreprise)').eq('id', id).single(),
      supabase.from('cave_wines').select('*').eq('domain_id', id).neq('statut', 'archive').order('type').order('prix_vente'),
      supabase.from('cave_agents').select('*').order('nom'),
      supabase.from('cave_domains').select('region').not('region', 'is', null),
    ])

    if (!d) { router.push('/more/domains'); return }

    const dom = d as DomainFull
    setDomain(dom)
    setWines((w as Wine[]) || [])
    setAgents((agentData || []) as Agent[])
    setRegionSuggestions([...new Set((regionData || []).map((r: { region: string }) => r.region))].sort())

    // Init edit fields
    setEditNom(dom.nom)
    setEditRegion(dom.region || '')
    setEditCommentaire(dom.commentaire_domaine || '')
    setEditNotes(dom.notes || '')
    setEditAgentId(dom.agent_id || null)

    setLoading(false)
  }

  useEffect(() => { loadDomain() }, [id, router])

  // Close region dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) setShowRegionDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function startEditing() {
    if (!domain) return
    setEditNom(domain.nom)
    setEditRegion(domain.region || '')
    setEditCommentaire(domain.commentaire_domaine || '')
    setEditNotes(domain.notes || '')
    setEditAgentId(domain.agent_id || null)
    setEditing(true)
  }

  async function handleSave() {
    if (!editNom.trim()) return
    setSaving(true)

    await supabase.from('cave_domains').update({
      nom: editNom.trim(),
      region: editRegion.trim() || null,
      commentaire_domaine: editCommentaire.trim() || null,
      notes: editNotes.trim() || null,
      agent_id: editAgentId,
    }).eq('id', id)

    setEditing(false)
    setSaving(false)
    await loadDomain()
  }

  async function handleArchive() {
    await supabase.from('cave_domains').update({ statut: 'archive' }).eq('id', id)
    router.push('/more/domains')
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>Chargement…</div>
  if (!domain) return null

  const totalStock = wines.reduce((sum, w) => sum + (w.quantite_stock || 0), 0)
  const inStock = wines.filter((w) => (w.quantite_stock || 0) > 0)
  const outOfStock = wines.filter((w) => (w.quantite_stock || 0) === 0)
  const filteredRegions = editRegion
    ? regionSuggestions.filter((r) => r.toLowerCase().includes(editRegion.toLowerCase()))
    : regionSuggestions

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `0.5px solid ${T.border}`,
    background: T.sea,
    color: T.text,
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  }

  const labelStyle = {
    fontSize: 10,
    color: T.teal,
    fontWeight: 500 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    display: 'block',
    marginBottom: 6,
  }

  // ────────── EDIT MODE ──────────
  if (editing) {
    return (
      <div style={{ padding: '16px 16px 100px' }}>
        <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Annuler</button>

        <div style={{ fontSize: 22, fontWeight: 500, color: T.text, marginBottom: 20 }}>Modifier le domaine</div>

        {/* Nom */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Nom du domaine *</label>
          <input type="text" value={editNom} onChange={(e) => setEditNom(e.target.value)} style={inputStyle} />
        </div>

        {/* Région */}
        <div style={{ marginBottom: 18, position: 'relative' }} ref={regionRef}>
          <label style={labelStyle}>Région</label>
          <input
            type="text"
            value={editRegion}
            onChange={(e) => { setEditRegion(e.target.value); setShowRegionDropdown(true) }}
            onFocus={() => setShowRegionDropdown(true)}
            placeholder="Ex : Jura, Provence & Corse…"
            style={inputStyle}
          />
          {showRegionDropdown && filteredRegions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
              background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10,
              marginTop: 4, maxHeight: 180, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {filteredRegions.map((r) => (
                <button key={r} onClick={() => { setEditRegion(r); setShowRegionDropdown(false) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `0.5px solid ${T.border}30`, color: T.text, fontSize: 13, cursor: 'pointer' }}>
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Agent */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>🤝 Agent / Fournisseur</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button onClick={() => setEditAgentId(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                background: editAgentId === null ? T.teal + '15' : T.deep,
                border: `0.5px solid ${editAgentId === null ? T.teal + '50' : T.border}`,
                color: editAgentId === null ? T.teal : T.muted, fontSize: 13, cursor: 'pointer', textAlign: 'left',
              }}>
              <span style={{ width: 28, height: 28, borderRadius: 14, background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>—</span>
              Aucun agent
            </button>
            {agents.map((a) => (
              <button key={a.id} onClick={() => setEditAgentId(editAgentId === a.id ? null : a.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
                  background: editAgentId === a.id ? T.teal + '15' : T.deep,
                  border: `0.5px solid ${editAgentId === a.id ? T.teal + '50' : T.border}`,
                  color: editAgentId === a.id ? T.teal : T.text, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 14,
                  background: editAgentId === a.id ? T.teal + '25' : T.surface,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 500, color: editAgentId === a.id ? T.teal : T.text2, flexShrink: 0,
                }}>{a.nom.charAt(0)}</span>
                <div>
                  <div style={{ fontWeight: 500 }}>{a.nom}</div>
                  {a.entreprise && <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{a.entreprise}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Commentaire */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>🏠 Commentaire domaine</label>
          <textarea value={editCommentaire} onChange={(e) => setEditCommentaire(e.target.value)} rows={4}
            placeholder="Histoire, terroir, philosophie…" style={{ ...inputStyle, resize: 'vertical' as const }} />
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>📝 Notes internes</label>
          <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2}
            placeholder="Contact, conditions, remarques…" style={{ ...inputStyle, resize: 'vertical' as const }} />
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving || !editNom.trim()}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: !editNom.trim() ? T.surface : T.gold,
            color: !editNom.trim() ? T.muted : T.sea,
            fontSize: 15, fontWeight: 600, border: 'none',
            cursor: saving || !editNom.trim() ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}>
          {saving ? 'Enregistrement…' : 'Sauvegarder'}
        </button>
      </div>
    )
  }

  // ────────── VIEW MODE ──────────
  return (
    <div style={{ padding: '16px 16px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0 }}>← Retour</button>
        <button onClick={startEditing} style={{ background: 'none', border: 'none', color: T.gold, fontSize: 13, cursor: 'pointer', padding: 0 }}>✏️ Modifier</button>
      </div>

      {/* Header */}
      <div style={{ fontSize: 22, fontWeight: 500, color: T.text, marginBottom: 4 }}>{domain.nom}</div>
      {domain.region && <div style={{ fontSize: 13, color: T.text2, marginBottom: 12 }}>{domain.region}</div>}

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Vins</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.gold, marginTop: 2 }}>{wines.length}</div>
        </div>
        <div style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>En stock</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: T.up, marginTop: 2 }}>{totalStock} btl</div>
        </div>
        <div style={{ flex: 1, background: T.deep, borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Disponibles</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: inStock.length === wines.length ? T.up : T.gold, marginTop: 2 }}>{inStock.length}/{wines.length}</div>
        </div>
      </div>

      {/* Agent */}
      {domain.cave_agents && (
        <Link href={`/more/agents/${domain.cave_agents.id}`} style={{ textDecoration: 'none' }}>
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: T.deep,
            border: `0.5px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: 16, background: T.teal + '20',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 500, color: T.teal, flexShrink: 0,
            }}>{domain.cave_agents.nom.charAt(0)}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{domain.cave_agents.nom}</div>
              {domain.cave_agents.telephone && <div style={{ fontSize: 11, color: T.muted }}>📞 {domain.cave_agents.telephone}</div>}
            </div>
            <div style={{ fontSize: 10, color: T.teal }}>Agent ›</div>
          </div>
        </Link>
      )}

      {/* Commentaire domaine */}
      <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: T.deep, border: `0.5px solid ${T.border}` }}>
        <div style={{ fontSize: 10, color: T.teal, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>🏠 Le domaine</div>
        <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>
          {domain.commentaire_domaine || <span style={{ color: T.muted, fontStyle: 'italic' }}>Aucune description. Cliquez Modifier pour ajouter.</span>}
        </div>
      </div>

      {/* Notes internes */}
      {domain.notes && (
        <div style={{ marginBottom: 16, padding: 14, borderRadius: 10, background: T.deep, border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>📝 Notes internes</div>
          <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>{domain.notes}</div>
        </div>
      )}

      {/* Vins en stock */}
      {inStock.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: T.up, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            En carte ({inStock.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {inStock.map((w) => (
              <Link key={w.id} href={`/cave/${w.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 10, background: T.deep,
                  border: `0.5px solid ${T.border}`, borderLeft: `3px solid ${wineTypeColor[w.type] || T.gold}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{w.cuvee || w.nom_appellation || w.type}</div>
                    <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>{w.type} · {w.nom_appellation || ''} {w.millesime || ''}</div>
                    {w.commentaire_client && <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic', marginTop: 2 }}>{w.commentaire_client}</div>}
                  </div>
                  <div style={{ textAlign: 'right', marginLeft: 12, flexShrink: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: T.text }}>{w.prix_vente}€</div>
                    <div style={{ fontSize: 10, color: (w.quantite_stock || 0) <= (w.stock_minimum || 3) ? T.down : T.up }}>{w.quantite_stock} btl</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Vins hors stock */}
      {outOfStock.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: T.down, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Épuisé ({outOfStock.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
            {outOfStock.map((w) => (
              <Link key={w.id} href={`/cave/${w.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '8px 14px', borderRadius: 8, background: T.deep,
                  border: `0.5px solid ${T.border}15`, opacity: 0.5,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ fontSize: 12, color: T.text2 }}>{w.cuvee || w.nom_appellation || w.type}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{w.prix_vente}€</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Archiver */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        {!confirmArchive ? (
          <button onClick={() => setConfirmArchive(true)}
            style={{ background: 'none', border: 'none', color: T.muted, fontSize: 12, cursor: 'pointer', padding: 4, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Archiver ce domaine
          </button>
        ) : (
          <div style={{ padding: 16, borderRadius: 10, background: T.deep, border: `0.5px solid ${T.down}30` }}>
            <div style={{ fontSize: 13, color: T.rose, marginBottom: 4 }}>Archiver ce domaine ?</div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>
              {wines.length > 0
                ? `⚠️ Ce domaine a ${wines.length} vin${wines.length > 1 ? 's' : ''} actif${wines.length > 1 ? 's' : ''}. Il disparaîtra de la liste mais les vins ne seront pas affectés.`
                : 'Il disparaîtra de la liste des domaines.'
              }
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleArchive}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, background: T.down + '20', border: `0.5px solid ${T.down}40`, color: T.down, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Oui, archiver
              </button>
              <button onClick={() => setConfirmArchive(false)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `0.5px solid ${T.border}`, background: 'transparent', color: T.text2, fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
