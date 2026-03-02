import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api/client'
import { SettingsView } from '../components/settings'
import type {
  ApiKey,
  ApiKeyFormData,
  PersonOption,
  SectionOption,
  SmtpSettings,
  SystemUser,
  UserFormData,
  WhatsappWebStatus,
} from '../components/settings'

interface SettingsDataBase {
  apiKeys: ApiKey[]
  smtpSettings: SmtpSettings
  users: SystemUser[]
  availableSections: SectionOption[]
  availablePeople: PersonOption[]
}

interface SettingsData extends SettingsDataBase {
  whatsappWebStatus: WhatsappWebStatus
}

type Notice = { type: 'info' | 'success' | 'error'; message: string }

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const refresh = useCallback(() => {
    setError(null)
    return Promise.all([
      apiFetch<SettingsDataBase>('/api/settings'),
      apiFetch<WhatsappWebStatus>('/api/settings/whatsapp-web'),
    ])
      .then(([settings, whatsappWebStatus]) => setData({ ...settings, whatsappWebStatus }))
      .catch((err) => setError((err as Error).message))
  }, [])

  const refreshWhatsappStatus = useCallback(() => {
    return apiFetch<WhatsappWebStatus>('/api/settings/whatsapp-web')
      .then((status) => {
        setData((current) => (current ? { ...current, whatsappWebStatus: status } : current))
      })
      .catch((err) => {
        console.error('Failed to refresh WhatsApp status:', err)
      })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshWhatsappStatus()
    }, 3000)
    return () => window.clearInterval(timer)
  }, [refreshWhatsappStatus])

  const clearNoticeSoon = useCallback(() => {
    window.setTimeout(() => setNotice(null), 2500)
  }, [])

  const mutate = useCallback(
    async (fn: () => Promise<unknown>) => {
      try {
        setError(null)
        await fn()
        await refresh()
      } catch (err) {
        console.error('Settings mutation failed:', err)
        setError((err as Error).message)
      }
    },
    [refresh],
  )

  const smtpTestHandler = useMemo(
    () => async () => {
      try {
        setNotice({ type: 'info', message: 'Testing SMTP connection…' })
        await apiFetch('/api/settings/smtp/test', { method: 'POST' })
        setNotice({ type: 'success', message: 'SMTP test succeeded.' })
      } catch (err) {
        console.error('SMTP test failed:', err)
        setNotice({ type: 'error', message: 'SMTP test failed.' })
      } finally {
        clearNoticeSoon()
      }
    },
    [clearNoticeSoon],
  )

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-500">Failed to load settings</p>
          <p className="text-xs text-zinc-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      {notice && (
        <div className="pointer-events-none absolute top-4 right-6 z-50">
          <div
            className={[
              'pointer-events-auto rounded-lg border px-3 py-2 text-xs font-medium shadow-sm backdrop-blur',
              notice.type === 'success' &&
                'bg-emerald-50/90 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300',
              notice.type === 'error' &&
                'bg-red-50/90 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300',
              notice.type === 'info' &&
                'bg-zinc-50/90 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {notice.message}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-6 z-40">
          <div className="rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50/80 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300 shadow-sm">
            {error}
          </div>
        </div>
      )}

      <SettingsView
        apiKeys={data.apiKeys}
        smtpSettings={data.smtpSettings}
        users={data.users}
        availableSections={data.availableSections}
        availablePeople={data.availablePeople}
        whatsappWebStatus={data.whatsappWebStatus}
        onAddApiKey={(payload: ApiKeyFormData) =>
          mutate(() =>
            apiFetch('/api/settings/api-keys', {
              method: 'POST',
              body: JSON.stringify(payload),
            }),
          )
        }
        onDeleteApiKey={(keyId: string) =>
          mutate(() =>
            apiFetch(`/api/settings/api-keys/${keyId}`, {
              method: 'DELETE',
            }),
          )
        }
        onSaveSmtp={(payload: SmtpSettings) =>
          mutate(() =>
            apiFetch('/api/settings/smtp', {
              method: 'PUT',
              body: JSON.stringify(payload),
            }),
          )
        }
        onTestSmtp={smtpTestHandler}
        onCreateUser={(payload: UserFormData) =>
          mutate(() =>
            apiFetch('/api/settings/users', {
              method: 'POST',
              body: JSON.stringify(payload),
            }),
          )
        }
        onEditUser={(userId: string, payload: UserFormData) =>
          mutate(() =>
            apiFetch(`/api/settings/users/${userId}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            }),
          )
        }
        onDeactivateUser={(userId: string) =>
          mutate(() =>
            apiFetch(`/api/settings/users/${userId}/deactivate`, {
              method: 'POST',
            }),
          )
        }
        onReactivateUser={(userId: string) =>
          mutate(() =>
            apiFetch(`/api/settings/users/${userId}/reactivate`, {
              method: 'POST',
            }),
          )
        }
        onWhatsappWebLogout={() =>
          mutate(() =>
            apiFetch('/api/settings/whatsapp-web/logout', {
              method: 'POST',
            }),
          )
        }
        onWhatsappWebReconnect={() =>
          mutate(() =>
            apiFetch('/api/settings/whatsapp-web/reconnect', {
              method: 'POST',
            }),
          )
        }
      />
    </div>
  )
}

