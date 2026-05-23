import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const LEVEL_NAMES: Record<string, string[]> = {
  culture: [
    'Les bases', 'Les familles', 'Les régions', 'Les cépages', 'La dégustation',
    'Accords', 'Vinification', 'Appellations', 'Le service', 'Expert',
  ],
  cave: [
    'Découvrir', 'Les couleurs', 'Nos domaines', 'Les cuvées', 'Nos cépages',
    'En parler', 'Nos accords', 'Argumenter', 'Nos histoires', 'Sommelier',
  ],
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { parcours, level, count = 10 } = body as {
      parcours: 'culture' | 'cave'
      level: number
      count?: number
    }

    if (!parcours || !level || level < 1 || level > 10) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const isOpenLevel = level >= 9
    const questionType = isOpenLevel ? 'open' : 'qcm'

    // Piocher des questions aléatoires dans la banque
    const { data: questions, error } = await supabase
      .from('cave_quiz_questions')
      .select('*')
      .eq('parcours', parcours)
      .eq('level', level)
      .eq('question_type', questionType)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({
        error: `Pas encore de questions pour ${parcours} niveau ${level}. Lancez la génération via /api/generate-quiz-batch.`,
      }, { status: 404 })
    }

    // Mélanger et prendre le nombre demandé
    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, count)

    const formatted = shuffled.map(q => {
      if (questionType === 'open') {
        return {
          question: q.question,
          expected_points: q.expected_points || [],
          example_answer: q.example_answer || '',
        }
      }
      return {
        question: q.question,
        options: q.options || [],
        correct: q.correct ?? 0,
        explanation: q.explanation || '',
        illustration: q.illustration || '🍷',
      }
    })

    const levelNames = LEVEL_NAMES[parcours] || LEVEL_NAMES.culture
    return NextResponse.json({
      parcours,
      level,
      levelName: levelNames[level - 1] || `Niveau ${level}`,
      isOpen: isOpenLevel,
      questions: formatted,
    })
  } catch (err) {
    console.error('Generate quiz error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
