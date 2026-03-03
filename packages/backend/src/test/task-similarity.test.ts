import { describe, it, expect } from "vitest";
import {
  calculateSimilarity,
  generateSimilarityHash,
  normalizeText,
  extractKeywords,
} from "../services/task-similarity";

describe("Task Similarity Detection", () => {
  describe("normalizeText", () => {
    it("should normalize text to lowercase", () => {
      const result = normalizeText("Implement User Login");
      expect(result).toBe("implement user login");
    });

    it("should remove punctuation", () => {
      const result = normalizeText("Fix bug #123: login issue!");
      expect(result).toBe("fix bug 123 login issue");
    });

    it("should normalize whitespace", () => {
      const result = normalizeText("Fix    bug   login");
      expect(result).toBe("fix bug login");
    });
  });

  describe("extractKeywords", () => {
    it("should extract meaningful keywords", () => {
      const keywords = extractKeywords("Implement user authentication system");
      expect(keywords).toContain("implement");
      expect(keywords).toContain("user");
      expect(keywords).toContain("authentication");
      expect(keywords).toContain("system");
    });

    it("should exclude stop words", () => {
      const keywords = extractKeywords("the and or in on at to");
      expect(keywords.size).toBe(0);
    });

    it("should exclude short words", () => {
      const keywords = extractKeywords("fix the bug in a login");
      expect(keywords).not.toContain("a");
      expect(keywords).not.toContain("in");
      expect(keywords).toContain("fix");
      expect(keywords).toContain("bug");
      expect(keywords).toContain("login");
    });
  });

  describe("generateSimilarityHash", () => {
    it("should generate consistent hash for same text", () => {
      const hash1 = generateSimilarityHash("Implement user login");
      const hash2 = generateSimilarityHash("Implement user login");
      expect(hash1).toBe(hash2);
    });

    it("should generate same hash for text with different cases", () => {
      const hash1 = generateSimilarityHash("IMPLEMENT USER LOGIN");
      const hash2 = generateSimilarityHash("implement user login");
      expect(hash1).toBe(hash2);
    });

    it("should generate same hash for text with extra spaces", () => {
      const hash1 = generateSimilarityHash("Implement   user   login");
      const hash2 = generateSimilarityHash("implement user login");
      expect(hash1).toBe(hash2);
    });
  });

  describe("calculateSimilarity", () => {
    it("should return 1.0 for exact matches", () => {
      const score = calculateSimilarity(
        "Implement user login",
        "Implement user login"
      );
      expect(score).toBe(1.0);
    });

    it("should return 1.0 for case-insensitive exact matches", () => {
      const score = calculateSimilarity(
        "IMPLEMENT USER LOGIN",
        "implement user login"
      );
      expect(score).toBe(1.0);
    });

    it("should return high score for semantically similar tasks", () => {
      const score = calculateSimilarity(
        "Create user authentication system",
        "Build login feature for users"
      );
      expect(score).toBeGreaterThan(0.5);
    });

    it("should return low score for unrelated tasks", () => {
      const score = calculateSimilarity(
        "Fix database bug",
        "Design new logo"
      );
      expect(score).toBeLessThan(0.4);
    });

    it("should return high score for substring matches", () => {
      const score = calculateSimilarity(
        "Implement user login with OAuth",
        "Implement user login"
      );
      expect(score).toBeGreaterThan(0.8);
    });

    it("should handle paraphrased descriptions", () => {
      const score = calculateSimilarity(
        "Setup payment gateway integration",
        "Integrate payment gateway into system"
      );
      expect(score).toBeGreaterThan(0.6);
    });

    it("should return 0 for empty strings", () => {
      expect(calculateSimilarity("", "Some task")).toBe(0);
      expect(calculateSimilarity("Some task", "")).toBe(0);
      expect(calculateSimilarity("", "")).toBe(0);
    });

    it("should handle Indonesian and English mixed", () => {
      const score = calculateSimilarity(
        "Buat fitur login user",
        "Create user login feature"
      );
      expect(score).toBeGreaterThan(0.4);
    });

    it("should differentiate between different features", () => {
      const score1 = calculateSimilarity(
        "Implement user login",
        "Implement user login"
      );
      const score2 = calculateSimilarity(
        "Implement user login",
        "Implement user profile"
      );
      expect(score1).toBeGreaterThan(score2);
    });

    it("should handle deadline-related task variations", () => {
      const score = calculateSimilarity(
        "Payment gateway harus selesai besok",
        "Setup payment gateway integration"
      );
      expect(score).toBeGreaterThan(0.5);
    });
  });
});
