import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { domaine, cuvee, cepage, millesime, region, appellation, type, existingDomainComment } = body

  const needsDomainComment = !existingDomainComment

  const prompt = `Tu es sommelier expert dans un restaurant gastronomique de bord de mer à Marseille (La Marine des Goudes). On te demande de générer des commentaires pour un nouveau vin ajouté à la cave.

Informations sur le vin :
- Domaine : ${domaine || 'non précisé'}
- Cuvée : ${cuvee || 'non précisée'}
- Cépage : ${cepage || 'non précisé'}
- Millésime : ${millesime || 'non précisé'}
- Région : ${region || 'non précisée'}
- Appellation : ${appellation || 'non précisée'}
- Type : ${type || 'non précisé'}

${needsDomainComment ? `Génère un "commentaire_domaine" : 2-3 phrases sur l'histoire, le terroir et la philosophie du domaine. Ton informatif, comme un brief oral.` : `Le commentaire domaine existe déjà, ne le génère PAS.`}

Génère un "commentaire_cuvee" : 2-3 phrases sur le profil aromatique du vin, la vinification, et une anecdote de vente utile pour le serveur. Ton direct et oral, comme un brief d'équipe. Pas d'accords mets-vins ici.

Génère un "commentaire_client" : 5 à 8 mots-clés séparés par des virgules qui décrivent le vin. Simples, évocateurs, vendeurs, compréhensibles par tous. Max 1 ligne. Exemples : "Vif et cristallin, citron et herbes fraîches" ou "Onctueux, noisette et beurre frais, longue finale" ou "Fruit croquant, épices douces, racé et frais".

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
${needsDomainComment ? '{"commentaire_domaine": "...", "commentaire_cuvee": "...", "commentaire_client": "..."}' : '{"commentaire_cuvee": "...", "commentaire_client": "..."}'}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Claude API error:', err)
    return NextResponse.json({ error: 'Erreur de génération' }, { status: 500 })
  }
}
