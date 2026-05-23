'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T, wineTypeColor } from '@/lib/theme'

interface CarteWine {
  type: string
  region: string
  domaine: string | null
  cuvee: string | null
  type_appellation: string | null
  nom_appellation: string | null
  cepage: string | null
  millesime: string | null
  prix_vente: string
  commentaire_client: string | null
}

const TYPE_ORDER: Record<string, number> = { BULLE: 1, BLANC: 2, ROSÉ: 3, ROUGE: 4, 'DEMI-SEC': 5 }
const TYPE_LABELS: Record<string, string> = { BULLE: 'Bulles & Champagnes', BLANC: 'Vins Blancs', ROSÉ: 'Vins Rosés', ROUGE: 'Vins Rouges', 'DEMI-SEC': 'Demi-Sec' }
const REGION_ORDER: Record<string, number> = {
  'Provence & Corse': 1, 'Vallée du Rhône': 2, 'Languedoc-Roussillon': 3,
  'Sud-Ouest': 4, 'Loire': 5, 'Bourgogne': 6, 'Alsace': 7,
  'Bordeaux': 8, 'Champagne': 9, 'Vénétie': 10,
}

export default function CartePage() {
  const router = useRouter()
  const [wines, setWines] = useState<CarteWine[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const loadCarte = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cave_wines')
      .select('type, region, domain_id, cuvee, type_appellation, nom_appellation, cepage, millesime, prix_vente, commentaire_client, cave_domains(nom)')
      .neq('statut', 'archive')
      .gt('quantite_stock', 0)

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted: CarteWine[] = (data as any[]).map((w) => ({
        ...w,
        domaine: w.cave_domains?.nom || null,
      }))

      // Sort by type, region (Provence first), then price
      formatted.sort((a, b) => {
        const typeA = TYPE_ORDER[a.type] || 99
        const typeB = TYPE_ORDER[b.type] || 99
        if (typeA !== typeB) return typeA - typeB
        const regA = REGION_ORDER[a.region] || 99
        const regB = REGION_ORDER[b.region] || 99
        if (regA !== regB) return regA - regB
        return parseFloat(a.prix_vente) - parseFloat(b.prix_vente)
      })

      setWines(formatted)
    }
    setLastUpdate(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }, [])

  useEffect(() => { loadCarte() }, [loadCarte])

  // Group wines by type, then by region
  const sections: { type: string; regions: { region: string; wines: CarteWine[] }[] }[] = []
  let currentType = ''
  let currentRegion = ''
  for (const w of wines) {
    if (w.type !== currentType) {
      currentType = w.type
      currentRegion = ''
      sections.push({ type: w.type, regions: [] })
    }
    const section = sections[sections.length - 1]
    if (w.region !== currentRegion) {
      currentRegion = w.region
      section.regions.push({ region: w.region, wines: [] })
    }
    section.regions[section.regions.length - 1].wines.push(w)
  }

  function formatAppellation(w: CarteWine) {
    const parts: string[] = []
    if (w.type_appellation && w.nom_appellation) {
      parts.push(`${w.type_appellation} ${w.nom_appellation}`)
    } else if (w.nom_appellation) {
      parts.push(w.nom_appellation)
    }
    if (w.cepage) parts.push(w.cepage)
    if (w.millesime) parts.push(w.millesime)
    return parts.join(' · ')
  }

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Retour</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 500, color: T.text }}>Carte des vins</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            {wines.length} vins en stock · Mise à jour {lastUpdate}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={loadCarte}
          disabled={loading}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 10, border: `0.5px solid ${T.border}`,
            background: T.deep, color: T.teal, fontSize: 13, fontWeight: 500,
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '⏳ Chargement…' : '🔄 Actualiser la carte'}
        </button>
        <button
          onClick={() => {
            setGeneratingPdf(true)
            // TODO: appeler le skill PDF de Charlotte
            setTimeout(() => {
              alert('Génération PDF : en attente du skill design de Charlotte')
              setGeneratingPdf(false)
            }, 500)
          }}
          disabled={generatingPdf || loading}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
            background: T.gold, color: T.sea, fontSize: 13, fontWeight: 500,
            cursor: (generatingPdf || loading) ? 'wait' : 'pointer',
            opacity: (generatingPdf || loading) ? 0.5 : 1,
          }}
        >
          {generatingPdf ? '⏳ Génération…' : '📄 Générer le PDF'}
        </button>
      </div>

      {/* Wine list preview */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.muted }}>Chargement de la carte…</div>
      ) : (
        <div>
          {sections.map((section) => (
            <div key={section.type} style={{ marginBottom: 28 }}>
              {/* Type header */}
              <div style={{
                padding: '10px 14px', marginBottom: 12,
                borderLeft: `4px solid ${wineTypeColor[section.type] || T.gold}`,
                background: (wineTypeColor[section.type] || T.gold) + '0c',
              }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: wineTypeColor[section.type] || T.gold, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {TYPE_LABELS[section.type] || section.type}
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {section.regions.reduce((sum, r) => sum + r.wines.length, 0)} références
                </div>
              </div>

              {section.regions.map((regionGroup) => (
                <div key={regionGroup.region} style={{ marginBottom: 16 }}>
                  {/* Region subheader */}
                  <div style={{ fontSize: 11, color: T.teal, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, padding: '0 4px', marginBottom: 8 }}>
                    {regionGroup.region}
                  </div>

                  {regionGroup.wines.map((w, i) => (
                    <div key={i} style={{ padding: '8px 4px', borderBottom: `0.5px solid ${T.border}20`, marginBottom: 2 }}>
                      {/* Line 1: Domaine — Cuvée .................. Prix */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: T.text, flex: 1 }}>
                          {w.domaine}
                          {w.cuvee ? ` — ${w.cuvee}` : ''}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginLeft: 12, flexShrink: 0 }}>
                          {parseInt(w.prix_vente)}€
                        </div>
                      </div>

                      {/* Line 2: AOP Appellation · Cépage · Millésime */}
                      <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>
                        {formatAppellation(w)}
                      </div>

                      {/* Line 3: Commentaire client */}
                      {w.commentaire_client && (
                        <div style={{ fontSize: 12, color: T.muted, fontStyle: 'italic', marginTop: 3 }}>
                          {w.commentaire_client}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
