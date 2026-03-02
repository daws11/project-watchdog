// Job type definitions for pg-boss queue

export const JobTypes = {
  PROCESS_BATCH: "process-batch",
  DETECT_RISKS: "detect-risks",
  GENERATE_REPORT: "generate-report",
  RUN_PROCESSING_RULE: "run-processing-rule",
} as const;

export interface ProcessBatchJob {
  connectionId: number;
  projectId: number;
  messageIds: number[];
}

export interface DetectRisksJob {
  projectId: number;
}

export interface GenerateReportJob {
  projectId: number;
  date: string; // YYYY-MM-DD format
  connectionIds?: number[];
}

export interface RunProcessingRuleJob {
  ruleId: number;
  runId: number;
}
