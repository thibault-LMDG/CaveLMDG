'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { T, wineTypeColor } from '@/lib/theme'
import type { Agent, Wine } from '@/types'

export default function AgentDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [wines, setWines] = useState<(Wine & { cave_domains?: { nom: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ nom: '', nom_famille: '', entreprise: '', telephone: '', email: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: agentData } = await supabase.from('cave_agents').select('*').eq('id', id).single()
      const a = agentData as Agent
      setAgent(a)
      if (a) setForm({
        nom: a.nom || '', nom_famille: a.nom_famille || '', entreprise: a.entreprise || '',
        telephone: a.telephone || '', email: a.email || '', notes: a.notes || '',
      })
      const { data: wineData } = await supabase
        .from('cave_wines').select('*, cave_domains(nom)')
        .eq('agent_id', id).neq('statut', 'archive')
        .order('type').order('region').order('prix_vente')
      setWines((wineData as typeof wines) || [])
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    await supabase.from('cave_agents').update({
      nom: form.nom.trim(), nom_famille: form.nom_famille.trim() || null,
      entreprise: form.entreprise.trim() || null, telephone: form.telephone.trim() || null,
      email: form.email.trim() || null, notes: form.notes.trim() || null,
    }).eq('id', id)
    const { data } = await supabase.from('cave_agents').select('*').eq('id', id).single()
    setAgent(data as Agent)
    setEditing(false)
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>Chargement…</div>
  if (!agent) return <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>Agent introuvable</div>

  const totalStock = wines.reduce((s, w) => s + w.quantite_stock, 0)
  const valeurVente = wines.reduce((s, w) => s + w.quantite_stock * w.prix_vente, 0)
  const francoConditions = [...new Set(wines.map((w) => w.conditions_franco).filter(Boolean))]

  const byType: Record<string, typeof wines> = {}
  wines.forEach((w) => { if (!byType[w.type]) byType[w.type] = []; byType[w.type].push(w) })
  const typeOrder = ['BLANC', 'ROUGE', 'ROSÉ', 'BULLE', 'DEMI-SEC']

  const displayName = [agent.nom, agent.nom_famille].filter(Boolean).join(' ')
  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: `0.5px solid ${T.border}`, background: T.sea, color: T.text, fontSize: 14, outline: 'none' }
  const labelStyle = { fontSize: 11, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4, display: 'block' }

  return (
    <div style={{ padding: '0 0 80px' }}>
      <div style={{ padding: '16px 16px 0' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Agents</button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: T.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: T.teal, fontWeight: 500, flexShrink: 0 }}>
            {agent.nom.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 500, color: T.text }}>{displayName}</div>
            {agent.entreprise && <div style={{ fontSize: 13, color: T.gold, marginTop: 2 }}>🏢 {agent.entreprise}</div>}
          </div>
          <button onClick={() => setEditing(!editing)} style={{ padding: '8px 12px', borderRadius: 8, border: `0.5px solid ${T.border}`, background: editing ? T.gold + '18' : 'transparent', color: editing ? T.gold : T.text2, fontSize: 12, cursor: 'pointer' }}>
            {editing ? 'Annuler' : '✏️ Modifier'}
          </button>
        </div>

        {/* Mode édition */}
        {editing ? (
          <div style={{ padding: 14, background: T.deep, borderRadius: 10, border: `0.5px solid ${T.border}`, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Prénom</label>
                <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Nom</label>
                <input type="text" value={form.nom_famille} onChange={(e) => setForm({ ...form, nom_famille: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Entreprise</label>
              <input type="text" value={form.entreprise} onChange={(e) => setForm({ ...form, entreprise: e.target.value })} placeholder="Nom de l'entreprise" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Téléphone</label>
                <input type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }} />
            </div>
            <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', background: T.gold, color: T.sea, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
              {saving ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        ) : (
          /* Mode lecture — coordonnées */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {agent.telephone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.text2 }}>
                <span>📞</span><span>{agent.telephone}</span>
              </div>
            )}
            {agent.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.text2 }}>
                <span>✉️</span><a href={`mailto:${agent.email}`} style={{ color: T.teal, textDecoration: 'none' }}>{agent.email}</a>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!editing && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {agent.telephone && (
              <a href={`tel:${agent.telephone.replace(/\s/g, '')}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 10, background: T.teal, color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>📞 Appeler</a>
            )}
            {agent.email && (
              <a href={`mailto:${agent.email}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 10, border: `0.5px solid ${T.border}`, background: T.surface, color: T.text, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>✉️ Email</a>
            )}
            {agent.telephone && (
              <a href={`sms:${agent.telephone.replace(/\s/g, '')}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 0', borderRadius: 10, border: `0.5px solid ${T.border}`, background: T.surface, color: T.text, textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>💬 SMS</a>
            )}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px' }}>
        {[
          { label: 'Références', value: wines.length, color: T.gold },
          { label: 'En stock', value: totalStock + ' btl', color: T.up },
          { label: 'Valeur stock', value: Math.round(valeurVente) + '€', color: T.teal },
        ].map((kpi) => (
          <div key={kpi.label} style={{ flex: 1, background: T.deep, borderRadius: 8, padding: '8px 10px', border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{kpi.label}</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: kpi.color, marginTop: 2 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Conditions franco */}
      {francoConditions.length > 0 && (
        <div style={{ margin: '0 16px 16px', padding: 12, borderRadius: 10, background: T.gold + '0c', borderLeft: `3px solid ${T.gold}` }}>
          <div style={{ fontSize: 10, color: T.gold, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Conditions franco</div>
          {francoConditions.map((f, i) => <div key={i} style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{f}</div>)}
        </div>
      )}

      {/* Notes */}
      {agent.notes && !editing && (
        <div style={{ margin: '0 16px 16px', padding: 12, borderRadius: 10, background: T.deep, border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>{agent.notes}</div>
        </div>
      )}

      {/* Wine list */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Vins distribués ({wines.length})</div>
        {typeOrder.map((type) => {
          const typeWines = byType[type]
          if (!typeWines || typeWines.length === 0) return null
          const borderColor = wineTypeColor[type] || T.gold
          return (
            <div key={type} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: borderColor, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: borderColor }} /> {type} ({typeWines.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {typeWines.map((wine) => (
                  <Link key={wine.id} href={`/cave/${wine.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: T.deep, borderRadius: 8, borderLeft: `3px solid ${borderColor}`, textDecoration: 'none', color: T.text }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{wine.cave_domains?.nom || '—'}</div>
                      <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>
                        {wine.cuvee || wine.nom_appellation || ''}{wine.millesime ? ` · ${wine.millesime}` : ''}
                      </div>
                      <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>
                        {wine.region}{wine.cepage ? ` · ${wine.cepage}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{wine.prix_vente}€</div>
                      <div style={{ fontSize: 10, color: T.muted }}>PA {wine.prix_achat_ht}€</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: wine.quantite_stock <= 0 ? T.down : T.up, marginTop: 2 }}>
                        {wine.quantite_stock <= 0 ? 'Épuisé' : `${wine.quantite_stock} btl`}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
