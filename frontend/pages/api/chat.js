import Groq from "groq-sdk";
import { pipeline } from "@xenova/transformers";
import fs from "fs";
import path from "path";

let embedder = null;
let vectorStore = null;

async function loadEmbedder() {
  if (!embedder) {
    console.log("Loading embedding model...");
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );
  }
  return embedder;
}

async function loadVectorStore() {
  if (!vectorStore) {
    console.log("Loading vector store...");
    try {
      const filePath = path.join(process.cwd(), "public", "vector_store.json");
      const fileContent = fs.readFileSync(filePath, "utf-8");
      vectorStore = JSON.parse(fileContent);
      console.log(`Loaded ${vectorStore.chunks.length} chunks from vector store`);
    } catch (err) {
      console.error("Vector store not found:", err);
      throw new Error("Vector store not initialized. Run: py scripts/build_json_store.py");
    }
  }
  return vectorStore;
}

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

  return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
}

async function findSimilarChunks(queryEmbedding, vectorStore, k = 4) {
  const similarities = vectorStore.chunks.map((chunk, idx) => ({
    idx,
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(item => item.text)
    .join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    // Load models
    const embedder = await loadEmbedder();
    const store = await loadVectorStore();

    // Generate embedding for query
    console.log("Embedding query...");
    const queryEmbedding = await embedder(message, {
      pooling: "mean",
      normalize: true,
    });

    // Convert to array
    const embedding = Array.from(queryEmbedding.data);

    // Find similar chunks
    console.log("Searching for similar chunks...");
    const context = await findSimilarChunks(embedding, store, 4);

    // Generate response using Groq
    console.log("Generating response with Groq...");
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are Alpha, a smart and friendly AI assistant created to represent Muneeb Ashraf's professional portfolio.

Your persona:
- You are NOT Muneeb Ashraf. You are a bot talking ABOUT him.
- Always refer to Muneeb in the third person: "Muneeb studied...", "Muneeb has experience in...", "Muneeb worked at..."
- Never say "I studied", "I worked", "I have skills" — that would imply you are Muneeb.
- When asked who you are, say: "I'm Aria, Muneeb Ashraf's personal portfolio assistant. Ask me anything about his background, skills, and experience!"

Rules:
- Answer only using the provided context about Muneeb.
- If information is not in the context, say it is not mentioned in Muneeb's profile.
- Speak professionally but in a warm, approachable tone.
- Keep answers concise and clear.`,
        },
        {
          role: "user",
          content: `Context:
${context}

Question:
${message}`,
        },
      ],
    });

    return res.status(200).json({
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: error.message || "Internal Server Error",
    });
  }
}
