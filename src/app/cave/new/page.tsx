'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { Agent, Domain, PricingGrid, WineType } from '@/types'

const WINE_TYPES: WineType[] = ['BLANC', 'ROUGE', 'ROSÉ', 'BULLE', 'DEMI-SEC']
const APPELLATIONS = ['AOP', 'IGP', 'VDF']
const REGIONS = ['Alsace', 'Bourgogne', 'Bordeaux', 'Champagne', 'Languedoc-Roussillon', 'Loire', 'Provence & Corse', 'Sud-Ouest', 'Vallée du Rhône', 'Vénétie']

export default function NewWinePage() {
  const router = useRouter()

  // Reference data
  const [agents, setAgents] = useState<Agent[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [pricingGrid, setPricingGrid] = useState<PricingGrid[]>([])

  // Form fields
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
  const [commentaireClient, setCommentaireClient] = useState('')

  // UI states
  const [showNewAgent, setShowNewAgent] = useState(false)
  const [newAgentNom, setNewAgentNom] = useState('')
  const [newAgentTel, setNewAgentTel] = useState('')
  const [showNewDomain, setShowNewDomain] = useState(false)
  const [newDomainNom, setNewDomainNom] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: a }, { data: d }, { data: p }] = await Promise.all([
        supabase.from('cave_agents').select('*').order('nom'),
        supabase.from('cave_domains').select('*').order('nom'),
        supabase.from('cave_pricing_grid').select('*').order('prix_achat_seuil'),
      ])
      setAgents((a as Agent[]) || [])
      setDomains((d as Domain[]) || [])
      setPricingGrid((p as PricingGrid[]) || [])
    }
    load()
  }, [])

  // Auto pricing
  const prixFpInclus = (parseFloat(prixAchat) || 0) + (parseFloat(fraisPort) || 0)

  const prixSuggere = useMemo(() => {
    if (prixFpInclus <= 0 || pricingGrid.length === 0) return null
    // Find closest grid entry
    let closest = pricingGrid[0]
    for (const g of pricingGrid) {
      if (Math.abs(g.prix_achat_seuil - prixFpInclus) < Math.abs(closest.prix_achat_seuil - prixFpInclus)) {
        closest = g
      }
    }
    // Interpolate
    const idx = pricingGrid.indexOf(closest)
    if (idx > 0 && prixFpInclus < closest.prix_achat_seuil) {
      const prev = pricingGrid[idx - 1]
      const ratio = (prixFpInclus - prev.prix_achat_seuil) / (closest.prix_achat_seuil - prev.prix_achat_seuil)
      const coef = prev.coefficient + ratio * (closest.coefficient - prev.coefficient)
      return Math.round(prixFpInclus * coef)
    }
    return Math.round(prixFpInclus * closest.coefficient)
  }, [prixFpInclus, pricingGrid])

  const coefficientActuel = prixFpInclus > 0 && parseFloat(prixVente) > 0
    ? (parseFloat(prixVente) / prixFpInclus).toFixed(2)
    : null

  const bevcostActuel = parseFloat(prixVente) > 0 && prixFpInclus > 0
    ? ((prixFpInclus / parseFloat(prixVente)) * 100).toFixed(1) + '%'
    : null

  // Filtered lists
  const filteredAgents = agentSearch
    ? agents.filter((a) => a.nom.toLowerCase().includes(agentSearch.toLowerCase()))
    : agents

  const filteredDomains = domainSearch
    ? domains.filter((d) => d.nom.toLowerCase().includes(domainSearch.toLowerCase()))
    : domains

  // Create new agent inline
  async function createAgent() {
    if (!newAgentNom.trim()) return
    const { data, error: err } = await supabase
      .from('cave_agents')
      .insert({ nom: newAgentNom.trim(), telephone: newAgentTel.trim() || null })
      .select()
      .single()
    if (data) {
      setAgents((prev) => [...prev, data as Agent].sort((a, b) => a.nom.localeCompare(b.nom)))
      setAgentId(data.id)
      setAgentSearch(data.nom)
      setShowNewAgent(false)
      setNewAgentNom('')
      setNewAgentTel('')
    }
  }

  // Create new domain inline
  async function createDomain() {
    if (!newDomainNom.trim()) return
    const { data, error: err } = await supabase
      .from('cave_domains')
      .insert({ nom: newDomainNom.trim(), region: region || null })
      .select()
      .single()
    if (data) {
      setDomains((prev) => [...prev, data as Domain].sort((a, b) => a.nom.localeCompare(b.nom)))
      setDomainId(data.id)
      setDomainSearch(data.nom)
      setShowNewDomain(false)
      setNewDomainNom('')
    }
  }

  // Submit
  async function handleSubmit() {
    if (!region) { setError('Région requise'); return }
    if (!prixAchat) { setError('Prix d\'achat requis'); return }
    if (!prixVente) { setError('Prix de vente requis'); return }

    setSaving(true)
    setError('')

    const { data, error: err } = await supabase
      .from('cave_wines')
      .insert({
        type,
        region,
        type_appellation: typeAppellation || null,
        nom_appellation: nomAppellation.trim() || null,
        domain_id: domainId,
        cuvee: cuvee.trim() || null,
        cepage: cepage.trim() || null,
        millesime: millesime.trim() || null,
        prix_achat_ht: parseFloat(prixAchat),
        frais_port: parseFloat(fraisPort) || 0,
        prix_vente: parseFloat(prixVente),
        agent_id: agentId,
        conditions_franco: conditionsFranco.trim() || null,
        commentaire_serveur: commentaireServeur.trim() || null,
        commentaire_client: commentaireClient.trim() || null,
      })
      .select()
      .single()

    if (err) {
      setError('Erreur : ' + err.message)
      setSaving(false)
    } else if (data) {
      router.push(`/cave/${data.id}`)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: `0.5px solid ${T.border}`,
    background: T.sea,
    color: T.text,
    fontSize: 14,
    outline: 'none',
  }

  const labelStyle = {
    fontSize: 11,
    color: T.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div style={{ padding: '16px 16px 120px' }}>
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}
      >
        ← Retour
      </button>

      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 20 }}>
        Nouveau vin
      </div>

      {/* Type de vin */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Type de vin</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {WINE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 13,
                border: `0.5px solid ${type === t ? T.gold + '60' : T.border}`,
                background: type === t ? T.gold + '18' : 'transparent',
                color: type === t ? T.gold : T.text2,
                cursor: 'pointer',
                fontWeight: type === t ? 500 : 400,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Région */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Région</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                fontSize: 11,
                border: `0.5px solid ${region === r ? T.teal + '60' : T.border}`,
                background: region === r ? T.teal + '18' : 'transparent',
                color: region === r ? T.teal : T.text2,
                cursor: 'pointer',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Appellation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 100 }}>
          <label style={labelStyle}>Type appel.</label>
          <select
            value={typeAppellation}
            onChange={(e) => setTypeAppellation(e.target.value)}
            style={{ ...inputStyle, appearance: 'none' }}
          >
            {APPELLATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Nom appellation</label>
          <input type="text" value={nomAppellation} onChange={(e) => setNomAppellation(e.target.value)} placeholder="ex: Sancerre" style={inputStyle} />
        </div>
      </div>

      {/* Domaine */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Domaine</label>
        {!showNewDomain ? (
          <>
            <input
              type="text"
              value={domainSearch}
              onChange={(e) => { setDomainSearch(e.target.value); setDomainId(null) }}
              placeholder="Chercher un domaine…"
              style={inputStyle}
            />
            {domainSearch && !domainId && (
              <div style={{ background: T.deep, border: `0.5px solid ${T.border}`, borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                {filteredDomains.slice(0, 8).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { setDomainId(d.id); setDomainSearch(d.nom) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: `0.5px solid ${T.border}20`, color: T.text, fontSize: 13, cursor: 'pointer' }}
                  >
                    {d.nom} <span style={{ color: T.muted, fontSize: 11 }}>{d.region}</span>
                  </button>
                ))}
                <button
                  onClick={() => { setShowNewDomain(true); setNewDomainNom(domainSearch) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: T.gold, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                >
                  + Créer « {domainSearch} »
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 12, background: T.deep, borderRadius: 8, border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.gold, fontWeight: 500, marginBottom: 8 }}>Nouveau domaine</div>
            <input type="text" value={newDomainNom} onChange={(e) => setNewDomainNom(e.target.value)} placeholder="Nom du domaine" style={{ ...inputStyle, marginBottom: 8 }} autoFocus />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createDomain} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: T.gold, color: T.sea, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Créer
              </button>
              <button onClick={() => { setShowNewDomain(false); setNewDomainNom('') }} style={{ padding: '10px 16px', borderRadius: 8, border: `0.5px solid ${T.border}`, background: 'transparent', color: T.text2, fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        )}
        {domainId && <div style={{ fontSize: 11, color: T.up, marginTop: 4 }}>✓ {domainSearch}</div>}
      </div>

      {/* Cuvée, Cépage, Millésime */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Cuvée</label>
        <input type="text" value={cuvee} onChange={(e) => setCuvee(e.target.value)} placeholder="Nom de la cuvée" style={inputStyle} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Cépage</label>
          <input type="text" value={cepage} onChange={(e) => setCepage(e.target.value)} placeholder="ex: Chenin" style={inputStyle} />
        </div>
        <div style={{ width: 100 }}>
          <label style={labelStyle}>Millésime</label>
          <input type="text" inputMode="numeric" value={millesime} onChange={(e) => setMillesime(e.target.value)} placeholder="2024" style={inputStyle} />
        </div>
      </div>

      {/* Prix */}
      <div style={{ padding: 14, background: T.deep, borderRadius: 10, border: `0.5px solid ${T.border}`, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: T.gold, fontWeight: 500, marginBottom: 10 }}>💰 Pricing</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>PA HT (€)</label>
            <input type="number" inputMode="decimal" step="0.01" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>FDP (€)</label>
            <input type="number" inputMode="decimal" step="0.01" value={fraisPort} onChange={(e) => setFraisPort(e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>
        </div>

        {prixFpInclus > 0 && (
          <div style={{ fontSize: 12, color: T.text2, marginBottom: 10 }}>
            PA FDP inclus : <span style={{ color: T.text, fontWeight: 500 }}>{prixFpInclus.toFixed(2)}€</span>
            {prixSuggere && (
              <span style={{ marginLeft: 8 }}>
                → PV suggéré : <button
                  onClick={() => setPrixVente(String(prixSuggere))}
                  style={{ background: 'none', border: 'none', color: T.gold, fontWeight: 500, cursor: 'pointer', textDecoration: 'underline', fontSize: 12, padding: 0 }}
                >
                  {prixSuggere}€
                </button>
              </span>
            )}
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <label style={labelStyle}>Prix de vente TTC (€)</label>
          <input type="number" inputMode="decimal" step="1" value={prixVente} onChange={(e) => setPrixVente(e.target.value)} placeholder="0" style={{ ...inputStyle, fontSize: 18, fontWeight: 500 }} />
        </div>

        {coefficientActuel && (
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <span style={{ color: T.text2 }}>Coefficient : <span style={{ color: T.teal, fontWeight: 500 }}>x{coefficientActuel}</span></span>
            <span style={{ color: T.text2 }}>BevCost : <span style={{ color: T.blue, fontWeight: 500 }}>{bevcostActuel}</span></span>
          </div>
        )}
      </div>

      {/* Agent / Fournisseur */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Agent / Fournisseur</label>
        {!showNewAgent ? (
          <>
            <input
              type="text"
              value={agentSearch}
              onChange={(e) => { setAgentSearch(e.target.value); setAgentId(null) }}
              placeholder="Chercher un agent…"
              style={inputStyle}
            />
            {agentSearch && !agentId && (
              <div style={{ background: T.deep, border: `0.5px solid ${T.border}`, borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                {filteredAgents.slice(0, 8).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setAgentId(a.id); setAgentSearch(a.nom) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: `0.5px solid ${T.border}20`, color: T.text, fontSize: 13, cursor: 'pointer' }}
                  >
                    {a.nom} {a.telephone && <span style={{ color: T.muted, fontSize: 11 }}>· {a.telephone}</span>}
                  </button>
                ))}
                <button
                  onClick={() => { setShowNewAgent(true); setNewAgentNom(agentSearch) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: T.gold, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                >
                  + Créer « {agentSearch} »
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 12, background: T.deep, borderRadius: 8, border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.gold, fontWeight: 500, marginBottom: 8 }}>Nouvel agent</div>
            <input type="text" value={newAgentNom} onChange={(e) => setNewAgentNom(e.target.value)} placeholder="Nom de l'agent" style={{ ...inputStyle, marginBottom: 8 }} autoFocus />
            <input type="tel" value={newAgentTel} onChange={(e) => setNewAgentTel(e.target.value)} placeholder="Téléphone (optionnel)" style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createAgent} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: T.gold, color: T.sea, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Créer
              </button>
              <button onClick={() => { setShowNewAgent(false); setNewAgentNom(''); setNewAgentTel('') }} style={{ padding: '10px 16px', borderRadius: 8, border: `0.5px solid ${T.border}`, background: 'transparent', color: T.text2, fontSize: 13, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
          </div>
        )}
        {agentId && <div style={{ fontSize: 11, color: T.up, marginTop: 4 }}>✓ {agentSearch}</div>}
      </div>

      {/* Conditions franco */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Conditions franco</label>
        <input type="text" value={conditionsFranco} onChange={(e) => setConditionsFranco(e.target.value)} placeholder="ex: 60 bouteilles" style={inputStyle} />
      </div>

      {/* Commentaires */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Pitch serveur</label>
        <textarea
          value={commentaireServeur}
          onChange={(e) => setCommentaireServeur(e.target.value)}
          placeholder="Argumentaire pour l'équipe de salle…"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Description client (sur carte)</label>
        <textarea
          value={commentaireClient}
          onChange={(e) => setCommentaireClient(e.target.value)}
          placeholder="Texte visible sur la carte des vins…"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      {/* Error */}
      {error && <div style={{ fontSize: 13, color: T.rose, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        style={{
          width: '100%',
          padding: '16px 0',
          borderRadius: 10,
          border: 'none',
          background: T.gold,
          color: T.sea,
          fontSize: 16,
          fontWeight: 500,
          cursor: saving ? 'wait' : 'pointer',
          opacity: saving ? 0.5 : 1,
          position: 'sticky',
          bottom: 72,
        }}
      >
        {saving ? 'Enregistrement…' : 'Ajouter le vin'}
      </button>
    </div>
  )
}
