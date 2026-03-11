# Project Watchdog - API Documentation

This document provides detailed information about the REST API endpoints available in Project Watchdog.

## Base URL

```
Development: http://localhost:3001
Production:  https://your-domain.com
```

## Authentication

Most API endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

Obtain a token by calling the login endpoint.

---

## Authentication Endpoints

### Login

Authenticate a user and receive a JWT token.

**Endpoint:** `POST /api/auth/login`

**Access:** Public

**Request Body:**
```json
{
  "email": "admin@watchdog.local",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "Watchdog Admin",
    "email": "admin@watchdog.local",
    "role": "admin"
  }
}
```

**Error Responses:**
- `400` - Missing email or password
- `401` - Invalid credentials

---

## Dashboard Endpoints

### Get Dashboard Data

Retrieve dashboard metrics and activity feed.

**Endpoint:** `GET /api/dashboard`

**Access:** Authenticated (Managers see their assigned scope, Admins see all)

**Response:**
```json
{
  "kpis": {
    "activeTasks": 24,
    "overdueTasks": 3,
    "activeRisks": 5,
    "completionRate": 78.5
  },
  "attentionPeople": [
    {
      "id": "john_doe",
      "name": "John Doe",
      "role": "Team Member",
      "overdueCount": 2,
      "riskLevel": "high"
    }
  ],
  "activityFeed": [
    {
      "id": 1,
      "type": "task_created",
      "description": "New task: Complete UI design",
      "timestamp": "2026-03-11T08:30:00Z"
    }
  ]
}
```

---

## Projects Endpoints

### List Projects

Get all projects.

**Endpoint:** `GET /api/projects`

**Access:** Authenticated

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "Project Alpha",
      "healthScore": 85,
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-03-11T08:00:00Z"
    }
  ]
}
```

### Create Project

Create a new project.

**Endpoint:** `POST /api/projects`

**Access:** Admin only

**Request Body:**
```json
{
  "name": "New Project",
  "healthScore": 100
}
```

**Response:**
```json
{
  "id": 2,
  "name": "New Project",
  "healthScore": 100,
  "createdAt": "2026-03-11T10:00:00Z",
  "updatedAt": "2026-03-11T10:00:00Z"
}
```

### Get Project Detail

Get details for a specific project.

**Endpoint:** `GET /api/projects/:id`

**Access:** Authenticated

### Update Project

Update a project.

**Endpoint:** `PUT /api/projects/:id`

**Access:** Admin only

### Delete Project

Delete a project.

**Endpoint:** `DELETE /api/projects/:id`

**Access:** Admin only

---

## Tasks Endpoints

### List Tasks

Get all tasks with filtering and pagination.

**Endpoint:** `GET /api/tasks`

**Access:** Authenticated (Managers see their assigned people's tasks)

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `open`, `done`, `blocked` |
| `owner` | string | Filter by owner name |
| `projectId` | number | Filter by project ID |
| `search` | string | Search in task descriptions |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "projectId": 1,
      "projectName": "Project Alpha",
      "messageId": 123,
      "description": "Complete UI design",
      "owner": "john",
      "deadline": "2026-03-15T00:00:00Z",
      "status": "open",
      "confidence": 0.95,
      "sourceLabel": "Alpha WhatsApp Group",
      "createdAt": "2026-03-11T08:30:00Z",
      "updatedAt": "2026-03-11T08:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "filters": {
    "people": ["john", "jane", "bob"],
    "projects": [{"id": 1, "name": "Project Alpha"}],
    "statuses": ["open", "done", "blocked"]
  }
}
```

### Create Task

Create a new task manually.

**Endpoint:** `POST /api/tasks`

**Access:** Authenticated

**Request Body:**
```json
{
  "projectId": 1,
  "description": "Review API documentation",
  "owner": "jane",
  "deadline": "2026-03-20",
  "status": "open"
}
```

### Update Task

Update an existing task.

**Endpoint:** `PUT /api/tasks/:id`

**Access:** Authenticated

**Request Body:**
```json
{
  "description": "Updated description",
  "status": "done",
  "owner": "john"
}
```

### Delete Task

Delete a task.

**Endpoint:** `DELETE /api/tasks/:id`

**Access:** Admin only

---

## People Endpoints

### List People

Get all people derived from task owners.

**Endpoint:** `GET /api/people`

**Access:** Authenticated

**Response:**
```json
{
  "people": [
    {
      "id": "john_doe",
      "name": "John Doe",
      "role": "Team Member",
      "openTaskCount": 5,
      "riskLevel": "medium",
      "lastActiveAt": "2026-03-11T08:30:00Z"
    }
  ]
}
```

### Get Person Detail

Get detailed information about a person.

**Endpoint:** `GET /api/people/:id`

**Access:** Authenticated (Managers can view their assigned people)

**Response:**
```json
{
  "id": "john_doe",
  "name": "John Doe",
  "role": "Team Member",
  "openTaskCount": 5,
  "riskLevel": "medium",
  "tasks": [
    {
      "id": 1,
      "description": "Complete UI design",
      "status": "open",
      "deadline": "2026-03-15T00:00:00Z"
    }
  ],
  "messages": [
    {
      "id": 123,
      "text": "@john please finish the design",
      "timestamp": "2026-03-11T08:30:00Z"
    }
  ],
  "averageTaskCount": 4.5
}
```

### Update Person Settings

Update settings for a person.

**Endpoint:** `PUT /api/people/:id/settings`

**Access:** Admin only

**Request Body:**
```json
{
  "name": "John Doe",
  "aliases": ["john", "jd"],
  "email": "john@example.com",
  "roleName": "UI Designer",
  "roleDescription": "Responsible for UI/UX design",
  "priorities": "high"
}
```

---

## Sources Endpoints

### List Sources

Get all channels and connections.

**Endpoint:** `GET /api/sources`

**Access:** Authenticated

**Response:**
```json
{
  "channels": [
    {
      "id": "whatsapp",
      "name": "WhatsApp",
      "description": "WhatsApp group integration"
    },
    {
      "id": "email",
      "name": "Email",
      "description": "Email integration"
    }
  ],
  "connections": [
    {
      "id": 1,
      "channelType": "whatsapp",
      "label": "Project Alpha Group",
      "identifier": "6281234567890-1234567890@g.us",
      "status": "active",
      "lastSyncAt": "2026-03-11T08:30:00Z",
      "messagesProcessed": 1523,
      "reportTime": "18:00"
    }
  ]
}
```

### Create Connection

Add a new connection to a channel.

**Endpoint:** `POST /api/sources/:channelId/connections`

**Access:** Admin only

**Request Body:**
```json
{
  "label": "Project Beta Group",
  "identifier": "6289876543210-0987654321@g.us",
  "reportTime": "18:00"
}
```

**Validation:**
- WhatsApp identifiers must end with `@g.us`
- Duplicate identifiers per channel return `409 Conflict`

### Update Connection

Update a connection.

**Endpoint:** `PUT /api/sources/connections/:id`

**Access:** Admin only

### Pause Connection

Pause message processing for a connection.

**Endpoint:** `POST /api/sources/connections/:id/pause`

**Access:** Admin only

### Resume Connection

Resume message processing for a connection.

**Endpoint:** `POST /api/sources/connections/:id/resume`

**Access:** Admin only

### Retry Connection

Clear error state and retry a connection.

**Endpoint:** `POST /api/sources/connections/:id/retry`

**Access:** Admin only

### Delete Connection

Delete a connection.

**Endpoint:** `DELETE /api/sources/connections/:id`

**Access:** Admin only

---

## Processing Endpoints

### List Processing Rules

Get all processing rules and recent runs.

**Endpoint:** `GET /api/processing`

**Access:** Authenticated

**Response:**
```json
{
  "rules": [
    {
      "id": 1,
      "name": "Daily Task Extraction",
      "description": "Extract tasks from messages daily",
      "schedule": "0 9 * * *",
      "channelIds": ["whatsapp"],
      "action": "extract_tasks",
      "enabled": true,
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ],
  "recentRuns": [
    {
      "id": 1,
      "ruleId": 1,
      "ruleName": "Daily Task Extraction",
      "status": "success",
      "startedAt": "2026-03-11T09:00:00Z",
      "finishedAt": "2026-03-11T09:05:00Z"
    }
  ]
}
```

### Create Rule

Create a new processing rule.

**Endpoint:** `POST /api/processing/rules`

**Access:** Admin only

**Request Body:**
```json
{
  "name": "Weekly Report",
  "description": "Generate weekly summary",
  "schedule": "0 18 * * 5",
  "channelIds": ["whatsapp"],
  "action": "extract_tasks",
  "prompt": "Custom AI prompt here"
}
```

### Update Rule

Update a processing rule.

**Endpoint:** `PUT /api/processing/rules/:id`

**Access:** Admin only

### Delete Rule

Delete a processing rule.

**Endpoint:** `DELETE /api/processing/rules/:id`

**Access:** Admin only

### Toggle Rule

Enable or disable a rule.

**Endpoint:** `POST /api/processing/rules/:id/toggle`

**Access:** Admin only

### Run Rule

Manually trigger a rule execution.

**Endpoint:** `POST /api/processing/rules/:id/run`

**Access:** Admin only

**Response:**
```json
{
  "runId": 42,
  "status": "running",
  "startedAt": "2026-03-11T10:00:00Z"
}
```

---

## Reports Endpoints

### List Reports

Get all generated reports.

**Endpoint:** `GET /api/reports`

**Access:** Authenticated

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | number | Filter by project |
| `startDate` | string | Start date (YYYY-MM-DD) |
| `endDate` | string | End date (YYYY-MM-DD) |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response:**
```json
{
  "reports": [
    {
      "id": 1,
      "projectId": 1,
      "date": "2026-03-10",
      "narrative": "Team made good progress...",
      "newTasks": 3,
      "resolvedTasks": 5,
      "activeRisks": 2,
      "createdAt": "2026-03-10T18:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 30,
    "totalPages": 3
  }
}
```

### Get Report Detail

Get a specific report.

**Endpoint:** `GET /api/reports/:id`

**Access:** Authenticated

**Response:**
```json
{
  "id": 1,
  "projectId": 1,
  "projectName": "Project Alpha",
  "date": "2026-03-10",
  "narrative": "📊 Daily Report — Project Alpha\n\n✅ Tasks Completed: 5\n📋 New Tasks: 3\n⚠️ Active Risks: 2\n\nSummary: Team made good progress...",
  "newTasks": 3,
  "resolvedTasks": 5,
  "activeRisks": 2,
  "tasks": [
    {
      "id": 1,
      "description": "Complete UI design",
      "status": "done"
    }
  ],
  "risks": [
    {
      "id": 1,
      "type": "deadline",
      "severity": "high",
      "explanation": "Task overdue by 2 days"
    }
  ]
}
```

---

## Settings Endpoints

### Get Settings

Get all admin settings.

**Endpoint:** `GET /api/settings`

**Access:** Admin only

**Response:**
```json
{
  "apiKeys": [
    {
      "id": 1,
      "service": "openai",
      "maskedKey": "sk-...1234",
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ],
  "smtpSettings": {
    "host": "smtp.gmail.com",
    "port": 587,
    "username": "notifications@example.com",
    "fromAddress": "watchdog@example.com",
    "encryption": "starttls"
  },
  "users": [
    {
      "id": 1,
      "name": "Admin User",
      "email": "admin@watchdog.local",
      "role": "admin",
      "active": true
    }
  ],
  "availableSections": [
    "dashboard",
    "people",
n    "tasks",
    "sources",
    "processing",
    "reports"
  ],
  "availablePeople": ["john", "jane", "bob"]
}
```

### Add API Key

Add a new API key.

**Endpoint:** `POST /api/settings/api-keys`

**Access:** Admin only

**Request Body:**
```json
{
  "service": "openai",
  "key": "sk-your-api-key-here"
}
```

**Note:** The key is encrypted before storage. Only the last 4 characters are returned in API responses.

### Delete API Key

Remove an API key.

**Endpoint:** `DELETE /api/settings/api-keys/:id`

**Access:** Admin only

### Update SMTP Settings

Update SMTP configuration.

**Endpoint:** `PUT /api/settings/smtp`

**Access:** Admin only

**Request Body:**
```json
{
  "host": "smtp.gmail.com",
  "port": 587,
  "username": "user@example.com",
  "password": "app_password",
  "fromAddress": "watchdog@example.com",
  "encryption": "starttls"
}
```

### Test SMTP

Test SMTP connection.

**Endpoint:** `POST /api/settings/smtp/test`

**Access:** Admin only

### Create User

Create a new user.

**Endpoint:** `POST /api/settings/users`

**Access:** Admin only

**Request Body:**
```json
{
  "name": "New Manager",
  "email": "manager@example.com",
  "password": "secure_password",
  "role": "manager",
  "sectionPermissions": ["dashboard", "tasks", "people"],
  "assignedPeopleIds": ["john", "jane"]
}
```

### Update User

Update an existing user.

**Endpoint:** `PUT /api/settings/users/:id`

**Access:** Admin only

### Deactivate User

Deactivate a user account.

**Endpoint:** `POST /api/settings/users/:id/deactivate`

**Access:** Admin only

### Reactivate User

Reactivate a user account.

**Endpoint:** `POST /api/settings/users/:id/reactivate`

**Access:** Admin only

### Get WhatsApp Web Status

Get the WhatsApp Web ingestor status.

**Endpoint:** `GET /api/settings/whatsapp-web`

**Access:** Admin only

**Response:**
```json
{
  "status": "online",
  "state": "CONNECTED",
  "qrCode": null,
  "lastHeartbeat": "2026-03-11T10:00:00Z",
  "info": {
    "platform": "android",
    "pushname": "My Phone"
  }
}
```

### Logout WhatsApp Web

Force logout of WhatsApp Web session.

**Endpoint:** `POST /api/settings/whatsapp-web/logout`

**Access:** Admin only

### Reconnect WhatsApp Web

Trigger WhatsApp Web reconnection.

**Endpoint:** `POST /api/settings/whatsapp-web/reconnect`

**Access:** Admin only

---

## Health Endpoints

### System Health

Get system health status.

**Endpoint:** `GET /api/health`

**Access:** Public

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-11T10:00:00Z",
  "uptime": 86400,
  "database": {
    "status": "connected",
    "latency": 5
  },
  "queue": {
    "depth": 12,
    "failedJobs": 0
  },
  "webhook": {
    "lastReceivedAt": "2026-03-11T09:59:00Z",
    "messagesProcessed": 1523
  },
  "ai": {
    "lastJobStatus": "success",
    "lastJobCompletedAt": "2026-03-11T09:45:00Z"
  }
}
```

**Status Values:**
- `healthy` - All systems operational
- `degraded` - Some services experiencing issues
- `error` - Critical system failure

---

## WhatsApp Web Integration Endpoints

These endpoints are used by the `wa-ingestor` service (whatsapp-web.js) to communicate with the backend. They handle both inbound message ingestion and outbound command polling.

### Ingest Messages

Receive WhatsApp messages from the local whatsapp-web.js ingestor.

**Endpoint:** `POST /ingest/whatsapp-web`

**Access:** Ingest token validation (header)

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Ingest-Token` | Yes | Must match `WHATSAPP_INGEST_TOKEN` |

**Request Body:**
```json
{
  "groupId": "6281234567890-1234567890@g.us",
  "sender": "6281111111111@s.whatsapp.net",
  "pushName": "Budi",
  "messageText": "ok @john selesaikan desain UI sebelum jumat ya",
  "timestampMs": 1740000000000,
  "messageId": "..."
}
```

**Response:**
- `200 OK` - Message accepted
- `401 Unauthorized` - Invalid token
- `400 Bad Request` - Invalid payload
- `429 Too Many Requests` - Rate limited

**Processing Flow:**
1. Validate ingest token
2. Deduplicate using SHA-256 hash
3. Store message in database
4. Enqueue batch processing job
5. Return 200

### Update Status

Update the runtime status of the WhatsApp Web ingestor.

**Endpoint:** `POST /ingest/whatsapp-web/status`

**Access:** Ingest token validation (header)

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Ingest-Token` | Yes | Must match `WHATSAPP_INGEST_TOKEN` |

**Request Body:**
```json
{
  "state": "ready",
  "qr": null,
  "info": "Listening for group text messages",
  "updatedAtMs": 1740000000000
}
```

**States:**
- `starting` - Initializing
- `qr_required` - Waiting for QR scan
- `authenticated` - QR scanned, authenticating
- `ready` - Connected and ready
- `disconnected` - Disconnected
- `auth_failure` - Authentication failed
- `error` - Error state

### Poll Commands

Get pending commands from the backend (e.g., send_message, logout, reconnect).

**Endpoint:** `GET /ingest/whatsapp-web/commands`

**Access:** Ingest token validation (header)

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Ingest-Token` | Yes | Must match `WHATSAPP_INGEST_TOKEN` |

**Response:**
```json
{
  "commands": [
    {
      "id": 1,
      "command": "send_message",
      "payload": {
        "groupId": "6281234567890-1234567890@g.us",
        "messageText": "📊 Daily Report - 5 tasks completed"
      }
    }
  ]
}
```

**Command Types:**
- `send_message` - Send a message to a WhatsApp group
- `logout` - Force logout and re-authenticate
- `reconnect` - Destroy and reinitialize client
- `sync_groups` - Sync group list with backend

### Acknowledge Command

Acknowledge a command as completed or failed (for retry logic).

**Endpoint:** `POST /ingest/whatsapp-web/commands/:id/ack`

**Access:** Ingest token validation (header)

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `X-Ingest-Token` | Yes | Must match `WHATSAPP_INGEST_TOKEN` |

**Request Body:**

Success:
```json
{
  "ok": true
}
```

Failure (triggers retry with exponential backoff):
```json
{
  "ok": false,
  "error": "Client not connected"
}
```

**Retry Behavior:**
- Failed commands are retried with exponential backoff (1s, 2s, 4s, 8s, 16s)
- Max 5 attempts before giving up
- Commands with `consumed_at` set are considered complete

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | `BAD_REQUEST` | Invalid request body or parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 422 | `VALIDATION_ERROR` | Validation failed |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

### Validation Errors

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

---

## Rate Limiting

API endpoints have the following rate limits:

| Endpoint | Limit |
|----------|-------|
| `/api/auth/*` | 10 requests per minute |
| `/api/*` (general) | 100 requests per minute |
| `/ingest/whatsapp-web/*` | 1000 requests per minute |

Rate limit headers included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1647000000
```

---

## Pagination

List endpoints support pagination with these query parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | 1 | Page number (1-indexed) |
| `limit` | 20 | Items per page (max: 100) |

**Response format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## Filtering

Many list endpoints support filtering. Common filters:

**Date Range:**
```
GET /api/reports?startDate=2026-03-01&endDate=2026-03-31
```

**Status Filter:**
```
GET /api/tasks?status=open
```

**Search:**
```
GET /api/tasks?search=design
```

**Multiple Values:**
```
GET /api/tasks?status=open,blocked
```

---

## Data Types

### Task Status

| Value | Description |
|-------|-------------|
| `open` | Task is active and not completed |
| `done` | Task has been completed |
| `blocked` | Task is blocked by dependencies or issues |

### Risk Severity

| Value | Description |
|-------|-------------|
| `low` | Minor concern, monitor |
| `medium` | Moderate risk, plan mitigation |
| `high` | Serious risk, immediate attention |
| `critical` | Critical risk, urgent action required |

### Risk Type

| Value | Description |
|-------|-------------|
| `deadline` | Task deadline approaching or overdue |
| `stagnation` | Task has no updates for extended period |
| `blockers` | Task is blocked by external factors |
| `sentiment` | Team sentiment concerns detected |

### Connection Status

| Value | Description |
|-------|-------------|
| `active` | Connection is operational |
| `paused` | Connection temporarily disabled |
| `error` | Connection has an error state |

### Processing Rule Action

| Value | Description |
|-------|-------------|
| `extract_tasks` | Extract tasks from messages |
| `update_profiles` | Update people profiles |
| `both` | Perform both actions |

---

## Client Integration Example

### JavaScript/TypeScript

```typescript
const API_BASE_URL = 'http://localhost:3001';

class WatchdogClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json();
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Dashboard
  async getDashboard() {
    return this.request('/api/dashboard');
  }

  // Tasks
  async getTasks(filters?: { status?: string; owner?: string }) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/tasks?${params}`);
  }

  async createTask(task: { description: string; owner?: string; deadline?: string }) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: number, updates: Partial<Task>) {
    return this.request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }
}

// Usage
const client = new WatchdogClient('your_jwt_token');
const dashboard = await client.getDashboard();
```

---

For more information, see the [Architecture Documentation](./ARCHITECTURE.md) and [Development Roadmap](./ROADMAP.md).
