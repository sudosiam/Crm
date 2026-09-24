import { Search } from 'lucide-react'

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search name, phone, model, notes',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="relative block">
      <span className="sr-only">Search customers</span>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        className="field pl-11"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        enterKeyHint="search"
      />
    </label>
  )
}
