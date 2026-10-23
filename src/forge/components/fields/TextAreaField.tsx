import { CLASE_CAMPO } from '../../../shared/ui/Campo'

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
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${CLASE_CAMPO} resize-y`}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}
