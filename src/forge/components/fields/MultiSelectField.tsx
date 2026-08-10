import { useState } from 'react'

interface MultiSelectFieldProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  options: string[]
  /** Máximo de selecciones permitidas (ej: facciones máx 3) */
  max?: number
}

export function MultiSelectField({ label, value, onChange, options, max }: MultiSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const atLimit = max !== undefined && value.length >= max

  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt))
    } else if (!atLimit) {
      onChange([...value, opt])
    }
  }

  return (
    <div className="flex flex-col gap-1 relative">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-surface-2 border border-card-border rounded px-3 py-2 text-left text-gray-100 
                   focus:outline-none focus:border-ether-400 transition-colors cursor-pointer"
      >
        {value.length ? value.join(', ') : 'Seleccionar...'}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-card-border rounded z-10 shadow-lg">
          {options.map((opt) => {
            const disabled = !value.includes(opt) && atLimit
            return (
              <label
                key={opt}
                className={`flex items-center gap-2 px-3 py-2 text-sm ${
                  disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-card-border cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  checked={value.includes(opt)}
                  onChange={() => toggle(opt)}
                  disabled={disabled}
                  className="accent-ether-400"
                />
                {opt}
              </label>
            )
          })}
        </div>
      )}
      {max !== undefined && value.length > 0 && (
        <span className="text-xs text-gray-500">
          {value.length}/{max} seleccionadas
        </span>
      )}
      {isOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />
      )}
    </div>
  )
}
