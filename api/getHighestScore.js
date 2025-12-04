import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  try {
    const { difficulty } = req.query;

    if (!difficulty || !['easy', 'intermediate', 'hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty' });
    }

    const { data, error } = await supabase
      .from('highscore')
      .select('score, difficulty, updated_at')
      .eq('difficulty', difficulty)
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(200).json({ score: 0, difficulty });
    }

    return res.status(200).json({
      score: data.score,
      difficulty: data.difficulty,
      updated_at: data.updated_at
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
