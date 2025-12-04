export async function getHighestScore(difficulty) {
  try {
    const res = await fetch(`/api/getHighestScore?difficulty=${difficulty}`);
    const data = await res.json();
    return data.score ?? 0;
  } catch (err) {
    console.error("Error fetching high score:", err);
    return 0;
  }
}

export async function saveHighestScore(difficulty, score) {
  try {
    const res = await fetch('/api/saveHighestScore', {
      method: 'POST',
      body: JSON.stringify({ difficulty, score })
    });

    return await res.json();
  } catch (err) {
    console.error("Error saving high score:", err);
    return null;
  }
}
