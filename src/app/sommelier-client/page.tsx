'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

// --- Marine carte des vins palette ---
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
  userBubble: '#1C5733',
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

export default function SommelierClientPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [expandedWine, setExpandedWine] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 3500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  const sendMessage = async (text: string) => {
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
        role: 'assistant',
        content: JSON.stringify(data.response),
        parsed: data.response as AIResponse,
      }])
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: '',
        parsed: { type: 'results', intro: 'Pardon, un petit souci technique. Réessayez dans un instant.', wines: [] },
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setMessages([])
    setExpandedWine(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const isFirstScreen = messages.length === 0

  return (
    <div style={{
      minHeight: '100dvh',
      background: C.bg,
      fontFamily: '"Copperplate", "Copperplate Gothic Std", "Cinzel", Georgia, serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Font faces */}
      <style>{`
        @font-face {
          font-family: 'Luminari';
          src: url('/fonts/Luminari-Regular.ttf') format('truetype');
          font-weight: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Copperplate';
          src: url('/fonts/Copperplate-Gothic-Std-33-BC.ttf') format('truetype');
          font-weight: bold;
          font-display: swap;
        }
        @font-face {
          font-family: 'Copperplate';
          src: url('/fonts/Copperplate-Gothic-Std-32-BC.otf') format('opentype');
          font-weight: normal;
          font-display: swap;
        }
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .suggestion-chip:active {
          background: ${C.accent} !important;
          transform: scale(0.97);
        }
      `}</style>

      {/* Header */}
      <header style={{
        padding: isFirstScreen ? '28px 20px 0' : '14px 20px 10px',
        textAlign: 'center',
        borderBottom: isFirstScreen ? 'none' : `0.5px solid ${C.borderLight}`,
        position: 'relative',
        transition: 'padding 0.3s',
      }}>
        {isFirstScreen ? (
          <>
            <Image
              src="/sommelier/logo.png"
              alt="La Marine des Goudes"
              width={60}
              height={60}
              style={{ opacity: 0.85, marginBottom: 8 }}
            />
            <div style={{
              fontFamily: 'Luminari, Georgia, serif',
              fontSize: 10,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: C.muted,
              marginBottom: 2,
            }}>
              Marseille · Les Goudes
            </div>
          </>
        ) : (
          <div style={{
            fontFamily: 'Luminari, Georgia, serif',
            fontSize: 9,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: C.muted,
          }}>
            La Marine des Goudes
          </div>
        )}
        <div style={{
          fontFamily: 'Luminari, Georgia, serif',
          fontSize: isFirstScreen ? 26 : 17,
          fontWeight: 400,
          color: C.marine,
          letterSpacing: 1,
          transition: 'font-size 0.3s',
        }}>
          Le Sommelier
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            style={{
              position: 'absolute', right: 16, top: 14,
              padding: '5px 12px', fontSize: 10,
              fontFamily: '"Copperplate", Georgia, serif',
              color: C.muted, background: 'transparent',
              border: `1px solid ${C.border}`, borderRadius: 20, cursor: 'pointer',
              letterSpacing: 0.5, textTransform: 'uppercase',
            }}
          >
            Nouveau
          </button>
        )}
      </header>

      {/* Content */}
      <div style={{ flex: 1, padding: '0 20px', overflowY: 'auto' }}>

        {/* FIRST SCREEN */}
        {isFirstScreen && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: 20, paddingBottom: 20,
          }}>
            {/* Tagline */}
            <div style={{
              fontFamily: 'Luminari, Georgia, serif',
              fontSize: 15,
              color: C.desc,
              textAlign: 'center',
              lineHeight: 1.7,
              marginBottom: 28,
              maxWidth: 300,
              fontStyle: 'italic',
            }}>
              Décrivez-moi ce qui vous ferait plaisir,
              <br />je vous trouve le vin parfait.
            </div>

            {/* Input */}
            <div style={{ width: '100%', maxWidth: 380, display: 'flex', gap: 10, marginBottom: 36 }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                style={{
                  flex: 1, padding: '14px 20px', fontSize: 13,
                  fontFamily: '"Copperplate", Georgia, serif',
                  background: C.bg,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 28, color: C.text, outline: 'none',
                  letterSpacing: 0.3,
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: 48, height: 48, borderRadius: 24,
                  background: input.trim() ? C.marine : C.border,
                  color: '#fff', border: 'none', fontSize: 20,
                  cursor: input.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                ↑
              </button>
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 340, marginBottom: 20,
            }}>
              <div style={{ flex: 1, height: 0.5, background: C.borderLight }} />
              <span style={{
                fontFamily: 'Luminari, Georgia, serif',
                fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: 'uppercase',
              }}>
                ou essayez
              </span>
              <div style={{ flex: 1, height: 0.5, background: C.borderLight }} />
            </div>

            {/* Suggestion chips */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
              maxWidth: 380,
            }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  className="suggestion-chip"
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: '8px 14px', fontSize: 11,
                    fontFamily: '"Copperplate", Georgia, serif',
                    color: C.text2, background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 20, cursor: 'pointer',
                    transition: 'all 0.15s', letterSpacing: 0.3,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Pointu illustration */}
            <div style={{ marginTop: 40, opacity: 0.12 }}>
              <Image src="/sommelier/pointu.png" alt="" width={180} height={90} style={{ objectFit: 'contain' }} />
            </div>
          </div>
        )}

        {/* CONVERSATION */}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 20 : 16, animation: 'fadeIn 0.3s ease' }}>
            {msg.role === 'user' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 16px',
                  background: C.userBubble, color: '#fff',
                  borderRadius: '18px 18px 4px 18px',
                  fontSize: 13, lineHeight: 1.4,
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                }}>
                  {msg.content}
                </div>
              </div>
            )}

            {msg.role === 'assistant' && msg.parsed && (
              <div>
                {msg.parsed.intro && (
                  <div style={{
                    fontFamily: 'Luminari, Georgia, serif',
                    fontSize: 13, color: C.desc, lineHeight: 1.7,
                    marginBottom: 14, paddingLeft: 2, fontStyle: 'italic',
                  }}>
                    {msg.parsed.intro}
                  </div>
                )}

                {msg.parsed.wines && msg.parsed.wines.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    {msg.parsed.wines.map((wine, wi) => {
                      const isExpanded = expandedWine === `${i}-${wi}`
                      return (
                        <div
                          key={wi}
                          onClick={() => wine.detail ? setExpandedWine(isExpanded ? null : `${i}-${wi}`) : null}
                          style={{
                            background: C.bg, borderRadius: 0,
                            border: `1px solid ${C.borderLight}`,
                            overflow: 'hidden',
                            cursor: wine.detail ? 'pointer' : 'default',
                          }}
                        >
                          {/* Rank bar */}
                          <div style={{
                            padding: '7px 16px',
                            background: C.accent,
                            borderBottom: `0.5px solid ${C.borderLight}`,
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}>
                            <span style={{
                              fontFamily: 'Luminari, Georgia, serif',
                              fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
                              color: wi === 0 ? C.marine : C.marinePale,
                            }}>
                              {wi === 0 ? '— Notre recommandation —' : wi === 1 ? '— Alternative —' : '— Découverte —'}
                            </span>
                          </div>

                          <div style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                              <div style={{
                                fontSize: 13, fontWeight: 700, color: C.marine,
                                fontFamily: '"Copperplate", Georgia, serif',
                                lineHeight: 1.4, flex: 1, letterSpacing: 0.3,
                                textTransform: 'uppercase',
                              }}>
                                {wine.name}
                              </div>
                              <div style={{
                                fontSize: 15, fontWeight: 400, color: C.marine,
                                fontFamily: '"Copperplate", Georgia, serif',
                                whiteSpace: 'nowrap',
                              }}>
                                {wine.prix}
                              </div>
                            </div>

                            <div style={{
                              fontFamily: '"Copperplate", Georgia, serif',
                              fontSize: 11, color: C.desc, lineHeight: 1.6,
                              marginTop: 8, fontWeight: 400,
                            }}>
                              {wine.raison}
                            </div>

                            {isExpanded && wine.detail && (
                              <div style={{
                                marginTop: 12, padding: '10px 14px',
                                borderLeft: `2px solid ${C.marine}`,
                                background: C.accent,
                                fontFamily: 'Luminari, Georgia, serif',
                                fontSize: 11, color: C.desc, lineHeight: 1.6,
                                fontStyle: 'italic',
                              }}>
                                {wine.detail}
                              </div>
                            )}

                            {wine.detail && (
                              <div style={{
                                fontSize: 9, color: C.muted, marginTop: 10,
                                textAlign: 'center', letterSpacing: 1,
                                fontFamily: '"Copperplate", Georgia, serif',
                                textTransform: 'uppercase',
                              }}>
                                {isExpanded ? '▴ moins' : '▾ en savoir plus'}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {msg.parsed.question && (
                  <div style={{
                    fontFamily: 'Luminari, Georgia, serif',
                    fontSize: 13, color: C.text, marginBottom: 10,
                    paddingLeft: 2, lineHeight: 1.6,
                  }}>
                    {msg.parsed.question}
                  </div>
                )}

                {msg.parsed.options && msg.parsed.options.length > 0 && i === messages.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                    {msg.parsed.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={e => { e.stopPropagation(); sendMessage(opt.value) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 16px',
                          background: C.bg, border: `1px solid ${C.border}`,
                          borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                          transition: 'all 0.15s',
                          fontFamily: '"Copperplate", Georgia, serif',
                        }}
                      >
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
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '16px 4px',
            animation: 'fadeIn 0.2s ease',
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(di => (
                <div key={di} style={{
                  width: 5, height: 5, borderRadius: 3, background: C.marine, opacity: 0.4,
                  animation: `pulse 1.2s ease-in-out ${di * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <span style={{
              fontFamily: 'Luminari, Georgia, serif',
              fontSize: 12, color: C.muted, fontStyle: 'italic',
            }}>
              Le sommelier réfléchit...
            </span>
          </div>
        )}

        <div ref={bottomRef} style={{ height: 16 }} />
      </div>

      {/* Input bar (always visible after conversation starts) */}
      {!isFirstScreen && (
        <div style={{
          padding: '10px 16px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          background: C.bg,
          borderTop: `0.5px solid ${C.borderLight}`,
        }}>
          <div style={{
            fontFamily: 'Luminari, Georgia, serif',
            fontSize: 10, color: C.muted, textAlign: 'center',
            marginBottom: 6, fontStyle: 'italic',
          }}>
            ou tapez votre réponse librement
          </div>
          <div style={{ display: 'flex', gap: 8, maxWidth: 480, margin: '0 auto' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="Précisez, ou posez une autre question..."
              style={{
                flex: 1, padding: '11px 16px', fontSize: 13,
                fontFamily: '"Copperplate", Georgia, serif',
                background: C.accent, border: `1px solid ${C.border}`,
                borderRadius: 24, color: C.text, outline: 'none',
                letterSpacing: 0.3,
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 42, height: 42, borderRadius: 21,
                background: input.trim() ? C.marine : C.border,
                color: '#fff', border: 'none', fontSize: 18,
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s', flexShrink: 0,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
