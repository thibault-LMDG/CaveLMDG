import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Build wine catalog for Claude context (called once per conversation start)
async function buildCatalog() {
  const { data: wines } = await supabase
    .from('cave_wines')
    .select('id, type, region, cepage, cuvee, millesime, prix_vente, quantite_stock, commentaire_cuvee, commentaire_client, accords_carte, certification, sans_sulfites, non_filtre, levures_indigenes, profil_vibes, cave_domains(nom, commentaire_domaine)')
    .eq('statut', 'actif')
    .gt('quantite_stock', 0)

  const { data: knowledge } = await supabase
    .from('cave_wine_knowledge')
    .select('wine_id, pitch_serveur, degustation_nez, degustation_bouche, temperature_service, potentiel_garde, accords_detailles, anecdote')
    .eq('status', 'validated')

  const knowledgeMap: Record<string, typeof knowledge extends (infer T)[] | null ? T : never> = {}
  for (const k of knowledge || []) {
    knowledgeMap[k.wine_id] = k
  }

  return (wines || []).map(w => {
    const domain = Array.isArray(w.cave_domains) ? w.cave_domains[0] : w.cave_domains
    const k = knowledgeMap[w.id]
    const parts = [
      `[${w.id}]`,
      `${(domain as { nom: string } | null)?.nom || '?'} — ${w.cuvee || ''}`,
      `${w.type} | ${w.region} | ${w.cepage || '?'} | ${w.millesime || '?'} | ${w.prix_vente}€`,
      `Profil: ${(w.profil_vibes || []).join(', ')}`,
      w.commentaire_cuvee ? `Cuvée: ${w.commentaire_cuvee}` : '',
      w.commentaire_client ? `Client: ${w.commentaire_client}` : '',
      w.accords_carte ? `Accords carte: ${w.accords_carte}` : '',
      w.certification && w.certification !== 'conventionnel' ? `Certif: ${w.certification}${w.sans_sulfites ? ' · sans sulfites' : ''}${w.non_filtre ? ' · non filtré' : ''}` : '',
      k?.pitch_serveur ? `Pitch: ${k.pitch_serveur}` : '',
      k?.accords_detailles ? `Accords détaillés: ${k.accords_detailles.substring(0, 300)}` : '',
      k?.anecdote ? `Anecdote: ${k.anecdote.substring(0, 200)}` : '',
      k?.temperature_service ? `Service: ${k.temperature_service}` : '',
    ].filter(Boolean)
    return parts.join('\n')
  }).join('\n---\n')
}

const SYSTEM_PROMPT = `Tu es le sommelier de La Marine des Goudes, un restaurant gastronomique de bord de mer dans les calanques de Marseille. Tu parles directement au client qui est à table.

TON STYLE :
- Chaleureux, passionné, accessible. Jamais pédant ni technique.
- Tu tutoies pas, tu vouvoies avec élégance.
- Tu parles comme un sommelier qui adore son métier, pas comme un robot.
- Tes phrases sont courtes, vivantes, enthousiastes.

RÈGLES ABSOLUES :
1. Tu recommandes UNIQUEMENT des vins de la liste fournie. JAMAIS d'invention.
2. Tu retournes TOUJOURS du JSON valide, sans markdown, sans backticks.
3. Maximum 3 vins recommandés, minimum 1.
4. Chaque recommandation doit inclure le wine_id exact de la liste.
5. Si la demande est trop vague (juste "un vin", "blanc"), pose UNE question d'affinage avec 3-4 options.
6. Si la demande mentionne un plat, priorise les vins dont les accords correspondent.
7. Ne mentionne JAMAIS le stock, le BevCost, ou les données internes.
8. La "raison" de chaque vin doit être une phrase naturelle qu'on dirait à table, pas une analyse technique.

FORMAT DE RÉPONSE (JSON strict) — 3 modes possibles :

Mode RÉSULTATS (demande suffisamment précise) :
{"type":"results","intro":"Phrase d'introduction naturelle","wines":[{"wine_id":"uuid","name":"Domaine Cuvée","prix":"XX€","raison":"Pourquoi ce vin, en une phrase vivante","detail":"Info bonus: anecdote ou note de dégustation courte"}]}

Mode AFFINAGE (demande trop vague) :
{"type":"refine","question":"Question naturelle et chaleureuse","options":[{"label":"Texte du bouton","emoji":"🐟","value":"ce que ça signifie pour toi"}]}

Mode MIXTE (on peut déjà proposer mais aussi affiner) :
{"type":"mixed","intro":"Phrase d'intro","wines":[...],"question":"Pour affiner...","options":[...]}

CONTEXTE RESTAURANT :
- Cuisine : poissons, fruits de mer, grillades méditerranéennes
- Plats phares : bouillabaisse, retour de pointu, 6 huîtres, poulpe snacké, sole meunière, gambas flambées
- Clientèle : touristes, locaux, familles, couples, anniversaires
- Ambiance : terrasse face à la mer, calanques, soleil`

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key missing' }, { status: 500 })
    }

    const body = await req.json()
    const { messages } = body as { messages: { role: string; content: string }[] }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages requis' }, { status: 400 })
    }

    // Build fresh catalog each time (ensures stock is current)
    const catalog = await buildCatalog()

    const fullSystem = `${SYSTEM_PROMPT}\n\nCAVE ACTUELLE (${new Date().toLocaleDateString('fr-FR')}) :\n${catalog}`

    // Keep only last 6 messages (3 exchanges max)
    const recentMessages = messages.slice(-6)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        system: fullSystem,
        messages: recentMessages,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Sommelier client API error:', response.status, errText)
      return NextResponse.json({ error: 'Erreur du sommelier' }, { status: 500 })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()

    // Try to parse JSON, extract it if wrapped in text
    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        parsed = { type: 'results', intro: clean, wines: [] }
      }
    }

    return NextResponse.json({ response: parsed, raw: text })
  } catch (err) {
    console.error('Sommelier client error:', err)
    return NextResponse.json({ error: 'Erreur du sommelier' }, { status: 500 })
  }
}
