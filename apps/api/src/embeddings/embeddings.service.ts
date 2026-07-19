import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";

export const EMBEDDING_MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

export const EMBEDDING_DIMENSIONS = 384;

let extractorPromise: Promise<FeatureExtractionPipeline> | undefined;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      EMBEDDING_MODEL_NAME,
    );
  }
  return extractorPromise;
}

export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  const cleanTexts = texts.map((text) => text.trim());

  if (cleanTexts.length === 0) {
    return [];
  }

  if (cleanTexts.some((text) => !text)) {
    throw new Error("Cannot create an embedding from empty text.");
  }
  const extractor = await getExtractor();
  const output = await extractor(cleanTexts, {
    pooling: "mean",
    normalize: true,
  });

  const embeddings = cleanTexts.map((_, index) => {
    const start = index * EMBEDDING_DIMENSIONS;
    const end = start + EMBEDDING_DIMENSIONS;
    return Array.from(output.data.slice(start, end));
  });

  for (const embedding of embeddings) {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected ${EMBEDDING_DIMENSIONS} dimensions, received ${embedding.length}.`,
      );
    }
  }
  return embeddings;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const [embedding] = await generateEmbeddings([text]);

  if (!embedding) {
    throw new Error("Failed to generate embedding.");
  }
  return embedding;
}