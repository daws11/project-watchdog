# Settings

## Overview

Application-level configuration using a sidebar navigation pattern with categories on the left and content on the right. Covers API key management for AI models and integrations, SMTP email configuration, and user management with role-based access control and scoped people permissions.

## User Flows

- Navigate between settings categories via a left sidebar (API Keys, SMTP, Users)
- **API Keys:** View configured API keys (masked), add a new key, delete existing keys
- **SMTP:** Configure outgoing email settings with a "Test connection" button
- **Users:** View all system users with name, email, role, status, last active
- Create a new user with name, email, role, section permissions, and assigned people
- Edit an existing user's role, permissions, and people access
- Deactivate or reactivate a user

## Design Decisions

- Settings-specific left sidebar separate from the shell sidebar
- Content area displays the selected category's form/table
- API Keys: list of rows with service name, masked key, created date, actions
- SMTP: standard form with save and test connection buttons
- Users: table with row click to open edit slide-over
- Regular users have scoped section permissions and assigned people
- Admin users have full access to all sections and people
- Deactivation confirmation before disabling a user

## Data Shapes

**Entities:**
- `ApiKey` — Configured API key with masked value and usage timestamps
- `ApiKeyFormData` — Data for adding a new API key
- `SmtpSettings` — SMTP configuration (host, port, credentials, encryption)
- `SystemUser` — User account with role, status, permissions, assigned people
- `UserFormData` — Data for creating/editing a user
- `SectionOption` — Available section for permission assignment
- `PersonOption` — Available person for assignment

## Components Provided

- `SettingsView` — Complete settings page with sidebar navigation and all three category panels

## Callback Props

| Callback | Triggered When |
|----------|---------------|
| `onAddApiKey` | User adds a new API key |
| `onDeleteApiKey` | User deletes an API key |
| `onSaveSmtp` | User saves SMTP settings |
| `onTestSmtp` | User tests SMTP connection |
| `onCreateUser` | User creates a new system user |
| `onEditUser` | User edits an existing user |
| `onDeactivateUser` | User deactivates a user |
| `onReactivateUser` | User reactivates a user |
