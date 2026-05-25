import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configuree' }, { status: 500 })
    }

    // 1. Fetch tous les vins actifs
    const { data: wines, error: fetchErr } = await supabase
      .from('cave_wines')
      .select('id, type, region, cepage, millesime, cuvee, commentaire_cuvee, commentaire_client, certification, sans_sulfites, non_filtre, levures_indigenes, prix_vente, cave_domains(nom)')
      .eq('statut', 'actif')

    if (fetchErr || !wines) {
      return NextResponse.json({ error: 'Erreur fetch vins' }, { status: 500 })
    }

    // 2. Construire la liste pour Claude
    const wineList = wines.map((w, idx) => {
      const domain = Array.isArray(w.cave_domains) ? w.cave_domains[0] : w.cave_domains
      return `${idx + 1}. [${w.id}] ${(domain as { nom: string } | null)?.nom || ''} ${w.cuvee || ''} | ${w.type} | ${w.region} | ${w.cepage || '?'} | ${w.prix_vente}€ | Cert: ${w.certification || 'conv'} ${w.sans_sulfites ? '· sans sulfites' : ''} ${w.non_filtre ? '· non filtré' : ''} | ${w.commentaire_cuvee || ''}`
    }).join('\n')

    const prompt = `Tu es sommelier expert dans un restaurant de bord de mer à Marseille (La Marine des Goudes). Pour chaque vin ci-dessous, attribue 3-5 tags de profil parmi ce vocabulaire STRICT :

STYLE : frais, minéral, vif, salin, floral, délicat, fin, élégant, soyeux, rond, généreux, ample, boisé, fruité, gourmand, croquant, souple, puissant, costaud, tannique, charpenté, structuré, doux, moelleux, festif, léger, aérien, sec, tendu, original, rare

Règles :
- Attribue 3 à 5 tags par vin, en étant précis et discriminant
- Base-toi sur le cépage, la région, le type, le commentaire de cuvée et la certification
- BLANCS frais/minéraux de Provence/Loire/Bourgogne : frais, minéral, vif, salin, tendu, fin
- BLANCS ronds/boisés (Bourgogne élevé, Rhône) : rond, généreux, ample, boisé
- BLANCS aromatiques (Alsace, Viognier) : floral, délicat, fin, élégant
- ROUGES légers/fruités (Beaujolais, Pinot, jeunes) : fruité, croquant, souple, léger
- ROUGES élégants (Bourgogne, Loire) : élégant, soyeux, fin
- ROUGES puissants (Rhône, Languedoc, Bordeaux) : puissant, structuré, tannique, charpenté, costaud
- ROSÉS pâles/gastronomiques : frais, minéral, fin, sec, tendu
- ROSÉS fruités/estivaux : fruité, gourmand, rond, léger
- BULLES vives : frais, vif, festif, léger
- BULLES vineuses/complexes : fin, élégant, rond, généreux
- DEMI-SEC légers : doux, fruité, léger
- DEMI-SEC riches : doux, puissant, rond, généreux
- Vins bio/nature/sans sulfites : ajouter "original" si pertinent
- Vins de petits producteurs/cépages rares : ajouter "rare"

VINS :
${wineList}

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
[{"id":"uuid","vibes":["tag1","tag2","tag3"]}, ...]`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return NextResponse.json({ error: `API Anthropic: ${response.status}` }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || '[]'
    const clean = text.replace(/```json|```/g, '').trim()
    const vibeResults: { id: string; vibes: string[] }[] = JSON.parse(clean)

    // 3. Update chaque vin
    let updated = 0
    let errors = 0

    for (const result of vibeResults) {
      const { error: updateErr } = await supabase
        .from('cave_wines')
        .update({ profil_vibes: result.vibes })
        .eq('id', result.id)

      if (updateErr) {
        console.error(`Error updating ${result.id}:`, updateErr)
        errors++
      } else {
        updated++
      }
    }

    return NextResponse.json({
      success: true,
      total: wines.length,
      generated: vibeResults.length,
      updated,
      errors,
      sample: vibeResults.slice(0, 5),
    })
  } catch (err) {
    console.error('Generate vibes error:', err)
    return NextResponse.json({ error: 'Erreur de generation des vibes' }, { status: 500 })
  }
}
