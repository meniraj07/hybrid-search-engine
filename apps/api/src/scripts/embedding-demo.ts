import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL_NAME,
  generateEmbedding,
} from "../embeddings/embeddings.service.js";

// Because our embeddings are normalized, dot product equals cosine similarity.
function cosineSimilarity(
  firstVector: number[],
  secondVector: number[],
): number {
  if (firstVector.length !== secondVector.length) {
    throw new Error("Vectors must have the same number of dimensions.");
  }

  return firstVector.reduce(
    (total, value, index) => total + value * secondVector[index]!,
    0,
  );
}

async function main(): Promise<void> {
  const firstText = "A neural network for image classification";
  const similarText = "A deep learning model that recognizes pictures";
  const differentText = "Database indexing for web applications";

  console.log("Loading the local embedding model...");
  console.log("The first run can take a few minutes because it downloads the model.\n");

  const firstEmbedding = await generateEmbedding(firstText);
  const similarEmbedding = await generateEmbedding(similarText);
  const differentEmbedding = await generateEmbedding(differentText);

  console.log(`Embedding dimensions: ${EMBEDDING_DIMENSIONS}`);
  console.log("First five vector values:", firstEmbedding.slice(0, 5));

  console.table([
    {
      comparison: "Similar meaning",
      firstText,
      comparedWith: similarText,
      cosineSimilarity: cosineSimilarity(
        firstEmbedding,
        similarEmbedding,
      ).toFixed(4),
    },
    {
      comparison: "Different meaning",
      firstText,
      comparedWith: differentText,
      cosineSimilarity: cosineSimilarity(
        firstEmbedding,
        differentEmbedding,
      ).toFixed(4),
    },
  ]);
}

main().catch((error: unknown) => {
  console.error("Embedding demonstration failed:", error);
  process.exitCode = 1;
});