'use client'

import { useState } from 'react'
import Link from 'next/link'
import { T, wineTypeColor, wineTypeEmoji } from '@/lib/theme'
import type { ScoredWine } from '../lib/scoring'

export default function WineResultCard({ result }: { result: ScoredWine }) {
  const [expanded, setExpanded] = useState(false)
  const w = result.wine
  const domain = w.cave_domains
  const typeColor = wineTypeColor[w.type] || T.text2
  const typeEmoji = wineTypeEmoji[w.type] || '🍷'
  
  const certBadges: string[] = []
  if (w.certification && w.certification !== 'conventionnel') {
    if (w.certification.startsWith('biodynamie')) certBadges.push('🌙 Biodynamie')
    else if (w.certification === 'bio') certBadges.push('🌿 Bio')
    else certBadges.push(`🌿 ${w.certification}`)
  }
  if (w.sans_sulfites) certBadges.push('🚫 Sans sulfites')
  if (w.non_filtre) certBadges.push('🫗 Non filtré')
  if (w.levures_indigenes) certBadges.push('🦠 Levures indigènes')

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: T.deep,
        borderRadius: 14,
        border: `0.5px solid ${T.border}`,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {/* Label badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        background: result.label === 'accord' ? `${T.gold}15` : result.label === 'rapport' ? `${T.teal}15` : `${T.purple}15`,
        borderBottom: `0.5px solid ${T.border}`,
      }}>
        <span style={{ fontSize: 14 }}>{result.labelEmoji}</span>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: result.label === 'accord' ? T.gold : result.label === 'rapport' ? T.teal : T.purple,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {result.labelText}
        </span>
      </div>
      
      {/* Wine info — compact */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Color stripe */}
          <div style={{
            width: 4,
            minHeight: 44,
            borderRadius: 2,
            background: typeColor,
            flexShrink: 0,
            marginTop: 2,
          }} />
          
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Domain + Cuvée */}
            <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>
              {domain?.nom || ''} {w.cuvee || ''}
            </div>
            <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>
              {typeEmoji} {w.type} · {w.region} {w.millesime ? `· ${w.millesime}` : ''}
            </div>
            
            {/* Commentaire client (le pitch) */}
            {w.commentaire_client && (
              <div style={{
                fontSize: 12,
                color: T.gold,
                fontStyle: 'italic',
                marginTop: 6,
                lineHeight: 1.4,
              }}>
                « {w.commentaire_client} »
              </div>
            )}
          </div>
          
          {/* Prix + stock */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 500, color: T.gold }}>{w.prix_vente}€</div>
            <div style={{
              fontSize: 10,
              marginTop: 4,
              padding: '2px 6px',
              borderRadius: 6,
              background: w.quantite_stock <= 2 ? `${T.rose}15` : `${T.up}15`,
              color: w.quantite_stock <= 2 ? T.rose : T.up,
            }}>
              {w.quantite_stock <= 1 ? 'Dernière !' : `${w.quantite_stock} btl`}
            </div>
          </div>
        </div>
        
        {/* Cert badges */}
        {certBadges.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {certBadges.map(badge => (
              <span key={badge} style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 10,
                background: `${T.teal}12`,
                color: T.teal,
              }}>
                {badge}
              </span>
            ))}
          </div>
        )}
        
        {/* Expand hint */}
        <div style={{ 
          fontSize: 10, 
          color: T.muted, 
          marginTop: 8, 
          textAlign: 'center',
          opacity: expanded ? 0 : 0.6,
        }}>
          Tap pour en savoir plus ▾
        </div>
      </div>
      
      {/* Expanded details */}
      {expanded && (
        <div style={{
          padding: '0 14px 14px',
          borderTop: `0.5px solid ${T.border}`,
          marginTop: 0,
        }}>
          {/* Commentaire cuvée */}
          {w.commentaire_cuvee && (
            <div style={{
              marginTop: 12,
              padding: 12,
              background: `${T.gold}0c`,
              borderLeft: `3px solid ${T.gold}`,
              borderRadius: '0 8px 8px 0',
            }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: T.gold, marginBottom: 4 }}>🍷 La cuvée</div>
              <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>{w.commentaire_cuvee}</div>
            </div>
          )}
          
          {/* Commentaire domaine */}
          {domain?.commentaire_domaine && (
            <div style={{
              marginTop: 10,
              padding: 12,
              background: T.deep,
              border: `0.5px solid ${T.teal}30`,
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: T.teal, marginBottom: 4 }}>🏠 Le domaine</div>
              <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{domain.commentaire_domaine}</div>
            </div>
          )}
          
          {/* Accords carte */}
          {w.accords_carte && (
            <div style={{
              marginTop: 10,
              padding: 12,
              background: T.deep,
              border: `0.5px solid ${T.up}20`,
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: T.up, marginBottom: 4 }}>🍽️ Accords carte</div>
              <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{w.accords_carte}</div>
            </div>
          )}
          
          {/* Cépages */}
          {w.cepage && (
            <div style={{ marginTop: 10, fontSize: 12, color: T.text2 }}>
              <span style={{ color: T.muted }}>Cépages :</span> {w.cepage}
            </div>
          )}
          
          {/* Link to full wine page */}
          <Link
            href={`/cave/${w.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'block',
              marginTop: 12,
              padding: '8px 0',
              fontSize: 12,
              color: T.teal,
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            Voir la fiche complète →
          </Link>
        </div>
      )}
    </div>
  )
}
