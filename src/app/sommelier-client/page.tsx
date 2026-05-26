'use client'

import { useState, useRef, useEffect } from 'react'

const C = {
  bg: '#FAF8F4',
  card: '#FFFFFF',
  marine: '#1E5532',
  gold: '#B8963E',
  text: '#2C2820',
  text2: '#6B6155',
  muted: '#9A9285',
  border: '#E8E2DA',
  borderLight: '#F0EBE4',
  accent: '#F5F0E8',
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

  // Focus input on mount
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
      const parsed = data.response as AIResponse

      setMessages([...newMessages, {
        role: 'assistant',
        content: JSON.stringify(parsed),
        parsed,
      }])
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: '',
        parsed: { type: 'results', intro: 'Désolé, un petit souci technique. Réessayez dans un instant.', wines: [] },
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleOptionClick = (option: Option) => {
    sendMessage(option.value)
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px 12px',
        textAlign: 'center',
        borderBottom: messages.length > 0 ? `0.5px solid ${C.border}` : 'none',
        background: messages.length > 0 ? C.card : 'transparent',
        position: 'relative',
      }}>
        <div style={{
          fontSize: 10,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: C.muted,
          marginBottom: 2,
        }}>
          La Marine des Goudes
        </div>
        <div style={{
          fontSize: 20,
          fontWeight: 300,
          color: C.marine,
          letterSpacing: 0.5,
        }}>
          Le Sommelier
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleReset}
            style={{
              position: 'absolute',
              right: 16,
              top: 16,
              padding: '5px 12px',
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

        {/* FIRST SCREEN — Input hero + suggestions */}
        {isFirstScreen && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 48,
            paddingBottom: 20,
          }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🍷</div>
            <div style={{
              fontSize: 18,
              color: C.text,
              fontWeight: 400,
              textAlign: 'center',
              lineHeight: 1.5,
              marginBottom: 28,
              maxWidth: 300,
            }}>
              Décrivez-moi ce qui vous ferait plaisir,<br />
              <em style={{ color: C.marine }}>je m'occupe du reste</em>
            </div>

            {/* Big input */}
            <div style={{
              width: '100%',
              maxWidth: 400,
              display: 'flex',
              gap: 8,
              marginBottom: 32,
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
                  padding: '14px 18px',
                  fontSize: 15,
                  background: C.card,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 28,
                  color: C.text,
                  outline: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: input.trim() ? C.marine : C.border,
                  color: '#fff',
                  border: 'none',
                  fontSize: 20,
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

            {/* Suggestion chips */}
            <div style={{
              width: '100%',
              maxWidth: 400,
            }}>
              <div style={{
                fontSize: 11,
                color: C.muted,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                marginBottom: 10,
                textAlign: 'center',
              }}>
                Ou essayez par exemple
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    style={{
                      padding: '8px 14px',
                      fontSize: 12,
                      color: C.text2,
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      borderRadius: 20,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      lineHeight: 1.3,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONVERSATION */}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 20 : 16 }}>
            {msg.role === 'user' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
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

            {msg.role === 'assistant' && msg.parsed && (
              <div>
                {msg.parsed.intro && (
                  <div style={{
                    fontSize: 14,
                    color: C.text,
                    lineHeight: 1.6,
                    marginBottom: 14,
                    fontStyle: 'italic',
                    paddingLeft: 2,
                  }}>
                    {msg.parsed.intro}
                  </div>
                )}

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
                            cursor: wine.detail ? 'pointer' : 'default',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          }}
                        >
                          <div style={{
                            padding: '6px 14px',
                            background: wi === 0 ? `${C.marine}0d` : C.accent,
                            borderBottom: `0.5px solid ${C.borderLight}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}>
                            <span style={{
                              width: 20, height: 20, borderRadius: 10,
                              background: wi === 0 ? C.marine : C.muted,
                              color: '#fff', fontSize: 10, fontWeight: 600,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {wi + 1}
                            </span>
                            <span style={{
                              fontSize: 10, textTransform: 'uppercase', letterSpacing: 1,
                              color: wi === 0 ? C.marine : C.muted, fontWeight: 500,
                            }}>
                              {wi === 0 ? 'Notre recommandation' : wi === 1 ? 'Alternative' : 'Découverte'}
                            </span>
                          </div>

                          <div style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{ fontSize: 15, fontWeight: 500, color: C.text, lineHeight: 1.3, flex: 1 }}>
                                {wine.name}
                              </div>
                              <div style={{ fontSize: 16, fontWeight: 500, color: C.gold, whiteSpace: 'nowrap' }}>
                                {wine.prix}
                              </div>
                            </div>

                            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.5, marginTop: 8 }}>
                              {wine.raison}
                            </div>

                            {isExpanded && wine.detail && (
                              <div style={{
                                marginTop: 10, padding: '10px 12px',
                                background: C.accent, borderRadius: 10,
                                fontSize: 12, color: C.text2, lineHeight: 1.5, fontStyle: 'italic',
                              }}>
                                💡 {wine.detail}
                              </div>
                            )}

                            {wine.detail && (
                              <div style={{ fontSize: 10, color: C.muted, marginTop: 8, textAlign: 'center' }}>
                                {isExpanded ? 'Moins ▴' : 'En savoir plus ▾'}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {msg.parsed.question && (
                  <div style={{ fontSize: 14, color: C.text, marginBottom: 10, paddingLeft: 2 }}>
                    {msg.parsed.question}
                  </div>
                )}

                {msg.parsed.options && msg.parsed.options.length > 0 && i === messages.length - 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                    {msg.parsed.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={e => { e.stopPropagation(); handleOptionClick(opt) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 16px',
                          background: C.card, border: `1px solid ${C.border}`,
                          borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{opt.emoji}</span>
                        <span style={{ fontSize: 13, color: C.text }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 4px' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(di => (
                <div key={di} style={{
                  width: 6, height: 6, borderRadius: 3, background: C.marine, opacity: 0.4,
                  animation: `pulse 1.2s ease-in-out ${di * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}>Le sommelier réfléchit...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar — visible only after conversation started */}
      {!isFirstScreen && (
        <div style={{
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          background: C.card,
          borderTop: `0.5px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', gap: 8, maxWidth: 500, margin: '0 auto' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="Précisez, ou posez une autre question..."
              style={{
                flex: 1, padding: '12px 16px', fontSize: 14,
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 24, color: C.text, outline: 'none',
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 44, height: 44, borderRadius: 22,
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

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
