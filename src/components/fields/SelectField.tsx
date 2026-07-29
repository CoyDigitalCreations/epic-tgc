interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  error?: string
}

export function SelectField({ label, value, onChange, options, error }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface-2 border border-card-border rounded px-3 py-2 text-gray-100 
                   focus:outline-none focus:border-ether-400 transition-colors"
      >
        <option value="">Seleccionar...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}
