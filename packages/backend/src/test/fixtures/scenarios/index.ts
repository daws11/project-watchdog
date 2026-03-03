export { simpleAssignmentScenario, simpleAssignmentExpected } from "./simple-assignment";
export { multiTaskScenario, multiTaskExpected } from "./multi-task";
export { withExistingTasksScenario, withExistingTasksExpected } from "./with-existing-tasks";
export { offTopicScenario, offTopicExpected } from "./off-topic";
export { mixedLanguageScenario, mixedLanguageExpected } from "./mixed-language";
export { deadlineExtractionScenario, deadlineExtractionExpected } from "./deadline-extraction";

import type { TestScenario } from "../../utils/seed-messages";
import { simpleAssignmentScenario } from "./simple-assignment";
import { multiTaskScenario } from "./multi-task";
import { withExistingTasksScenario } from "./with-existing-tasks";
import { offTopicScenario } from "./off-topic";
import { mixedLanguageScenario } from "./mixed-language";
import { deadlineExtractionScenario } from "./deadline-extraction";

/**
 * All available test scenarios
 */
export const allScenarios: TestScenario[] = [
  simpleAssignmentScenario,
  multiTaskScenario,
  withExistingTasksScenario,
  offTopicScenario,
  mixedLanguageScenario,
  deadlineExtractionScenario,
];

/**
 * Get scenario by name
 */
export function getScenarioByName(name: string): TestScenario | undefined {
  return allScenarios.find((s) => s.name === name);
}

/**
 * Get all scenario names
 */
export function getAllScenarioNames(): string[] {
  return allScenarios.map((s) => s.name);
}
