'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

const C = {
  bg: '#FFFFFF',
  marine: '#1C5733',
  marineMid: '#5e7e6c',
  marinePale: '#8aa194',
  desc: '#3d5c4a',
  gold: '#B8963E',
  text: '#1C5733',
  text2: '#5e7e6c',
  muted: '#8aa194',
  border: '#cdd9d0',
  borderLight: '#e2ebe5',
  accent: '#f2f6f3',
}

interface WineResult {
  wine_id: string
  name: string
  prix: string
  raison: string
  detail?: string
}

interface Option { label: string; emoji: string; value: string }

interface AIResponse {
  type: 'results' | 'refine' | 'mixed'
  intro?: string
  wines?: WineResult[]
  question?: string
  options?: Option[]
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  parsed?: AIResponse
}

interface KnowledgeData {
  wine_id: string
  pitch_serveur: string | null
  degustation_nez: string | null
  degustation_bouche: string | null
  degustation_finale: string | null
  temperature_service: string | null
  potentiel_garde: string | null
  accords_detailles: string | null
  histoire_domaine: string | null
  histoire_cuvee: string | null
  terroir: string | null
  vinification: string | null
  anecdote: string | null
  notes_critiques: string | null
}

interface WineBase {
  id: string
  type: string
  region: string
  cepage: string | null
  cuvee: string | null
  millesime: string | null
  certification: string | null
  sans_sulfites: boolean
  cave_domains: { nom: string } | { nom: string }[] | null
}

const SUGGESTIONS = [
  'Un blanc frais pour les huîtres',
  'Un vin pour fêter un anniversaire',
  'Quelque chose de léger pour l\'apéro',
  'Un rouge pour l\'entrecôte',
  'Un vin nature original',
  'Votre coup de cœur du moment',
  'Un rosé bien frais',
  'Un vin pour la bouillabaisse',
]

const PLACEHOLDERS = [
  'Un blanc frais pour les huîtres...',
  'Quelque chose de léger pour l\'apéro...',
  'Un rouge pour l\'entrecôte...',
  'Un vin pour fêter un anniversaire...',
  'Votre coup de cœur du moment...',
]

// Auto-resize textarea helper
function AutoTextarea({ value, onChange, onKeyDown, placeholder, style }: {
  value: string
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  placeholder: string
  style: React.CSSProperties
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = Math.min(ref.current.scrollHeight, 120) + 'px'
    }
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onKeyDown(e)
        }
      }}
      placeholder={placeholder}
      rows={1}
      style={{
        ...style,
        resize: 'none',
        overflow: 'hidden',
        lineHeight: 1.4,
      }}
    />
  )
}

// Wine full sheet component
function WineFullSheet({ wineId, knowledge, wineBase, onClose }: {
  wineId: string
  knowledge: KnowledgeData | null
  wineBase: WineBase | null
  onClose: () => void
}) {
  if (!knowledge && !wineBase) return null

  const domain = wineBase?.cave_domains
    ? (Array.isArray(wineBase.cave_domains) ? wineBase.cave_domains[0] : wineBase.cave_domains)
    : null

  const sections: { icon: string; title: string; content: string | null }[] = [
    { icon: '👃', title: 'Au nez', content: knowledge?.degustation_nez || null },
    { icon: '👅', title: 'En bouche', content: knowledge?.degustation_bouche || null },
    { icon: '🎵', title: 'Finale', content: knowledge?.degustation_finale || null },
    { icon: '🌡️', title: 'Service', content: knowledge?.temperature_service || null },
    { icon: '⏳', title: 'Garde', content: knowledge?.potentiel_garde || null },
    { icon: '🍽️', title: 'Accords', content: knowledge?.accords_detailles || null },
    { icon: '🗺️', title: 'Terroir', content: knowledge?.terroir || null },
    { icon: '⚗️', title: 'Vinification', content: knowledge?.vinification || null },
    { icon: '🏠', title: 'Le domaine', content: knowledge?.histoire_domaine || null },
    { icon: '🍇', title: 'La cuvée', content: knowledge?.histoire_cuvee || null },
    { icon: '⭐', title: 'Critiques', content: knowledge?.notes_critiques || null },
  ].filter(s => s.content)

  const certParts: string[] = []
  if (wineBase?.certification && wineBase.certification !== 'conventionnel') certParts.push(wineBase.certification)
  if (wineBase?.sans_sulfites) certParts.push('sans sulfites')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500, maxHeight: '88dvh',
          background: C.bg, borderRadius: '20px 20px 0 0',
          overflowY: 'auto',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.borderLight }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 20px 16px', borderBottom: `0.5px solid ${C.borderLight}` }}>
          <div style={{
            fontFamily: '"Copperplate", Georgia, serif',
            fontSize: 14, fontWeight: 700, color: C.marine,
            textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.4,
          }}>
            {domain?.nom || ''} {wineBase?.cuvee || ''}
          </div>
          <div style={{
            fontFamily: '"Copperplate", Georgia, serif',
            fontSize: 10, color: C.muted, marginTop: 4, letterSpacing: 0.5,
          }}>
            {wineBase?.type} · {wineBase?.region} {wineBase?.millesime ? `· ${wineBase.millesime}` : ''}
            {wineBase?.cepage ? ` · ${wineBase.cepage}` : ''}
            {certParts.length > 0 ? ` · ${certParts.join(' · ')}` : ''}
          </div>
        </div>

        {/* Anecdote highlight */}
        {knowledge?.anecdote && (
          <div style={{
            margin: '16px 20px 0', padding: '14px 16px',
            background: `${C.gold}0c`,
            border: `1px solid ${C.gold}25`,
            borderRadius: 10,
          }}>
            <div style={{
              fontFamily: '"Copperplate", Georgia, serif',
              fontSize: 9, color: C.gold, textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 6, fontWeight: 700,
            }}>
              💡 Pour briller en société
            </div>
            <div style={{
              fontFamily: 'Luminari, Georgia, serif',
              fontSize: 12, color: C.desc, lineHeight: 1.7, fontStyle: 'italic',
            }}>
              {knowledge.anecdote}
            </div>
          </div>
        )}

        {/* Sections */}
        <div style={{ padding: '12px 20px 32px' }}>
          {sections.map((s, i) => (
            <div key={i} style={{ marginTop: i === 0 ? 8 : 16 }}>
              <div style={{
                fontFamily: '"Copperplate", Georgia, serif',
                fontSize: 9, color: C.marinePale, textTransform: 'uppercase',
                letterSpacing: 1.5, marginBottom: 4, fontWeight: 500,
              }}>
                {s.icon} {s.title}
              </div>
              <div style={{
                fontFamily: '"Copperplate", Georgia, serif',
                fontSize: 11, color: C.desc, lineHeight: 1.6,
              }}>
                {s.content}
              </div>
            </div>
          ))}

          {sections.length === 0 && (
            <div style={{
              fontFamily: 'Luminari, Georgia, serif',
              fontSize: 12, color: C.muted, textAlign: 'center',
              padding: '24px 0', fontStyle: 'italic',
            }}>
              La fiche détaillée de ce vin sera bientôt disponible.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SommelierClientPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [expandedWine, setExpandedWine] = useState<string | null>(null)
  const [fullSheetWine, setFullSheetWine] = useState<string | null>(null)
  const [knowledgeMap, setKnowledgeMap] = useState<Record<string, KnowledgeData>>({})
  const [wineBaseMap, setWineBaseMap] = useState<Record<string, WineBase>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const heroInputRef = useRef<HTMLTextAreaElement>(null)

  // Load knowledge + wine base data
  useEffect(() => {
    async function load() {
      const [{ data: kData }, { data: wData }] = await Promise.all([
        supabase.from('cave_wine_knowledge').select('*').eq('status', 'validated'),
        supabase.from('cave_wines').select('id, type, region, cepage, cuvee, millesime, certification, sans_sulfites, cave_domains(nom)').eq('statut', 'actif').gt('quantite_stock', 0),
      ])
      const km: Record<string, KnowledgeData> = {}
      for (const k of kData || []) km[k.wine_id] = k as KnowledgeData
      setKnowledgeMap(km)
      const wm: Record<string, WineBase> = {}
      for (const w of wData || []) wm[w.id] = w as WineBase
      setWineBaseMap(wm)
    }
    load()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    setTimeout(() => heroInputRef.current?.focus(), 300)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.role === 'assistant' && m.parsed ? JSON.stringify(m.parsed) : m.content,
      }))
      const res = await fetch('/api/sommelier-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setMessages([...newMessages, {
        role: 'assistant', content: JSON.stringify(data.response), parsed: data.response as AIResponse,
      }])
    } catch {
      setMessages([...newMessages, {
        role: 'assistant', content: '',
        parsed: { type: 'results', intro: 'Pardon, un petit souci technique. Réessayez dans un instant.', wines: [] },
      }])
    } finally {
      setLoading(false)
    }
  }, [messages, loading])

  const handleReset = () => {
    setMessages([])
    setExpandedWine(null)
    setFullSheetWine(null)
    setTimeout(() => heroInputRef.current?.focus(), 100)
  }

  const isFirstScreen = messages.length === 0

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '12px 18px', fontSize: 13,
    fontFamily: '"Copperplate", Georgia, serif',
    background: isFirstScreen ? C.bg : C.accent,
    border: `1.5px solid ${C.border}`,
    borderRadius: 22, color: C.text, outline: 'none',
    letterSpacing: 0.3, minHeight: 44,
  }

  return (
    <div style={{
      height: '100%', background: C.bg,
      fontFamily: '"Copperplate", "Copperplate Gothic Std", Georgia, serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <style>{`
        @font-face { font-family: 'Luminari'; src: url('/fonts/Luminari-Regular.ttf') format('truetype'); font-weight: normal; font-display: swap; }
        @font-face { font-family: 'Copperplate'; src: url('/fonts/Copperplate-Gothic-Std-33-BC.ttf') format('truetype'); font-weight: bold; font-display: swap; }
        @font-face { font-family: 'Copperplate'; src: url('/fonts/Copperplate-Gothic-Std-32-BC.otf') format('opentype'); font-weight: normal; font-display: swap; }
        @keyframes pulse { 0%,80%,100%{opacity:.3;transform:scale(.8)} 40%{opacity:1;transform:scale(1.1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <header style={{
        padding: isFirstScreen ? '28px 20px 0' : '14px 20px 10px',
        textAlign: 'center',
        borderBottom: isFirstScreen ? 'none' : `0.5px solid ${C.borderLight}`,
        position: 'relative', flexShrink: 0,
      }}>
        {isFirstScreen && (
          <>
            <Image src="/sommelier/logo.png" alt="La Marine des Goudes" width={60} height={60} style={{ opacity: 0.85, marginBottom: 8 }} />
            <div style={{ fontFamily: 'Luminari, Georgia, serif', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: C.muted, marginBottom: 2 }}>
              Marseille · Les Goudes
            </div>
          </>
        )}
        {!isFirstScreen && (
          <div style={{ fontFamily: 'Luminari, Georgia, serif', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: C.muted }}>
            La Marine des Goudes
          </div>
        )}
        <div style={{ fontFamily: 'Luminari, Georgia, serif', fontSize: isFirstScreen ? 26 : 17, fontWeight: 400, color: C.marine, letterSpacing: 1 }}>
          Le Sommelier
        </div>
        {messages.length > 0 && (
          <button onClick={handleReset} style={{
            position: 'absolute', right: 16, top: 14, padding: '5px 12px', fontSize: 10,
            fontFamily: '"Copperplate", Georgia, serif', color: C.muted, background: 'transparent',
            border: `1px solid ${C.border}`, borderRadius: 20, cursor: 'pointer', letterSpacing: 0.5, textTransform: 'uppercase',
          }}>Nouveau</button>
        )}
      </header>

      {/* Content */}
      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto', minHeight: 0 }}>
        {isFirstScreen && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20, paddingBottom: 20 }}>
            <div style={{ fontFamily: 'Luminari, Georgia, serif', fontSize: 15, color: C.desc, textAlign: 'center', lineHeight: 1.7, marginBottom: 28, maxWidth: 300, fontStyle: 'italic' }}>
              Décrivez-moi ce qui vous ferait plaisir,<br />je vous trouve le vin parfait.
            </div>

            {/* Hero input */}
            <div style={{ width: '100%', maxWidth: 380, display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 36 }}>
              <AutoTextarea
                value={input}
                onChange={setInput}
                onKeyDown={() => sendMessage(input)}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                style={inputStyle}
              />
              <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{
                width: 48, height: 48, borderRadius: 24, background: input.trim() ? C.marine : C.border,
                color: '#fff', border: 'none', fontSize: 20, cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0,
              }}>↑</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 340, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 0.5, background: C.borderLight }} />
              <span style={{ fontFamily: 'Luminari, Georgia, serif', fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: 'uppercase' }}>ou essayez</span>
              <div style={{ flex: 1, height: 0.5, background: C.borderLight }} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 380 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} style={{
                  padding: '8px 14px', fontSize: 11, fontFamily: '"Copperplate", Georgia, serif',
                  color: C.text2, background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s', letterSpacing: 0.3,
                }}>{s}</button>
              ))}
            </div>

            <div style={{ marginTop: 40, opacity: 0.12 }}>
              <Image src="/sommelier/pointu.png" alt="" width={180} height={90} style={{ objectFit: 'contain' }} />
            </div>
          </div>
        )}

        {/* Conversation */}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 20 : 16, animation: 'fadeIn 0.3s ease' }}>
            {msg.role === 'user' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 16px', background: C.marine, color: '#fff',
                  borderRadius: '18px 18px 4px 18px', fontSize: 13, lineHeight: 1.4,
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                }}>{msg.content}</div>
              </div>
            )}

            {msg.role === 'assistant' && msg.parsed && (
              <div>
                {msg.parsed.intro && (
                  <div style={{ fontFamily: 'Luminari, Georgia, serif', fontSize: 13, color: C.desc, lineHeight: 1.7, marginBottom: 14, paddingLeft: 2, fontStyle: 'italic' }}>
                    {msg.parsed.intro}
                  </div>
                )}

                {msg.parsed.wines && msg.parsed.wines.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    {msg.parsed.wines.map((wine, wi) => {
                      const isExpanded = expandedWine === `${i}-${wi}`
                      const hasKnowledge = !!knowledgeMap[wine.wine_id]
                      return (
                        <div key={wi} style={{
                          background: C.bg, border: `1px solid ${C.borderLight}`, overflow: 'hidden',
                        }}>
                          {/* Rank */}
                          <div style={{
                            padding: '7px 16px', background: C.accent, borderBottom: `0.5px solid ${C.borderLight}`,
                            display: 'flex', alignItems: 'center',
                          }}>
                            <span style={{
                              fontFamily: 'Luminari, Georgia, serif', fontSize: 10, letterSpacing: 2,
                              textTransform: 'uppercase', color: wi === 0 ? C.marine : C.marinePale,
                            }}>
                              {wi === 0 ? '— Notre recommandation —' : wi === 1 ? '— Alternative —' : '— Découverte —'}
                            </span>
                          </div>

                          <div style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: C.marine, fontFamily: '"Copperplate", Georgia, serif', lineHeight: 1.4, flex: 1, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                                {wine.name}
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 400, color: C.marine, fontFamily: '"Copperplate", Georgia, serif', whiteSpace: 'nowrap' }}>
                                {wine.prix}
                              </div>
                            </div>

                            <div style={{ fontFamily: '"Copperplate", Georgia, serif', fontSize: 11, color: C.desc, lineHeight: 1.6, marginTop: 8 }}>
                              {wine.raison}
                            </div>

                            {/* Expand: detail */}
                            {isExpanded && wine.detail && (
                              <div style={{
                                marginTop: 12, padding: '10px 14px', borderLeft: `2px solid ${C.marine}`,
                                background: C.accent, fontFamily: 'Luminari, Georgia, serif',
                                fontSize: 11, color: C.desc, lineHeight: 1.6, fontStyle: 'italic',
                              }}>
                                {wine.detail}
                              </div>
                            )}

                            {/* Buttons row */}
                            <div style={{ display: 'flex', gap: 0, marginTop: 10, borderTop: `0.5px solid ${C.borderLight}`, paddingTop: 8 }}>
                              {wine.detail && (
                                <button
                                  onClick={e => { e.stopPropagation(); setExpandedWine(isExpanded ? null : `${i}-${wi}`) }}
                                  style={{
                                    flex: 1, padding: '6px 0', fontSize: 9, color: C.muted, background: 'transparent',
                                    border: 'none', cursor: 'pointer', letterSpacing: 1,
                                    fontFamily: '"Copperplate", Georgia, serif', textTransform: 'uppercase',
                                  }}
                                >
                                  {isExpanded ? '▴ moins' : '▾ en savoir plus'}
                                </button>
                              )}
                              {(hasKnowledge || wineBaseMap[wine.wine_id]) && (
                                <button
                                  onClick={e => { e.stopPropagation(); setFullSheetWine(wine.wine_id) }}
                                  style={{
                                    flex: 1, padding: '6px 0', fontSize: 9, color: C.gold, background: 'transparent',
                                    border: 'none', cursor: 'pointer', letterSpacing: 1,
                                    fontFamily: '"Copperplate", Georgia, serif', textTransform: 'uppercase',
                                    borderLeft: wine.detail ? `0.5px solid ${C.borderLight}` : 'none',
                                  }}
                                >
                                  🍷 fiche complète
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {msg.parsed.question && (
                  <div style={{ fontFamily: 'Luminari, Georgia, serif', fontSize: 13, color: C.text, marginBottom: 10, paddingLeft: 2, lineHeight: 1.6 }}>
                    {msg.parsed.question}
                  </div>
                )}

                {msg.parsed.options && msg.parsed.options.length > 0 && i === messages.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                    {msg.parsed.options.map((opt, oi) => (
                      <button key={oi} onClick={e => { e.stopPropagation(); sendMessage(opt.value) }} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        fontFamily: '"Copperplate", Georgia, serif',
                      }}>
                        <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                        <span style={{ fontSize: 12, color: C.text2, letterSpacing: 0.3 }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 4px', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(di => (
                <div key={di} style={{ width: 5, height: 5, borderRadius: 3, background: C.marine, opacity: 0.4, animation: `pulse 1.2s ease-in-out ${di * 0.2}s infinite` }} />
              ))}
            </div>
            <span style={{ fontFamily: 'Luminari, Georgia, serif', fontSize: 12, color: C.muted, fontStyle: 'italic' }}>Le sommelier réfléchit...</span>
          </div>
        )}

        <div ref={bottomRef} style={{ height: 16 }} />
      </div>

      {/* Bottom input bar */}
      <div style={{
        padding: '8px 16px',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        background: C.bg,
        borderTop: `0.5px solid ${C.borderLight}`,
        flexShrink: 0,
        display: isFirstScreen ? 'none' : 'block',
      }}>
        <div style={{ display: 'flex', gap: 8, maxWidth: 480, margin: '0 auto', alignItems: 'flex-end' }}>
          <AutoTextarea
            value={input}
            onChange={setInput}
            onKeyDown={() => sendMessage(input)}
            placeholder="Précisez, ou posez une autre question..."
            style={{
              flex: 1, padding: '11px 16px', fontSize: 13,
              fontFamily: '"Copperplate", Georgia, serif',
              background: C.accent, border: `1px solid ${C.border}`,
              borderRadius: 22, color: C.text, outline: 'none',
              letterSpacing: 0.3, minHeight: 42,
            }}
          />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{
            width: 42, height: 42, borderRadius: 21, background: input.trim() ? C.marine : C.border,
            color: '#fff', border: 'none', fontSize: 18, cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0,
          }}>↑</button>
        </div>
      </div>

      {/* Full sheet overlay */}
      {fullSheetWine && (
        <WineFullSheet
          wineId={fullSheetWine}
          knowledge={knowledgeMap[fullSheetWine] || null}
          wineBase={wineBaseMap[fullSheetWine] || null}
          onClose={() => setFullSheetWine(null)}
        />
      )}
    </div>
  )
}
