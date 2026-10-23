import { CLASE_CAMPO } from '../../../shared/ui/Campo'

interface SelectFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  error?: string
}

export function SelectField({ label, value, onChange, options, error }: SelectFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${CLASE_CAMPO} cursor-pointer`}
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
