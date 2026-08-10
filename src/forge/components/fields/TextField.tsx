interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
}

export function TextField({ label, value, onChange, placeholder, error }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-surface-2 border border-card-border rounded px-3 py-2 text-gray-100 
                   placeholder-gray-500 focus:outline-none focus:border-ether-400 transition-colors"
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}
