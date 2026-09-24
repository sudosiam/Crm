import { useEffect, useState } from 'react'
import { messageTemplates } from '../../lib/business'
import { whatsAppUrl } from '../../lib/phone'
import { Sheet } from '../ui/Sheet'

export function WhatsAppSheet({
  open,
  phone,
  businessName,
  initialTemplate = 'follow-up',
  reviewUrl,
  onClose,
}: {
  open: boolean
  phone: string
  businessName: string
  initialTemplate?: string
  reviewUrl?: string
  onClose: () => void
}) {
  const templates = messageTemplates(businessName)
  const [templateId, setTemplateId] = useState(initialTemplate)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!open) return
    const nextTemplates = messageTemplates(businessName)
    const template = nextTemplates.find((item) => item.id === initialTemplate) ?? nextTemplates[0]
    const extra = template.id === 'review' && reviewUrl ? `\n${reviewUrl}` : ''
    setTemplateId(template.id)
    setMessage(`${template.body}${extra}`)
  }, [open, initialTemplate, businessName, reviewUrl])

  const href = whatsAppUrl(phone, message)
  return (
    <Sheet open={open} title="WhatsApp" onClose={onClose}>
      <p className="mb-3 text-sm text-muted">Edit the message, then open WhatsApp. Nothing is sent until you tap send there.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="chip"
            aria-pressed={templateId === template.id}
            onClick={() => {
              setTemplateId(template.id)
              const extra = template.id === 'review' && reviewUrl ? `\n${reviewUrl}` : ''
              setMessage(`${template.body}${extra}`)
            }}
          >
            {template.label}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Message</span>
        <textarea className="field min-h-36" value={message} onChange={(event) => setMessage(event.target.value)} />
      </label>
      {href ? (
        <a className="btn btn-primary mt-4 w-full" href={href} target="_blank" rel="noopener noreferrer" onClick={onClose}>
          Open WhatsApp
        </a>
      ) : (
        <p className="mt-4 text-danger">This phone number cannot be opened in WhatsApp.</p>
      )}
    </Sheet>
  )
}
