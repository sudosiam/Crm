import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SelectField } from '../components/ui/SelectField'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { containsSecretKey, parseBackup } from '../lib/importExport'
import { humanizeError } from '../lib/errors'
import { maybeNotify, notificationSupport, requestNotificationPermission } from '../lib/notifications'
import { downloadText } from '../lib/url'
import { todayISO } from '../lib/dates'
import type { BusinessInput, ProductKind } from '../lib/types'

export function SettingsPage() {
  const { repo, workspace, actor, mode, user } = useApp()
  const { preference, setPreference } = useTheme()
  const toast = useToast()
  const navigate = useNavigate()
  const owner = actor?.role === 'OWNER'
  const [review, setReview] = useState(workspace?.organization.googleReviewUrl ?? '')
  const [name, setName] = useState(actor?.fullName ?? '')
  const [business, setBusiness] = useState<BusinessInput | null>(workspace ? {
    name: workspace.organization.name,
    tagline: workspace.organization.tagline,
    phone: workspace.organization.phone,
    email: workspace.organization.email,
    website: workspace.organization.website,
    adLandingUrl: workspace.organization.adLandingUrl,
    address: workspace.organization.address,
    businessHours: workspace.organization.businessHours,
  } : null)
  const [productName, setProductName] = useState('')
  const [productKind, setProductKind] = useState<ProductKind>('model')
  const [importFile, setImportFile] = useState<unknown>(null)
  const [importSummary, setImportSummary] = useState('')
  const [confirmImport, setConfirmImport] = useState(false)
  const me = workspace?.members.find((member) => member.userId === actor?.userId)

  if (!workspace || !actor || !business) return null

  async function save(action: () => Promise<unknown>, message: string) {
    try {
      await action()
      toast.push(repo.isOffline() ? 'Saved on this phone. It will sync when you are back online.' : message)
    } catch (caught) {
      toast.push(humanizeError(caught))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Settings</h1>
      <section className="card p-3">
        <h2 className="font-semibold">Your name</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} />
          <button type="button" className="btn btn-secondary sm:shrink-0" onClick={() => void save(() => repo.updateMyProfile(name, me?.phone ?? ''), 'Name saved')}>Save</button>
        </div>
        <p className="mt-2 text-sm text-muted">{user?.email}</p>
      </section>
      <section className="card p-3">
        <SelectField
            label="Theme"
            value={preference}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={(next) => setPreference(next as 'system' | 'light' | 'dark')}
        />
      </section>
      <section className="card p-3">
        <h2 className="font-semibold">Reminders</h2>
        <p className="mt-2 text-sm text-muted">
          BPH can remind you when you open the app. Android and browsers do not guarantee an alert at the exact follow-up time while the app is closed. Overdue and today’s follow-ups always stay on the home screen.
        </p>
        <p className="mt-2 text-sm">Notifications: {notificationSupport()}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              void requestNotificationPermission().then((result) => toast.push(result === 'granted' ? 'Reminders allowed' : 'Reminders were not allowed. The home screen still shows them.'))
            }}
          >
            Allow reminders
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void save(() => repo.setMyNotifications(!(me?.notifyFollowups ?? true)), 'Reminder preference saved')}
          >
            {me?.notifyFollowups === false ? 'Turn reminders on' : 'Turn reminders off'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void maybeNotify(1, 1, true).then(() => toast.push('If reminders are allowed, a test alert was sent.'))}>
            Test reminder
          </button>
        </div>
      </section>
      {owner && business ? (
        <section className="card space-y-2 p-3">
          <h2 className="font-semibold">Business</h2>
          {([
            ['name', 'Name'],
            ['tagline', 'Tagline'],
            ['phone', 'Phone'],
            ['email', 'Email'],
            ['website', 'Website'],
            ['adLandingUrl', 'Ad landing page'],
            ['address', 'Showroom'],
            ['businessHours', 'Hours'],
          ] as const).map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-sm font-semibold">{label}</span>
              <input className="field" value={business[key]} onChange={(event) => setBusiness({ ...business, [key]: event.target.value })} />
            </label>
          ))}
          <button type="button" className="btn btn-primary" onClick={() => void save(() => repo.updateBusiness(business), 'Business details saved')}>Save business</button>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Google review link</span>
            <input className="field" value={review} onChange={(event) => setReview(event.target.value)} placeholder="https://" />
          </label>
          <button type="button" className="btn btn-secondary" onClick={() => void save(() => repo.setGoogleReviewUrl(review), 'Review link saved')}>Save review link</button>
        </section>
      ) : (
        <section className="card p-3 text-sm text-muted">
          <p className="font-semibold text-ink">{workspace.organization.name}</p>
          <p className="mt-1">{workspace.organization.address}</p>
          <p>{workspace.organization.businessHours}</p>
        </section>
      )}
      {owner ? (
        <section className="card p-3">
          <h2 className="font-semibold">Products</h2>
          <p className="mt-1 text-sm text-muted">Names only. BPH does not store price, range, or warranty here.</p>
          {(['model', 'battery'] as const).map((kind) => (
            <div key={kind} className="mt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{kind === 'model' ? 'Models' : 'Batteries'}</h3>
              <ul className="mt-2 space-y-2">
                {workspace.products.filter((product) => product.kind === kind).sort((a, b) => a.sortOrder - b.sortOrder).map((product) => (
                  <li key={product.id} className="rounded-xl border border-line p-2.5">
                    <span className={product.active ? 'font-medium' : 'text-muted line-through'}>{product.name}</span>
                    <span className="mt-2 flex flex-wrap gap-1">
                      <button type="button" className="chip" onClick={() => void save(() => repo.moveProduct(product.id, -1), 'Order saved')}>Up</button>
                      <button type="button" className="chip" onClick={() => void save(() => repo.moveProduct(product.id, 1), 'Order saved')}>Down</button>
                      <button type="button" className="chip" onClick={() => void save(() => repo.saveProduct({ id: product.id, kind, name: product.name, active: !product.active }), product.active ? 'Hidden from the form' : 'Shown on the form')}>
                        {product.active ? 'Hide' : 'Show'}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="mt-4 grid grid-cols-[7.5rem_1fr] gap-2">
            <select className="field" value={productKind} onChange={(event) => setProductKind(event.target.value as ProductKind)}>
              <option value="model">Model</option>
              <option value="battery">Battery</option>
            </select>
            <input className="field" value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="New name" />
          </div>
          <button
            type="button"
            className="btn btn-secondary mt-2"
            onClick={() => void save(async () => {
              await repo.saveProduct({ kind: productKind, name: productName })
              setProductName('')
            }, 'Product added')}
          >
            Add product
          </button>
        </section>
      ) : null}
      {owner ? (
        <section className="card p-3">
          <h2 className="font-semibold">Team</h2>
          <p className="mt-2 text-sm">Team code: <span className="font-semibold tracking-wider">{workspace.organization.joinCode}</span></p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => void navigator.clipboard.writeText(workspace.organization.joinCode).then(() => toast.push('Team code copied'))}>Copy code</button>
            <button type="button" className="btn btn-ghost" onClick={() => void save(() => repo.rotateJoinCode(), 'New team code saved')}>New code</button>
          </div>
          <ul className="mt-4 space-y-3">
            {workspace.members.map((member) => (
              <li key={member.id} className="rounded-2xl border border-line p-3">
                <p className="font-semibold">{member.fullName}</p>
                <p className="text-sm text-muted">{member.email} · {member.role === 'OWNER' ? 'Owner' : 'Staff'}</p>
                {member.role === 'STAFF' ? (
                  <div className="mt-2">
                    <SelectField
                      label="Can see"
                      value={member.canViewAll ? 'all' : 'assigned'}
                      options={[
                        { value: 'assigned', label: 'Assigned leads' },
                        { value: 'all', label: 'All leads' },
                      ]}
                      onChange={(next) => void save(() => repo.updateMember(member.id, { canViewAll: next === 'all' }), 'Access updated')}
                    />
                  </div>
                ) : null}
                {member.userId !== actor.userId ? (
                  <button type="button" className="btn btn-danger mt-2" onClick={() => void save(() => repo.removeMember(member.id), 'Teammate removed')}>Remove</button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {owner ? (
        <section className="card p-3">
          <h2 className="font-semibold">Backup</h2>
          <p className="mt-1 text-sm text-muted">Exports contain customer phone numbers. Keep the file private. Passwords are not included.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => void repo.exportCsv().then((csv) => downloadText(`bph-customers-${todayISO()}.csv`, csv, 'text/csv')).catch((caught: unknown) => toast.push(humanizeError(caught)))}>
              Export CSV
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => void repo.exportBackup().then((backup) => downloadText(`bph-backup-${todayISO()}.json`, JSON.stringify(backup, null, 2), 'application/json')).catch((caught: unknown) => toast.push(humanizeError(caught)))}>
              Export JSON
            </button>
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-semibold">Import JSON backup</span>
            <input
              className="field"
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                void file.text().then((text) => {
                  const raw = JSON.parse(text) as unknown
                  if (containsSecretKey(raw)) {
                    toast.push('This file looks like it contains a secret. It was not imported.')
                    return
                  }
                  const parsed = parseBackup(raw)
                  setImportFile(raw)
                  setImportSummary(`${parsed.customers.length} customers found. ${parsed.issues.length} rows look invalid and will be skipped.`)
                }).catch(() => toast.push('That file could not be read.'))
              }}
            />
          </label>
          {importSummary ? <p className="mt-2 text-sm">{importSummary}</p> : null}
          <button type="button" className="btn btn-primary mt-3" disabled={!importFile} onClick={() => setConfirmImport(true)}>Review import</button>
        </section>
      ) : null}
      {mode === 'demo' ? (
        <section className="card p-3">
          <h2 className="font-semibold">Demo data</h2>
          <p className="mt-1 text-sm text-muted">This puts the sample showroom back and signs you out of the demo session.</p>
          <button type="button" className="btn btn-ghost mt-3" onClick={() => void repo.resetDemo().then(() => navigate('/login'))}>Reset demo data</button>
        </section>
      ) : null}
      <button type="button" className="btn btn-danger w-full" onClick={() => void repo.signOut().then(() => navigate('/login'))}>Log out</button>
      <ConfirmDialog
        open={confirmImport}
        title="Import this backup?"
        body={`${importSummary} Existing phone numbers are skipped. Nothing is deleted.`}
        confirmLabel="Import"
        onClose={() => setConfirmImport(false)}
        onConfirm={() => {
          setConfirmImport(false)
          void save(() => repo.importBackup(importFile), 'Import finished')
        }}
      />
    </div>
  )
}
