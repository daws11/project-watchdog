import { z } from "zod";

export const projectClassificationSystemPrompt = `You are a project classification assistant. Your task is to analyze a message and determine which project it most likely belongs to.

Consider the following factors:
- Project names and descriptions
- Keywords in the message that match project context
- Technical terms, product names, or domain-specific language
- Team member names associated with projects
- Message tone and content relevance

Output valid JSON only.

Classification Guidelines:
- High confidence (0.8-1.0): Message clearly relates to a specific project based on strong keyword matches
- Medium confidence (0.5-0.7): Message might relate but there's ambiguity or weak matches
- Low confidence (0.0-0.4): Message seems unrelated to any project or is too vague

If no project seems relevant, set projectId to null and confidence to 0.`;

export const ProjectClassificationSchema = z.object({
  projectId: z
    .number()
    .nullable()
    .describe("ID of the best matching project, or null if no clear match"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score of the classification (0.0-1.0)"),
  reasoning: z
    .string()
    .describe("Brief explanation of the classification decision"),
});

export type ProjectClassificationResult = z.infer<
  typeof ProjectClassificationSchema
>;

export interface AvailableProject {
  id: number;
  name: string;
  description: string | null;
}

export function buildProjectClassificationPrompt(
  messageText: string,
  sender: string,
  availableProjects: AvailableProject[],
): string {
  const projectsText = availableProjects
    .map(
      (p) =>
        `Project ID ${p.id}: ${p.name}${
          p.description ? `\n  Description: ${p.description}` : ""
        }`,
    )
    .join("\n\n");

  return `Available Projects:
${projectsText}

Message to classify:
Sender: ${sender}
Text: ${messageText}

Analyze this message and determine which project it most likely belongs to. Return the projectId, confidence score, and reasoning.`;
}
