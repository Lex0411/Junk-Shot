const handleResponse = async (response) => {
  if (!response.ok) {
    const error = new Error('High score request failed');
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const getHighScore = async (difficulty) => {
  // Check if API endpoint exists before trying to fetch
  // For local development without API, just return 0
  try {
    const res = await fetch(`/api/getHighestScore?difficulty=${encodeURIComponent(difficulty)}`, {
      method: 'GET',
      // Add signal to abort if needed
    });
    
    if (!res.ok) {
      // API endpoint not available - return 0 silently (no console output)
      return 0;
    }
    
    const data = await res.json();
    return Number(data?.score ?? 0);
  } catch (error) {
    // Network error or API not available - fail silently
    // Don't log anything to avoid red errors
    return 0;
  }
};

export const saveHighScore = async (score, difficulty) => {
  // Silently fail if API not available - no console output
  try {
    const res = await fetch('/api/saveHighestScore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ difficulty, score })
    });
    
    if (!res.ok) {
      // API not available - fail silently
      return { updated: false };
    }
    
    return await res.json();
  } catch (error) {
    // Network error - fail silently, no console output
    return { updated: false };
  }
};
