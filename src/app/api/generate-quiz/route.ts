import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Définition des 10 niveaux Culture Vin
const CULTURE_LEVELS: Record<number, { name: string; description: string; prompt: string }> = {
  1: {
    name: 'Les bases',
    description: 'Rouge, blanc, rosé — les fondamentaux absolus',
    prompt: `Niveau DEBUTANT ABSOLU. La personne n'y connait RIEN en vin.
Questions tres simples : difference rouge/blanc/rose, qu'est-ce qu'un vin effervescent, comment on sert le vin, qu'est-ce qu'un verre a vin, pourquoi on fait tourner le vin dans le verre.
Les reponses fausses doivent etre plausibles mais clairement fausses pour quelqu'un qui reflechit.`,
  },
  2: {
    name: 'Les familles',
    description: 'Cépages, types de vins, vocabulaire de base',
    prompt: `Niveau DEBUTANT. La personne connait les bases (rouge/blanc/rose).
Questions sur : qu'est-ce qu'un cepage (sans demander lesquels), difference vin sec/moelleux/liquoreux, qu'est-ce qu'un millesime, qu'est-ce qu'un tanin (definition simple), vin tranquille vs effervescent.
Vocabulaire simple, pas de piege.`,
  },
  3: {
    name: 'Les régions',
    description: 'Les grandes régions viticoles de France',
    prompt: `Niveau INTERMEDIAIRE BAS. La personne connait le vocabulaire de base.
Questions sur les grandes regions viticoles françaises : Provence, Rhone, Bourgogne, Bordeaux, Loire, Alsace, Champagne, Languedoc.
Pas de sous-regions ni de cepages specifiques. Questions du type : "La Champagne est connue pour quel type de vin ?", "Cite 3 grandes regions viticoles", "Quel type de vin est le plus produit en Provence ?".`,
  },
  4: {
    name: 'Les cépages',
    description: 'Les principaux cépages et où on les trouve',
    prompt: `Niveau INTERMEDIAIRE. La personne connait les regions de base.
Questions sur les cepages principaux : Chardonnay, Sauvignon, Grenache, Syrah, Mourvedre, Cabernet Sauvignon, Merlot, Pinot Noir, Cinsault, Vermentino/Rolle, Viognier.
Associer cepages a des regions, reconnaitre si un cepage est blanc ou rouge, cepages typiques du sud de la France.`,
  },
  5: {
    name: 'La dégustation',
    description: 'Les étapes, le vocabulaire, les arômes',
    prompt: `Niveau INTERMEDIAIRE. La personne connait les cepages et regions.
Questions sur la degustation : les 3 etapes (oeil/nez/bouche), vocabulaire (charpente, rondeur, acidite, longueur en bouche, finale, robe, larmes, jambes), familles d'aromes (fruites, floraux, epices, boise), temperature de service par type.
Pas d'accords mets-vins (c'est le niveau 6).`,
  },
  6: {
    name: 'Accords mets-vins',
    description: 'Les principes fondamentaux des accords',
    prompt: `Niveau INTERMEDIAIRE AVANCE. La personne maitrise la degustation.
Questions sur les principes d'accords : pourquoi le blanc avec le poisson (acidite/iode), pourquoi eviter les tanins avec les fruits de mer, accords regionaux (bouillabaisse + rose de Provence), accords par type de cuisson, accords fromages, accords desserts.
Questions pratiques orientees service restaurant.`,
  },
  7: {
    name: 'Vinification',
    description: 'Comment on fait du vin — élevage, macération, méthodes',
    prompt: `Niveau AVANCE. La personne connait les accords.
Questions sur la vinification : maceration (quoi, pourquoi), fermentation alcoolique et malolactique, elevage cuve vs fut vs amphore, vinification en blanc vs rouge vs rose (saignee, pressurage direct), methode champenoise, biodynamie, agriculture bio, levures indigenes vs selectionnees.
Niveau technique mais explique simplement.`,
  },
  8: {
    name: 'Les appellations',
    description: 'AOP, IGP, sous-régions, terroirs',
    prompt: `Niveau AVANCE. La personne comprend la vinification.
Questions sur le systeme d'appellations : AOP/AOC/IGP/VDF, sous-regions (Bandol, Cassis, Cotes du Rhone vs Chateauneuf, Chablis vs Meursault, Saint-Emilion vs Pauillac), notion de terroir, grands crus et premiers crus en Bourgogne, classification Bordeaux.
Focus sur les appellations qu'on retrouve dans les restaurants du sud.`,
  },
  9: {
    name: 'Le service',
    description: 'Conseiller, présenter, servir — le métier de sommelier',
    prompt: `Niveau EXPERT. La personne maitrise les appellations.
Questions OUVERTES (pas QCM) sur le service : comment presenter un vin a un client, comment gerer un client qui renvoie une bouteille, comment decrire un vin en 10 secondes, comment orienter un client indecis, carafage vs decantation, temperatures precises par type, service au verre vs bouteille, ordre de service des vins pendant un repas.
Les reponses doivent etre evaluees sur la pertinence et le professionnalisme.`,
  },
  10: {
    name: 'Expert',
    description: 'Histoire, géographie, analyse — le niveau sommelier',
    prompt: `Niveau EXPERT MAXIMUM. La personne maitrise le service.
Questions OUVERTES et COMPLEXES : histoire du vignoble français (phylloxera, classification 1855), biodynamie vs bio vs nature en profondeur, grands vignerons historiques, evolution du gout des consommateurs, enjeux du changement climatique sur la viticulture, vins orange/amphore, vins naturels.
Reponses evaluees sur la profondeur d'analyse et la capacite a vulgariser.`,
  },
}

// Définition des 10 niveaux Notre Cave
const CAVE_LEVELS: Record<number, { name: string; description: string; prompt: string }> = {
  1: {
    name: 'Découvrir',
    description: 'Les bases de notre carte des vins',
    prompt: `Niveau DEBUTANT ABSOLU sur la cave du restaurant.
Questions tres simples : combien de vins environ a la carte, quelles couleurs de vin on propose, est-ce qu'on a des bulles, est-ce qu'on a des roses.
Utilise les donnees fournies pour creer des questions factuelles simples.`,
  },
  2: {
    name: 'Les couleurs',
    description: 'Nos vins par type et par région',
    prompt: `Niveau DEBUTANT. La personne sait qu'on a une carte.
Questions sur les types et regions : cite 2 vins blancs de notre carte, de quelle region viennent la majorite de nos vins, combien de roses on a environ.
Toujours base sur les donnees reelles fournies.`,
  },
  3: {
    name: 'Nos domaines',
    description: 'Les producteurs avec qui on travaille',
    prompt: `Niveau INTERMEDIAIRE BAS. La personne connait nos types de vins.
Questions sur les domaines : cite 3 domaines de notre carte, tel domaine est dans quelle region, combien de domaines differents on a.
Base sur les donnees reelles.`,
  },
  4: {
    name: 'Les cuvées',
    description: 'Associer domaines et cuvées',
    prompt: `Niveau INTERMEDIAIRE. La personne connait nos domaines.
Questions d'association : quel domaine produit telle cuvee, telle cuvee c'est un rouge ou un blanc, associe 3 cuvees a leur domaine.
Base sur les donnees reelles.`,
  },
  5: {
    name: 'Nos cépages',
    description: 'Les cépages de chaque vin de notre cave',
    prompt: `Niveau INTERMEDIAIRE. La personne connait nos cuvees.
Questions sur les cepages de NOS vins : quels cepages dans tel vin, cite un vin de notre carte a base de Mourvedre, quel est le cepage principal de notre Chablis.
Base sur les donnees reelles de cepages.`,
  },
  6: {
    name: 'En parler',
    description: 'Décrire nos vins en quelques mots',
    prompt: `Niveau INTERMEDIAIRE AVANCE. La personne connait nos cepages.
Questions sur la capacite a decrire : decris le profil de tel vin en une phrase, un client demande un blanc frais et mineral — tu proposes quoi, comment tu presentes tel domaine en 10 secondes.
Utilise les commentaires de cuvee et les commentaires client des donnees.`,
  },
  7: {
    name: 'Nos accords',
    description: 'Quels vins avec quels plats de notre carte',
    prompt: `Niveau AVANCE. La personne sait decrire nos vins.
Questions sur les accords avec NOTRE carte : avec la bouillabaisse tu proposes quoi et pourquoi, quel vin pour le loup grille, quel vin pour les fromages.
Utilise les champs accords_carte des donnees.`,
  },
  8: {
    name: 'Argumenter',
    description: 'Comparer et conseiller entre nos vins',
    prompt: `Niveau AVANCE. La personne connait les accords.
Questions de comparaison et d'argumentation : un client hesite entre 2 de nos vins — comment tu l'aiguilles, quelle est la difference de style entre nos 2 roses de Bandol, pourquoi tel vin est plus cher que tel autre.
Reponses evaluees sur la pertinence.`,
  },
  9: {
    name: 'Nos histoires',
    description: 'L\'histoire de chaque domaine et cuvée',
    prompt: `Niveau EXPERT. La personne sait argumenter.
Questions OUVERTES sur l'histoire : raconte l'histoire de tel domaine, qu'est-ce qui rend le terroir de tel domaine particulier, depuis combien de temps on travaille avec tel agent.
Utilise les commentaires domaine des donnees. Reponses evaluees par IA.`,
  },
  10: {
    name: 'Sommelier LMDG',
    description: 'Le niveau ultime — tu connais notre cave par cœur',
    prompt: `Niveau SOMMELIER. La personne connait tout.
Questions OUVERTES et COMPLEXES : compose une selection de 3 vins au verre pour accompagner un repas complet, cree un argumentaire de vente pour le vin le moins vendu, un client connaisseur te challenge sur une appellation — comment tu geres, propose une selection pour une table de 6 qui fete un anniversaire avec budget 200€ en vins.
Evaluation stricte sur la coherence, la creativite et le professionnalisme.`,
  },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { parcours, level, count = 10 } = body as {
      parcours: 'culture' | 'cave'
      level: number
      count?: number
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configuree' }, { status: 500 })
    }

    const levels = parcours === 'culture' ? CULTURE_LEVELS : CAVE_LEVELS
    const levelConfig = levels[level]
    if (!levelConfig) {
      return NextResponse.json({ error: 'Niveau invalide' }, { status: 400 })
    }

    const isOpenLevel = level >= 9
    let wineDataContext = ''

    // Pour le parcours "cave", on récupère les données réelles
    if (parcours === 'cave') {
      const { data: wines } = await supabase
        .from('cave_wines')
        .select('type, region, nom_appellation, cuvee, cepage, millesime, quantite_stock, commentaire_cuvee, commentaire_client, accords_carte, cave_domains(nom, commentaire_domaine), cave_agents(nom)')
        .eq('statut', 'actif')
        .order('region')

      if (wines && wines.length > 0) {
        wineDataContext = `\n\nDONNEES DE NOTRE CAVE (${wines.length} vins actifs) :\n${wines.map((w: Record<string, unknown>) => {
          const domain = w.cave_domains as Record<string, string> | null
          const agent = w.cave_agents as Record<string, string> | null
          return `- ${domain?.nom || '?'} ${w.cuvee || ''} ${w.millesime || ''} | ${w.type} | ${w.region} | ${w.nom_appellation || ''} | Cepages: ${w.cepage || '?'} | Stock: ${w.quantite_stock} | ${w.commentaire_cuvee ? 'Profil: ' + w.commentaire_cuvee : ''} | ${w.commentaire_client ? 'Mots-cles: ' + w.commentaire_client : ''} | ${w.accords_carte ? 'Accords carte: ' + w.accords_carte : ''} | ${domain?.commentaire_domaine ? 'Domaine: ' + domain.commentaire_domaine : ''} | Agent: ${agent?.nom || '?'}`
        }).join('\n')}`
      }
    }

    const formatInstruction = isOpenLevel
      ? `Genere ${count} questions OUVERTES (pas de QCM).
Pour chaque question, fournis :
- "question" : la question ouverte
- "expected_points" : liste de 3-5 points cles attendus dans une bonne reponse
- "example_answer" : un exemple de reponse ideale en 2-3 phrases

Reponds UNIQUEMENT en JSON valide :
{"questions":[{"question":"...","expected_points":["...","..."],"example_answer":"..."}]}`
      : `Genere ${count} questions QCM avec 4 choix chacune.
Pour chaque question, fournis :
- "question" : la question
- "options" : tableau de 4 reponses possibles (la bonne en position aleatoire)
- "correct" : index de la bonne reponse (0-3)
- "explanation" : explication courte et engageante de la bonne reponse (2 phrases max). Si c'est le parcours "cave", fais le lien avec nos vins quand c'est pertinent.
- "illustration" : un emoji qui illustre bien la question (vin, region, etc.)

Les reponses fausses doivent etre PLAUSIBLES, pas ridicules.
Varie les types de questions (pas que des "quel est..." mais aussi des vrai/faux deguises en QCM, des associations, des "lequel de ces vins...").

Reponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
{"questions":[{"question":"...","options":["...","...","...","..."],"correct":0,"explanation":"...","illustration":"🍷"}]}`

    const prompt = `Tu es formateur vin pour l'equipe de salle d'un restaurant gastronomique de bord de mer a Marseille (La Marine des Goudes). Tu crees un quiz de formation.

PARCOURS : ${parcours === 'culture' ? 'Culture Vin (connaissances generales)' : 'Notre Cave (connaissances specifiques a notre carte)'}
NIVEAU ${level}/10 : ${levelConfig.name} — ${levelConfig.description}

CONSIGNES PEDAGOGIQUES :
${levelConfig.prompt}

IMPORTANT :
- Le ton doit etre bienveillant et encourageant, jamais scolaire
- Les explications doivent donner envie d'en apprendre plus
- Chaque question doit etre differente (pas de doublons)
- Ne repete JAMAIS les memes questions d'une session a l'autre — varie !
${wineDataContext}

${formatInstruction}`

    // Essayer d'abord le modèle standard, puis fallback
    const models = ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022']
    let responseData = null

    for (const model of models) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (response.ok) {
        responseData = await response.json()
        break
      } else {
        const errText = await response.text()
        console.error(`Anthropic API error with ${model}:`, response.status, errText.slice(0, 200))
        if (model === models[models.length - 1]) {
          return NextResponse.json({ error: `API Anthropic: ${response.status} — ${errText.slice(0, 100)}` }, { status: 500 })
        }
        // Continue to next model
      }
    }

    if (!responseData) {
      return NextResponse.json({ error: 'Tous les modèles ont échoué' }, { status: 500 })
    }

    const text = responseData.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({
      parcours,
      level,
      levelName: levelConfig.name,
      levelDescription: levelConfig.description,
      isOpen: isOpenLevel,
      ...parsed,
    })
  } catch (err) {
    console.error('Generate quiz error:', err)
    return NextResponse.json({ error: 'Erreur de generation du quiz' }, { status: 500 })
  }
}
