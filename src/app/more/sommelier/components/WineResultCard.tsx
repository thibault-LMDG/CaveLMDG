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

  // Infos compactes secondaires (cépages + accords en une ligne)
  const shortInfos: string[] = []
  if (w.cepage) shortInfos.push(w.cepage)
  if (w.accords_carte) shortInfos.push(w.accords_carte)
  const shortLine = shortInfos.join(' · ')

  // Y a-t-il du contenu à déplier ?
  const hasExpandContent = !!domain?.commentaire_domaine

  return (
    <div
      style={{
        background: T.deep,
        borderRadius: 14,
        border: `0.5px solid ${T.border}`,
        overflow: 'hidden',
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
      
      {/* Wine info */}
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
        
        {/* Commentaire cuvée — toujours visible (c'est le pitch serveur) */}
        {w.commentaire_cuvee && (
          <div style={{
            fontSize: 12,
            color: T.gold,
            fontStyle: 'italic',
            marginTop: 8,
            lineHeight: 1.5,
            padding: '8px 10px',
            background: `${T.gold}08`,
            borderRadius: 8,
          }}>
            « {w.commentaire_cuvee} »
          </div>
        )}
        
        {/* Commentaire client (pitch carte) */}
        {w.commentaire_client && !w.commentaire_cuvee && (
          <div style={{
            fontSize: 12,
            color: T.text2,
            fontStyle: 'italic',
            marginTop: 8,
            lineHeight: 1.4,
          }}>
            « {w.commentaire_client} »
          </div>
        )}

        {/* Cépages + accords en ligne compacte */}
        {shortLine && (
          <div style={{
            fontSize: 11,
            color: T.muted,
            marginTop: 8,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {shortLine}
          </div>
        )}
        
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
      </div>
      
      {/* Expand toggle + expanded content */}
      {hasExpandContent && (
        <div style={{ borderTop: `0.5px solid ${T.border}` }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%',
              padding: '8px 14px',
              fontSize: 11,
              color: T.teal,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            {expanded ? 'Moins de détails' : 'En savoir plus sur le domaine'}
            <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: 10 }}>▾</span>
          </button>
          
          {expanded && (
            <div style={{ padding: '0 14px 14px' }}>
              {domain?.commentaire_domaine && (
                <div style={{
                  padding: 10,
                  background: `${T.teal}08`,
                  border: `0.5px solid ${T.teal}20`,
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: T.teal, marginBottom: 4 }}>🏠 Le domaine</div>
                  <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.5 }}>{domain.commentaire_domaine}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Fiche complète link — toujours visible */}
      <Link
        href={`/cave/${w.id}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'block',
          padding: '8px 14px',
          fontSize: 11,
          color: T.muted,
          textAlign: 'center',
          textDecoration: 'none',
          borderTop: `0.5px solid ${T.border}`,
        }}
      >
        Voir la fiche complète →
      </Link>
    </div>
  )
}
