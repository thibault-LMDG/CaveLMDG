import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Enrichit UN vin à la fois (appelé par la page admin ou en batch)
// POST /api/enrich-wine { wine_id: "uuid" }
// POST /api/enrich-wine { batch: true } → enrichit le prochain vin "pending"

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configuree' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    let wineId = body.wine_id as string | undefined

    // Mode batch : prend le prochain vin pending
    if (!wineId && body.batch) {
      // Chercher un vin actif qui n'a pas encore de knowledge ou qui est pending
      const { data: pendingKnowledge } = await supabase
        .from('cave_wine_knowledge')
        .select('wine_id')
        .eq('status', 'pending')
        .limit(1)
        .single()

      if (pendingKnowledge) {
        wineId = pendingKnowledge.wine_id
      } else {
        // Chercher un vin actif sans entrée dans knowledge
        const { data: allWines } = await supabase
          .from('cave_wines')
          .select('id')
          .eq('statut', 'actif')
          .gt('quantite_stock', 0)

        const { data: existingKnowledge } = await supabase
          .from('cave_wine_knowledge')
          .select('wine_id')

        const existingIds = new Set((existingKnowledge || []).map(k => k.wine_id))
        const missingWine = (allWines || []).find(w => !existingIds.has(w.id))

        if (missingWine) {
          // Créer l'entrée pending
          await supabase.from('cave_wine_knowledge').insert({ wine_id: missingWine.id, status: 'pending' })
          wineId = missingWine.id
        } else {
          return NextResponse.json({ message: 'Tous les vins sont déjà enrichis ou en cours', done: true })
        }
      }
    }

    if (!wineId) {
      return NextResponse.json({ error: 'wine_id requis ou batch: true' }, { status: 400 })
    }

    // Fetch le vin complet
    const { data: wine, error: wineErr } = await supabase
      .from('cave_wines')
      .select('*, cave_domains(nom, region, commentaire_domaine, notes)')
      .eq('id', wineId)
      .single()

    if (wineErr || !wine) {
      return NextResponse.json({ error: 'Vin non trouvé' }, { status: 404 })
    }

    // Marquer comme "enriching"
    await supabase
      .from('cave_wine_knowledge')
      .upsert({ wine_id: wineId, status: 'enriching' }, { onConflict: 'wine_id' })

    const domain = Array.isArray(wine.cave_domains) ? wine.cave_domains[0] : wine.cave_domains
    const domainName = domain?.nom || 'Domaine inconnu'

    // Construire le prompt Opus avec toutes les infos existantes
    const prompt = `Tu es un sommelier expert et journaliste vin. Tu travailles pour un restaurant gastronomique de bord de mer à Marseille (La Marine des Goudes). On te demande de créer une fiche de connaissance complète pour un vin de la carte.

INFORMATIONS EXISTANTES SUR LE VIN :
- Domaine : ${domainName}
- Cuvée : ${wine.cuvee || 'Non spécifiée'}
- Type : ${wine.type}
- Région : ${wine.region}
- Appellation : ${wine.nom_appellation || 'Non spécifiée'}
- Cépage(s) : ${wine.cepage || 'Non spécifié'}
- Millésime : ${wine.millesime || 'Non spécifié'}
- Prix carte : ${wine.prix_vente}€
- Certification : ${wine.certification || 'conventionnel'}${wine.sans_sulfites ? ' · sans sulfites ajoutés' : ''}${wine.non_filtre ? ' · non filtré' : ''}${wine.levures_indigenes ? ' · levures indigènes' : ''}
- Commentaire cuvée existant : ${wine.commentaire_cuvee || 'Aucun'}
- Commentaire client existant : ${wine.commentaire_client || 'Aucun'}
- Accords carte existants : ${wine.accords_carte || 'Aucun'}
- Notes domaine existantes : ${domain?.commentaire_domaine || 'Aucune'}

CONSIGNES :
1. En te basant sur tes connaissances ET les résultats de recherche web, crée une fiche enrichie
2. Sois précis et factuel — si tu ne trouves pas une info, mets null
3. Le "pitch_serveur" doit être naturel, 2-3 phrases que le serveur peut dire au client sans avoir l'air de réciter
4. L'anecdote doit être un fait surprenant ou une histoire qui donne envie
5. Pour les notes critiques, cite les sources (Guide Hachette, RVF, Decanter, Vivino, etc.)
6. Adapte le ton au contexte : restaurant de poisson/fruits de mer au bord de la Méditerranée

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
{
  "degustation_nez": "Notes olfactives détaillées (fruits, fleurs, épices, minéral...)",
  "degustation_bouche": "Attaque, milieu, structure, texture...",
  "degustation_finale": "Longueur, persistance aromatique, sensation finale...",
  "temperature_service": "Ex: 10-12°C",
  "potentiel_garde": "Ex: À boire dans les 3 ans / 5-10 ans de garde",
  "accords_detailles": "Accords mets-vins détaillés et créatifs, adaptés à un restaurant de bord de mer",
  "histoire_domaine": "Histoire du domaine, philosophie, vignerons...",
  "histoire_cuvee": "Spécificités de cette cuvée, parcelle, process...",
  "terroir": "Sol, exposition, altitude, climat, particularités...",
  "vinification": "Vendanges, vinification, élevage, mise en bouteille...",
  "pitch_serveur": "2-3 phrases naturelles prêtes à dire au client",
  "anecdote": "Un fait marquant, une histoire qui donne envie",
  "notes_critiques": "Notes de guides/critiques si connues (sinon null)"
}`

    // Appel Claude Opus avec web search
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          }
        ],
        messages: [
          {
            role: 'user',
            content: `Recherche des informations sur le domaine "${domainName}" et la cuvée "${wine.cuvee || ''}" (${wine.region}, ${wine.type}), puis crée la fiche complète.\n\n${prompt}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Opus API error:', response.status, errText)
      await supabase
        .from('cave_wine_knowledge')
        .update({ status: 'pending' })
        .eq('wine_id', wineId)
      return NextResponse.json({ error: `API Opus: ${response.status}`, details: errText }, { status: 500 })
    }

    const data = await response.json()

    // Extraire le texte JSON de la réponse (peut contenir des tool_use blocks)
    const textBlocks = data.content?.filter((b: { type: string }) => b.type === 'text') || []
    const fullText = textBlocks.map((b: { text: string }) => b.text).join('\n')

    // Parser le JSON
    const clean = fullText.replace(/```json|```/g, '').trim()
    // Trouver le JSON dans le texte
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in Opus response:', clean.substring(0, 500))
      await supabase
        .from('cave_wine_knowledge')
        .update({ status: 'pending' })
        .eq('wine_id', wineId)
      return NextResponse.json({ error: 'Pas de JSON dans la réponse Opus', raw: clean.substring(0, 500) }, { status: 500 })
    }

    const knowledge = JSON.parse(jsonMatch[0])

    // Extraire les sources (URLs des web search results)
    const sources = data.content
      ?.filter((b: { type: string }) => b.type === 'web_search_tool_result')
      ?.flatMap((b: { content?: { url?: string; title?: string }[] }) =>
        (b.content || []).map((r: { url?: string; title?: string }) => ({
          url: r.url,
          title: r.title,
        }))
      ) || []

    // Sauvegarder en base
    const { error: upsertErr } = await supabase
      .from('cave_wine_knowledge')
      .upsert({
        wine_id: wineId,
        status: 'ready',
        degustation_nez: knowledge.degustation_nez || null,
        degustation_bouche: knowledge.degustation_bouche || null,
        degustation_finale: knowledge.degustation_finale || null,
        temperature_service: knowledge.temperature_service || null,
        potentiel_garde: knowledge.potentiel_garde || null,
        accords_detailles: knowledge.accords_detailles || null,
        histoire_domaine: knowledge.histoire_domaine || null,
        histoire_cuvee: knowledge.histoire_cuvee || null,
        terroir: knowledge.terroir || null,
        vinification: knowledge.vinification || null,
        pitch_serveur: knowledge.pitch_serveur || null,
        anecdote: knowledge.anecdote || null,
        notes_critiques: knowledge.notes_critiques || null,
        sources: sources,
        generated_at: new Date().toISOString(),
        generation_model: 'claude-sonnet-4-6',
      }, { onConflict: 'wine_id' })

    if (upsertErr) {
      console.error('Upsert error:', upsertErr)
      return NextResponse.json({ error: 'Erreur sauvegarde', details: upsertErr }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      wine_id: wineId,
      wine_name: `${domainName} ${wine.cuvee || ''}`.trim(),
      status: 'ready',
      knowledge,
      sources_count: sources.length,
    })
  } catch (err) {
    console.error('Enrich wine error:', err)
    return NextResponse.json({ error: 'Erreur enrichissement' }, { status: 500 })
  }
}

// GET — Statut de l'enrichissement
export async function GET() {
  const { data: stats } = await supabase
    .from('cave_wine_knowledge')
    .select('status')

  const { data: totalWines } = await supabase
    .from('cave_wines')
    .select('id')
    .eq('statut', 'actif')
    .gt('quantite_stock', 0)

  const counts = {
    total_wines: totalWines?.length || 0,
    pending: 0,
    enriching: 0,
    ready: 0,
    validated: 0,
    rejected: 0,
    not_started: (totalWines?.length || 0) - (stats?.length || 0),
  }

  for (const row of stats || []) {
    const s = row.status as keyof typeof counts
    if (s in counts) counts[s]++
  }

  return NextResponse.json(counts)
}
