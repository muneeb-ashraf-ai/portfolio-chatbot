/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

/**
 * Find similar chunks using cosine similarity
 */
export function findSimilarChunks(queryEmbedding, vectorStore, k = 4) {
  const similarities = vectorStore.chunks.map((chunk, idx) => ({
    idx,
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(item => item.text)
    .join("\n---\n");
}
