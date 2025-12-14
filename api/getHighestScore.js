import { createClient } from '@supabase/supabase-js';

let supabase;
try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      env: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
    });
  }
  
  supabase = createClient(
    supabaseUrl,
    supabaseKey,
    { auth: { persistSession: false } }
  );
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

export default async function handler(req, res) {
  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase client not initialized. Check environment variables.',
      score: 0 
    });
  }
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
