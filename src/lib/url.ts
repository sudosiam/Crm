export function appRootUrl(): string {
  const current = new URL(window.location.href)
  current.hash = ''
  current.search = ''
  if (!current.pathname.endsWith('/')) {
    const last = current.pathname.split('/').pop() ?? ''
    current.pathname = last.includes('.')
      ? current.pathname.replace(/[^/]+$/, '')
      : `${current.pathname}/`
  }
  return current.href
}

export function downloadText(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
