'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { T } from '@/lib/theme'
import {
  GREEN, GREEN_MED, GREEN_PALE, GREEN_DESC, GREEN_FOOT, GREEN_RULE,
  TYPE_TO_CHAPTER, REGION_ORDER_BY_TYPE,
  MOT_MAISON, CITATION, CLOTURE_TEXT, MENTION_LEGALE,
} from '@/lib/carte/constants'

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
interface WineRow {
  type: string
  region: string
  cuvee: string | null
  type_appellation: string | null
  nom_appellation: string | null
  cepage: string | null
  millesime: string | null
  prix_vente: string
  commentaire_client: string | null
  cave_domains: { nom: string } | null
}

interface CarteVin {
  domaine: string
  cuvee: string
  appellation: string
  millesime: string
  cepage: string
  prix: string
  description: string
}

interface ChapitreData {
  nom: string
  numero: string
  regions: { nom: string; vins: CarteVin[] }[]
  total: number
}

// ────────────────────────────────────────────
// Data loading & structuring
// ────────────────────────────────────────────
function buildChapitres(wines: WineRow[]): ChapitreData[] {
  // Group by type
  const byType: Record<string, WineRow[]> = {}
  for (const w of wines) {
    if (!byType[w.type]) byType[w.type] = []
    byType[w.type].push(w)
  }

  const chapitres: ChapitreData[] = []
  const typeOrder = Object.entries(TYPE_TO_CHAPTER).sort((a, b) => a[1].order - b[1].order)

  for (const [type, meta] of typeOrder) {
    const typeWines = byType[type]
    if (!typeWines || typeWines.length === 0) continue

    // Group by region with correct order
    const regionOrder = REGION_ORDER_BY_TYPE[type] || []
    const byRegion: Record<string, CarteVin[]> = {}
    
    for (const w of typeWines) {
      const region = w.region || 'Autre'
      if (!byRegion[region]) byRegion[region] = []
      
      const appParts: string[] = []
      if (w.type_appellation && w.nom_appellation) {
        appParts.push(`${w.type_appellation} ${w.nom_appellation}`)
      } else if (w.nom_appellation) {
        appParts.push(w.nom_appellation)
      } else if (w.type_appellation) {
        // VDF sans nom → afficher "VIN DE FRANCE"
        const typeLabels: Record<string, string> = { VDF: 'VIN DE FRANCE', IGP: 'IGP', AOP: 'AOP' }
        appParts.push(typeLabels[w.type_appellation] || w.type_appellation)
      }

      byRegion[region].push({
        domaine: w.cave_domains?.nom || '',
        cuvee: w.cuvee || '',
        appellation: appParts.join(' '),
        millesime: w.millesime || '',
        cepage: w.cepage || '',
        prix: String(Math.round(parseFloat(w.prix_vente || '0'))),
        description: w.commentaire_client || '',
      })
    }

    // Sort regions according to fixed order, then sort wines by price within each region
    const regions: { nom: string; vins: CarteVin[] }[] = []
    const sortedRegionNames = Object.keys(byRegion).sort((a, b) => {
      const idxA = regionOrder.indexOf(a)
      const idxB = regionOrder.indexOf(b)
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB)
    })

    for (const rName of sortedRegionNames) {
      const vins = byRegion[rName].sort((a, b) => parseFloat(a.prix) - parseFloat(b.prix))
      regions.push({ nom: rName, vins })
    }

    const total = regions.reduce((s, r) => s + r.vins.length, 0)
    chapitres.push({ nom: meta.nom, numero: meta.numero, regions, total })
  }

  return chapitres
}

// ────────────────────────────────────────────
// CSS for print carte (injected into the print iframe)
// ────────────────────────────────────────────
function buildPrintCSS(fontAkz: string, fontCop: string, fontCopB: string, fontLum: string): string {
  return `
@font-face { font-family:'Akz'; src:url(${fontAkz}) format('truetype'); }
@font-face { font-family:'Cop'; src:url(${fontCop}) format('opentype'); }
@font-face { font-family:'CopB'; src:url(${fontCopB}) format('truetype'); }
@font-face { font-family:'Lum'; src:url(${fontLum}) format('truetype'); }
@page { size:210mm 297mm; margin:0; }
*{margin:0;padding:0;box-sizing:border-box;}
html,body{color:${GREEN};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.page{position:relative;width:210mm;height:297mm;overflow:hidden;background:#fff;page-break-after:always;}
.page:last-child{page-break-after:auto;}
.pad{position:absolute;left:22mm;right:22mm;top:22mm;bottom:24mm;}
.foot{position:absolute;left:0;right:0;bottom:11mm;text-align:center;font-family:'Cop';font-size:6.5pt;letter-spacing:2.5px;color:${GREEN_FOOT};}
.chap-head{margin-bottom:8mm;}
.chap-top{display:flex;justify-content:space-between;align-items:flex-end;}
.chap-num{font-family:'Cop';font-size:7.5pt;letter-spacing:3px;color:${GREEN_PALE};}
.chap-count{font-family:'Lum';font-size:10pt;color:${GREEN_PALE};}
.chap-title{font-family:'Akz';font-size:46pt;line-height:0.92;color:${GREEN};margin-top:1mm;}
.chap-rule{height:2pt;background:${GREEN};margin-top:4mm;}
.cont-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:7mm;border-bottom:2pt solid ${GREEN};padding-bottom:3mm;}
.cont-title{font-family:'Akz';font-size:24pt;color:${GREEN};}
.cont-sub{font-family:'Lum';font-size:11pt;color:${GREEN_PALE};}
.rtitle{font-family:'Lum';font-size:15pt;color:${GREEN};margin:0 0 3.5mm;}
.rtitle.cont::after{content:' (suite)';font-size:9pt;color:${GREEN_PALE};}
.vin{margin-bottom:4.4mm;}
.vline{display:flex;align-items:baseline;}
.vname{font-family:'CopB';font-size:10pt;letter-spacing:0.4px;color:${GREEN};white-space:nowrap;}
.vdom{font-family:'CopB';font-size:8.5pt;letter-spacing:0.3px;color:${GREEN_MED};}
.vdots{flex:1;min-width:4mm;}
.vprice{font-family:'Cop';font-size:10pt;color:${GREEN};white-space:nowrap;}
.vapp{font-family:'Cop';font-size:6.6pt;letter-spacing:1.4px;color:${GREEN_PALE};margin:1.6mm 0 1mm;}
.vdesc{font-family:'Cop';font-size:8pt;line-height:1.5;color:${GREEN_DESC};max-width:152mm;}
`
}

// ────────────────────────────────────────────
// HTML builders (same as Charlotte's script)
// ────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function vinHTML(v: CarteVin): string {
  const appParts = [v.appellation]
  if (v.millesime) appParts.push(v.millesime)
  const appLine = appParts.filter(Boolean).join(' · ')
  const cepDesc = v.cepage && v.description
    ? `${esc(v.cepage)} — ${esc(v.description)}`
    : esc(v.cepage || v.description)

  return `<div class="vin"><div class="vline"><div class="vname">${esc(v.domaine)} <span class="vdom">· ${esc(v.cuvee)}</span></div><div class="vdots"></div><div class="vprice">${esc(v.prix)}€</div></div><div class="vapp">${esc(appLine)}</div><div class="vdesc">${cepDesc}</div></div>`
}

function countLabel(n: number): string {
  return n === 1 ? '1 cuvée' : `${n} cuvées`
}

function chapHeadHTML(chap: ChapitreData): string {
  return `<div class="chap-head"><div class="chap-top"><span class="chap-num">${esc(chap.numero)}</span><span class="chap-count">${countLabel(chap.total)}</span></div><div class="chap-title">${esc(chap.nom)}</div><div class="chap-rule"></div></div>`
}

function contHeadHTML(chapName: string): string {
  return `<div class="cont-head"><div class="cont-title">${esc(chapName)}</div><div class="cont-sub">— suite —</div></div>`
}

// ────────────────────────────────────────────
// Pagination engine (reproduces Charlotte's Python logic)
// Uses a hidden measuring div to get exact heights
// ────────────────────────────────────────────
async function paginateChapitres(
  chapitres: ChapitreData[],
  measureFn: (html: string) => Promise<number>,
  availPx: number,
): Promise<string[]> {
  const pages: string[] = []

  for (const chap of chapitres) {
    const headH = await measureFn(chapHeadHTML(chap))
    const contH = await measureFn(contHeadHTML(chap.nom))

    let curFrags: string[] = []
    let curH = 0
    let firstPage = true

    const budget = () => availPx - (firstPage ? headH : contH)

    const flush = () => {
      if (curFrags.length === 0) return
      const hd = firstPage ? chapHeadHTML(chap) : contHeadHTML(chap.nom)
      pages.push(
        `<div class="page"><div class="pad">${hd}${curFrags.join('')}</div><div class="foot">LA MARINE DES GOUDES&nbsp;·&nbsp;${esc(chap.nom)}</div></div>`
      )
      curFrags = []
      curH = 0
      firstPage = false
    }

    for (const region of chap.regions) {
      const rtHTML = `<div class="rtitle">${esc(region.nom)}</div>`
      const rtContHTML = `<div class="rtitle cont">${esc(region.nom)}</div>`
      const rtH = await measureFn(rtHTML)
      const rtContH = await measureFn(rtContHTML)
      const firstVinH = await measureFn(vinHTML(region.vins[0]))

      // Check if region title + first wine fits
      if (curH + rtH + firstVinH > budget()) {
        flush()
      }

      curFrags.push(rtHTML)
      curH += rtH

      for (const v of region.vins) {
        const vh = await measureFn(vinHTML(v))
        if (curH + vh > budget()) {
          flush()
          curFrags.push(rtContHTML)
          curH += rtContH
        }
        curFrags.push(vinHTML(v))
        curH += vh
      }

      // Region spacing
      curFrags.push('<div style="height:2.5mm"></div>')
      curH += 2.5 * 3.78 // ~px per mm at 96dpi
    }

    flush()
  }

  return pages
}

// ────────────────────────────────────────────
// Full HTML document builder
// ────────────────────────────────────────────
function buildFullHTML(
  css: string,
  contentPages: string[],
  imgLogo: string,
  imgPaysage: string,
  imgPointu: string,
  imgHomard: string,
): string {
  const cover = `<div class="page">
    <div style="position:absolute;top:30mm;left:0;right:0;text-align:center;">
      <div style="font-family:'Cop';font-size:8pt;letter-spacing:5px;color:${GREEN_PALE};">MARSEILLE · LES GOUDES</div>
      <img src="${imgLogo}" style="width:54mm;margin-top:12mm;">
    </div>
    <div style="position:absolute;top:118mm;left:0;right:0;text-align:center;">
      <div style="font-family:'Akz';font-size:92pt;line-height:0.86;color:${GREEN};">CARTE</div>
      <div style="font-family:'Lum';font-size:26pt;color:${GREEN};margin:1mm 0;">des</div>
      <div style="font-family:'Akz';font-size:92pt;line-height:0.86;color:${GREEN};">VINS</div>
    </div>
    <img src="${imgPaysage}" style="position:absolute;bottom:26mm;left:50%;transform:translateX(-50%);width:120mm;opacity:0.92;">
  </div>`

  const motmaison = `<div class="page"><div class="pad">
    <div style="font-family:'Cop';font-size:7.5pt;letter-spacing:3px;color:${GREEN_PALE};margin-top:52mm;">LE MOT DE LA MAISON</div>
    <div style="font-family:'Lum';font-size:23pt;line-height:1.4;color:${GREEN};margin-top:6mm;max-width:150mm;">${esc(CITATION)}</div>
    <div style="font-family:'Lum';font-size:11pt;line-height:1.7;color:${GREEN_DESC};margin-top:12mm;max-width:150mm;">${esc(MOT_MAISON)}</div>
    <div style="font-family:'Lum';font-size:12pt;color:${GREEN};margin-top:9mm;">— L'équipe de la Marine des Goudes</div>
    <img src="${imgPointu}" style="position:absolute;bottom:4mm;left:50%;transform:translateX(-50%);width:64mm;opacity:0.9;">
  </div><div class="foot">LA MARINE DES GOUDES&nbsp;·&nbsp;MARSEILLE 8ᵉ · LES GOUDES</div></div>`

  const families = ['BULLES', 'BLANCS', 'ROSÉS', 'ROUGES']
  const auverreGrid = families.map(x =>
    `<div style="text-align:center;border-top:0.6pt solid ${GREEN_RULE};border-bottom:0.6pt solid ${GREEN_RULE};padding:9mm 0;">
      <div style="font-family:'Akz';font-size:21pt;color:${GREEN};">${x}</div>
      <div style="font-family:'Cop';font-size:7pt;letter-spacing:2px;color:${GREEN_PALE};margin-top:3mm;">12 CL</div>
      <div style="font-family:'Lum';font-size:12pt;color:${GREEN_PALE};margin-top:2mm;">—</div>
    </div>`
  ).join('')

  const auverre = `<div class="page"><div class="pad">
    <div class="chap-head"><div class="chap-top"><span class="chap-num">À L'ARDOISE</span><span class="chap-count">0 cuvée</span></div><div class="chap-title">AU VERRE</div><div class="chap-rule"></div></div>
    <div style="text-align:center;font-family:'Lum';font-size:11.5pt;line-height:1.6;color:${GREEN_DESC};margin:14mm auto 16mm;max-width:130mm;">Notre sélection au verre évolue chaque semaine, au gré de la cave et des arrivages. Demandez à la salle — nous serons ravis de vous accompagner.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14mm 18mm;max-width:150mm;margin:0 auto;">${auverreGrid}</div>
    <img src="${imgPaysage}" style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:108mm;opacity:0.5;">
  </div><div class="foot">LA MARINE DES GOUDES&nbsp;·&nbsp;AU VERRE</div></div>`

  const cloture = `<div class="page">
    <img src="${imgHomard}" style="position:absolute;top:66mm;left:50%;transform:translateX(-50%);width:80mm;">
    <div style="position:absolute;top:150mm;left:0;right:0;text-align:center;">
      <div style="font-family:'Lum';font-size:23pt;line-height:1.35;color:${GREEN};max-width:150mm;margin:0 auto;">${esc(CLOTURE_TEXT)}</div>
    </div>
    <div style="position:absolute;top:210mm;left:0;right:0;text-align:center;">
      <div style="font-family:'Cop';font-size:8pt;letter-spacing:4px;color:${GREEN_PALE};">LA MARINE DES GOUDES</div>
      <div style="font-family:'Cop';font-size:8pt;letter-spacing:4px;color:${GREEN_PALE};margin-top:2mm;">MARSEILLE 8ᵉ · LES GOUDES</div>
      <div style="font-family:'Lum';font-size:7.5pt;color:${GREEN_FOOT};margin-top:10mm;">${esc(MENTION_LEGALE)}</div>
    </div>
  </div>`

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>${css}</style></head><body>${cover}${motmaison}${contentPages.join('\n')}${auverre}${cloture}</body></html>`
}

// ────────────────────────────────────────────
// Preview container with responsive scaling
// ────────────────────────────────────────────
function PreviewContainer({ iframeRef, totalPages }: { iframeRef: React.RefObject<HTMLIFrameElement | null>; totalPages: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.35)

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerW = containerRef.current.clientWidth - 16 // padding
        const iframeW = 210 * 3.7795 // 210mm in px at 96dpi ≈ 793.7px
        setScale(Math.min(containerW / iframeW, 0.6))
      }
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const iframeWPx = 210 * 3.7795 // mm to px
  const iframeHPx = 297 * totalPages * 3.7795
  const scaledW = iframeWPx * scale
  const scaledH = iframeHPx * scale

  return (
    <div
      ref={containerRef}
      style={{
        background: '#1a1a2e',
        borderRadius: 12,
        padding: '16px 8px',
        overflow: 'hidden',
      }}
    >
      <div style={{
        width: '100%',
        maxHeight: '65vh',
        overflow: 'auto',
        borderRadius: 8,
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{ width: scaledW, height: scaledH, flexShrink: 0 }}>
          <iframe
            ref={iframeRef}
            title="Carte des vins preview"
            style={{
              width: iframeWPx,
              height: iframeHPx,
              border: 'none',
              background: '#fff',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          />
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: T.muted, marginTop: 8 }}>
        Aperçu de la carte — faites défiler pour voir toutes les pages
      </div>
    </div>
  )
}

// ────────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────────
export default function CartePage() {
  const router = useRouter()
  const [wines, setWines] = useState<WineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [previewHTML, setPreviewHTML] = useState<string>('')
  const [totalVins, setTotalVins] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const measureIframeRef = useRef<HTMLIFrameElement>(null)

  // Assets loaded lazily
  const [assets, setAssets] = useState<{
    fontAkz: string; fontCop: string; fontCopB: string; fontLum: string
    imgLogo: string; imgPaysage: string; imgPointu: string; imgHomard: string
  } | null>(null)

  // Load assets on mount
  useEffect(() => {
    import('@/lib/carte/assets').then(mod => {
      setAssets({
        fontAkz: mod.FONT_AKZ,
        fontCop: mod.FONT_COP,
        fontCopB: mod.FONT_COPB,
        fontLum: mod.FONT_LUM,
        imgLogo: mod.IMG_LOGO,
        imgPaysage: mod.IMG_PAYSAGE,
        imgPointu: mod.IMG_POINTU,
        imgHomard: mod.IMG_HOMARD,
      })
    })
  }, [])

  // Load wines from Supabase
  const loadWines = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cave_wines')
      .select('type, region, cuvee, type_appellation, nom_appellation, cepage, millesime, prix_vente, commentaire_client, cave_domains(nom)')
      .neq('statut', 'archive')
      .gt('quantite_stock', 0)

    if (data) {
      setWines(data as unknown as WineRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadWines() }, [loadWines])

  // Generate preview when wines + assets are ready
  const generatePreview = useCallback(async () => {
    if (!assets || wines.length === 0) return
    setGenerating(true)

    const chapitres = buildChapitres(wines)
    setTotalVins(chapitres.reduce((s, c) => s + c.total, 0))

    const css = buildPrintCSS(assets.fontAkz, assets.fontCop, assets.fontCopB, assets.fontLum)

    // Create a hidden iframe for measuring
    const measureFrame = measureIframeRef.current
    if (!measureFrame) { setGenerating(false); return }

    // Set up measuring environment
    const mDoc = measureFrame.contentDocument
    if (!mDoc) { setGenerating(false); return }
    mDoc.open()
    mDoc.write(`<!DOCTYPE html><html><head><style>${css}</style></head><body><div id="m" style="width:166mm;"></div></body></html>`)
    mDoc.close()

    // Wait for fonts to load in the iframe
    await new Promise(r => setTimeout(r, 300))

    const mEl = mDoc.getElementById('m')
    if (!mEl) { setGenerating(false); return }

    // Calculate available height per page in pixels
    // Create a reference div to get px/mm ratio
    const refDiv = mDoc.createElement('div')
    refDiv.style.height = '100mm'
    mDoc.body.appendChild(refDiv)
    const pxPerMm = refDiv.getBoundingClientRect().height / 100
    mDoc.body.removeChild(refDiv)

    const availPx = (297 - 22 - 24 - 12) * pxPerMm // page height - top pad - bottom pad - safety

    const measureFn = async (html: string): Promise<number> => {
      mEl.innerHTML = html
      await new Promise(r => setTimeout(r, 5))
      const rect = mEl.getBoundingClientRect()
      // Add margin of last child
      const children = mEl.children
      let h = rect.height
      if (children.length > 0) {
        const last = children[children.length - 1] as HTMLElement
        const cs = getComputedStyle(last)
        h += parseFloat(cs.marginBottom) || 0
      }
      return h
    }

    const contentPages = await paginateChapitres(chapitres, measureFn, availPx)
    const fullHTML = buildFullHTML(css, contentPages, assets.imgLogo, assets.imgPaysage, assets.imgPointu, assets.imgHomard)

    setPreviewHTML(fullHTML)
    setTotalPages(contentPages.length + 4) // +4 = cover + mot maison + au verre + cloture
    setGenerating(false)
  }, [assets, wines])

  // Auto-generate when data is ready
  useEffect(() => {
    if (assets && wines.length > 0 && !previewHTML) {
      generatePreview()
    }
  }, [assets, wines, previewHTML, generatePreview])

  // Write preview HTML into display iframe
  useEffect(() => {
    if (previewHTML && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(previewHTML)
        doc.close()
      }
    }
  }, [previewHTML])

  // Print PDF via iframe
  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print()
    }
  }

  const isReady = !!previewHTML && !generating && !loading

  return (
    <div style={{ padding: '16px 16px 100px', minHeight: '100vh' }}>
      {/* Hidden measuring iframe */}
      <iframe
        ref={measureIframeRef}
        style={{ position: 'absolute', left: -9999, top: -9999, width: '210mm', height: '297mm', border: 'none', visibility: 'hidden' }}
        title="measure"
      />

      {/* Header */}
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', color: T.teal, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 12 }}
      >
        ← Retour
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 500, color: T.text }}>📄 Carte des vins</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            {loading ? 'Chargement…' : generating ? 'Mise en page…' : isReady ? `${totalVins} vins · ${totalPages} pages` : ''}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => { setPreviewHTML(''); loadWines() }}
          disabled={loading || generating}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 10, border: `0.5px solid ${T.border}`,
            background: T.deep, color: T.teal, fontSize: 13, fontWeight: 500,
            cursor: (loading || generating) ? 'wait' : 'pointer',
            opacity: (loading || generating) ? 0.5 : 1,
          }}
        >
          🔄 Actualiser
        </button>
        <button
          onClick={handlePrint}
          disabled={!isReady}
          style={{
            flex: 1, padding: '12px 0', borderRadius: 10, border: 'none',
            background: T.gold, color: T.sea, fontSize: 13, fontWeight: 500,
            cursor: isReady ? 'pointer' : 'not-allowed',
            opacity: isReady ? 1 : 0.5,
          }}
        >
          🖨️ Imprimer / PDF
        </button>
      </div>

      {/* Status info */}
      {isReady && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 16,
          background: `${T.up}10`, border: `0.5px solid ${T.up}30`,
        }}>
          <div style={{ fontSize: 12, color: T.up, fontWeight: 500 }}>
            ✅ Carte prête — {totalVins} vins en stock, {totalPages} pages
          </div>
          <div style={{ fontSize: 11, color: T.text2, marginTop: 3 }}>
            Cliquez sur « Imprimer / PDF » pour télécharger. Dans la boîte de dialogue, choisissez « Enregistrer en PDF » comme destination.
          </div>
        </div>
      )}

      {/* Loading state */}
      {(loading || generating) && (
        <div style={{
          textAlign: 'center', padding: '60px 20px', color: T.muted,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>{loading ? '🍷' : '📐'}</div>
          <div style={{ fontSize: 14, color: T.text2 }}>
            {loading ? 'Chargement des vins en stock…' : 'Mise en page de la carte…'}
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            {generating ? 'Calcul de la pagination optimale' : ''}
          </div>
        </div>
      )}

      {/* Preview iframe */}
      {isReady && (
        <PreviewContainer iframeRef={iframeRef} totalPages={totalPages} />
      )}
    </div>
  )
}
