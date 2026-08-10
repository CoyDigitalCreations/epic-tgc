interface TextAreaFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  rows?: number
}

export function TextAreaField({ label, value, onChange, placeholder, error, rows = 5 }: TextAreaFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="bg-surface-2 border border-card-border rounded px-3 py-2 text-gray-100 
                   placeholder-gray-500 focus:outline-none focus:border-ether-400 transition-colors resize-y"
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}
