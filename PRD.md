# 📘 Watchdog Backend Product Requirements Document (PRD)

### Version

v1.0 – MVP Backend Scope

### Last Updated

February 2026

---

## 📌 1. Executive Summary

Watchdog is an AI-driven project risk intelligence platform that operates primarily via WhatsApp group messages. Its core purpose is to turn unstructured WhatsApp conversations into structured project insights, including task detection, risk identification, daily insights, and simple reporting — while preserving your existing React frontend and PostgreSQL backend stack.

The backend must support message ingestion, AI processing, risk detection, task tracking, reporting, and WhatsApp notifications using the **Fonnte API** for outbound messaging and webhook receipt. ([Fonnte's Documentation][1])

---

## 🧱 2. MVP Scope

### Includes:

**Backend Services:**

* WhatsApp webhook ingestion (Fonnte)
* Task detection extraction
* Risk detection engine
* Daily report generator
* REST API for frontend
* PostgreSQL persistence

**Roles & Access:**

* Simple authenticated access (e.g. JWT)
* Admin vs Manager access

**Key Deliverables:**

* Message ingestion endpoint
* Project, task & risk models
* AI parsing integration
* REST API endpoints
* Fonnte send integration
* Minimal reporting logic

### Excludes:

* Official WhatsApp Business API
* MCP bridge support
* Complex scheduling
* Predictive forecasting
* Message history retention policies
* Full persona analytics (phase 2)

---

## 🗺 3. Architecture Overview

```
               ┌────────────────────────────┐
               │          React Frontend     │
               │ (Dashboard & UI components) │
               └───────────────┬────────────┘
                               |
                         REST API (Node.js)
                               |
            ┌──────────────────┴─────────────────┐
            │                                        │
  PostgreSQL DB (tasks, risks, reports)       WhatsApp Integration
            │                                        │
            ├─────────────┐                    ┌───────┴──────────┐
            │             │                    │  Fonnte Incoming │
            │             │                    │  Webhook Handler │
            │             │                    └───────▲──────────┘
  AI Workers (task/risk engine)                   │
            │                                     │
            └─────────◄────── AI Task Processor ◄──┘
                                  |
                     Fonnte Outbound Message API
```

---

## ⚙ 4. WhatsApp Integration (Fonnte)

Watchdog will use **Fonnte’s API** to send WhatsApp messages and receive incoming messages via webhook. Fonnte provides endpoints to send messages to individuals and groups and to receive webhook callbacks when messages arrive. ([Fonnte's Documentation][1])

### Inbound Messaging (Webhook)

Your backend must expose an endpoint, e.g.:

```
POST /webhooks/fonnte/receive
```

Fonnte will call this webhook with message payloads when group messages arrive — including incoming chat text, metadata, and message context.

> Backend must return status 200 quickly to acknowledge receipt. ([Fonnte's Documentation][2])

---

### Outbound Messaging

Use the Fonnte send API:

```
POST https://api.fonnte.com/send
```

Payload includes:

* `target`: single number or group ID
* `message`: the message text sent to the target ([Fonnte's Documentation][3])

---

## 🧠 5. Core Backend Modules

### 5.1 Message Ingestion Module

Receives webhook data from Fonnte

* Preprocess messages
* Deduplicate
* Queue for NLP extraction

#### Endpoint:

```
POST /webhooks/fonnte/receive
```

---

### 5.2 NLP & AI Task Extraction

Responsible for:

* Detecting tasks mentioned in message text
* Extracting assignee (e.g., “@John”)
* Extracting deadlines (e.g., “by Friday”)
* Converting natural language into structured tasks

This will be implemented as a processing worker using OpenAI or similar model.

---

### 5.3 Risk Detection Engine

The risk engine will analyze:

* Task deadlines
* Task status (inferred from messages)
* Overdue tasks
* Stagnation (no updates for > X hours)

It will generate risk records with:

* `type`
* `severity`
* `explanation`
* `recommendation`

Stored in PostgreSQL.

---

### 5.4 Reporting Module

A nightly scheduled job will generate **Daily Reports** capturing:

* New tasks identified
* Resolved tasks
* Active risks
* Narrative summary for the day

Reports are stored for UI consumption.

---

## 🗃 6. Data Models

### Projects

```
id
name
health_score
created_at
updated_at
```

### Tasks

```
id
project_id
description
owner
deadline
status
created_at
updated_at
```

### Risks

```
id
project_id
type
severity
explanation
recommendation
created_at
resolved_at
```

### Daily Reports

```
id
date
narrative
new_tasks
resolved_tasks
active_risks
```

---

## 📡 7. Backend API Endpoints

| Endpoint                   | Method | Purpose               |
| -------------------------- | ------ | --------------------- |
| `/api/dashboard`           | GET    | Summary metrics       |
| `/api/projects`            | GET    | List all projects     |
| `/api/projects/:id`        | GET    | Project detail        |
| `/api/reports`             | GET    | List reports          |
| `/api/reports/:date`       | GET    | Daily report detail   |
| `/webhooks/fonnte/receive` | POST   | Inbound WhatsApp trxn |

---

## 🎯 8. Security

* Validate Fonnte webhook payloads
* Store Fonnte API key securely (env vars)
* Limit message handling to groups you have joined
* Apply RBAC for UI APIs

---

## 🖥 9. Backend Implementation Details

### Language & Framework

* **Node.js + TypeScript**
* **Express.js** or similar
* PostgreSQL via **Drizzle ORM**

### Workflow

1. Webhook receives raw message
2. Message dispatcher sends to NLP worker queue
3. Task extraction creates/updates tasks
4. Risk engine re-evaluates project risk
5. Daily report job runs each midnight
6. Frontend consumes via REST API

---

## 📋 10. WhatsApp Behavior with Fonnte

Fonnte supports:

* Sending messages to group or single numbers
* Scheduled messages
* Webhooks for incoming messages
* Attachments (images/media)
* Group list updates
* Typing simulation (optional) ([Fonnte's Documentation][1])

**Note:** Because Fonnte automates WhatsApp Web rather than using official WhatsApp Business API, your number carries some risk of account actions or suspension. It’s recommended to use a secondary WhatsApp number for this integration. ([Fonnte][4])

---

## 🧪 Quality & Testing

* Unit tests for task & risk logic
* Integration tests for webhook handling
* Mock Fonnte API responses
* CI pipeline to validate schema + output

---

## 📊 Metrics & Logging

* Log inbound webhooks
* Measure latency of AI task extraction
* Track failure rates
* Dashboard: webhook success rate, send status, report generation time

---

## 📘 Architecture Summary

Watchdog’s backend will consist of:

1. **Webhook Ingestion Service** — handles incoming WhatsApp messages
2. **Task Extraction Worker** — converts chat into structured tasks
3. **Risk Detection Engine** — analyzes task patterns for risk
4. **Report Generator** — daily summaries stored in DB
5. **REST APIs** — consumed by the React frontend
6. **Fonnte Integration** — for outbound messaging and webhook source

This architecture ensures **scalability**, **separation of concerns**, and **alignment with your tech stack** (React + Node.js + PostgreSQL).

---

## 📌 Key Constraints & Notes

* Fonnte is unofficial WhatsApp integration — *use with caution*. ([Fonnte][4])
* Prioritize secure token storage
* Use environment config for Fonnte API
* Monitor webhook health metrics

---

[1]: https://docs.fonnte.com/category/api/ "API - Fonnte's Documentation"
[2]: https://docs.fonnte.com/language/en/"EN - Fonnte's Documentation"
[3]: https://docs.fonnte.com/api-send-message/"Sending API Messages - Fonnte's Documentation"
[4]: https://fonnte.com/"Unofficial Whatsapp API Gateway Indonesia"
