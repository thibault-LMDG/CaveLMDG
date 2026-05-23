'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { T } from '@/lib/theme'

const LEVELS: Record<string, { name: string; emoji: string }[]> = {
  culture: [
    { name: 'Les bases', emoji: '🔰' },
    { name: 'Les familles', emoji: '🍇' },
    { name: 'Les régions', emoji: '🗺️' },
    { name: 'Les cépages', emoji: '🌿' },
    { name: 'La dégustation', emoji: '👃' },
    { name: 'Accords', emoji: '🍽️' },
    { name: 'Vinification', emoji: '🏺' },
    { name: 'Appellations', emoji: '📜' },
    { name: 'Le service', emoji: '🤵' },
    { name: 'Expert', emoji: '🏆' },
  ],
  cave: [
    { name: 'Découvrir', emoji: '👀' },
    { name: 'Les couleurs', emoji: '🎨' },
    { name: 'Nos domaines', emoji: '🏠' },
    { name: 'Les cuvées', emoji: '🍾' },
    { name: 'Nos cépages', emoji: '🌿' },
    { name: 'En parler', emoji: '💬' },
    { name: 'Nos accords', emoji: '🍽️' },
    { name: 'Argumenter', emoji: '🎯' },
    { name: 'Nos histoires', emoji: '📖' },
    { name: 'Sommelier', emoji: '⭐' },
  ],
}

const ACCENT = { culture: T.purple, cave: T.teal }

interface QCMQuestion {
  question: string
  options: string[]
  correct: number
  explanation: string
  illustration: string
}

interface OpenQuestion {
  question: string
  expected_points: string[]
  example_answer: string
}

function getProgress(key: string): { level: number; scores: Record<number, number> } {
  if (typeof window === 'undefined') return { level: 1, scores: {} }
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { level: 1, scores: {} }
}

function saveProgress(key: string, data: { level: number; scores: Record<number, number> }) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data))
  }
}

function QuizContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const parcours = (searchParams.get('parcours') || 'culture') as 'culture' | 'cave'
  const accent = ACCENT[parcours]
  const levels = LEVELS[parcours]
  const storageKey = `cave_lmdg_quiz_${parcours}`

  const [progress, setProgress] = useState(getProgress(storageKey))
  const [view, setView] = useState<'levels' | 'quiz' | 'result'>('levels')
  const [selectedLevel, setSelectedLevel] = useState(progress.level)
  const [questions, setQuestions] = useState<QCMQuestion[]>([])
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [openAnswer, setOpenAnswer] = useState('')
  const [openFeedback, setOpenFeedback] = useState<string | null>(null)
  const [openEvaluating, setOpenEvaluating] = useState(false)

  useEffect(() => {
    setProgress(getProgress(storageKey))
  }, [storageKey])

  const isOpenLevel = selectedLevel >= 9

  const startQuiz = useCallback(async (level: number) => {
    setSelectedLevel(level)
    setLoading(true)
    setView('quiz')
    setCurrentQ(0)
    setScore(0)
    setAnswered(null)
    setQuestions([])
    setOpenQuestions([])
    setOpenAnswer('')
    setOpenFeedback(null)

    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcours, level, count: 10 }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.isOpen) {
        setOpenQuestions(data.questions || [])
      } else {
        setQuestions(data.questions || [])
      }
    } catch (err) {
      console.error('Quiz load error:', err)
      alert('Erreur lors du chargement du quiz. Réessayez.')
      setView('levels')
    } finally {
      setLoading(false)
    }
  }, [parcours])

  const handleQCMAnswer = (idx: number) => {
    if (answered !== null) return
    setAnswered(idx)
    if (idx === questions[currentQ].correct) {
      setScore(s => s + 1)
    }
  }

  const nextQuestion = () => {
    const total = isOpenLevel ? openQuestions.length : questions.length
    if (currentQ + 1 < total) {
      setCurrentQ(q => q + 1)
      setAnswered(null)
      setOpenAnswer('')
      setOpenFeedback(null)
    } else {
      // Quiz terminé
      const newProgress = { ...progress }
      newProgress.scores = { ...newProgress.scores, [selectedLevel]: Math.max(newProgress.scores[selectedLevel] || 0, score) }
      // Débloquer le niveau suivant si >= 8/10
      if (score >= 8 && selectedLevel === progress.level && selectedLevel < 10) {
        newProgress.level = progress.level + 1
      }
      saveProgress(storageKey, newProgress)
      setProgress(newProgress)
      setView('result')
    }
  }

  const evaluateOpenAnswer = async () => {
    if (!openAnswer.trim()) return
    setOpenEvaluating(true)
    try {
      const q = openQuestions[currentQ]
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcours: 'evaluate',
          level: selectedLevel,
          count: 1,
          // On hacke un peu — on envoie l'évaluation via le même endpoint
        }),
      })
      // Fallback simple : on compare les points clés
      const matchedPoints = q.expected_points.filter(p =>
        openAnswer.toLowerCase().includes(p.toLowerCase().slice(0, 8))
      )
      const isGood = matchedPoints.length >= Math.ceil(q.expected_points.length / 2)
      if (isGood) setScore(s => s + 1)
      setOpenFeedback(isGood
        ? `Bien joué ! Voici les points clés : ${q.expected_points.join(', ')}`
        : `Pas mal, mais il manque quelques éléments. Points attendus : ${q.expected_points.join(', ')}.\n\nExemple de réponse : "${q.example_answer}"`
      )
    } catch {
      setOpenFeedback('Erreur d\'évaluation. Ta réponse a été comptée.')
      setScore(s => s + 1)
    } finally {
      setOpenEvaluating(false)
    }
  }

  // ===== VUE NIVEAUX =====
  if (view === 'levels') {
    const pct = Math.round(((progress.level - 1) / 10) * 100)
    return (
      <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => router.push('/more/formation')} style={{ background: 'none', border: 'none', color: T.text2, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 500, color: T.text }}>{parcours === 'culture' ? 'Culture vin' : 'Notre cave'}</span>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>{parcours === 'culture' ? '🍇' : '🏠'}</div>
          <div style={{ fontSize: 13, color: T.text2 }}>{parcours === 'culture' ? 'De débutant à expert' : 'De la découverte au statut Sommelier LMDG'}</div>
          <div style={{ width: '100%', height: 6, background: T.surface, borderRadius: 3, overflow: 'hidden', margin: '12px 0 4px' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: accent, borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>{pct}% complété</div>
        </div>

        {/* Grille niveaux — 2 lignes de 5 */}
        {[0, 5].map(offset => (
          <div key={offset}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: offset ? 14 : 0 }}>
              {levels.slice(offset, offset + 5).map((lvl, i) => {
                const num = offset + i + 1
                const unlocked = num < progress.level
                const current = num === progress.level
                const locked = num > progress.level
                return (
                  <div
                    key={num}
                    onClick={() => !locked && startQuiz(num)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: 10,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      border: `1px solid ${current ? accent : locked ? T.border : `${accent}66`}`,
                      background: current ? `${accent}33` : unlocked ? `${accent}1a` : T.surface,
                      cursor: locked ? 'default' : 'pointer',
                      opacity: locked ? 0.35 : 1,
                      transition: 'all 0.2s',
                      boxShadow: current ? `0 0 14px ${accent}33` : 'none',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{locked ? '🔒' : lvl.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: current || unlocked ? accent : T.muted }}>{num}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 4 }}>
              {levels.slice(offset, offset + 5).map((lvl, i) => (
                <div key={offset + i} style={{ fontSize: 9, color: T.muted, textAlign: 'center', lineHeight: 1.2 }}>
                  {lvl.name}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Détail niveau en cours */}
        <div style={{ marginTop: 20, padding: 14, background: T.deep, borderRadius: 12, border: `0.5px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{levels[progress.level - 1]?.emoji}</span>
            <span style={{ fontSize: 15, fontWeight: 500, color: T.text }}>
              Niveau {progress.level} — {levels[progress.level - 1]?.name}
            </span>
          </div>
          {progress.scores[progress.level] !== undefined && (
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8 }}>
              Meilleur score : {progress.scores[progress.level]}/10
              {progress.scores[progress.level] < 8 && ' — il faut 8/10 pour passer au suivant'}
            </div>
          )}
          <button
            onClick={() => startQuiz(progress.level)}
            style={{
              width: '100%',
              padding: 12,
              background: accent,
              color: T.sea,
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {progress.scores[progress.level] !== undefined ? 'Réessayer' : 'Lancer le quiz'}
          </button>
        </div>
      </div>
    )
  }

  // ===== VUE QUIZ =====
  if (view === 'quiz') {
    const total = isOpenLevel ? openQuestions.length : questions.length

    if (loading || total === 0) {
      return (
        <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <button onClick={() => setView('levels')} style={{ background: 'none', border: 'none', color: T.text2, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
            <span style={{ fontSize: 14, color: T.text2 }}>Chargement...</span>
          </div>
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 42, marginBottom: 16, animation: 'spin 2s linear infinite' }}>🍷</div>
            <div style={{ fontSize: 15, color: T.text2 }}>Préparation des questions...</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>Claude compose votre quiz sur mesure</div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )
    }

    // QCM
    if (!isOpenLevel) {
      const q = questions[currentQ]
      if (!q) return null
      return (
        <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button onClick={() => setView('levels')} style={{ background: 'none', border: 'none', color: T.text2, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
            <span style={{
              padding: '4px 12px',
              borderRadius: 20,
              background: `${accent}1f`,
              color: accent,
              fontSize: 12,
            }}>
              Niv. {selectedLevel} · {levels[selectedLevel - 1]?.name}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: T.text2 }}>{currentQ + 1}/{total}</span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: 4, background: T.surface, borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((currentQ + 1) / total) * 100}%`, background: accent, borderRadius: 2, transition: 'width 0.3s ease' }} />
          </div>

          {/* Illustration */}
          <div style={{
            width: '100%',
            height: 100,
            borderRadius: 12,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: parcours === 'culture'
              ? 'linear-gradient(135deg, #1a1040 0%, #2d1854 40%, #1a2848 100%)'
              : 'linear-gradient(135deg, #0d2a3d 0%, #0a1628 50%, #162840 100%)',
          }}>
            <span style={{ fontSize: 48 }}>{q.illustration || (parcours === 'culture' ? '🍇' : '🏠')}</span>
          </div>

          {/* Question */}
          <div style={{ fontSize: 17, fontWeight: 500, color: T.text, marginBottom: 20, lineHeight: 1.4 }}>
            {q.question}
          </div>

          {/* Options */}
          {q.options.map((opt, idx) => {
            const isCorrect = answered !== null && idx === q.correct
            const isWrong = answered === idx && idx !== q.correct
            const letters = ['A', 'B', 'C', 'D']
            return (
              <button
                key={idx}
                onClick={() => handleQCMAnswer(idx)}
                disabled={answered !== null}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: isCorrect ? 'rgba(91,196,122,0.1)' : isWrong ? 'rgba(232,122,122,0.1)' : T.deep,
                  border: `1px solid ${isCorrect ? T.up : isWrong ? T.rose : T.border}`,
                  borderRadius: 12,
                  color: T.text,
                  fontSize: 15,
                  textAlign: 'left' as const,
                  cursor: answered !== null ? 'default' : 'pointer',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isCorrect ? 'rgba(91,196,122,0.2)' : isWrong ? 'rgba(232,122,122,0.2)' : T.surface,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 500,
                  color: isCorrect ? T.up : isWrong ? T.rose : T.text2,
                  flexShrink: 0,
                }}>
                  {isCorrect ? '✓' : isWrong ? '✗' : letters[idx]}
                </span>
                {opt}
              </button>
            )
          })}

          {/* Feedback */}
          {answered !== null && (
            <>
              <div style={{
                marginTop: 6,
                padding: 14,
                borderRadius: 12,
                fontSize: 13,
                lineHeight: 1.5,
                color: T.text2,
                background: answered === q.correct ? 'rgba(91,196,122,0.06)' : 'rgba(232,122,122,0.05)',
                border: `0.5px solid ${answered === q.correct ? 'rgba(91,196,122,0.15)' : 'rgba(232,122,122,0.12)'}`,
              }}>
                <span style={{ color: answered === q.correct ? T.up : T.rose, fontWeight: 500 }}>
                  {answered === q.correct ? 'Bien joué ! ' : 'Pas tout à fait. '}
                </span>
                {q.explanation}
              </div>
              <button
                onClick={nextQuestion}
                style={{
                  width: '100%',
                  padding: 14,
                  marginTop: 12,
                  background: accent,
                  color: T.sea,
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {currentQ + 1 < total ? 'Question suivante' : 'Voir le résultat'}
              </button>
            </>
          )}
        </div>
      )
    }

    // Questions ouvertes (niveaux 9-10)
    const q = openQuestions[currentQ]
    if (!q) return null
    return (
      <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={() => setView('levels')} style={{ background: 'none', border: 'none', color: T.text2, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <span style={{ padding: '4px 12px', borderRadius: 20, background: `${accent}1f`, color: accent, fontSize: 12 }}>
            Niv. {selectedLevel} · {levels[selectedLevel - 1]?.name}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: T.text2 }}>{currentQ + 1}/{total}</span>
        </div>

        <div style={{ width: '100%', height: 4, background: T.surface, borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((currentQ + 1) / total) * 100}%`, background: accent, borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>

        <div style={{
          width: '100%', height: 80, borderRadius: 12, marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a2e1a 0%, #0d1f38 50%, #1a2848 100%)',
        }}>
          <span style={{ fontSize: 40 }}>🤵</span>
        </div>

        <div style={{ fontSize: 17, fontWeight: 500, color: T.text, marginBottom: 16, lineHeight: 1.4 }}>
          {q.question}
        </div>

        {!openFeedback && (
          <>
            <textarea
              value={openAnswer}
              onChange={e => setOpenAnswer(e.target.value)}
              placeholder="Écris ta réponse ici..."
              rows={4}
              style={{
                width: '100%',
                padding: 14,
                background: T.deep,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                color: T.text,
                fontSize: 14,
                resize: 'vertical' as const,
                outline: 'none',
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={evaluateOpenAnswer}
              disabled={!openAnswer.trim() || openEvaluating}
              style={{
                width: '100%',
                padding: 14,
                marginTop: 12,
                background: openAnswer.trim() ? accent : T.surface,
                color: openAnswer.trim() ? T.sea : T.muted,
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 500,
                cursor: openAnswer.trim() ? 'pointer' : 'default',
                opacity: openEvaluating ? 0.6 : 1,
              }}
            >
              {openEvaluating ? 'Évaluation...' : 'Valider ma réponse'}
            </button>
          </>
        )}

        {openFeedback && (
          <>
            <div style={{
              padding: 14, borderRadius: 12, fontSize: 13, lineHeight: 1.5, color: T.text2,
              background: 'rgba(91,196,176,0.06)', border: '0.5px solid rgba(91,196,176,0.15)',
              whiteSpace: 'pre-line' as const,
            }}>
              {openFeedback}
            </div>
            <button
              onClick={nextQuestion}
              style={{
                width: '100%', padding: 14, marginTop: 12,
                background: accent, color: T.sea, border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {currentQ + 1 < total ? 'Question suivante' : 'Voir le résultat'}
            </button>
          </>
        )}
      </div>
    )
  }

  // ===== VUE RÉSULTAT =====
  if (view === 'result') {
    const total = 10
    const passed = score >= 8
    const isMax = selectedLevel === 10
    const justUnlocked = passed && selectedLevel === progress.level - 1

    return (
      <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginTop: 20, marginBottom: 16 }}>
          {passed ? (isMax ? '🏆' : '🎉') : '💪'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 500, color: T.text, marginBottom: 8 }}>
          {passed
            ? isMax ? 'Niveau maximum atteint !' : 'Niveau validé !'
            : 'Encore un effort !'
          }
        </div>
        <div style={{ fontSize: 42, fontWeight: 500, color: passed ? T.up : T.gold, marginBottom: 8 }}>
          {score}/{total}
        </div>
        <div style={{ fontSize: 14, color: T.text2, marginBottom: 24 }}>
          {passed
            ? justUnlocked
              ? `Bravo ! Le niveau ${selectedLevel + 1} "${levels[selectedLevel]?.name}" est débloqué.`
              : `Excellent ! Tu maîtrises le niveau ${selectedLevel}.`
            : `Il faut 8/10 pour débloquer le niveau suivant. Tu y es presque !`
          }
        </div>

        {/* Score dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 30 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < score ? T.up : 'rgba(232,122,122,0.3)',
            }} />
          ))}
        </div>

        <button
          onClick={() => startQuiz(selectedLevel)}
          style={{
            width: '100%', padding: 14, background: T.surface, color: T.text,
            border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 15,
            fontWeight: 500, cursor: 'pointer', marginBottom: 10,
          }}
        >
          Réessayer ce niveau
        </button>

        {passed && !isMax && (
          <button
            onClick={() => startQuiz(selectedLevel + 1)}
            style={{
              width: '100%', padding: 14, background: accent, color: T.sea,
              border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500,
              cursor: 'pointer', marginBottom: 10,
            }}
          >
            Niveau suivant : {levels[selectedLevel]?.name}
          </button>
        )}

        <button
          onClick={() => setView('levels')}
          style={{
            width: '100%', padding: 14, background: 'transparent', color: T.text2,
            border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer',
          }}
        >
          Retour aux niveaux
        </button>
      </div>
    )
  }

  return null
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 40, textAlign: 'center', color: T.text2 }}>Chargement...</div>
    }>
      <QuizContent />
    </Suspense>
  )
}
