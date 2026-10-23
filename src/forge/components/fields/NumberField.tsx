import { CLASE_CAMPO } from '../../../shared/ui/Campo'

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
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className={CLASE_CAMPO}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}
