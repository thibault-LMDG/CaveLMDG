import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    // 1. Get IDs already synced (stored as "tiller:<ligne_id>" in commentaire)
    const { data: existingMovements } = await supabase
      .from('cave_stock_movements')
      .select('commentaire')
      .eq('type', 'vente')
      .like('commentaire', 'tiller:%')
    const syncedIds = new Set(
      (existingMovements || []).map((m: { commentaire: string }) => m.commentaire.replace('tiller:', ''))
    )

    // 2. Get matched sales via the view (joins lignes_produits + cave_tiller_mapping)
    const { data: sales, error: salesErr } = await supabase
      .from('v_cave_tiller_sales')
      .select('ligne_id, produit, quantite, wine_id, is_au_verre, created_at')
      .order('created_at', { ascending: true })
    if (salesErr) throw salesErr

    // 3. Filter out already-synced
    const newSales = (sales || []).filter((s: { ligne_id: string }) => !syncedIds.has(s.ligne_id))

    if (newSales.length === 0) {
      return NextResponse.json({ 
        message: 'Aucune nouvelle vente', 
        synced: 0, 
        total_matched: (sales || []).length,
        already_synced: syncedIds.size
      })
    }

    // 4. Create stock movements
    let synced = 0
    const errors: string[] = []

    for (const sale of newSales) {
      const quantite = sale.quantite || 1
      const { error: insertErr } = await supabase
        .from('cave_stock_movements')
        .insert({
          wine_id: sale.wine_id,
          type: 'vente',
          quantite: -quantite,
          commentaire: `tiller:${sale.ligne_id}`,
        })
      if (insertErr) {
        errors.push(`${sale.produit}: ${insertErr.message}`)
      } else {
        synced++
      }
    }

    return NextResponse.json({
      message: `${synced} vente(s) synchronisee(s)`,
      synced,
      new_sales: newSales.length,
      total_matched: (sales || []).length,
      already_synced: syncedIds.size,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('Sync tiller cave error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
