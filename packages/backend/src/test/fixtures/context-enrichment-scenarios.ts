/**
 * Test fixtures for context enrichment testing
 * These scenarios are designed to test AI's ability to extract context
 * from conversations and populate description, priorities, and customPrompt fields
 */

export interface ContextEnrichmentScenario {
  name: string;
  description: string;
  messages: Array<{
    sender: string;
    text: string;
  }>;
  expectedContext: {
    descriptionPattern: RegExp;
    prioritiesPattern: RegExp;
  };
}

/**
 * Scenario: Payment Gateway Integration Project
 * Tests ability to extract technical project context from development discussions
 */
export const paymentGatewayScenario: ContextEnrichmentScenario = {
  name: "payment-gateway-context",
  description: "Development team discussing payment integration implementation",
  messages: [
    {
      sender: "John",
      text: "We need to finalize the API documentation for the payment gateway integration. The endpoints for Stripe and Midtrans need to be documented by tomorrow.",
    },
    {
      sender: "Sarah",
      text: "Also let's make sure we test the webhook handling for both providers. Security review is critical for this feature.",
    },
    {
      sender: "John",
      text: "Don't forget to update the developer docs with the new authentication flow using JWT tokens.",
    },
    {
      sender: "Mike",
      text: "The sandbox environment is ready. We can start testing the payment flows with test cards.",
    },
  ],
  expectedContext: {
    descriptionPattern: /payment|gateway|integration|stripe|midtrans/i,
    prioritiesPattern: /api|documentation|security|webhook|authentication/i,
  },
};

/**
 * Scenario: Performance Optimization Project
 * Tests ability to extract performance-related priorities from team discussions
 */
export const performanceOptimizationScenario: ContextEnrichmentScenario = {
  name: "performance-optimization-context",
  description: "Team discussing app performance improvements",
  messages: [
    {
      sender: "Manager",
      text: "Team, our Q1 focus is on improving app performance and reducing load times. Page load should be under 2 seconds.",
    },
    {
      sender: "Dev1",
      text: "I'll work on optimizing the database queries and adding caching with Redis. The N+1 query problem needs to be fixed.",
    },
    {
      sender: "Dev2",
      text: "I can handle the frontend optimization - lazy loading images and code splitting with Webpack.",
    },
    {
      sender: "Dev3",
      text: "Let's also implement CDN for static assets and compress images properly.",
    },
  ],
  expectedContext: {
    descriptionPattern: /performance|optimization|speed|load time/i,
    prioritiesPattern: /database|query|caching|redis|frontend|cdn/i,
  },
};

/**
 * Scenario: Mobile App Development
 * Tests ability to extract mobile-specific context
 */
export const mobileAppScenario: ContextEnrichmentScenario = {
  name: "mobile-app-context",
  description: "Mobile development team working on crash fixes and features",
  messages: [
    {
      sender: "Bob",
      text: "Working on the mobile app crash fixes. The iOS version keeps crashing on login for users with 2FA enabled.",
    },
    {
      sender: "Carol",
      text: "I can help test the Android version. Let's prioritize the login flow stability before adding new features.",
    },
    {
      sender: "Bob",
      text: "Found the issue - it's a race condition in the auth callback. Fix will be ready by end of day.",
    },
    {
      sender: "Carol",
      text: "Great! After this, we should work on the push notification feature for order updates.",
    },
  ],
  expectedContext: {
    descriptionPattern: /mobile|app|ios|android|crash|login/i,
    prioritiesPattern: /stability|auth|2fa|notification|bug fix/i,
  },
};

/**
 * Scenario: E-commerce Platform
 * Tests ability to extract business domain context
 */
export const ecommerceScenario: ContextEnrichmentScenario = {
  name: "ecommerce-context",
  description: "E-commerce platform development with shopping and payments",
  messages: [
    {
      sender: "Alice",
      text: "The shopping cart component needs Redux for state management. Users should be able to add multiple items.",
    },
    {
      sender: "Ben",
      text: "We also need to implement the checkout flow with multiple payment options - credit card, bank transfer, and e-wallet.",
    },
    {
      sender: "Alice",
      text: "Don't forget the inventory management integration. Stock should update in real-time after each purchase.",
    },
    {
      sender: "Ben",
      text: "And we need an admin dashboard for sellers to manage their products and view sales reports.",
    },
  ],
  expectedContext: {
    descriptionPattern: /e-commerce|shopping|cart|checkout|payment/i,
    prioritiesPattern: /cart|checkout|payment|inventory|dashboard/i,
  },
};

/**
 * Scenario: Architecture and Design Discussion
 * Tests ability to extract technical architecture context from senior dev discussions
 */
export const architectureScenario: ContextEnrichmentScenario = {
  name: "architecture-context",
  description: "Tech lead discussing system architecture decisions",
  messages: [
    {
      sender: "Alice (Tech Lead)",
      text: "As the tech lead, I need to review all PRs before they go to staging. Please tag me on critical changes.",
    },
    {
      sender: "Alice (Tech Lead)",
      text: "Our architecture decision is to use microservices for the new module. I'll document the service boundaries today.",
    },
    {
      sender: "Alice (Tech Lead)",
      text: "We need to implement API Gateway for routing and load balancing between services.",
    },
    {
      sender: "Bob",
      text: "Should we use Kubernetes for orchestration or stick with Docker Compose for now?",
    },
  ],
  expectedContext: {
    descriptionPattern: /architecture|microservice|tech|lead|design/i,
    prioritiesPattern: /microservice|api gateway|kubernetes|review|documentation/i,
  },
};

/**
 * Scenario: Security and Compliance
 * Tests ability to extract security-focused context
 */
export const securityScenario: ContextEnrichmentScenario = {
  name: "security-context",
  description: "Team discussing security implementation and compliance",
  messages: [
    {
      sender: "Security Lead",
      text: "We need to implement OAuth2 flow for Google and Facebook login. Security audit is scheduled for next week.",
    },
    {
      sender: "Dev1",
      text: "Make sure we handle the token refresh properly and store tokens securely. We need to be GDPR compliant.",
    },
    {
      sender: "Security Lead",
      text: "Also implement rate limiting on all public APIs and add input validation for all user inputs.",
    },
    {
      sender: "Dev2",
      text: "I'll set up the SSL certificates and configure the WAF rules for DDoS protection.",
    },
  ],
  expectedContext: {
    descriptionPattern: /security|oauth|authentication|gdpr|compliance/i,
    prioritiesPattern: /oauth|token|security|ssl|rate limit|validation/i,
  },
};

/**
 * Scenario: DevOps and Infrastructure
 * Tests ability to extract DevOps and infrastructure context
 */
export const devopsScenario: ContextEnrichmentScenario = {
  name: "devops-context",
  description: "DevOps team discussing CI/CD and infrastructure",
  messages: [
    {
      sender: "DevOps Lead",
      text: "Setting up the CI/CD pipeline with GitHub Actions. We need automated testing and deployment.",
    },
    {
      sender: "DevOps Engineer",
      text: "I'll configure the AWS infrastructure with Terraform. We need auto-scaling for the production environment.",
    },
    {
      sender: "DevOps Lead",
      text: "Don't forget to set up monitoring with Prometheus and Grafana for observability.",
    },
    {
      sender: "DevOps Engineer",
      text: "And we need log aggregation with ELK stack for debugging production issues.",
    },
  ],
  expectedContext: {
    descriptionPattern: /devops|ci\/cd|infrastructure|aws|deployment/i,
    prioritiesPattern: /ci\/cd|automation|monitoring|terraform|aws|kubernetes/i,
  },
};

/**
 * Scenario: UI/UX Design Discussion
 * Tests ability to extract design and UX context
 */
export const designScenario: ContextEnrichmentScenario = {
  name: "design-context",
  description: "Design team discussing UI/UX improvements",
  messages: [
    {
      sender: "Designer",
      text: "Working on the new dashboard design with Figma. We need a responsive layout that works on mobile.",
    },
    {
      sender: "Frontend Dev",
      text: "I'll implement the design system with Tailwind CSS. Component consistency is key.",
    },
    {
      sender: "Designer",
      text: "Make sure we follow accessibility guidelines - WCAG 2.1 AA compliance is required.",
    },
    {
      sender: "UX Researcher",
      text: "User testing shows we need better navigation. Let's implement a breadcrumb system.",
    },
  ],
  expectedContext: {
    descriptionPattern: /design|ui|ux|figma|dashboard|responsive/i,
    prioritiesPattern: /design|responsive|accessibility|mobile|component/i,
  },
};

/**
 * All context enrichment scenarios for batch testing
 */
export const allContextEnrichmentScenarios: ContextEnrichmentScenario[] = [
  paymentGatewayScenario,
  performanceOptimizationScenario,
  mobileAppScenario,
  ecommerceScenario,
  architectureScenario,
  securityScenario,
  devopsScenario,
  designScenario,
];

/**
 * Expected outcomes for validation
 */
export const contextEnrichmentExpected = {
  minFieldsPopulated: 1, // At least one field should be populated by AI
  maxRetries: 3,
  timeoutMs: 30000,
};
