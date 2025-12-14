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

const SUPPORTED_DIFFICULTIES = ['easy', 'intermediate', 'hard'];

async function parseJsonBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      return req.body ? JSON.parse(req.body) : {};
    }
    return req.body;
  }

  const chunks = [];
  await new Promise((resolve, reject) => {
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', resolve);
    req.on('error', reject);
  });

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase client not initialized. Check environment variables.',
      updated: false 
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST method required' });
  }

  let payload;
  try {
    payload = await parseJsonBody(req);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { score, difficulty } = payload || {};
  if (
    typeof score !== 'number' ||
    Number.isNaN(score) ||
    score < 0 ||
    !SUPPORTED_DIFFICULTIES.includes(difficulty)
  ) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  try {
    const { data: current, error: selError } = await supabase
      .from('highscore')
      .select('id, score')
      .eq('difficulty', difficulty)
      .limit(1)
      .maybeSingle();

    if (selError) {
      console.error('Select error:', selError);
      return res.status(500).json({ error: selError.message });
    }

    if (!current) {
      const { error: insError } = await supabase
        .from('highscore')
        .insert([{ score, difficulty, updated_at: new Date().toISOString() }]);

      if (insError) {
        console.error('Insert error:', insError);
        return res.status(500).json({ error: insError.message });
      }

      return res.status(200).json({ updated: true, score });
    }

    if (score > current.score) {
      const { error: updError } = await supabase
        .from('highscore')
        .update({ score, updated_at: new Date().toISOString() })
        .eq('id', current.id);

      if (updError) {
        console.error('Update error:', updError);
        return res.status(500).json({ error: updError.message });
      }

      return res.status(200).json({ updated: true, score });
    }

    return res.status(200).json({ updated: false, score: current.score });
  } catch (error) {
    console.error('Save high score error:', error);
    return res.status(500).json({ error: error.message });
  }
}
