'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { T } from '@/lib/theme'

interface Question {
  question: string
  options: string[]
  correct: number
  explanation: string
  illustration: string
}

type Difficulty = 'facile' | 'moyen' | 'dur'
type Theme = 'mix' | 'culture' | 'cave'

export default function CollectifPage() {
  const router = useRouter()
  const [view, setView] = useState<'config' | 'quiz' | 'result'>('config')
  const [difficulty, setDifficulty] = useState<Difficulty>('facile')
  const [theme, setTheme] = useState<Theme>('mix')
  const [count, setCount] = useState(5)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [teamScore, setTeamScore] = useState(0)
  const [loading, setLoading] = useState(false)

  const difficultyToLevel: Record<Difficulty, number> = {
    facile: 2,
    moyen: 5,
    dur: 8,
  }

  const startQuiz = async () => {
    setLoading(true)
    try {
      const parcours = theme === 'cave' ? 'cave' : 'culture'
      const level = difficultyToLevel[difficulty]
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcours, level, count }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Si theme = mix, on mélange culture et cave
      if (theme === 'mix') {
        const res2 = await fetch('/api/generate-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parcours: 'cave', level, count: Math.ceil(count / 2) }),
        })
        const data2 = await res2.json()
        const allQ = [...(data.questions || []).slice(0, Math.floor(count / 2)), ...(data2.questions || []).slice(0, Math.ceil(count / 2))]
        // Mélanger
        for (let i = allQ.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[allQ[i], allQ[j]] = [allQ[j], allQ[i]]
        }
        setQuestions(allQ.slice(0, count))
      } else {
        setQuestions((data.questions || []).slice(0, count))
      }

      setCurrentQ(0)
      setTeamScore(0)
      setRevealed(false)
      setView('quiz')
    } catch (err) {
      console.error(err)
      alert('Erreur lors du chargement. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const revealAnswer = () => setRevealed(true)

  const markCorrect = () => {
    setTeamScore(s => s + 1)
    goNext()
  }

  const markWrong = () => {
    goNext()
  }

  const goNext = () => {
    if (currentQ + 1 < questions.length) {
      setCurrentQ(q => q + 1)
      setRevealed(false)
    } else {
      setView('result')
    }
  }

  // ===== CONFIG =====
  if (view === 'config') {
    return (
      <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => router.push('/more/formation')} style={{ background: 'none', border: 'none', color: T.text2, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <span style={{ fontSize: 18, fontWeight: 500, color: T.text }}>Quiz collectif</span>
        </div>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '20px 10px 30px' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 20, fontWeight: 500, color: T.text, marginBottom: 8 }}>Quiz pré-service</div>
          <div style={{ fontSize: 14, color: T.text2, lineHeight: 1.5 }}>
            Posez les questions à voix haute.<br />Validez ensemble les réponses.
          </div>
        </div>

        {/* Thème */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: `0.5px solid rgba(30,58,95,0.4)` }}>
          <span style={{ fontSize: 14, color: T.text2 }}>Thème</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['mix', 'culture', 'cave'] as Theme[]).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  fontSize: 13,
                  border: `1px solid ${theme === t ? `${T.gold}66` : T.border}`,
                  background: theme === t ? `${T.gold}1f` : 'transparent',
                  color: theme === t ? T.gold : T.text2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {t === 'mix' ? 'Mix' : t === 'culture' ? 'Culture' : 'Cave'}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulté */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: `0.5px solid rgba(30,58,95,0.4)` }}>
          <span style={{ fontSize: 14, color: T.text2 }}>Difficulté</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['facile', 'moyen', 'dur'] as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  fontSize: 13,
                  border: `1px solid ${difficulty === d ? `${T.gold}66` : T.border}`,
                  background: difficulty === d ? `${T.gold}1f` : 'transparent',
                  color: difficulty === d ? T.gold : T.text2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Nombre de questions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: `0.5px solid rgba(30,58,95,0.4)` }}>
          <span style={{ fontSize: 14, color: T.text2 }}>Questions</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[5, 10].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  fontSize: 13,
                  border: `1px solid ${count === n ? `${T.gold}66` : T.border}`,
                  background: count === n ? `${T.gold}1f` : 'transparent',
                  color: count === n ? T.gold : T.text2,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Bouton lancer */}
        <button
          onClick={startQuiz}
          disabled={loading}
          style={{
            width: '100%',
            padding: 16,
            marginTop: 24,
            background: T.gold,
            color: T.sea,
            border: 'none',
            borderRadius: 12,
            fontSize: 17,
            fontWeight: 500,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Préparation...' : 'Lancer le quiz'}
        </button>
      </div>
    )
  }

  // ===== QUIZ COLLECTIF =====
  if (view === 'quiz') {
    const q = questions[currentQ]
    if (!q) return null
    const letters = ['A', 'B', 'C', 'D']

    return (
      <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={() => setView('config')} style={{ background: 'none', border: 'none', color: T.text2, fontSize: 22, cursor: 'pointer', padding: 4 }}>←</button>
          <span style={{ fontSize: 13, color: T.gold }}>👥 Quiz collectif</span>
          <span style={{ marginLeft: 'auto', fontSize: 14, color: T.text2 }}>
            {currentQ + 1}/{questions.length}
          </span>
        </div>

        {/* Progress */}
        <div style={{ width: '100%', height: 4, background: T.surface, borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${((currentQ + 1) / questions.length) * 100}%`, background: T.gold, borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>

        {/* Illustration */}
        <div style={{
          width: '100%', height: 90, borderRadius: 12, marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #162040 0%, #1a2848 50%, #0d1f38 100%)',
        }}>
          <span style={{ fontSize: 44 }}>{q.illustration || '🍷'}</span>
        </div>

        {/* Question — grande pour lire à voix haute */}
        <div style={{ fontSize: 19, fontWeight: 500, color: T.text, marginBottom: 20, lineHeight: 1.4, textAlign: 'center' }}>
          {q.question}
        </div>

        {/* Options */}
        {q.options.map((opt, idx) => {
          const isCorrect = revealed && idx === q.correct
          return (
            <div
              key={idx}
              style={{
                padding: '14px 16px',
                background: isCorrect ? 'rgba(91,196,122,0.1)' : T.deep,
                border: `1px solid ${isCorrect ? T.up : T.border}`,
                borderRadius: 12,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.3s',
              }}
            >
              <span style={{
                width: 30, height: 30, borderRadius: '50%',
                background: isCorrect ? 'rgba(91,196,122,0.2)' : T.surface,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 500,
                color: isCorrect ? T.up : T.text2,
                flexShrink: 0,
              }}>
                {isCorrect ? '✓' : letters[idx]}
              </span>
              <span style={{ fontSize: 15, color: T.text }}>{opt}</span>
            </div>
          )
        })}

        {/* Boutons d'action */}
        {!revealed ? (
          <button
            onClick={revealAnswer}
            style={{
              width: '100%', padding: 14, marginTop: 12,
              background: T.gold, color: T.sea, border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Révéler la réponse
          </button>
        ) : (
          <>
            {/* Explication */}
            <div style={{
              marginTop: 8, padding: 14, borderRadius: 12,
              fontSize: 13, lineHeight: 1.5, color: T.text2,
              background: 'rgba(91,196,122,0.06)',
              border: '0.5px solid rgba(91,196,122,0.15)',
            }}>
              {q.explanation}
            </div>

            {/* L'équipe a-t-elle trouvé ? */}
            <div style={{ fontSize: 13, color: T.text2, marginTop: 14, textAlign: 'center' }}>
              L&apos;équipe a trouvé ?
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                onClick={markCorrect}
                style={{
                  flex: 1, padding: 14, background: 'rgba(91,196,122,0.12)',
                  color: T.up, border: `1px solid ${T.up}33`, borderRadius: 10,
                  fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }}
              >
                ✓ Oui
              </button>
              <button
                onClick={markWrong}
                style={{
                  flex: 1, padding: 14, background: 'rgba(232,122,122,0.08)',
                  color: T.rose, border: `1px solid ${T.rose}33`, borderRadius: 10,
                  fontSize: 15, fontWeight: 500, cursor: 'pointer',
                }}
              >
                ✗ Non
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ===== RÉSULTAT =====
  return (
    <div style={{ padding: '16px 16px 0', maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginTop: 30, marginBottom: 16 }}>
        {teamScore >= questions.length * 0.8 ? '🎉' : teamScore >= questions.length * 0.5 ? '👏' : '💪'}
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color: T.text, marginBottom: 8 }}>
        {teamScore >= questions.length * 0.8 ? 'Excellente équipe !' : teamScore >= questions.length * 0.5 ? 'Pas mal du tout !' : 'On progresse !'}
      </div>
      <div style={{ fontSize: 42, fontWeight: 500, color: T.gold, marginBottom: 8 }}>
        {teamScore}/{questions.length}
      </div>
      <div style={{ fontSize: 14, color: T.text2, marginBottom: 30 }}>
        bonnes réponses en équipe
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 30 }}>
        {Array.from({ length: questions.length }).map((_, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: '50%',
            background: i < teamScore ? T.up : 'rgba(232,122,122,0.3)',
          }} />
        ))}
      </div>

      <button
        onClick={() => { setView('config'); setQuestions([]); setTeamScore(0) }}
        style={{
          width: '100%', padding: 14, background: T.gold, color: T.sea,
          border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500,
          cursor: 'pointer', marginBottom: 10,
        }}
      >
        Nouveau quiz
      </button>

      <button
        onClick={() => router.push('/more/formation')}
        style={{
          width: '100%', padding: 14, background: 'transparent', color: T.text2,
          border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer',
        }}
      >
        Retour à la formation
      </button>
    </div>
  )
}
