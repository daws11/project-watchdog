import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { tasks } from "../db/schema";

export interface SimilarityResult {
  existingTask: typeof tasks.$inferSelect | null;
  similarityScore: number;
  matchType: "exact" | "high" | "medium" | "none";
}

export interface SimilarityOptions {
  threshold?: number;
  includeDone?: boolean;
  includeMerged?: boolean;
  checkAllProjects?: boolean;
}

// Normalize text untuk comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// Generate similarity hash untuk fast exact match lookup
export function generateSimilarityHash(description: string): string {
  const normalized = normalizeText(description);
  // Simple hash: normalized text (bisa diganti dengan proper hash jika perlu)
  return normalized;
}

// Calculate exact match (normalized string comparison)
function calculateExactMatch(desc1: string, desc2: string): number {
  const norm1 = normalizeText(desc1);
  const norm2 = normalizeText(desc2);

  if (norm1 === norm2) return 1.0;

  // Check if one contains the other (substring match)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const longer = Math.max(norm1.length, norm2.length);
    const shorter = Math.min(norm1.length, norm2.length);
    return shorter / longer;
  }

  return 0;
}

// Extract keywords dari text (nouns and important words)
function extractKeywords(text: string): Set<string> {
  const normalized = normalizeText(text);

  // Common stop words to exclude
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "yang",
    "dan",
    "atau",
    "di",
    "ke",
    "dari",
    "untuk",
    "dengan",
    "pada",
    "ini",
    "itu",
  ]);

  const words = normalized
    .split(" ")
    .filter((w) => w.length > 2 && !stopWords.has(w));

  return new Set(words);
}

// Calculate Jaccard similarity untuk keywords
function calculateKeywordSimilarity(desc1: string, desc2: string): number {
  const keywords1 = extractKeywords(desc1);
  const keywords2 = extractKeywords(desc2);

  if (keywords1.size === 0 || keywords2.size === 0) return 0;

  const intersection = new Set(
    [...keywords1].filter((k) => keywords2.has(k))
  );
  const union = new Set([...keywords1, ...keywords2]);

  return intersection.size / union.size;
}

// Calculate word order similarity (bonus untuk kata-kata yang sama urutannya)
function calculateOrderSimilarity(desc1: string, desc2: string): number {
  const words1 = normalizeText(desc1).split(" ");
  const words2 = normalizeText(desc2).split(" ");

  const commonWords = words1.filter((w) => words2.includes(w));
  if (commonWords.length === 0) return 0;

  // Check sequence similarity
  let matches = 0;
  let lastIndex = -1;

  for (const word of words1) {
    const index = words2.indexOf(word);
    if (index > lastIndex) {
      matches++;
      lastIndex = index;
    }
  }

  return matches / Math.max(words1.length, words2.length);
}

// Main similarity calculation dengan hybrid approach
export function calculateSimilarity(desc1: string, desc2: string): number {
  if (!desc1 || !desc2) return 0;

  // Exact match check
  const exactScore = calculateExactMatch(desc1, desc2);
  if (exactScore >= 0.95) return 1.0;

  // Keyword overlap (Jaccard)
  const keywordScore = calculateKeywordSimilarity(desc1, desc2);

  // Word order bonus
  const orderScore = calculateOrderSimilarity(desc1, desc2);

  // Weighted combination
  // Exact match gets high weight, keyword similarity is base, order is bonus
  const finalScore =
    exactScore * 0.4 + keywordScore * 0.4 + orderScore * 0.2;

  return Math.min(1.0, finalScore);
}

// Determine match type berdasarkan similarity score
function getMatchType(score: number): SimilarityResult["matchType"] {
  if (score >= 0.95) return "exact";
  if (score >= 0.8) return "high";
  if (score >= 0.6) return "medium";
  return "none";
}

// Find similar tasks menggunakan multiple strategies
export async function findSimilarTask(
  projectId: number,
  newTaskDescription: string,
  options: SimilarityOptions = {}
): Promise<SimilarityResult> {
  const {
    threshold = 0.8,
    includeDone = false,
    includeMerged = false,
    checkAllProjects = false,
  } = options;

  // Strategy 1: Fast exact match menggunakan similarity_hash
  const similarityHash = generateSimilarityHash(newTaskDescription);

  const exactMatchQuery = and(
    eq(tasks.similarityHash, similarityHash),
    includeDone ? undefined : ne(tasks.status, "done"),
    includeMerged ? undefined : ne(tasks.status, "merged"),
    checkAllProjects ? undefined : eq(tasks.projectId, projectId)
  );

  const exactMatches = await db
    .select()
    .from(tasks)
    .where(exactMatchQuery)
    .limit(1);

  if (exactMatches.length > 0) {
    return {
      existingTask: exactMatches[0],
      similarityScore: 1.0,
      matchType: "exact",
    };
  }

  // Strategy 2: Semantic similarity check dengan semua open tasks
  const statusFilter = includeDone
    ? undefined
    : sql`${tasks.status} IN ('open', 'blocked')`;

  const mergedFilter = includeMerged ? undefined : ne(tasks.status, "merged");

  const projectFilter = checkAllProjects
    ? undefined
    : eq(tasks.projectId, projectId);

  const whereClause = and(
    projectFilter,
    statusFilter,
    mergedFilter,
    sql`${tasks.similarityHash} IS NOT NULL` // Only check tasks with hash
  );

  const candidateTasks = await db
    .select()
    .from(tasks)
    .where(whereClause)
    .limit(50); // Limit untuk performa

  let bestMatch: (typeof tasks.$inferSelect) | null = null;
  let bestScore = 0;

  for (const candidate of candidateTasks) {
    const score = calculateSimilarity(
      newTaskDescription,
      candidate.description
    );

    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return {
    existingTask: bestMatch,
    similarityScore: bestScore,
    matchType: getMatchType(bestScore),
  };
}

// Find multiple similar tasks (untuk merge suggestions)
export async function findSimilarTasks(
  projectId: number,
  taskDescription: string,
  options: SimilarityOptions & { maxResults?: number } = {}
): Promise<SimilarityResult[]> {
  const {
    threshold = 0.6,
    includeDone = false,
    includeMerged = false,
    checkAllProjects = false,
    maxResults = 5,
  } = options;

  const statusFilter = includeDone
    ? undefined
    : sql`${tasks.status} IN ('open', 'blocked')`;

  const mergedFilter = includeMerged ? undefined : ne(tasks.status, "merged");

  const projectFilter = checkAllProjects
    ? undefined
    : eq(tasks.projectId, projectId);

  const whereClause = and(projectFilter, statusFilter, mergedFilter);

  const candidateTasks = await db
    .select()
    .from(tasks)
    .where(whereClause)
    .limit(100);

  const results: SimilarityResult[] = [];

  for (const candidate of candidateTasks) {
    const score = calculateSimilarity(taskDescription, candidate.description);

    if (score >= threshold) {
      results.push({
        existingTask: candidate,
        similarityScore: score,
        matchType: getMatchType(score),
      });
    }
  }

  // Sort by similarity score descending
  results.sort((a, b) => b.similarityScore - a.similarityScore);

  return results.slice(0, maxResults);
}

// Check if a task should be auto-updated (high similarity)
export function shouldAutoUpdate(similarityResult: SimilarityResult): boolean {
  return (
    similarityResult.matchType === "exact" ||
    similarityResult.matchType === "high"
  );
}

// Check if a task should be flagged untuk merge review
export function shouldSuggestMerge(
  similarityResult: SimilarityResult
): boolean {
  return similarityResult.matchType === "medium";
}
