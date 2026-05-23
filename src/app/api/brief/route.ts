import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type DomainJoin = { nom: string; commentaire_domaine: string | null } | null

export async function GET() {
  try {
    // 1. Récupérer les vins actifs avec domaines
    const { data: wines } = await supabase
      .from('cave_wines')
      .select('id, type, region, nom_appellation, cuvee, cepage, millesime, prix_vente, quantite_stock, stock_minimum, bevcost_pct, commentaire_client, commentaire_cuvee, accords_carte, cave_domains(nom, commentaire_domaine)')
      .eq('statut', 'actif')
      .gt('quantite_stock', 0)
      .order('quantite_stock', { ascending: false })

    if (!wines || wines.length === 0) {
      return NextResponse.json({ pushWines: [], ruptures: [], anecdote: null })
    }

    // 2. Récupérer les ruptures (stock = 0 mais pas archivé)
    const { data: ruptureWines } = await supabase
      .from('cave_wines')
      .select('id, type, cuvee, quantite_stock, cave_domains(nom)')
      .eq('statut', 'actif')
      .lte('quantite_stock', 1)
      .order('updated_at', { ascending: false })
      .limit(5)

    // 3. Récupérer les vins "forcés" (stockés dans cave_brief_push)
    const { data: forcedPush } = await supabase
      .from('cave_brief_push')
      .select('wine_id, motif')
      .gte('date_brief', new Date().toISOString().split('T')[0])

    const forcedIds = new Set((forcedPush || []).map(f => f.wine_id))
    const forcedMotifs: Record<string, string> = {}
    ;(forcedPush || []).forEach(f => { forcedMotifs[f.wine_id] = f.motif || 'Choix manuel' })

    // 4. Calculer le score de push pour chaque vin
    const scoredWines = wines
      .filter(w => w.quantite_stock > 1)
      .map(w => {
        let score = 0
        let reason = ''

        // Marge forte (bevcost bas = bonne marge)
        const bevcost = w.bevcost_pct || 50
        if (bevcost < 30) { score += 3; reason = 'Bonne marge' }
        else if (bevcost < 40) { score += 1 }

        // Stock élevé (rotation lente)
        if (w.quantite_stock > 6) { score += 2; if (!reason) reason = 'Stock élevé' }
        if (w.quantite_stock > 12) { score += 2 }

        // Forcé par le manager
        if (forcedIds.has(w.id)) {
          score += 100
          reason = forcedMotifs[w.id]
        }

        return { ...w, pushScore: score, pushReason: reason }
      })
      .sort((a, b) => b.pushScore - a.pushScore)
      .slice(0, 3)

    // 5. Préparer les vins à pousser
    const getDomain = (w: { cave_domains: unknown }): DomainJoin => {
      const d = w.cave_domains
      if (Array.isArray(d)) return d[0] as DomainJoin
      return d as DomainJoin
    }

    const pushWines = scoredWines.map((w, i) => {
      const domain = getDomain(w)
      return {
        rank: i + 1,
        id: w.id,
        name: `${domain?.nom || ''} ${w.cuvee || ''} ${w.millesime || ''}`.trim(),
        type: w.type,
        region: w.nom_appellation || w.region,
        cepage: w.cepage,
        commentaire_client: w.commentaire_client,
        prix: w.prix_vente,
        stock: w.quantite_stock,
        reason: w.pushReason,
        reasonType: forcedIds.has(w.id) ? 'forced' : w.pushReason === 'Bonne marge' ? 'margin' : 'stock',
      }
    })

    // 6. Préparer les ruptures
    const ruptures = (ruptureWines || []).map(w => {
      const domain = getDomain(w as { cave_domains: unknown })
      return {
        id: w.id,
        name: `${domain?.nom || ''} ${w.cuvee || ''}`.trim(),
        stock: w.quantite_stock,
        label: w.quantite_stock === 0 ? 'Épuisé' : 'Dernière bouteille',
      }
    })

    // 7. Anecdote du jour — un domaine au hasard
    const domainsWithComment = wines
      .map(w => getDomain(w as { cave_domains: unknown }))
      .filter((d): d is NonNullable<DomainJoin> => !!d?.commentaire_domaine)
    
    const uniqueDomains = [...new Map(domainsWithComment.map(d => [d.nom, d])).values()]
    const randomDomain = uniqueDomains[Math.floor(Math.random() * uniqueDomains.length)]
    const anecdote = randomDomain ? {
      domaine: randomDomain.nom,
      texte: randomDomain.commentaire_domaine,
    } : null

    return NextResponse.json({
      date: new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' }),
      pushWines,
      ruptures,
      anecdote,
      totalRefs: wines.length,
    })
  } catch (err) {
    console.error('Brief error:', err)
    return NextResponse.json({ error: 'Erreur de generation du brief' }, { status: 500 })
  }
}
