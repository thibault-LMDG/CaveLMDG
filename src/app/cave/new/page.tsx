'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import type { Agent, Domain, PricingGrid, WineType } from '@/types'

const WINE_TYPES: WineType[] = ['BLANC', 'ROUGE', 'ROSÉ', 'BULLE', 'DEMI-SEC']
const APPELLATIONS = ['AOP', 'IGP', 'VDF']

export default function NewWinePage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [pricingGrid, setPricingGrid] = useState<PricingGrid[]>([])

  const [type, setType] = useState<WineType>('BLANC')
  const [region, setRegion] = useState('')
  const [typeAppellation, setTypeAppellation] = useState('AOP')
  const [nomAppellation, setNomAppellation] = useState('')
  const [domainId, setDomainId] = useState<string | null>(null)
  const [domainSearch, setDomainSearch] = useState('')
  const [regionSuggestions, setRegionSuggestions] = useState<string[]>([])
  const [showRegionDropdown, setShowRegionDropdown] = useState(false)
  const regionRef = useRef<HTMLDivElement>(null)
  const [cuvee, setCuvee] = useState('')
  const [cepage, setCepage] = useState('')
  const [millesime, setMillesime] = useState('')
  const [prixAchat, setPrixAchat] = useState('')
  const [fraisPort, setFraisPort] = useState('')
  const [prixVente, setPrixVente] = useState('')
  const [prixForce, setPrixForce] = useState(false)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [agentSearch, setAgentSearch] = useState('')
  const [conditionsFranco, setConditionsFranco] = useState('')
  const [commentaireServeur, setCommentaireServeur] = useState('')
  const [commentaireClient, setCommentaireClient] = useState('')
  const [commentaireCuvee, setCommentaireCuvee] = useState('')
  const [accordsCarte, setAccordsCarte] = useState('')
  const [generating, setGenerating] = useState(false)

  const [showNewAgent, setShowNewAgent] = useState(false)
  const [newAgentNom, setNewAgentNom] = useState('')
  const [newAgentNomFamille, setNewAgentNomFamille] = useState('')
  const [newAgentEntreprise, setNewAgentEntreprise] = useState('')
  const [newAgentTel, setNewAgentTel] = useState('')
  const [newAgentEmail, setNewAgentEmail] = useState('')
  const [showNewDomain, setShowNewDomain] = useState(false)
  const [newDomainNom, setNewDomainNom] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: a }, { data: d }, { data: p }, { data: regionData }] = await Promise.all([
        supabase.from('cave_agents').select('*').order('nom'),
        supabase.from('cave_domains').select('*').neq('statut', 'archive').order('nom'),
        supabase.from('cave_pricing_grid').select('*').order('prix_achat_seuil'),
        supabase.from('cave_wines').select('region').not('region', 'is', null),
      ])
      setAgents((a as Agent[]) || [])
      setDomains((d as Domain[]) || [])
      setPricingGrid((p as PricingGrid[]) || [])
      // Merge wine regions + domain regions for complete suggestions
      const wineRegions = (regionData || []).map((r: { region: string }) => r.region)
      const domainRegions = ((d as Domain[]) || []).filter(dom => dom.region).map(dom => dom.region!)
      setRegionSuggestions([...new Set([...wineRegions, ...domainRegions])].sort())
    }
    load()
  }, [])

  // Close region dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) setShowRegionDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Prix FDP inclus
  const prixFpInclus = (parseFloat(prixAchat) || 0) + (parseFloat(fraisPort) || 0)

  // Prix suggéré via interpolation de la grille
  const prixSuggere = useMemo(() => {
    if (prixFpInclus <= 0 || pricingGrid.length === 0) return null
    const grid = pricingGrid
    // Sous le premier palier
    if (prixFpInclus <= grid[0].prix_achat_seuil) {
      return Math.round(prixFpInclus * grid[0].coefficient)
    }
    // Au-dessus du dernier palier
    if (prixFpInclus >= grid[grid.length - 1].prix_achat_seuil) {
      return Math.round(prixFpInclus * grid[grid.length - 1].coefficient)
    }
    // Interpolation entre deux paliers
    for (let i = 0; i < grid.length - 1; i++) {
      if (prixFpInclus >= grid[i].prix_achat_seuil && prixFpInclus < grid[i + 1].prix_achat_seuil) {
        const ratio = (prixFpInclus - grid[i].prix_achat_seuil) / (grid[i + 1].prix_achat_seuil - grid[i].prix_achat_seuil)
        const coef = grid[i].coefficient + ratio * (grid[i + 1].coefficient - grid[i].coefficient)
        return Math.round(prixFpInclus * coef)
      }
    }
    return null
  }, [prixFpInclus, pricingGrid])

  // Auto-fill prix de vente quand prix suggéré change ET pas forcé manuellement
  useEffect(() => {
    if (prixSuggere && !prixForce) {
      setPrixVente(String(prixSuggere))
    }
  }, [prixSuggere, prixForce])

  const coeffActuel = prixFpInclus > 0 && parseFloat(prixVente) > 0
    ? (parseFloat(prixVente) / prixFpInclus).toFixed(2) : null
  const bevcostActuel = parseFloat(prixVente) > 0 && prixFpInclus > 0
    ? ((prixFpInclus / parseFloat(prixVente)) * 100).toFixed(1) + '%' : null

  // Palier de grille correspondant
  const palierActuel = useMemo(() => {
    if (prixFpInclus <= 0 || pricingGrid.length === 0) return null
    let closest = pricingGrid[0]
    for (const g of pricingGrid) {
      if (Math.abs(g.prix_achat_seuil - prixFpInclus) < Math.abs(closest.prix_achat_seuil - prixFpInclus)) closest = g
    }
    return closest
  }, [prixFpInclus, pricingGrid])

  const filteredAgents = agentSearch
    ? agents.filter((a) => a.nom.toLowerCase().includes(agentSearch.toLowerCase()) || (a.entreprise || '').toLowerCase().includes(agentSearch.toLowerCase()))
    : agents
  const filteredDomains = domainSearch
    ? domains.filter((d) => d.nom.toLowerCase().includes(domainSearch.toLowerCase()))
    : domains

  async function createAgent() {
    if (!newAgentNom.trim()) return
    const { data } = await supabase
      .from('cave_agents')
      .insert({
        nom: newAgentNom.trim(),
        nom_famille: newAgentNomFamille.trim() || null,
        entreprise: newAgentEntreprise.trim() || null,
        telephone: newAgentTel.trim() || null,
        email: newAgentEmail.trim() || null,
      })
      .select().single()
    if (data) {
      setAgents((prev) => [...prev, data as Agent].sort((a, b) => a.nom.localeCompare(b.nom)))
      setAgentId(data.id)
      setAgentSearch(data.nom + (data.entreprise ? ` (${data.entreprise})` : ''))
      setShowNewAgent(false)
      setNewAgentNom(''); setNewAgentNomFamille(''); setNewAgentEntreprise(''); setNewAgentTel(''); setNewAgentEmail('')
    }
  }

  async function createDomain() {
    if (!newDomainNom.trim()) return
    const { data } = await supabase
      .from('cave_domains')
      .insert({ nom: newDomainNom.trim(), region: region || null })
      .select().single()
    if (data) {
      setDomains((prev) => [...prev, data as Domain].sort((a, b) => a.nom.localeCompare(b.nom)))
      setDomainId(data.id)
      setDomainSearch(data.nom)
      setShowNewDomain(false)
      setNewDomainNom('')
    }
  }

  async function handleSubmit() {
    if (!region) { setError('Région requise'); return }
    if (!prixAchat) { setError('Prix d\'achat requis'); return }
    if (!prixVente) { setError('Prix de vente requis'); return }
    setSaving(true); setError('')
    const { data, error: err } = await supabase.from('cave_wines').insert({
      type, region,
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
      commentaire_cuvee: commentaireCuvee.trim() || null,
      accords_carte: accordsCarte.trim() || null,
    }).select().single()
    if (err) { setError('Erreur : ' + err.message); setSaving(false) }
    else if (data) { router.push(`/cave/${data.id}`) }
  }

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 8, border: `0.5px solid ${T.border}`, background: T.sea, color: T.text, fontSize: 14, outline: 'none' }
  const labelStyle = { fontSize: 11, color: T.muted, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 4, display: 'block' }

  return (
    <div style={{ padding: '16px 16px 120px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Retour</button>
      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 20 }}>Nouveau vin</div>

      {/* Type */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Type de vin</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {WINE_TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, border: `0.5px solid ${type === t ? T.gold + '60' : T.border}`, background: type === t ? T.gold + '18' : 'transparent', color: type === t ? T.gold : T.text2, cursor: 'pointer', fontWeight: type === t ? 500 : 400 }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Région */}
      <div style={{ marginBottom: 16, position: 'relative' }} ref={regionRef}>
        <label style={labelStyle}>Région</label>
        <input
          type="text"
          value={region}
          onChange={(e) => { setRegion(e.target.value); setShowRegionDropdown(true) }}
          onFocus={() => setShowRegionDropdown(true)}
          placeholder="Ex : Jura, Provence & Corse…"
          style={inputStyle}
        />
        {showRegionDropdown && (() => {
          const filtered = region
            ? regionSuggestions.filter((r) => r.toLowerCase().includes(region.toLowerCase()))
            : regionSuggestions
          return filtered.length > 0 ? (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
              background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 10,
              marginTop: 4, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {filtered.map((r) => (
                <button key={r} onClick={() => { setRegion(r); setShowRegionDropdown(false) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `0.5px solid ${T.border}30`, color: T.text, fontSize: 13, cursor: 'pointer' }}>
                  {r}
                </button>
              ))}
            </div>
          ) : null
        })()}
        {region && !regionSuggestions.includes(region) && region.trim().length > 1 && (
          <div style={{ fontSize: 11, color: T.blue, marginTop: 4 }}>✨ Nouvelle région — sera créée automatiquement</div>
        )}
      </div>

      {/* Appellation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 100 }}>
          <label style={labelStyle}>Type appel.</label>
          <select value={typeAppellation} onChange={(e) => setTypeAppellation(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
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
            <input type="text" value={domainSearch} onChange={(e) => { setDomainSearch(e.target.value); setDomainId(null) }} placeholder="Chercher un domaine…" style={inputStyle} />
            {domainSearch && !domainId && (
              <div style={{ background: T.deep, border: `0.5px solid ${T.border}`, borderRadius: 8, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                {filteredDomains.slice(0, 8).map((d) => (
                  <button key={d.id} onClick={() => { setDomainId(d.id); setDomainSearch(d.nom) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: `0.5px solid ${T.border}20`, color: T.text, fontSize: 13, cursor: 'pointer' }}>
                    {d.nom} <span style={{ color: T.muted, fontSize: 11 }}>{d.region}</span>
                  </button>
                ))}
                <button onClick={() => { setShowNewDomain(true); setNewDomainNom(domainSearch) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: T.gold, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>+ Créer « {domainSearch} »</button>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 12, background: T.deep, borderRadius: 8, border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.gold, fontWeight: 500, marginBottom: 8 }}>Nouveau domaine</div>
            <input type="text" value={newDomainNom} onChange={(e) => setNewDomainNom(e.target.value)} placeholder="Nom du domaine" style={{ ...inputStyle, marginBottom: 8 }} autoFocus />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createDomain} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: T.gold, color: T.sea, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Créer</button>
              <button onClick={() => { setShowNewDomain(false); setNewDomainNom('') }} style={{ padding: '10px 16px', borderRadius: 8, border: `0.5px solid ${T.border}`, background: 'transparent', color: T.text2, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
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

      {/* PRICING — bloc principal */}
      <div style={{ padding: 14, background: T.deep, borderRadius: 10, border: `0.5px solid ${T.border}`, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: T.gold, fontWeight: 500, marginBottom: 12 }}>💰 Pricing</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Prix achat HT (€)</label>
            <input type="number" inputMode="decimal" step="0.01" value={prixAchat} onChange={(e) => { setPrixAchat(e.target.value); setPrixForce(false) }} placeholder="0.00" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Frais de port (€)</label>
            <input type="number" inputMode="decimal" step="0.01" value={fraisPort} onChange={(e) => { setFraisPort(e.target.value); setPrixForce(false) }} placeholder="0.00" style={inputStyle} />
          </div>
        </div>

        {prixFpInclus > 0 && (
          <div style={{ padding: 10, background: T.sea, borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
            <div style={{ color: T.text2, marginBottom: 4 }}>
              PA tout compris : <span style={{ color: T.text, fontWeight: 500 }}>{prixFpInclus.toFixed(2)}€</span>
            </div>
            {palierActuel && (
              <div style={{ color: T.muted }}>
                Grille LMDG : coeff x{palierActuel.coefficient.toFixed(2)} · BevCost cible {(palierActuel.bevcost_target * 100).toFixed(0)}%
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Prix de vente TTC (€)</label>
            {prixSuggere && prixForce && (
              <button onClick={() => { setPrixVente(String(prixSuggere)); setPrixForce(false) }} style={{ background: 'none', border: 'none', color: T.gold, fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                Revenir au prix suggéré ({prixSuggere}€)
              </button>
            )}
          </div>
          <input
            type="number"
            inputMode="decimal"
            step="1"
            value={prixVente}
            onChange={(e) => { setPrixVente(e.target.value); setPrixForce(true) }}
            placeholder="0"
            style={{ ...inputStyle, fontSize: 20, fontWeight: 500, textAlign: 'center' as const }}
          />
          {prixSuggere && !prixForce && prixVente && (
            <div style={{ fontSize: 11, color: T.up, marginTop: 4, textAlign: 'center' }}>
              ✓ Prix recommandé par la grille LMDG
            </div>
          )}
          {prixForce && prixSuggere && parseFloat(prixVente) !== prixSuggere && (
            <div style={{ fontSize: 11, color: T.gold, marginTop: 4, textAlign: 'center' }}>
              Prix forcé manuellement (grille suggère {prixSuggere}€)
            </div>
          )}
        </div>

        {coeffActuel && (
          <div style={{ display: 'flex', gap: 16, fontSize: 13, justifyContent: 'center', marginTop: 8 }}>
            <span style={{ color: T.text2 }}>Coeff : <span style={{ color: T.teal, fontWeight: 500 }}>x{coeffActuel}</span></span>
            <span style={{ color: T.text2 }}>BevCost : <span style={{ color: T.blue, fontWeight: 500 }}>{bevcostActuel}</span></span>
          </div>
        )}
      </div>

      {/* Agent */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Agent / Fournisseur</label>
        {!showNewAgent ? (
          <>
            <input type="text" value={agentSearch} onChange={(e) => { setAgentSearch(e.target.value); setAgentId(null) }} placeholder="Chercher un agent…" style={inputStyle} />
            {agentSearch && !agentId && (
              <div style={{ background: T.deep, border: `0.5px solid ${T.border}`, borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                {filteredAgents.slice(0, 8).map((a) => (
                  <button key={a.id} onClick={() => { setAgentId(a.id); setAgentSearch(a.nom + (a.entreprise ? ` (${a.entreprise})` : '')) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: `0.5px solid ${T.border}20`, color: T.text, fontSize: 13, cursor: 'pointer' }}>
                    <div>{a.nom} {a.nom_famille || ''}</div>
                    {a.entreprise && <div style={{ fontSize: 11, color: T.muted }}>{a.entreprise}</div>}
                  </button>
                ))}
                <button onClick={() => { setShowNewAgent(true); setNewAgentNom(agentSearch) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', color: T.gold, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>+ Créer « {agentSearch} »</button>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: 12, background: T.deep, borderRadius: 8, border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 12, color: T.gold, fontWeight: 500, marginBottom: 10 }}>Nouvel agent</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Prénom</label>
                <input type="text" value={newAgentNom} onChange={(e) => setNewAgentNom(e.target.value)} placeholder="Prénom" style={inputStyle} autoFocus />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Nom</label>
                <input type="text" value={newAgentNomFamille} onChange={(e) => setNewAgentNomFamille(e.target.value)} placeholder="Nom de famille" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Entreprise</label>
              <input type="text" value={newAgentEntreprise} onChange={(e) => setNewAgentEntreprise(e.target.value)} placeholder="Nom de l'entreprise" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Téléphone</label>
                <input type="tel" value={newAgentTel} onChange={(e) => setNewAgentTel(e.target.value)} placeholder="06 12 34 56 78" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={newAgentEmail} onChange={(e) => setNewAgentEmail(e.target.value)} placeholder="email@example.com" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createAgent} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: T.gold, color: T.sea, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Créer l'agent</button>
              <button onClick={() => { setShowNewAgent(false); setNewAgentNom(''); setNewAgentNomFamille(''); setNewAgentEntreprise(''); setNewAgentTel(''); setNewAgentEmail('') }} style={{ padding: '10px 16px', borderRadius: 8, border: `0.5px solid ${T.border}`, background: 'transparent', color: T.text2, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        )}
        {agentId && <div style={{ fontSize: 11, color: T.up, marginTop: 4 }}>✓ {agentSearch}</div>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Conditions franco</label>
        <input type="text" value={conditionsFranco} onChange={(e) => setConditionsFranco(e.target.value)} placeholder="ex: 60 bouteilles" style={inputStyle} />
      </div>

      {/* Commentaires — bouton générer + champs */}
      <div style={{ margin: '24px 0 16px', padding: '14px 0', borderTop: `0.5px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>Commentaires</div>
          <button
            onClick={async () => {
              const selectedDomain = domains.find(d => d.id === domainId)
              const domainName = selectedDomain?.nom || domainSearch || newDomainNom
              if (!domainName && !cuvee) { setError('Remplissez au moins le domaine ou la cuvée'); return }
              setGenerating(true); setError('')
              try {
                const existingDomainComment = selectedDomain?.commentaire_domaine
                const resp = await fetch('/api/generate-comments', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    domaine: domainName, cuvee, millesime, region, appellation: nomAppellation, type,
                    existingDomainComment: existingDomainComment || null,
                  }),
                })
                if (!resp.ok) {
                  const err = await resp.json()
                  setError(err.error || 'Erreur API'); setGenerating(false); return
                }
                const result = await resp.json()
                // Cépages
                if (result.cepage && !cepage) setCepage(result.cepage)
                // Cuvée
                if (result.commentaire_cuvee) setCommentaireCuvee(result.commentaire_cuvee)
                // Client
                if (result.commentaire_client) setCommentaireClient(result.commentaire_client)
                // Domaine
                if (result.commentaire_domaine && !existingDomainComment) {
                  if (domainId) {
                    await supabase.from('cave_domains').update({ commentaire_domaine: result.commentaire_domaine }).eq('id', domainId)
                  }
                  setCommentaireServeur(result.commentaire_domaine)
                } else if (existingDomainComment) {
                  setCommentaireServeur(existingDomainComment)
                }
              } catch { setError('Erreur lors de la génération') }
              setGenerating(false)
            }}
            disabled={generating}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: T.teal + '20', color: T.teal, fontSize: 12, fontWeight: 500, cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.5 : 1 }}
          >
            {generating ? '⏳ Génération…' : '✨ Générer'}
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>🏠 Le domaine (histoire, terroir)</label>
          <textarea value={commentaireServeur} onChange={(e) => setCommentaireServeur(e.target.value)} placeholder="Histoire, terroir, philosophie du domaine…" rows={3} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>🍷 La cuvée (profil, anecdote)</label>
          <textarea value={commentaireCuvee} onChange={(e) => setCommentaireCuvee(e.target.value)} placeholder="Profil aromatique, vinification, anecdote de vente…" rows={3} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>🍽️ Accords carte LMDG</label>
          <textarea value={accordsCarte} onChange={(e) => setAccordsCarte(e.target.value)} placeholder="Plats de la carte qui accompagnent ce vin…" rows={2} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>📋 Sur la carte (client)</label>
          <textarea value={commentaireClient} onChange={(e) => setCommentaireClient(e.target.value)} placeholder="Quelques mots vendeurs, max 1 ligne…" rows={2} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }} />
        </div>
      </div>

      {error && <div style={{ fontSize: 13, color: T.rose, marginBottom: 12, textAlign: 'center' }}>{error}</div>}

      <button onClick={handleSubmit} disabled={saving} style={{ width: '100%', padding: '16px 0', borderRadius: 10, border: 'none', background: T.gold, color: T.sea, fontSize: 16, fontWeight: 500, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.5 : 1, position: 'sticky' as const, bottom: 72 }}>
        {saving ? 'Enregistrement…' : 'Ajouter le vin'}
      </button>
    </div>
  )
}
