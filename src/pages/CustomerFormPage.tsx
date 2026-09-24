import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CustomerForm, customerToForm, emptyCustomerForm, type CustomerFormValue } from '../components/customers/CustomerForm'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { humanizeError } from '../lib/errors'
import type { CustomerInput } from '../lib/types'

function sourceOf(value: CustomerFormValue) {
  if (value.source === 'Other') return value.sourceOther.trim() || 'Other'
  return value.source || null
}

function inputOf(value: CustomerFormValue, status: CustomerInput['status']): CustomerInput {
  return {
    name: value.name,
    phone: value.phone,
    status,
    enquiryDate: value.enquiryDate,
    model: value.model || null,
    batteryConfiguration: value.battery || null,
    budget: value.budget || null,
    source: sourceOf(value),
    notes: value.notes || null,
    followUpDate: value.followUpDate || null,
    followUpTime: value.followUpDate ? value.followUpTime : null,
    assignedTo: value.assignedTo || null,
  }
}

export function CustomerFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const { repo, workspace, actor, pending } = useApp()
  const toast = useToast()
  const navigate = useNavigate()
  const [value, setValue] = useState<CustomerFormValue | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [duplicate, setDuplicate] = useState<'visible' | 'hidden' | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)

  useEffect(() => {
    if (!actor) return
    if (!id) {
      setValue(emptyCustomerForm(actor.userId))
      return
    }
    let gone = false
    void repo.getCustomer(id).then((bundle) => {
      if (!gone) setValue(customerToForm(bundle.customer))
    }).catch((caught: unknown) => {
      if (!gone) setError(humanizeError(caught))
    })
    return () => {
      gone = true
    }
  }, [actor, id, repo])

  async function persist(allowDuplicate = false) {
    if (!value) return
    setBusy(true)
    setError('')
    const before = pending
    try {
      let customerId = id
      if (value.status === 'SOLD' || value.status === 'LOST') {
        const created = id
          ? await repo.updateCustomer(id, inputOf(value, 'NEW'), { allowDuplicate })
          : await repo.createCustomer(inputOf(value, 'NEW'), { allowDuplicate })
        customerId = created.id
        if (value.status === 'SOLD') {
          const amount = value.saleAmount.trim() ? Number(value.saleAmount) : null
          await repo.recordSale(created.id, {
            model: value.model || null,
            batteryConfiguration: value.battery || null,
            saleAmount: amount,
            deliveryDate: value.deliveryDate || null,
            notes: value.notes || null,
          })
        } else {
          const reason = value.lostReason === 'Other' ? (value.lostNote.trim() || 'Other') : value.lostReason
          await repo.markLost(created.id, reason, value.lostNote || null)
        }
      } else if (value.status === 'TEST_RIDE') {
        const created = id
          ? await repo.updateCustomer(id, inputOf(value, 'FOLLOW_UP'), { allowDuplicate })
          : await repo.createCustomer(inputOf({ ...value, followUpDate: '' }, 'NEW'), { allowDuplicate })
        customerId = created.id
        await repo.scheduleTestRide(created.id, {
          date: value.testRideDate,
          time: value.testRideTime,
          model: value.model || null,
          notes: value.notes || null,
          assignedTo: value.assignedTo || null,
        })
      } else {
        const created = id
          ? await repo.updateCustomer(id, inputOf(value, value.status), { allowDuplicate })
          : await repo.createCustomer(inputOf(value, value.status), { allowDuplicate })
        customerId = created.id
        if (id && value.followUpDate) await repo.scheduleFollowUp(created.id, { date: value.followUpDate, time: value.followUpTime })
      }
      const syncedLater = repo.pendingCount() > before || repo.isOffline()
      toast.push(syncedLater ? 'Saved on this phone. It will sync when you are back online.' : editing ? 'Customer updated.' : 'Customer added successfully.')
      navigate(customerId ? `/customers/${customerId}` : '/customers')
    } catch (caught) {
      setError(humanizeError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (!value) return
    if (!id) {
      try {
        const match = await repo.findByPhone(value.phone)
        if (match.state === 'visible') {
          setExistingId(match.customer?.id ?? null)
          setDuplicate('visible')
          return
        }
        if (match.state === 'hidden') {
          setDuplicate('hidden')
          return
        }
      } catch (caught) {
        setError(humanizeError(caught))
        return
      }
    }
    await persist(false)
  }

  if (!workspace || !actor) return <LoadingState />
  return (
    <div>
      <Link to={id ? `/customers/${id}` : '/customers'} className="text-sm font-semibold text-brand">Back</Link>
      <h1 className="page-title mt-2">{editing ? 'Edit customer' : 'Add customer'}</h1>
      <p className="mt-1 text-muted">Name, phone, model, and a follow-up are enough.</p>
      {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
      {value ? (
        <div className="mt-5">
          <CustomerForm
            value={value}
            products={workspace.products}
            members={workspace.members}
            submitting={busy}
            submitLabel={editing ? 'Save changes' : 'Save customer'}
            onChange={setValue}
            onSubmit={() => void submit()}
          />
        </div>
      ) : error ? null : <LoadingState label="Loading customer…" />}
      <ConfirmDialog
        open={duplicate === 'visible'}
        title="Customer already exists."
        body="This phone number is already in BPH."
        confirmLabel="Add anyway"
        cancelLabel="Open existing"
        onConfirm={() => {
          setDuplicate(null)
          void persist(true)
        }}
        onClose={() => {
          setDuplicate(null)
          if (existingId) navigate(`/customers/${existingId}`)
        }}
      />
      <ConfirmDialog
        open={duplicate === 'hidden'}
        title="Customer already exists."
        body="This number is already in BPH and assigned to someone else."
        confirmLabel="Add anyway"
        onConfirm={() => {
          setDuplicate(null)
          void persist(true)
        }}
        onClose={() => setDuplicate(null)}
      />
    </div>
  )
}
