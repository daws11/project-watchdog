import { useState } from 'react'
import { X } from 'lucide-react'
import type { PersonSummary, PersonSettingsData } from '../people/types'

interface PersonSettingsProps {
  person: PersonSummary
  onClose: () => void
  onSave?: (data: PersonSettingsData) => void
}

export function PersonSettings({ person, onClose, onSave }: PersonSettingsProps) {
  const [name, setName] = useState(person.name ?? '')
  const [aliases, setAliases] = useState<string[]>([...person.aliases])
  const [email, setEmail] = useState(person.email ?? '')
  const [phone, setPhone] = useState(person.phone ?? '')
  const [roleName, setRoleName] = useState(person.role ?? '')
  const [roleDescription, setRoleDescription] = useState('')
  const [priorities, setPriorities] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')

  const handleSave = () => {
    onSave?.({ name, aliases: aliases.join(', '), email, phone, roleName, roleDescription, priorities, customPrompt })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/15 dark:bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2
            className="text-base font-bold text-zinc-900 dark:text-zinc-100"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Person Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* Identity */}
          <section className="space-y-4">
            <SectionLabel>Identity</SectionLabel>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 -mt-2">
              The system uses these identifiers to match messages to this person.
            </p>
            <Field label="Full Name" value={name} onChange={setName} placeholder="Enter full name" />
            <TagField
              label="Aliases"
              tags={aliases}
              onChange={setAliases}
              placeholder="Type an alias and press Enter"
            />
            <Field label="Email" value={email} onChange={setEmail} placeholder="email@example.com" type="email" />
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="+971500000000" type="tel" />
          </section>

          {/* Role */}
          <section className="space-y-4">
            <SectionLabel>Role</SectionLabel>
            <Field label="Role Name" value={roleName} onChange={setRoleName} placeholder="e.g. Electrician Foreman" />
            <TextareaField
              label="Description"
              value={roleDescription}
              onChange={setRoleDescription}
              placeholder="Describe this person's responsibilities and scope of work..."
              rows={3}
            />
          </section>

          {/* AI Processing */}
          <section className="space-y-4">
            <SectionLabel>AI Processing</SectionLabel>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 -mt-2">
              Configure how the AI pipeline extracts and prioritizes tasks for this person.
            </p>
            <TextareaField
              label="Priorities"
              value={priorities}
              onChange={setPriorities}
              placeholder="Define what counts as high priority for this person, e.g.&#10;&#10;High: Safety compliance, permit deadlines&#10;Medium: Equipment procurement, scheduling&#10;Low: Documentation, archival"
              rows={5}
            />
            <TextareaField
              label="Custom Prompt"
              value={customPrompt}
              onChange={setCustomPrompt}
              placeholder="Additional instructions for the AI when processing this person's messages, e.g.&#10;&#10;This person manages MEP subcontractors. Flag any mentions of electrical safety or code compliance as high priority."
              rows={5}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {children}
    </h3>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
      />
    </div>
  )
}

function TagField({
  label,
  tags,
  onChange,
  placeholder,
}: {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const value = input.trim()
    if (value && !tags.includes(value)) {
      onChange([...tags, value])
    }
    setInput('')
  }

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
    if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
        {label}
      </label>
      <div className="w-full px-2 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-400 transition-colors">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="size-3" strokeWidth={2} />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] px-1.5 py-1 text-sm bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
          />
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">Press Enter to add</p>
    </div>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors resize-none"
      />
    </div>
  )
}
