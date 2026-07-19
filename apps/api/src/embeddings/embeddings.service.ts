import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";

const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

export const EMBEDDING_DIMENSIONS = 384;

let extractorPromise: Promise<FeatureExtractionPipeline> | undefined;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if(!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      EMBEDDING_MODEL,
    );
  }
  return extractorPromise;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim();
  if(!cleanText) {
    throw new Error("Cannot generate embedding for empty text.");
  }
  const extractor = await getExtractor();
  const output = await extractor(cleanText, {
    pooling: "mean",
    normalize: true,
  });

  const embedding = Array.from(output.data);

  if(embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Unexpected embedding dimension: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`
    );
  }
  return embedding;
}

