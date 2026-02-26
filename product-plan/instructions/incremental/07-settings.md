# Milestone 7: Settings

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Shell) complete

---

## About This Handoff

**What you're receiving:**
- Finished UI designs (React components with full styling)
- Product requirements and user flow specifications
- Design system tokens (colors, typography)
- Sample data showing the shape of data components expect
- Test specs focused on user-facing behavior

**Your job:**
- Integrate these components into your application
- Wire up callback props to your routing and business logic
- Replace sample data with real data from your backend
- Implement loading, error, and empty states

The components are props-based — they accept data and fire callbacks. How you architect the backend, data layer, and business logic is up to you.

---

## Goal

Implement the Settings section — API key management, SMTP configuration, and user management with role-based access control.

## Overview

The Settings section uses a sidebar navigation pattern with categories on the left (API Keys, SMTP, Users) and content on the right. It covers API key management for AI models and integrations, SMTP email configuration, and user management with role-based access control where regular users have scoped section permissions and assigned people access.

**Key Functionality:**
- Navigate between settings categories via sidebar
- Manage API keys (view masked, add, delete)
- Configure SMTP settings with test connection
- Manage system users (create, edit, deactivate, reactivate)
- Assign roles (admin/regular) with section permissions and people access

## Components Provided

Copy from `product-plan/sections/settings/components/`:

- `SettingsView` — Complete settings page with sidebar navigation and all three category panels

## Props Reference

**Data props:**
- `apiKeys: ApiKey[]` — Configured API keys (masked)
- `smtpSettings: SmtpSettings` — SMTP configuration
- `users: SystemUser[]` — System user accounts
- `availableSections: SectionOption[]` — Sections for permission assignment
- `availablePeople: PersonOption[]` — People for assignment to regular users

**Callback props:**

| Callback | Triggered When |
|----------|---------------|
| `onAddApiKey(data)` | User adds a new API key |
| `onDeleteApiKey(keyId)` | User deletes an API key |
| `onSaveSmtp(data)` | User saves SMTP settings |
| `onTestSmtp()` | User tests SMTP connection |
| `onCreateUser(data)` | User creates a new system user |
| `onEditUser(userId, data)` | User edits an existing user |
| `onDeactivateUser(userId)` | User deactivates a user |
| `onReactivateUser(userId)` | User reactivates a user |

## Expected User Flows

### Flow 1: Add an API Key

1. User navigates to the "API Keys" category
2. User clicks "Add Key"
3. User selects a service and enters the API key
4. User clicks "Save"
5. **Outcome:** New key appears in the list with masked value

### Flow 2: Configure SMTP

1. User navigates to the "SMTP" category
2. User fills in host, port, username, password, from address, encryption
3. User clicks "Test Connection" to verify
4. User clicks "Save"
5. **Outcome:** SMTP settings are saved

### Flow 3: Create a Regular User

1. User navigates to the "Users" category
2. User clicks "Add User"
3. User fills in name, email, selects "Regular" role
4. User selects section permissions (e.g., Dashboard, People, Tasks)
5. User assigns specific people this user can access
6. User clicks "Create"
7. **Outcome:** New user appears in the users table

### Flow 4: Deactivate a User

1. User clicks on a user row or edit button
2. User clicks "Deactivate"
3. Confirmation prompt appears
4. User confirms
5. **Outcome:** User status changes to "Inactive"

## Empty States

- **No API keys:** Shows empty state encouraging user to add their first key
- **No users:** Shows empty state (unlikely but handled)

## Testing

See `product-plan/sections/settings/tests.md` for UI behavior test specs.

## Files to Reference

- `product-plan/sections/settings/README.md` — Feature overview and design intent
- `product-plan/sections/settings/tests.md` — UI behavior test specs
- `product-plan/sections/settings/components/` — React components
- `product-plan/sections/settings/types.ts` — TypeScript interfaces
- `product-plan/sections/settings/sample-data.json` — Test data

## Done When

- [ ] Settings sidebar navigates between categories
- [ ] API keys list renders with masked values
- [ ] Add and delete API key actions work
- [ ] SMTP form saves and test connection works
- [ ] Users table renders with role and status
- [ ] Create user with role, permissions, and people access works
- [ ] Edit user updates role, permissions, and people access
- [ ] Deactivate/reactivate user works with confirmation
- [ ] Admin users automatically get full access
- [ ] Empty states display properly
- [ ] Responsive on mobile
