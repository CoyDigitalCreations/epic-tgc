import { CLASE_CAMPO } from '../../../shared/ui/Campo'

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
}

export function TextField({ label, value, onChange, placeholder, error }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={CLASE_CAMPO}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}
