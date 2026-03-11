export { simpleAssignmentScenario, simpleAssignmentExpected } from "./simple-assignment";
export { multiTaskScenario, multiTaskExpected } from "./multi-task";
export { withExistingTasksScenario, withExistingTasksExpected } from "./with-existing-tasks";
export { offTopicScenario, offTopicExpected } from "./off-topic";
export { mixedLanguageScenario, mixedLanguageExpected } from "./mixed-language";
export { deadlineExtractionScenario, deadlineExtractionExpected } from "./deadline-extraction";
export { taskUpdateScenario, taskUpdateExpected } from "./task-update";

// Realistic WhatsApp group scenarios with morning task plans and EOD updates
export {
  realisticMorningTaskPlansScenario,
  realisticEODUpdatesScenario,
  realisticCompleteDayScenario,
  realisticMorningPlansExpected,
  expectedDuplicatePatterns,
  allRealisticScenarios,
} from "./whatsapp-group-realistic";

// Inventory Manager Group scenarios for F&B inventory tracking
export {
  dailyStocktakeScenario,
  inventoryCountScenario,
  damagedItemsScenario,
  inventoryIssuesScenario,
  completeInventoryScenario,
  allInventoryScenarios,
  inventoryExpectedPatterns,
  inventoryExpectedResults,
} from "./inventory-manager-group";

// Context enrichment scenarios
export {
  paymentGatewayScenario,
  performanceOptimizationScenario,
  mobileAppScenario,
  ecommerceScenario,
  architectureScenario,
  securityScenario,
  devopsScenario,
  designScenario,
  allContextEnrichmentScenarios,
  contextEnrichmentExpected,
  type ContextEnrichmentScenario,
} from "../context-enrichment-scenarios";

import type { TestScenario } from "../../utils/seed-messages";
import { simpleAssignmentScenario } from "./simple-assignment";
import { multiTaskScenario } from "./multi-task";
import { withExistingTasksScenario } from "./with-existing-tasks";
import { offTopicScenario } from "./off-topic";
import { mixedLanguageScenario } from "./mixed-language";
import { deadlineExtractionScenario } from "./deadline-extraction";
import { taskUpdateScenario } from "./task-update";
import {
  realisticMorningTaskPlansScenario,
  realisticEODUpdatesScenario,
  realisticCompleteDayScenario,
} from "./whatsapp-group-realistic";
import {
  dailyStocktakeScenario,
  inventoryCountScenario,
  damagedItemsScenario,
  inventoryIssuesScenario,
  completeInventoryScenario,
} from "./inventory-manager-group";

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
  taskUpdateScenario,
  realisticMorningTaskPlansScenario,
  realisticEODUpdatesScenario,
  realisticCompleteDayScenario,
  dailyStocktakeScenario,
  inventoryCountScenario,
  damagedItemsScenario,
  inventoryIssuesScenario,
  completeInventoryScenario,
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
