import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // 1. Get IDs already synced
    const { data: existingMovements } = await supabase
      .from('cave_stock_movements')
      .select('commentaire')
      .eq('type', 'vente')
      .like('commentaire', 'tiller:%')
    const syncedIds = new Set(
      (existingMovements || []).map((m: { commentaire: string }) => m.commentaire.replace('tiller:', ''))
    )

    // 2. Get all mappings (bouteille + verre)
    const { data: mappingsData } = await supabase
      .from('cave_tiller_mapping')
      .select('wine_id, tiller_product_name, tiller_verre_product_name, is_au_verre')

    if (!mappingsData || mappingsData.length === 0) {
      return NextResponse.json({ message: 'Aucun mapping configuré', synced: 0 })
    }

    // Build lookup: tiller_product_name -> { wine_id, type: 'btl' | 'verre' }
    const productLookup = new Map<string, { wine_id: string; sale_type: 'btl' | 'verre' }>()
    for (const m of mappingsData) {
      if (m.tiller_product_name && m.wine_id) {
        productLookup.set(m.tiller_product_name, { wine_id: m.wine_id, sale_type: 'btl' })
      }
      if (m.tiller_verre_product_name && m.wine_id) {
        productLookup.set(m.tiller_verre_product_name, { wine_id: m.wine_id, sale_type: 'verre' })
      }
    }

    // 3. Get verres_par_bouteille for verre conversion
    const { data: winesData } = await supabase
      .from('cave_wines')
      .select('id, verres_par_bouteille')
      .neq('statut', 'archive')
    const verresMap = new Map<string, number>()
    for (const w of (winesData || [])) {
      verresMap.set(w.id, w.verres_par_bouteille || 6)
    }

    // 4. Get recent sales from lignes_produits (last 7 days to cover any gaps)
    // Paginate to avoid Supabase 1000-row default limit
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const salesData: Array<{ id: string; produit: string; quantite: number; created_at: string }> = []
    const PAGE_SIZE = 1000
    let from = 0
    let hasMore = true
    while (hasMore) {
      const { data: page, error: pageErr } = await supabase
        .from('lignes_produits')
        .select('id, produit, quantite, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      if (pageErr) throw pageErr
      if (page && page.length > 0) {
        salesData.push(...page)
        from += PAGE_SIZE
        hasMore = page.length === PAGE_SIZE
      } else {
        hasMore = false
      }
    }

    // 5. Match and filter
    const newSales: Array<{
      ligne_id: string
      produit: string
      wine_id: string
      quantite: number
      sale_type: 'btl' | 'verre'
    }> = []

    for (const sale of (salesData || [])) {
      if (syncedIds.has(sale.id)) continue
      const match = productLookup.get(sale.produit)
      if (!match) continue
      newSales.push({
        ligne_id: sale.id,
        produit: sale.produit,
        wine_id: match.wine_id,
        quantite: sale.quantite || 1,
        sale_type: match.sale_type,
      })
    }

    if (newSales.length === 0) {
      return NextResponse.json({
        message: 'Aucune nouvelle vente',
        synced: 0,
        total_products_tracked: productLookup.size,
        already_synced: syncedIds.size,
      })
    }

    // 6. Create stock movements
    let syncedBtl = 0, syncedVerre = 0
    const errors: string[] = []

    for (const sale of newSales) {
      let stockDecrement: number

      if (sale.sale_type === 'verre') {
        // Convert verres to fraction of bottle
        const verresParBtl = verresMap.get(sale.wine_id) || 6
        stockDecrement = sale.quantite / verresParBtl
      } else {
        stockDecrement = sale.quantite
      }

      const { error: insertErr } = await supabase
        .from('cave_stock_movements')
        .insert({
          wine_id: sale.wine_id,
          type: 'vente',
          quantite: -stockDecrement,
          commentaire: `tiller:${sale.ligne_id}`,
          motif: sale.sale_type === 'verre' ? `Verre: ${sale.produit}` : sale.produit,
        })

      if (insertErr) {
        errors.push(`${sale.produit}: ${insertErr.message}`)
      } else {
        if (sale.sale_type === 'verre') syncedVerre++
        else syncedBtl++
      }
    }

    return NextResponse.json({
      message: `${syncedBtl + syncedVerre} vente(s) synchronisée(s)`,
      synced_btl: syncedBtl,
      synced_verre: syncedVerre,
      synced_total: syncedBtl + syncedVerre,
      new_sales: newSales.length,
      total_products_tracked: productLookup.size,
      already_synced: syncedIds.size,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('Sync tiller cave error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
