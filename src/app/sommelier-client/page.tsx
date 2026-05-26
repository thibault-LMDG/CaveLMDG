'use client'

import { useState, useRef, useEffect } from 'react'

// --- Client theme (light, carte des vins spirit) ---
const C = {
  bg: '#FAF8F4',
  card: '#FFFFFF',
  marine: '#1E5532',
  marineSoft: '#2D7A4A',
  gold: '#B8963E',
  goldLight: '#D4B86A',
  text: '#2C2820',
  text2: '#6B6155',
  muted: '#9A9285',
  border: '#E8E2DA',
  borderLight: '#F0EBE4',
  accent: '#F5F0E8',
  cream: '#F0EBE2',
}

interface WineResult {
  wine_id: string
  name: string
  prix: string
  raison: string
  detail?: string
}

interface Option {
  label: string
  emoji: string
  value: string
}

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

const SHORTCUTS = [
  { emoji: '🥂', label: 'Apéro', prompt: 'Je cherche un vin pour l\'apéritif, quelque chose de frais et convivial' },
  { emoji: '🐟', label: 'Avec mon plat', prompt: '__PLATS__' },
  { emoji: '🎉', label: 'On fête !', prompt: 'C\'est un moment spécial ce soir, on veut une belle bouteille pour fêter ça' },
  { emoji: '🧭', label: 'Surprenez-moi', prompt: 'Surprenez-moi, je vous fais confiance — proposez-moi vos coups de cœur' },
]

const PLATS = [
  { emoji: '🦪', label: 'Huîtres' },
  { emoji: '🐙', label: 'Poulpe snacké' },
  { emoji: '🐟', label: 'Sole meunière' },
  { emoji: '🦐', label: 'Gambas flambées' },
  { emoji: '🥘', label: 'Bouillabaisse' },
  { emoji: '🐠', label: 'Daurade' },
  { emoji: '🫒', label: 'Aïoli' },
  { emoji: '🐡', label: 'Retour de pointu' },
  { emoji: '🦞', label: 'Homard' },
  { emoji: '🍝', label: 'Pasta fruits de mer' },
  { emoji: '🥩', label: 'Entrecôte' },
  { emoji: '🐟', label: 'Rougets' },
]

const PLACEHOLDERS = [
  'Un blanc frais pour les huîtres...',
  'Quelque chose de léger pour l\'apéro...',
  'Un rouge pour l\'entrecôte...',
  'Un vin nature pour le poulpe...',
  'Une belle bouteille pour un anniversaire...',
  'Un rosé de Provence bien frais...',
]

export default function SommelierClientPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPlats, setShowPlats] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [expandedWine, setExpandedWine] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Rotate placeholder
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3000)
    return () => clearInterval(t)
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setShowPlats(false)

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
      const parsed = data.response as AIResponse

      const assistantMsg: Message = {
        role: 'assistant',
        content: JSON.stringify(parsed),
        parsed,
      }
      setMessages([...newMessages, assistantMsg])
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Désolé, un petit souci technique. Réessayez dans un instant.',
        parsed: { type: 'results', intro: 'Désolé, un petit souci technique. Réessayez dans un instant.', wines: [] },
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleShortcut = (shortcut: typeof SHORTCUTS[0]) => {
    if (shortcut.prompt === '__PLATS__') {
      setShowPlats(true)
      return
    }
    sendMessage(shortcut.prompt)
  }

  const handlePlatSelect = (plat: typeof PLATS[0]) => {
    sendMessage(`Je vais prendre ${plat.label.toLowerCase()}, qu'est-ce que vous me conseillez comme vin ?`)
  }

  const handleOptionClick = (option: Option) => {
    sendMessage(option.value)
  }

  const handleReset = () => {
    setMessages([])
    setShowPlats(false)
    setExpandedWine(null)
    inputRef.current?.focus()
  }

  const isFirstScreen = messages.length === 0 && !showPlats

  return (
    <div style={{
      minHeight: '100dvh',
      background: C.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 20px 16px',
        textAlign: 'center',
        borderBottom: `0.5px solid ${C.border}`,
        background: C.card,
      }}>
        <div style={{
          fontSize: 11,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: C.muted,
          marginBottom: 4,
        }}>
          La Marine des Goudes
        </div>
        <div style={{
          fontSize: 22,
          fontWeight: 300,
          color: C.marine,
          letterSpacing: 1,
        }}>
          Le Sommelier
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            style={{
              position: 'absolute',
              right: 16,
              top: 20,
              padding: '6px 12px',
              fontSize: 11,
              color: C.muted,
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 20,
              cursor: 'pointer',
            }}
          >
            Nouveau
          </button>
        )}
      </header>

      {/* Content */}
      <div style={{ flex: 1, padding: '0 16px', overflowY: 'auto' }}>
        {/* First screen — welcome + shortcuts */}
        {isFirstScreen && (
          <div style={{ paddingTop: 32, paddingBottom: 16 }}>
            <div style={{
              textAlign: 'center',
              marginBottom: 28,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🍷</div>
              <div style={{
                fontSize: 17,
                color: C.text,
                fontWeight: 400,
                lineHeight: 1.5,
                maxWidth: 280,
                margin: '0 auto',
              }}>
                Posez-moi votre question,<br />
                je vous trouve <em style={{ color: C.marine, fontStyle: 'italic' }}>le vin parfait</em>
              </div>
            </div>

            {/* Shortcuts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 360, margin: '0 auto' }}>
              {SHORTCUTS.map(s => (
                <button
                  key={s.label}
                  onClick={() => handleShortcut(s)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '18px 12px',
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 14,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 26 }}>{s.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plats selection */}
        {showPlats && messages.length === 0 && (
          <div style={{ paddingTop: 24, paddingBottom: 16 }}>
            <div style={{
              fontSize: 16,
              color: C.text,
              fontWeight: 400,
              textAlign: 'center',
              marginBottom: 20,
            }}>
              Qu'avez-vous choisi ?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, maxWidth: 360, margin: '0 auto' }}>
              {PLATS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handlePlatSelect(p)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '14px 8px',
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{p.emoji}</span>
                  <span style={{ fontSize: 11, color: C.text, fontWeight: 400 }}>{p.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPlats(false)}
              style={{
                display: 'block',
                margin: '16px auto 0',
                padding: '8px 16px',
                fontSize: 12,
                color: C.muted,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ← Retour
            </button>
          </div>
        )}

        {/* Conversation */}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 20 : 16 }}>
            {/* User message */}
            {msg.role === 'user' && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: 12,
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 16px',
                  background: C.marine,
                  color: '#fff',
                  borderRadius: '18px 18px 4px 18px',
                  fontSize: 14,
                  lineHeight: 1.4,
                }}>
                  {msg.content}
                </div>
              </div>
            )}

            {/* Assistant response */}
            {msg.role === 'assistant' && msg.parsed && (
              <div>
                {/* Intro text */}
                {msg.parsed.intro && (
                  <div style={{
                    fontSize: 14,
                    color: C.text,
                    lineHeight: 1.6,
                    marginBottom: 14,
                    fontStyle: 'italic',
                    paddingLeft: 4,
                  }}>
                    {msg.parsed.intro}
                  </div>
                )}

                {/* Wine cards */}
                {msg.parsed.wines && msg.parsed.wines.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {msg.parsed.wines.map((wine, wi) => {
                      const isExpanded = expandedWine === `${i}-${wi}`
                      return (
                        <div
                          key={wi}
                          onClick={() => setExpandedWine(isExpanded ? null : `${i}-${wi}`)}
                          style={{
                            background: C.card,
                            borderRadius: 14,
                            border: `1px solid ${C.border}`,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          }}
                        >
                          {/* Wine rank */}
                          <div style={{
                            padding: '6px 14px',
                            background: wi === 0 ? `${C.marine}0d` : C.accent,
                            borderBottom: `0.5px solid ${C.borderLight}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}>
                            <span style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              background: wi === 0 ? C.marine : C.muted,
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {wi + 1}
                            </span>
                            <span style={{
                              fontSize: 10,
                              textTransform: 'uppercase',
                              letterSpacing: 1,
                              color: wi === 0 ? C.marine : C.muted,
                              fontWeight: 500,
                            }}>
                              {wi === 0 ? 'Notre recommandation' : wi === 1 ? 'Alternative' : 'Découverte'}
                            </span>
                          </div>

                          <div style={{ padding: '12px 14px' }}>
                            {/* Name + price */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{
                                fontSize: 15,
                                fontWeight: 500,
                                color: C.text,
                                lineHeight: 1.3,
                                flex: 1,
                              }}>
                                {wine.name}
                              </div>
                              <div style={{
                                fontSize: 16,
                                fontWeight: 500,
                                color: C.gold,
                                whiteSpace: 'nowrap',
                              }}>
                                {wine.prix}
                              </div>
                            </div>

                            {/* Reason */}
                            <div style={{
                              fontSize: 13,
                              color: C.text2,
                              lineHeight: 1.5,
                              marginTop: 8,
                            }}>
                              {wine.raison}
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && wine.detail && (
                              <div style={{
                                marginTop: 10,
                                padding: '10px 12px',
                                background: C.accent,
                                borderRadius: 10,
                                fontSize: 12,
                                color: C.text2,
                                lineHeight: 1.5,
                                fontStyle: 'italic',
                              }}>
                                💡 {wine.detail}
                              </div>
                            )}

                            {wine.detail && (
                              <div style={{
                                fontSize: 10,
                                color: C.muted,
                                marginTop: 8,
                                textAlign: 'center',
                              }}>
                                {isExpanded ? 'Moins' : 'En savoir plus'} {isExpanded ? '▴' : '▾'}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Refine question */}
                {msg.parsed.question && (
                  <div style={{
                    fontSize: 14,
                    color: C.text,
                    marginBottom: 10,
                    paddingLeft: 4,
                  }}>
                    {msg.parsed.question}
                  </div>
                )}

                {/* Option buttons */}
                {msg.parsed.options && msg.parsed.options.length > 0 && i === messages.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                    {msg.parsed.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={(e) => { e.stopPropagation(); handleOptionClick(opt) }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px 16px',
                          background: C.card,
                          border: `1px solid ${C.border}`,
                          borderRadius: 12,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{opt.emoji}</span>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 400 }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '16px 4px',
          }}>
            <div style={{
              display: 'flex',
              gap: 4,
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: C.marine,
                  opacity: 0.4,
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>Le sommelier réfléchit...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        background: C.card,
        borderTop: `0.5px solid ${C.border}`,
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          maxWidth: 500,
          margin: '0 auto',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: 14,
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 24,
              color: C.text,
              outline: 'none',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: input.trim() ? C.marine : C.border,
              color: '#fff',
              border: 'none',
              fontSize: 18,
              cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
          >
            ↑
          </button>
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
