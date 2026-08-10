import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'
import { fileToDataUrl, isValidImageFile } from '../utils/file-to-data-url'

interface ImageUploadProps {
  value: string | undefined
  onChange: (dataUrl: string | undefined) => void
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    if (!isValidImageFile(file)) {
      setError('Formato no soportado. Usá PNG, JPG, WebP o AVIF.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen es muy grande. Máximo 5 MB.')
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      onChange(dataUrl)
    } catch {
      setError('Error al leer el archivo')
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleRemove = () => {
    onChange(undefined)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-300">Arte de la carta</span>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg overflow-hidden cursor-pointer
          transition-all duration-200 min-h-[120px]
          flex items-center justify-center
          ${dragOver
            ? 'border-ether-400 bg-ether-400/10'
            : 'border-card-border hover:border-ether-400/50 bg-surface-2'
          }
          ${value ? 'p-0' : 'p-4'}
        `}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Card art"
              className="w-full h-full object-cover max-h-[200px]"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full 
                         w-7 h-7 flex items-center justify-center text-sm transition-colors"
            >
              ✕
            </button>
          </>
        ) : (
          <div className="text-center text-gray-500">
            <svg
              className="mx-auto mb-2 w-8 h-8 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Soltó una imagen acá</p>
            <p className="text-xs text-gray-600 mt-1">o hacé clic para buscar</p>
            <p className="text-xs text-gray-700 mt-1">PNG, JPG, WebP — máx 5 MB</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
