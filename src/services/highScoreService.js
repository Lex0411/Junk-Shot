const handleResponse = async (response) => {
  if (!response.ok) {
    const error = new Error('High score request failed');
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const getHighScore = async (difficulty) => {
  try {
    const res = await fetch(`/api/getHighestScore?difficulty=${encodeURIComponent(difficulty)}`);
    const data = await handleResponse(res);
    return Number(data?.score ?? 0);
  } catch (error) {
    console.error('getHighScore failed', error);
    return 0;
  }
};

export const saveHighScore = async (score, difficulty) => {
  try {
    const res = await fetch('/api/saveHighestScore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ difficulty, score })
    });
    return handleResponse(res);
  } catch (error) {
    console.error('saveHighScore failed', error);
    return { updated: false };
  }
};
