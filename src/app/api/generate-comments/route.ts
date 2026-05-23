import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { domaine, cuvee, millesime, region, appellation, type, existingDomainComment } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configuree' }, { status: 500 })
    }

    const needsDomainComment = !existingDomainComment

    const prompt = `Tu es sommelier expert dans un restaurant gastronomique de bord de mer a Marseille (La Marine des Goudes). On te demande de generer des informations pour un vin ajoute a la cave.

Informations connues :
- Domaine : ${domaine || 'non precise'}
- Cuvee : ${cuvee || 'non precisee'}
- Millesime : ${millesime || 'non precise'}
- Region : ${region || 'non precisee'}
- Appellation : ${appellation || 'non precisee'}
- Type : ${type || 'non precise'}

Recherche et genere les informations suivantes :

1. "cepage" : les cepages exacts de cette cuvee de ce domaine. Si tu ne trouves pas le detail exact, donne les cepages typiques de l'appellation. Format : "Chardonnay" ou "60% Grenache, 30% Syrah, 10% Mourvedre". Pas de phrase, juste les cepages.

${needsDomainComment ? `2. "commentaire_domaine" : 2-3 phrases sur l'histoire, le terroir et la philosophie du domaine. Ton informatif, direct, comme un brief oral pour une equipe de salle.` : `Le commentaire domaine existe deja, ne le genere PAS.`}

3. "commentaire_cuvee" : 2-3 phrases sur le profil aromatique de CE vin, la vinification, et un argument de vente utile pour le serveur. Ton direct et oral. Pas d'accords mets-vins ici.

4. "commentaire_client" : 5 a 8 mots-cles separes par des virgules qui decrivent le vin. Simples, evocateurs, vendeurs, comprehensibles par tous. Max 1 ligne. Exemples : "Vif et cristallin, citron et herbes fraiches" ou "Onctueux, noisette et beurre frais, longue finale".

Reponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans explication :
${needsDomainComment ? '{"cepage":"...","commentaire_domaine":"...","commentaire_cuvee":"...","commentaire_client":"..."}' : '{"cepage":"...","commentaire_cuvee":"...","commentaire_client":"..."}'}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return NextResponse.json({ error: `API Anthropic: ${response.status}` }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Generate comments error:', err)
    return NextResponse.json({ error: 'Erreur de generation' }, { status: 500 })
  }
}
