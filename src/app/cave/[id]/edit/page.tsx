'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { Agent, Domain, PricingGrid, Wine, WineType } from '@/types'

const WINE_TYPES: WineType[] = ['BLANC', 'ROUGE', 'ROSÉ', 'BULLE', 'DEMI-SEC']
const APPELLATIONS = ['AOP', 'IGP', 'VDF']
const REGIONS = ['Alsace', 'Bourgogne', 'Bordeaux', 'Champagne', 'Languedoc-Roussillon', 'Loire', 'Provence & Corse', 'Sud-Ouest', 'Vallée du Rhône', 'Vénétie']

export default function EditWinePage() {
  const { id } = useParams()
  const router = useRouter()
  const [wine, setWine] = useState<Wine | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [pricingGrid, setPricingGrid] = useState<PricingGrid[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [type, setType] = useState<WineType>('BLANC')
  const [region, setRegion] = useState('')
  const [typeAppellation, setTypeAppellation] = useState('AOP')
  const [nomAppellation, setNomAppellation] = useState('')
  const [domainId, setDomainId] = useState<string | null>(null)
  const [domainSearch, setDomainSearch] = useState('')
  const [cuvee, setCuvee] = useState('')
  const [cepage, setCepage] = useState('')
  const [millesime, setMillesime] = useState('')
  const [prixAchat, setPrixAchat] = useState('')
  const [fraisPort, setFraisPort] = useState('')
  const [prixVente, setPrixVente] = useState('')
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agentSearch, setAgentSearch] = useState('')
  const [conditionsFranco, setConditionsFranco] = useState('')
  const [commentaireServeur, setCommentaireServeur] = useState('')
  const [commentaireCuvee, setCommentaireCuvee] = useState('')
  const [commentaireClient, setCommentaireClient] = useState('')
  const [accordsCarte, setAccordsCarte] = useState('')
  const [auVerre, setAuVerre] = useState(false)
  const [stockMinimum, setStockMinimum] = useState('3')
  const [emplacement, setEmplacement] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: w }, { data: a }, { data: d }, { data: p }] = await Promise.all([
        supabase.from('cave_wines').select('*, cave_domains(nom, commentaire_domaine), cave_agents(nom)').eq('id', id).single(),
        supabase.from('cave_agents').select('*').order('nom'),
        supabase.from('cave_domains').select('*').order('nom'),
        supabase.from('cave_pricing_grid').select('*').order('prix_achat_seuil'),
      ])
      if (!w) { router.push('/cave'); return }
      const wine = w as Wine & { cave_domains?: Domain; cave_agents?: Agent }
      setWine(wine)
      setAgents((a as Agent[]) || [])
      setDomains((d as Domain[]) || [])
      setPricingGrid((p as PricingGrid[]) || [])

      // Fill form
      setType(wine.type)
      setRegion(wine.region || '')
      setTypeAppellation(wine.type_appellation || 'AOP')
      setNomAppellation(wine.nom_appellation || '')
      setDomainId(wine.domain_id)
      setDomainSearch(wine.cave_domains?.nom || '')
      setCuvee(wine.cuvee || '')
      setCepage(wine.cepage || '')
      setMillesime(wine.millesime || '')
      setPrixAchat(wine.prix_achat_ht?.toString() || '')
      setFraisPort(wine.frais_port?.toString() || '')
      setPrixVente(wine.prix_vente?.toString() || '')
      setAgentId(wine.agent_id)
      setAgentSearch(wine.cave_agents?.nom || '')
      setConditionsFranco(wine.conditions_franco || '')
      setCommentaireServeur(wine.commentaire_serveur || wine.cave_domains?.commentaire_domaine || '')
      setCommentaireCuvee(wine.commentaire_cuvee || '')
      setCommentaireClient(wine.commentaire_client || '')
      setAccordsCarte(wine.accords_carte || '')
      setAuVerre(wine.au_verre || false)
      setStockMinimum(wine.stock_minimum?.toString() || '3')
      setEmplacement(wine.emplacement || '')
      setLoading(false)
    }
    load()
  }, [id, router])

  const filteredDomains = domainSearch ? domains.filter(d => d.nom.toLowerCase().includes(domainSearch.toLowerCase())) : domains
  const filteredAgents = agentSearch ? agents.filter(a => a.nom.toLowerCase().includes(agentSearch.toLowerCase())) : agents

  async function handleSave() {
    if (!prixAchat || !prixVente) { setError('Prix achat et prix vente requis'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('cave_wines').update({
      type, region, type_appellation: typeAppellation, nom_appellation: nomAppellation.trim() || null,
      domain_id: domainId, cuvee: cuvee.trim() || null, cepage: cepage.trim() || null, millesime: millesime.trim() || null,
      prix_achat_ht: parseFloat(prixAchat), frais_port: parseFloat(fraisPort) || 0, prix_vente: parseFloat(prixVente),
      agent_id: agentId, conditions_franco: conditionsFranco.trim() || null,
      commentaire_serveur: commentaireServeur.trim() || null,
      commentaire_cuvee: commentaireCuvee.trim() || null,
      commentaire_client: commentaireClient.trim() || null,
      accords_carte: accordsCarte.trim() || null,
      au_verre: auVerre, stock_minimum: parseInt(stockMinimum) || 3,
      emplacement: emplacement.trim() || null,
    }).eq('id', id)
    if (err) { setError('Erreur : ' + err.message); setSaving(false) }
    else { router.push(`/cave/${id}`) }
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: `0.5px solid ${T.border}`, background: T.sea, color: T.text, fontSize: 14, outline: 'none' }
  const labelStyle = { fontSize: 11, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4, display: 'block' }
  const rowStyle = { display: 'flex', gap: 8, marginBottom: 16 }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>Chargement…</div>

  return (
    <div style={{ padding: '16px 16px 120px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Retour</button>
      <div style={{ fontSize: 22, fontWeight: 500, color: T.text, marginBottom: 20 }}>Modifier le vin</div>

      {/* Type + Région */}
      <div style={rowStyle}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as WineType)} style={inputStyle}>
            {WINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Région</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle}>
            <option value="">—</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Appellation */}
      <div style={rowStyle}>
        <div style={{ width: 80 }}>
          <label style={labelStyle}>Type</label>
          <select value={typeAppellation} onChange={(e) => setTypeAppellation(e.target.value)} style={inputStyle}>
            {APPELLATIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Appellation</label>
          <input type="text" value={nomAppellation} onChange={(e) => setNomAppellation(e.target.value)} placeholder="ex: Chablis" style={inputStyle} />
        </div>
      </div>

      {/* Domaine */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Domaine</label>
        <input type="text" value={domainSearch} onChange={(e) => { setDomainSearch(e.target.value); setDomainId(null) }} placeholder="Chercher un domaine…" style={inputStyle} />
        {domainSearch && !domainId && (
          <div style={{ maxHeight: 150, overflowY: 'auto', background: T.deep, borderRadius: 8, border: `0.5px solid ${T.border}`, marginTop: 4 }}>
            {filteredDomains.slice(0, 8).map(d => (
              <button key={d.id} onClick={() => { setDomainId(d.id); setDomainSearch(d.nom) }} style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: T.text, fontSize: 13, textAlign: 'left', cursor: 'pointer', borderBottom: `0.5px solid ${T.border}15` }}>
                {d.nom}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cuvée, Cépage, Millésime */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Cuvée</label>
        <input type="text" value={cuvee} onChange={(e) => setCuvee(e.target.value)} placeholder="ex: Les Terrasses" style={inputStyle} />
      </div>
      <div style={rowStyle}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Cépage</label>
          <input type="text" value={cepage} onChange={(e) => setCepage(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ width: 100 }}>
          <label style={labelStyle}>Millésime</label>
          <input type="text" value={millesime} onChange={(e) => setMillesime(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Prix */}
      <div style={rowStyle}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Prix achat HT</label>
          <input type="number" step="0.01" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Frais port</label>
          <input type="number" step="0.01" value={fraisPort} onChange={(e) => setFraisPort(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Prix vente TTC</label>
          <input type="number" step="0.01" value={prixVente} onChange={(e) => setPrixVente(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Agent */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Agent / Fournisseur</label>
        <input type="text" value={agentSearch} onChange={(e) => { setAgentSearch(e.target.value); setAgentId(null) }} placeholder="Chercher un agent…" style={inputStyle} />
        {agentSearch && !agentId && (
          <div style={{ maxHeight: 150, overflowY: 'auto', background: T.deep, borderRadius: 8, border: `0.5px solid ${T.border}`, marginTop: 4 }}>
            {filteredAgents.slice(0, 8).map(a => (
              <button key={a.id} onClick={() => { setAgentId(a.id); setAgentSearch(a.nom) }} style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: T.text, fontSize: 13, textAlign: 'left', cursor: 'pointer', borderBottom: `0.5px solid ${T.border}15` }}>
                {a.nom}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Conditions franco</label>
        <input type="text" value={conditionsFranco} onChange={(e) => setConditionsFranco(e.target.value)} style={inputStyle} />
      </div>

      {/* Options */}
      <div style={rowStyle}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Stock minimum</label>
          <input type="number" value={stockMinimum} onChange={(e) => setStockMinimum(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Emplacement</label>
          <input type="text" value={emplacement} onChange={(e) => setEmplacement(e.target.value)} placeholder="ex: B3" style={inputStyle} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 0' }}>
            <input type="checkbox" checked={auVerre} onChange={(e) => setAuVerre(e.target.checked)} />
            <span style={{ fontSize: 13, color: T.text }}>Au verre</span>
          </label>
        </div>
      </div>

      {/* Commentaires */}
      <div style={{ margin: '24px 0 16px', padding: '14px 0', borderTop: `0.5px solid ${T.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 12 }}>Commentaires</div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>🏠 Le domaine</label>
          <textarea value={commentaireServeur} onChange={(e) => setCommentaireServeur(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>🍷 La cuvée</label>
          <textarea value={commentaireCuvee} onChange={(e) => setCommentaireCuvee(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>🍽️ Accords carte LMDG</label>
          <textarea value={accordsCarte} onChange={(e) => setAccordsCarte(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>📋 Sur la carte (client)</label>
          <textarea value={commentaireClient} onChange={(e) => setCommentaireClient(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }} />
        </div>
      </div>

      {error && <div style={{ fontSize: 13, color: T.rose, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

      <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px 0', borderRadius: 10, border: 'none', background: T.gold, color: T.sea, fontSize: 16, fontWeight: 500, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.5 : 1 }}>
        {saving ? 'Enregistrement…' : 'Sauvegarder les modifications'}
      </button>
    </div>
  )
}
