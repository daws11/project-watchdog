# Test Specs: Settings

These test specs are **framework-agnostic**. Adapt them to your testing setup.

## Overview
The Settings section uses a sidebar navigation pattern with three categories: **API Keys** (add/delete credentials for external services), **SMTP** (configure outgoing email with test connection), and **Users** (full user management with create/edit/deactivate/reactivate, role-based access control, section permissions, and people assignment). Tests cover category navigation, CRUD operations, form validation, and confirmation flows.

---

## User Flow Tests

### Flow 1: Category Navigation
**Scenario:** User navigates between settings categories.

#### Success Path
**Setup:** Render `SettingsView` with all props populated.

**Steps:**
1. Verify header: "Settings" title with subtitle "Application configuration and user management"
2. Verify left sidebar shows 3 categories: "API Keys" (Key icon, "External service credentials"), "SMTP" (Mail icon, "Outgoing email config"), "Users" (Users icon, "Accounts & permissions")
3. Verify "API Keys" is selected by default
4. Click "SMTP"
5. Verify SMTP content panel is displayed
6. Click "Users"
7. Verify Users content panel is displayed

**Expected Results:**
- [ ] Active category has white/dark background with shadow and border, plus ChevronRight indicator
- [ ] Active category icon uses sky coloring; inactive categories use zinc coloring
- [ ] Content area updates to show the selected category's panel

---

### Flow 2: API Keys -- View Existing Keys
**Scenario:** User views configured API keys.

#### Success Path
**Setup:** Render with `apiKeys` containing 3+ keys for different services.

**Steps:**
1. Verify "API Keys" heading with subtitle "Manage credentials for AI models and external integrations"
2. Verify "Add key" button is visible
3. Verify each key row displays: Lock icon, service name, masked key (monospace, e.g. "sk-...****1234"), created date, "Last used" time, and Delete button (trash icon, visible on hover)

**Expected Results:**
- [ ] Masked key is displayed in JetBrains Mono font
- [ ] Created date formatted as "DD Mon YYYY" (e.g. "15 Jan 2026")
- [ ] "Last used" shows relative time or "never" if `lastUsedAt` is null
- [ ] Delete button appears on hover (opacity-0 -> opacity-100 on group-hover)

---

### Flow 3: API Keys -- Add a New Key
**Scenario:** User adds a new API key.

#### Success Path
**Steps:**
1. Click "Add key" button
2. Verify a form card appears with blue highlight border
3. Verify form shows: Service dropdown and API Key password input (placeholder "sk-...")
4. Verify service dropdown options: "OpenAI", "Anthropic", "WhatsApp Business API", "Google Cloud", "Microsoft Graph", "Custom"
5. Select "Anthropic" and enter "sk-ant-12345"
6. Click "Save key"

**Expected Results:**
- [ ] `onAddApiKey` is called with `{ service: 'Anthropic', key: 'sk-ant-12345' }`
- [ ] Form closes after save
- [ ] Key input clears
- [ ] "Add key" button is hidden while form is visible

#### Failure Path: Empty Key
**Steps:** Click "Save key" with empty key field.

**Expected Results:**
- [ ] "Save key" button is disabled
- [ ] `onAddApiKey` is NOT called

#### Cancel Add
**Steps:** Click "Cancel" on the add key form.

**Expected Results:**
- [ ] Form closes, key field clears
- [ ] "Add key" button reappears

---

### Flow 4: API Keys -- Delete a Key
**Scenario:** User deletes an API key with confirmation.

#### Success Path
**Steps:**
1. Hover over a key row to reveal the Delete button (Trash2 icon)
2. Click Delete
3. Verify confirmation card appears with red highlight: 'Delete the [Service] key? This action cannot be undone.'
4. Click "Delete key" (red button)

**Expected Results:**
- [ ] `onDeleteApiKey` is called with `keyId`
- [ ] Confirmation UI disappears

#### Cancel Delete
**Steps:** Click "Cancel" on the deletion confirmation.

**Expected Results:**
- [ ] Original key row is restored
- [ ] `onDeleteApiKey` is NOT called

---

### Flow 5: SMTP -- Configure and Save
**Scenario:** User configures SMTP settings and saves.

#### Success Path
**Setup:** Render with `smtpSettings` pre-populated.

**Steps:**
1. Navigate to "SMTP" category
2. Verify heading: "SMTP Configuration" with subtitle "Configure outgoing email for notifications and alerts"
3. Verify form sections: Server (Host, Port), Authentication (Username, Password with show/hide toggle), Sender (From Address), Encryption (None, SSL/TLS, STARTTLS buttons)
4. Verify fields are pre-populated from `smtpSettings` prop
5. Modify the host to "smtp.newprovider.com"
6. Click the eye icon to toggle password visibility
7. Click "Save settings"

**Expected Results:**
- [ ] `onSaveSmtp` is called with `{ host: 'smtp.newprovider.com', port, username, password, fromAddress, encryption }`
- [ ] Password field toggles between `type="password"` and `type="text"` when eye icon is clicked
- [ ] Eye icon toggles between Eye and EyeOff icons
- [ ] Port defaults to 587 if the field value is not a valid number

---

### Flow 6: SMTP -- Test Connection
**Scenario:** User tests the SMTP connection.

#### Success Path
**Steps:**
1. Click "Test connection" button (with Send icon)

**Expected Results:**
- [ ] `onTestSmtp` is called
- [ ] Button shows "Test connection" text with Send icon

---

### Flow 7: SMTP -- Encryption Selection
**Scenario:** User selects an encryption method.

#### Success Path
**Steps:**
1. Click "None" encryption button
2. Click "SSL/TLS" button
3. Click "STARTTLS" button

**Expected Results:**
- [ ] Only one encryption option is selected at a time (mutual exclusivity)
- [ ] Selected button has sky-highlighted styling
- [ ] Labels render as: "None", "SSL/TLS", "STARTTLS"

---

### Flow 8: Users -- View User List
**Scenario:** User views all system users.

#### Success Path
**Setup:** Render with `users` containing a mix of active/inactive users with admin/regular roles.

**Steps:**
1. Navigate to "Users" category
2. Verify heading: "Users" with subtitle "N accounts . X active"
3. Verify "Add user" button is visible
4. Verify active users are listed first, inactive users in a separate "Inactive" section
5. For each user row, verify: avatar initials, name, email, role badge, status indicator, last active time, and action buttons (Edit, Deactivate/Reactivate -- visible on hover)

**Expected Results:**
- [ ] Admin users show amber avatar background, "Admin" badge (ShieldCheck icon, amber styling)
- [ ] Regular users show sky avatar background, "User" badge (Shield icon, sky styling)
- [ ] Active users show emerald dot with "Active" text
- [ ] Inactive users show zinc dot with "Off" text, row has reduced opacity
- [ ] Avatar shows first letter of each word (e.g. "Ahmed Hassan" -> "AH")
- [ ] Clicking a user row opens the edit slide-over

---

### Flow 9: Users -- Create a New User
**Scenario:** User creates a new system user.

#### Success Path
**Steps:**
1. Click "Add user" button
2. Verify slide-over opens with title "New User" and subtitle "Create a new account"
3. Verify Identity section: Name and Email fields
4. Verify Role & Access section: "Admin" and "Regular User" toggle buttons
5. Select "Regular User" (default)
6. Verify Section Access checkboxes appear (only for regular role)
7. Verify Assigned People list appears (only for regular role)
8. Fill in name "Khalid Al-Farsi" and email "khalid@company.com"
9. Check "Dashboard", "People", "Tasks" sections
10. Select 2 people from the Assigned People list
11. Click "Create user"

**Expected Results:**
- [ ] `onCreateUser` is called with `{ name: 'Khalid Al-Farsi', email: 'khalid@company.com', role: 'regular', sectionPermissions: ['dashboard', 'people', 'tasks'], assignedPeopleIds: ['p1', 'p2'] }`
- [ ] Slide-over closes after creation
- [ ] Section Access and Assigned People are only shown when role is "regular"
- [ ] Default section permission includes "dashboard"

#### Admin Role
**Steps:** Select "Admin" role.

**Expected Results:**
- [ ] Section Access and Assigned People sections are hidden
- [ ] When submitted, `sectionPermissions` includes all section IDs plus "settings"
- [ ] `assignedPeopleIds` is empty array for admins
- [ ] Description text shows "Full access to all sections and people."

#### Failure Path: Missing Required Fields
**Steps:** Try to submit with empty name or email.

**Expected Results:**
- [ ] "Create user" button is disabled
- [ ] `onCreateUser` is NOT called

#### Cancel Create
**Steps:** Click "Cancel" or overlay.

**Expected Results:**
- [ ] Slide-over closes
- [ ] No callback is fired

---

### Flow 10: Users -- Edit an Existing User
**Scenario:** User edits an existing user's settings.

#### Success Path
**Setup:** Render with existing users.

**Steps:**
1. Click a user row or the Edit button (UserCog icon, `title="Edit"`)
2. Verify slide-over opens with title "Edit User" and subtitle "Editing [name]"
3. Verify form is pre-populated with user's current values (name, email, role, sectionPermissions, assignedPeopleIds)
4. Change role from "regular" to "admin"
5. Verify Section Access and Assigned People sections disappear
6. Click "Save changes"

**Expected Results:**
- [ ] `onEditUser` is called with `(userId, updatedData)`
- [ ] Pre-populated values match the user's current data
- [ ] Role change dynamically shows/hides permission controls
- [ ] Slide-over closes after save

---

### Flow 11: Users -- Deactivate a User
**Scenario:** User deactivates an active user with confirmation.

#### Success Path
**Steps:**
1. Hover over an active user row to reveal action buttons
2. Click the Deactivate button (X icon, `title="Deactivate"`)
3. Verify confirmation: "Deactivate [name]? They will lose access to the system." with red border
4. Click "Deactivate" button (red)

**Expected Results:**
- [ ] `onDeactivateUser` is called with `userId`
- [ ] Confirmation UI disappears

#### Cancel Deactivate
**Steps:** Click "Cancel" on the confirmation.

**Expected Results:**
- [ ] Original user row is restored
- [ ] `onDeactivateUser` is NOT called

---

### Flow 12: Users -- Reactivate a User
**Scenario:** User reactivates an inactive user.

#### Success Path
**Steps:**
1. In the "Inactive" section, hover over an inactive user row
2. Click the Reactivate button (Check icon, `title="Reactivate"`)
3. Verify confirmation: "Reactivate [name]?" with emerald border
4. Click "Reactivate" button (emerald)

**Expected Results:**
- [ ] `onReactivateUser` is called with `userId`
- [ ] Confirmation UI disappears

---

## Empty State Tests

### No API Keys
**Setup:** Render with `apiKeys: []`.

**Expected Results:**
- [ ] Key icon in a zinc rounded box is displayed centered
- [ ] Text "No API keys configured" is shown
- [ ] "Add key" button is still visible

### No Users (Unlikely but Testable)
**Setup:** Render with `users: []`.

**Expected Results:**
- [ ] Subtitle shows "0 accounts . 0 active"
- [ ] "Add user" button is still visible
- [ ] No "Inactive" section header

---

## Component Interaction Tests

### Section Permission Toggle
**Setup:** Open the user editor slide-over for a regular user.

**Steps:**
1. Click "Dashboard" checkbox (toggles off)
2. Click "People" checkbox (toggles on)

**Expected Results:**
- [ ] Checkboxes toggle: sky styling when selected, zinc when deselected
- [ ] Check icon appears inside the checkbox square when selected
- [ ] `formSections` array updates accordingly

### People Assignment Toggle
**Setup:** Open the user editor for a regular user with `availablePeople`.

**Steps:**
1. Click a person to assign them
2. Click the same person to unassign

**Expected Results:**
- [ ] Selected person row has sky styling; deselected has zinc styling
- [ ] Check icon appears when selected
- [ ] `formPeople` array updates accordingly

### Admin Role Auto-Permissions
**Steps:** Create/edit a user, select Admin role, submit.

**Expected Results:**
- [ ] `sectionPermissions` automatically includes all available section IDs plus "settings"
- [ ] `assignedPeopleIds` is empty
- [ ] Description shows "Full access to all sections and people."

### Regular Role Description
**Steps:** Select Regular User role.

**Expected Results:**
- [ ] Description shows "Scoped to assigned sections and people only."

---

## Edge Cases

### Delete Last API Key
**Setup:** Only 1 API key exists, delete it.

**Expected Results:**
- [ ] After deletion, the empty state "No API keys configured" appears

### User with Very Long Name
**Setup:** User with name "Muhammad bin Abdullah Al-Khalifa Al-Rashid Al-Thani".

**Expected Results:**
- [ ] Name truncates in user rows
- [ ] Full name displays in slide-over
- [ ] Avatar initials are "MA" (first 2 words)

### SMTP Port Validation
**Setup:** Enter non-numeric port value.

**Expected Results:**
- [ ] On save, port defaults to 587 (`parseInt(port) || 587`)

### Switching Categories Preserves State
**Steps:** Start editing SMTP fields, switch to API Keys, switch back to SMTP.

**Expected Results:**
- [ ] SMTP form state is controlled by component state -- behavior depends on implementation (may reset on re-mount)

### Deactivate and Reactivate Confirmation Overlap
**Steps:** Click deactivate on one user, then deactivate on another.

**Expected Results:**
- [ ] Both confirmations can use the same `deactivatingId` state -- only the most recently clicked user shows confirmation

---

## Accessibility Checks

- [ ] Sidebar category buttons are keyboard accessible with distinct focus/active states
- [ ] API key rows: delete button has `title="Delete"` and appears on hover/focus
- [ ] SMTP form: all inputs are labeled; password toggle button is keyboard accessible
- [ ] Encryption toggle buttons are keyboard accessible
- [ ] "Save settings" and "Test connection" buttons are keyboard accessible
- [ ] User rows: click opens edit; action buttons (Edit, Deactivate, Reactivate) have `title` attributes and appear on hover
- [ ] User editor slide-over: all form fields are focusable; X button and overlay close the panel
- [ ] Section permission checkboxes are implemented as `<button>` elements (keyboard accessible)
- [ ] People assignment buttons are keyboard accessible
- [ ] "Create user" / "Save changes" buttons have disabled state for incomplete forms
- [ ] Role toggle buttons ("Admin" / "Regular User") include icons and are keyboard accessible

---

## Sample Test Data

```typescript
import type { ApiKey, SmtpSettings, SystemUser, SectionOption, PersonOption, SettingsProps } from './types'

const mockApiKeys: ApiKey[] = [
  { id: 'key1', service: 'OpenAI', maskedKey: 'sk-...Xf4R', createdAt: '2026-01-15T10:00:00Z', lastUsedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'key2', service: 'Anthropic', maskedKey: 'sk-ant-...9kLm', createdAt: '2026-01-20T10:00:00Z', lastUsedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'key3', service: 'WhatsApp Business API', maskedKey: 'EAAx...7dBz', createdAt: '2026-02-01T10:00:00Z', lastUsedAt: null },
]

const mockSmtpSettings: SmtpSettings = {
  host: 'smtp.company.com',
  port: 587,
  username: 'noreply@company.com',
  password: 'smtp-password-123',
  fromAddress: 'Watchdog <noreply@company.com>',
  encryption: 'starttls',
}

const mockUsers: SystemUser[] = [
  {
    id: 'u1',
    name: 'Admin User',
    email: 'admin@company.com',
    role: 'admin',
    status: 'active',
    lastActiveAt: new Date(Date.now() - 600000).toISOString(),
    sectionPermissions: ['dashboard', 'people', 'tasks', 'sources', 'processing', 'settings'],
    assignedPeopleIds: [],
  },
  {
    id: 'u2',
    name: 'Khalid Al-Farsi',
    email: 'khalid@company.com',
    role: 'regular',
    status: 'active',
    lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
    sectionPermissions: ['dashboard', 'people', 'tasks'],
    assignedPeopleIds: ['p1', 'p2'],
  },
  {
    id: 'u3',
    name: 'Sara Ahmed',
    email: 'sara@company.com',
    role: 'regular',
    status: 'inactive',
    lastActiveAt: new Date(Date.now() - 2592000000).toISOString(),
    sectionPermissions: ['dashboard'],
    assignedPeopleIds: ['p3'],
  },
]

const mockSections: SectionOption[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'people', label: 'People' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'sources', label: 'Sources' },
  { id: 'processing', label: 'Processing' },
]

const mockPeopleOptions: PersonOption[] = [
  { id: 'p1', name: 'Ahmed Al-Rashid' },
  { id: 'p2', name: 'Fatima Hassan' },
  { id: 'p3', name: 'Omar Khaled' },
  { id: 'p4', name: 'Layla Ibrahim' },
]

const mockSettingsProps: SettingsProps = {
  apiKeys: mockApiKeys,
  smtpSettings: mockSmtpSettings,
  users: mockUsers,
  availableSections: mockSections,
  availablePeople: mockPeopleOptions,
  onAddApiKey: vi.fn(),
  onDeleteApiKey: vi.fn(),
  onSaveSmtp: vi.fn(),
  onTestSmtp: vi.fn(),
  onCreateUser: vi.fn(),
  onEditUser: vi.fn(),
  onDeactivateUser: vi.fn(),
  onReactivateUser: vi.fn(),
}
```
