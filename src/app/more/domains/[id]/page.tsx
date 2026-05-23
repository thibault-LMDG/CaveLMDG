'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { T, wineTypeColor } from '@/lib/theme'
import type { Domain, Wine } from '@/types'

export default function DomainDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [domain, setDomain] = useState<Domain | null>(null)
  const [wines, setWines] = useState<Wine[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [commentaire, setCommentaire] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: d } = await supabase.from('cave_domains').select('*').eq('id', id).single()
      if (!d) { router.push('/more/domains'); return }
      setDomain(d as Domain)
      setCommentaire((d as Domain).commentaire_domaine || '')

      const { data: w } = await supabase
        .from('cave_wines')
        .select('*')
        .eq('domain_id', id)
        .neq('statut', 'archive')
        .order('type')
        .order('prix_vente')
      setWines((w as Wine[]) || [])
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleSave() {
    setSaving(true)
    await supabase.from('cave_domains').update({ commentaire_domaine: commentaire.trim() || null }).eq('id', id)
    const { data } = await supabase.from('cave_domains').select('*').eq('id', id).single()
    setDomain(data as Domain)
    setEditing(false)
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>Chargement…</div>
  if (!domain) return null

  const totalStock = wines.reduce((sum, w) => sum + (w.quantite_stock || 0), 0)
  const inStock = wines.filter((w) => (w.quantite_stock || 0) > 0)
  const outOfStock = wines.filter((w) => (w.quantite_stock || 0) === 0)

  return (
    <div style={{ padding: '16px 16px 80px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}>← Retour</button>

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

      {/* Commentaire domaine */}
      <div style={{ marginBottom: 20, padding: 14, borderRadius: 10, background: T.deep, border: `0.5px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: T.teal, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}>🏠 Le domaine</div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
            style={{ background: 'none', border: 'none', color: editing ? T.gold : T.muted, fontSize: 11, cursor: 'pointer' }}
          >
            {saving ? '…' : editing ? '💾 Sauvegarder' : '✏️ Modifier'}
          </button>
        </div>
        {editing ? (
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `0.5px solid ${T.border}`, background: T.sea, color: T.text, fontSize: 13, outline: 'none', resize: 'vertical' as const, fontFamily: 'inherit', lineHeight: 1.5 }}
          />
        ) : (
          <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>
            {domain.commentaire_domaine || <span style={{ color: T.muted, fontStyle: 'italic' }}>Aucune description. Cliquez Modifier pour ajouter.</span>}
          </div>
        )}
      </div>

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
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>
                      {w.cuvee || w.nom_appellation || w.type}
                    </div>
                    <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>
                      {w.type} · {w.nom_appellation || ''} {w.millesime || ''}
                    </div>
                    {w.commentaire_client && (
                      <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic', marginTop: 2 }}>{w.commentaire_client}</div>
                    )}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
    </div>
  )
}
