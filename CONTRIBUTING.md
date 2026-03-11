# Contributing to Project Watchdog

Thank you for your interest in contributing to Project Watchdog! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Testing](#testing)
- [Documentation](#documentation)
- [Questions](#questions)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Accept differing viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL 14+
- Git

### Setting Up Your Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/project-watchdog.git
cd project-watchdog
```

3. Install dependencies:
```bash
pnpm install
```

4. Set up your environment:
```bash
cp .env.example .env
# Edit .env with your local configuration
```

5. Set up the database:
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

6. Start development servers:
```bash
pnpm dev
```

## Development Workflow

### Branch Naming

Use descriptive branch names with the following prefixes:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or improvements
- `chore/` - Maintenance tasks

Examples:
```
feature/task-priority-sorting
fix/risk-detection-null-pointer
docs/api-authentication
```

### Making Changes

1. Create a new branch from `main`:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes following our coding standards
3. Write or update tests as needed
4. Update documentation if applicable
5. Run the test suite:
```bash
pnpm lint
pnpm --filter backend test:run
```

6. Run pre-deployment checks:
```bash
pnpm predeploy
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode in `tsconfig.json`
- Define explicit return types for functions
- Use interfaces for object shapes
- Avoid `any` type; use `unknown` when necessary

Example:
```typescript
// Good
interface Task {
  id: number;
  description: string;
  status: 'open' | 'done' | 'blocked';
}

async function createTask(data: CreateTaskInput): Promise<Task> {
  // implementation
}

// Avoid
function createTask(data: any): any {
  // implementation
}
```

### Backend (Express)

**Route Organization:**
```typescript
// routes/tasks.ts
import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const createTaskSchema = z.object({
  description: z.string().min(1),
  owner: z.string().optional(),
  deadline: z.string().datetime().optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);
    const task = await taskService.create(data);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

export { router as tasksRouter };
```

**Service Pattern:**
```typescript
// services/task-service.ts
export class TaskService {
  async create(data: CreateTaskInput): Promise<Task> {
    // Business logic here
  }

  async findById(id: number): Promise<Task | null> {
    // Database query
  }
}

export const taskService = new TaskService();
```

**Error Handling:**
```typescript
// Use custom error classes
class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string
  ) {
    super(message);
  }
}

// In routes
router.get('/:id', async (req, res, next) => {
  try {
    const task = await taskService.findById(req.params.id);
    if (!task) {
      throw new APIError(404, 'Task not found', 'NOT_FOUND');
    }
    res.json(task);
  } catch (error) {
    next(error);
  }
});
```

### Frontend (React)

**Component Structure:**
```typescript
// components/TaskCard.tsx
import { useState } from 'react';
import { Task } from '@project-watchdog/shared';

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: number, status: TaskStatus) => void;
}

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="task-card">
      {/* Component JSX */}
    </div>
  );
}
```

**Custom Hooks:**
```typescript
// hooks/useTasks.ts
import { useQuery } from '@tanstack/react-query'; // or useSWR

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => api.getTasks(filters),
  });
}
```

**State Management (Zustand):**
```typescript
// stores/taskStore.ts
import { create } from 'zustand';

interface TaskState {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: number, updates: Partial<Task>) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(t =>
      t.id === id ? { ...t, ...updates } : t
    )
  })),
}));
```

### Database (Drizzle)

**Schema Definition:**
```typescript
// db/schema/tasks.ts
import { pgTable, serial, text, integer, timestamp, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  description: text('description').notNull(),
  status: text('status').$type<TaskStatus>().default('open'),
  confidence: real('confidence'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
}));
```

**Migrations:**

Always generate migrations after schema changes:
```bash
pnpm db:generate
```

Review the generated SQL before applying:
```bash
pnpm db:migrate
```

### Styling (Tailwind CSS)

**Utility-First Approach:**
```tsx
// Good
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">

// Avoid
<div className="task-card">
```

**Custom Components:**
```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children }: ButtonProps) {
  const baseStyles = 'rounded font-medium transition-colors';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${sizes[size]}`}>
      {children}
    </button>
  );
}
```

## Commit Messages

Use conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, no logic change)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

Examples:
```
feat(tasks): add priority field to task model

Adds a priority field (low/medium/high) to the tasks table
and updates the task extraction prompt to detect priorities.

Closes #123
```

```
fix(risk-engine): handle null deadline in stagnation check

The risk engine was throwing an error when checking stagnation
for tasks without a deadline. Now properly handles null values.

Fixes #456
```

## Pull Requests

### Creating a PR

1. Ensure all tests pass
2. Update documentation if needed
3. Fill out the PR template completely
4. Link related issues

### PR Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added for new features
```

### Review Process

1. Automated checks must pass (CI/CD)
2. At least one approval from a maintainer
3. All comments resolved
4. No merge conflicts

## Testing

### Unit Tests

Backend tests use Vitest:

```typescript
// test/services/task-extraction.test.ts
import { describe, it, expect, vi } from 'vitest';
import { extractTasks } from '../../src/services/task-extraction';

describe('extractTasks', () => {
  it('should extract task from message', async () => {
    const message = {
      text: 'John, please complete the UI by Friday',
      sender: '628123456789',
    };

    const result = await extractTasks([message]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      description: expect.stringContaining('UI'),
      owner: 'john',
    });
  });
});
```

Run tests:
```bash
# Run all tests
pnpm --filter backend test:run

# Run with watch mode
pnpm --filter backend test

# Run specific test file
pnpm --filter backend test:run -- -t "task extraction"
```

### Integration Tests

Test scenarios are defined in `packages/backend/src/test/fixtures/scenarios/`:

```bash
# List available scenarios
pnpm --filter backend test:list

# Run specific scenario
pnpm --filter backend test:scenario whatsapp-group-realistic

# Run with verbose output
pnpm --filter backend test:scenario whatsapp-group-realistic --verbose
```

### Manual Testing

Before submitting a PR:

1. Test the happy path
2. Test error conditions
3. Test edge cases (empty data, large data, special characters)
4. Verify UI renders correctly
5. Check mobile responsiveness (if applicable)

## Documentation

### Code Comments

- Use JSDoc for functions and classes
- Explain why, not what
- Keep comments current with code changes

```typescript
/**
 * Extracts tasks from WhatsApp messages using LLM.
 *
 * @param messages - Array of messages to analyze
 * @param context - Project context for enrichment
 * @returns Array of extracted tasks with confidence scores
 *
 * @example
 * const tasks = await extractTasks(messages, {
 *   projectName: 'Project Alpha',
 *   recentTasks: existingTasks,
 * });
 */
async function extractTasks(
  messages: Message[],
  context: ExtractionContext
): Promise<ExtractedTask[]> {
  // Implementation
}
```

### Documentation Files

Update relevant documentation when making changes:

- `README.md` - User-facing overview
- `ARCHITECTURE.md` - Technical architecture details
- `API.md` - API endpoint documentation
- `CONTRIBUTING.md` - This file

## Project Structure Guidelines

### Adding a New Feature

Example: Adding a "Task Priority" feature

1. **Database:**
```
packages/backend/src/db/schema/
└── update tasks.ts (add priority column)
```

2. **Shared Schema:**
```
packages/shared/src/schemas.ts
└── add priority Zod schemas
```

3. **Backend Routes:**
```
packages/backend/src/routes/
└── update tasks.ts (add priority to endpoints)
```

4. **Backend Services:**
```
packages/backend/src/services/
└── update task-extraction.ts (extract priority from messages)
```

5. **Frontend Components:**
```
packages/frontend/src/components/tasks/
└── TaskPriorityBadge.tsx (new component)
```

6. **Frontend Pages:**
```
packages/frontend/src/pages/
└── update TasksPage.tsx (add priority filter)
```

7. **Tests:**
```
packages/backend/src/test/
└── add task-priority.test.ts
```

8. **Documentation:**
```
API.md (update task endpoints)
ARCHITECTURE.md (if architecture changes)
```

## Environment-Specific Considerations

### Development

- Use local PostgreSQL or Docker
- Mock LLM calls when testing (optional)
- Set `NODE_ENV=development`

### Staging

- Use staging database
- Connect to test WhatsApp groups
- Use `gpt-4.1-mini` for cost savings

### Production

- Use production database with backups
- Connect to production WhatsApp groups
- Use `gpt-4.1` for best quality
- Enable all security headers
- Monitor error rates closely

## Security Guidelines

- Never commit secrets (use `.env` files)
- Validate all user inputs with Zod
- Sanitize data before rendering in UI
- Use parameterized queries (Drizzle handles this)
- Implement proper access control checks
- Log security-relevant events

## Performance Guidelines

- Use database indexes for frequent queries
- Implement pagination for list endpoints
- Use connection pooling for database
- Cache expensive computations when appropriate
- Lazy load components in frontend
- Optimize images and assets

## Questions?

If you have questions:

1. Check existing documentation
2. Search closed issues and PRs
3. Ask in discussions
4. Join our community chat (if available)

---

Thank you for contributing to Project Watchdog! Your efforts help make project management easier for teams everywhere.
