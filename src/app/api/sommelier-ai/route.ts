import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, wines } = body

    if (!query || !wines) {
      return NextResponse.json({ error: 'Query et wines requis' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configuree' }, { status: 500 })
    }

    // Construire le contexte des vins (compact pour rester sous la limite tokens)
    const wineContext = wines
      .filter((w: { stock: number }) => w.stock > 0)
      .map((w: { id: string; nom: string; type: string; region: string; cepage: string; millesime: string; prix: number; stock: number; commentaire_cuvee: string; commentaire_client: string; accords_carte: string; certification: string; sans_sulfites: boolean; non_filtre: boolean; profil_vibes: string[] }) =>
        `[${w.id}] ${w.nom} | ${w.type} | ${w.region} | ${w.cepage || '?'} | ${w.millesime || '?'} | ${w.prix}€ | ${w.stock}btl | ${w.certification || 'conv'} ${w.sans_sulfites ? '· sans sulfites' : ''} ${w.non_filtre ? '· non filtré' : ''} | Profil: ${(w.profil_vibes || []).join(', ') || '?'} | ${w.commentaire_client || ''} | Accords: ${w.accords_carte || '?'}`
      )
      .join('\n')

    const prompt = `Tu es le sommelier de La Marine des Goudes, restaurant gastronomique de bord de mer a Marseille.
Tu recommandes UNIQUEMENT parmi les vins de NOTRE cave (liste ci-dessous).

CAVE ACTUELLE :
${wineContext}

QUESTION DU SERVEUR :
"${query}"

Reponds en JSON strict (sans markdown, sans backticks) avec :
{
  "reasoning": "Explication courte (2-3 phrases max) de ta logique de recommandation, ecrite comme un sommelier qui parle a un collegue",
  "recommendations": [
    { "id": "uuid-du-vin", "raison": "Pourquoi ce vin repond a la demande (1 phrase)" }
  ]
}

Regles :
- Maximum 3 recommandations, minimum 1
- Utilise UNIQUEMENT les IDs de la liste ci-dessus
- Si aucun vin ne correspond, dis-le dans reasoning et retourne un tableau vide
- Sois direct, pas de blabla, parle comme un collegue pas comme un robot`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
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
    console.error('Sommelier AI error:', err)
    return NextResponse.json({ error: 'Erreur du sommelier IA' }, { status: 500 })
  }
}
