'use client'

import { useState } from 'react'
import { T } from '@/lib/theme'
import type { Wine } from '@/types'
import type { ScoredWine } from '../lib/scoring'
import WineResultCard from './WineResultCard'

interface Props {
  wines: (Wine & { cave_domains?: { nom: string; commentaire_domaine: string | null } })[]
}

export default function AISommelier({ wines }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ScoredWine[]>([])
  const [aiText, setAiText] = useState('')
  const [error, setError] = useState('')

  const handleAsk = async () => {
    if (!query.trim() || loading) return
    setLoading(true)
    setError('')
    setResults([])
    setAiText('')

    try {
      const res = await fetch('/api/sommelier-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), wines: wines.map(w => ({
          id: w.id,
          nom: `${w.cave_domains?.nom || ''} ${w.cuvee || ''}`.trim(),
          type: w.type,
          region: w.region,
          cepage: w.cepage,
          millesime: w.millesime,
          prix: w.prix_vente,
          stock: w.quantite_stock,
          commentaire_cuvee: w.commentaire_cuvee,
          commentaire_client: w.commentaire_client,
          accords_carte: w.accords_carte,
          certification: w.certification,
          sans_sulfites: w.sans_sulfites,
          non_filtre: w.non_filtre,
          profil_vibes: w.profil_vibes,
        })) }),
      })

      if (!res.ok) throw new Error('Erreur API')

      const data = await res.json()

      if (data.recommendations && Array.isArray(data.recommendations)) {
        const scoredResults: ScoredWine[] = data.recommendations
          .map((rec: { id: string; raison: string }, idx: number) => {
            const wine = wines.find(w => w.id === rec.id)
            if (!wine) return null
            return {
              wine,
              score: 100 - idx * 10,
              label: idx === 0 ? 'accord' as const : idx === 1 ? 'rapport' as const : 'coeur' as const,
              labelEmoji: '🤖',
              labelText: `Recommandation IA`,
            }
          })
          .filter(Boolean) as ScoredWine[]

        setResults(scoredResults)
        setAiText(data.reasoning || '')
      }
    } catch {
      setError('Erreur de connexion. Réessaye.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        padding: 14,
        background: T.deep,
        borderRadius: 14,
        border: `0.5px solid ${T.border}`,
      }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 10 }}>
          🤖 Demande au sommelier IA
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>
          Pose ta question en langage naturel sur nos vins
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="Ex: Un blanc minéral pour du bar grillé ?"
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: 13,
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              color: T.text,
              outline: 'none',
            }}
          />
          <button
            onClick={handleAsk}
            disabled={loading || !query.trim()}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 500,
              background: T.gold,
              color: T.sea,
              border: 'none',
              borderRadius: 10,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading || !query.trim() ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? '...' : '→'}
          </button>
        </div>
        
        {error && (
          <div style={{ marginTop: 10, fontSize: 12, color: T.rose }}>{error}</div>
        )}
        
        {loading && (
          <div style={{ marginTop: 14, textAlign: 'center', fontSize: 12, color: T.muted }}>
            Le sommelier réfléchit... 🍷
          </div>
        )}
        
        {aiText && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: T.surface,
            borderRadius: 10,
            fontSize: 12,
            color: T.text2,
            lineHeight: 1.5,
          }}>
            {aiText}
          </div>
        )}
      </div>
      
      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {results.map(r => (
            <WineResultCard key={r.wine.id} result={r} />
          ))}
        </div>
      )}
    </div>
  )
}
