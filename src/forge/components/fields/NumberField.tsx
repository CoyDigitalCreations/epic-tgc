interface NumberFieldProps {
  label: string
  value: number | undefined
  onChange: (value: number) => void
  min?: number
  max?: number
  error?: string
}

export function NumberField({ label, value, onChange, min, max, error }: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="bg-surface-2 border border-card-border rounded px-3 py-2 text-gray-100 
                   focus:outline-none focus:border-ether-400 transition-colors"
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}
