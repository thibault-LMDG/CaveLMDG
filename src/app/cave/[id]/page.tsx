'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T, wineTypeColor, wineTypeEmoji } from '@/lib/theme'
import type { Wine, StockMovement } from '@/types'

export default function WineDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [wine, setWine] = useState<Wine & { cave_domains?: { nom: string }; cave_agents?: { nom: string; telephone: string | null } } | null>(null)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('cave_wines')
        .select('*, cave_domains(nom), cave_agents(nom, telephone)')
        .eq('id', id)
        .single()
      setWine(data as typeof wine)

      const { data: mvts } = await supabase
        .from('cave_stock_movements')
        .select('*')
        .eq('wine_id', id)
        .order('created_at', { ascending: false })
        .limit(20)
      setMovements((mvts as StockMovement[]) || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>Chargement…</div>
  if (!wine) return <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>Vin introuvable</div>

  const borderColor = wineTypeColor[wine.type] || T.gold
  const coef = wine.coefficient ? wine.coefficient.toFixed(2) : '—'
  const bevcost = wine.bevcost_pct ? (wine.bevcost_pct * 100).toFixed(1) + '%' : '—'

  return (
    <div style={{ padding: '0 0 100px' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: `0.5px solid ${T.border}` }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}
        >
          ← Retour
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 500,
            background: borderColor + '20',
            color: borderColor,
          }}>
            {wineTypeEmoji[wine.type]} {wine.type}
          </span>
          <span style={{ fontSize: 11, color: T.muted }}>{wine.region}</span>
          {wine.type_appellation && (
            <span style={{ fontSize: 11, color: T.muted }}>{wine.type_appellation}</span>
          )}
        </div>

        <div style={{ fontSize: 22, fontWeight: 500, color: T.text, lineHeight: 1.3 }}>
          {wine.cuvee || wine.nom_appellation || 'Sans nom'}
        </div>
        <div style={{ fontSize: 14, color: T.text2, marginTop: 4 }}>
          {wine.cave_domains?.nom}
          {wine.millesime ? ` · ${wine.millesime}` : ''}
          {wine.cepage ? ` · ${wine.cepage}` : ''}
        </div>
      </div>

      {/* Prix + Stock */}
      <div style={{ display: 'flex', gap: 12, padding: '16px', alignItems: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 500, color: T.text }}>{wine.prix_vente}€</div>
        <span style={{
          padding: '3px 10px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          background: T.teal + '18',
          color: T.teal,
        }}>
          x{coef}
        </span>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{
            fontSize: 18,
            fontWeight: 500,
            color: wine.quantite_stock <= 0 ? T.down : wine.quantite_stock <= wine.stock_minimum ? T.down : T.up,
          }}>
            {wine.quantite_stock} btl
          </div>
          <div style={{ fontSize: 10, color: T.muted }}>min {wine.stock_minimum}</div>
        </div>
      </div>

      {/* Grille métadonnées */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 16px' }}>
        {[
          { label: 'PA HT', value: `${wine.prix_achat_ht}€` },
          { label: 'FDP', value: wine.frais_port > 0 ? `${wine.frais_port}€` : '—' },
          { label: 'BevCost', value: bevcost },
          { label: 'Au verre', value: wine.au_verre ? `Oui (${wine.verres_par_bouteille}v)` : 'Non' },
        ].map((m) => (
          <div key={m.label} style={{ background: T.deep, borderRadius: 8, padding: '8px 12px', border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: T.text, marginTop: 2 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Pitch serveur */}
      {wine.commentaire_serveur && (
        <div style={{ margin: '0 16px 16px', padding: 14, borderRadius: 10, background: T.gold + '0c', borderLeft: `3px solid ${T.gold}` }}>
          <div style={{ fontSize: 10, color: T.gold, fontWeight: 500, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>
            Pitch serveur
          </div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5 }}>{wine.commentaire_serveur}</div>
        </div>
      )}

      {/* Description client */}
      {wine.commentaire_client && (
        <div style={{ margin: '0 16px 16px', padding: 14, borderRadius: 10, background: T.deep, border: `0.5px solid ${T.border}` }}>
          <div style={{ fontSize: 10, color: T.text2, fontWeight: 500, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>
            Sur la carte
          </div>
          <div style={{ fontSize: 14, color: T.text2, lineHeight: 1.5, fontStyle: 'italic' }}>{wine.commentaire_client}</div>
        </div>
      )}

      {/* Agent */}
      {wine.cave_agents && (
        <div style={{ margin: '0 16px 16px', padding: 14, borderRadius: 10, background: T.deep, border: `0.5px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Agent</div>
            <div style={{ fontSize: 14, color: T.text, marginTop: 2 }}>{wine.cave_agents.nom}</div>
            {wine.conditions_franco && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Franco: {wine.conditions_franco}</div>}
          </div>
          {wine.cave_agents.telephone && (
            <a
              href={`tel:${wine.cave_agents.telephone.replace(/\s/g, '')}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                background: T.teal + '18',
                color: T.teal,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              📞 Appeler
            </a>
          )}
        </div>
      )}

      {/* Mouvements récents */}
      {movements.length > 0 && (
        <div style={{ margin: '0 16px 16px' }}>
          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Mouvements récents
          </div>
          {movements.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `0.5px solid ${T.border}`, fontSize: 12 }}>
              <span style={{ color: T.text2 }}>{m.type}</span>
              <span style={{ color: m.quantite > 0 ? T.up : T.down, fontWeight: 500 }}>
                {m.quantite > 0 ? '+' : ''}{m.quantite}
              </span>
              <span style={{ color: T.muted }}>{new Date(m.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action bar fixe en bas */}
      <div style={{
        position: 'fixed',
        bottom: 56,
        left: 0,
        right: 0,
        display: 'flex',
        gap: 8,
        padding: '12px 16px',
        background: T.sea,
        borderTop: `0.5px solid ${T.border}`,
        zIndex: 40,
      }}>
        <button style={{
          flex: 1,
          padding: '12px 0',
          borderRadius: 10,
          border: 'none',
          background: T.up + '18',
          color: T.up,
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}>
          + Entrée
        </button>
        <button style={{
          flex: 1,
          padding: '12px 0',
          borderRadius: 10,
          border: 'none',
          background: T.rose + '18',
          color: T.rose,
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}>
          − Sortie
        </button>
      </div>
    </div>
  )
}
