import { useState } from 'react'

interface MultiSelectFieldProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  options: string[]
}

export function MultiSelectField({ label, value, onChange, options }: MultiSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt))
    } else {
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
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-2 hover:bg-card-border cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={value.includes(opt)}
                onChange={() => toggle(opt)}
                className="accent-ether-400"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
      {isOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />
      )}
    </div>
  )
}
