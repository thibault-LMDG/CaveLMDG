'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'

const REGIONS = ['Alsace', 'Bourgogne', 'Bordeaux', 'Champagne', 'Languedoc-Roussillon', 'Loire', 'Provence & Corse', 'Sud-Ouest', 'Vallée du Rhône', 'Vénétie']

export default function NewDomainPage() {
  const router = useRouter()
  const [nom, setNom] = useState('')
  const [region, setRegion] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')

    const trimmedNom = nom.trim()
    if (!trimmedNom) {
      setError('Le nom du domaine est requis')
      return
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('cave_domains')
      .select('id')
      .ilike('nom', trimmedNom)
      .limit(1)

    if (existing && existing.length > 0) {
      setError(`Le domaine "${trimmedNom}" existe déjà`)
      return
    }

    setSaving(true)

    const { data, error: insertError } = await supabase
      .from('cave_domains')
      .insert({
        nom: trimmedNom,
        region: region || null,
        commentaire_domaine: commentaire.trim() || null,
        notes: notes.trim() || null,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(`Erreur : ${insertError.message}`)
      setSaving(false)
      return
    }

    // Navigate to the new domain's page
    router.push(`/more/domains/${data.id}`)
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `0.5px solid ${T.border}`,
    background: T.deep,
    color: T.text,
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ padding: '16px 16px 100px' }}>
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}
      >
        ← Retour
      </button>

      <div style={{ fontSize: 24, fontWeight: 500, color: T.text, marginBottom: 4 }}>Nouveau domaine</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 24 }}>Ajouter un domaine viticole à la cave</div>

      {/* Nom du domaine */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: T.teal, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
          Nom du domaine *
        </label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex : Château de Pibarnon"
          style={inputStyle}
        />
      </div>

      {/* Région */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: T.teal, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
          Région
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(region === r ? '' : r)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
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

      {/* Commentaire domaine */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: T.teal, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
          🏠 Commentaire domaine
        </label>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
          Histoire, terroir, philosophie du vigneron… Partagé entre tous les vins du domaine.
        </div>
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={4}
          placeholder="Ex : Domaine familial sur les hauteurs de La Cadière. Biodynamie, sols argilo-calcaires…"
          style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.5 }}
        />
      </div>

      {/* Notes internes */}
      <div style={{ marginBottom: 28 }}>
        <label style={{ fontSize: 11, color: T.teal, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
          📝 Notes internes
        </label>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>
          Notes privées (contact, conditions, remarques…)
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ex : Visite prévue en septembre, demander allocations 2025"
          style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.5 }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 8,
          background: T.down + '15',
          border: `0.5px solid ${T.down}30`,
          color: T.down,
          fontSize: 13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSave}
        disabled={saving || !nom.trim()}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 12,
          background: !nom.trim() ? T.surface : T.gold,
          color: !nom.trim() ? T.muted : T.sea,
          fontSize: 15,
          fontWeight: 600,
          border: 'none',
          cursor: saving || !nom.trim() ? 'default' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Enregistrement…' : 'Ajouter le domaine'}
      </button>
    </div>
  )
}
