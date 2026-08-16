const FILLERS = new Set(["um", "uh", "erm", "hmm", "like"]);

export function tokenizeTranscript(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function basicTextFeatures(transcript: string, speakingMs: number) {
  const tokens = tokenizeTranscript(transcript);
  const wordCount = tokens.length;
  const speakingMinutes = Math.max(speakingMs, 1) / 60000;
  const fillerCount = tokens.filter((token) => FILLERS.has(token)).length;
  let repeatedAdjacent = 0;
  for (let i = 1; i < tokens.length; i += 1) {
    if (tokens[i] === tokens[i - 1]) repeatedAdjacent += 1;
  }

  return {
    wordCount,
    wpm: wordCount / speakingMinutes,
    fillerRatio: wordCount ? fillerCount / wordCount : 0,
    repetitionRatio: wordCount ? repeatedAdjacent / wordCount : 0,
  };
}
