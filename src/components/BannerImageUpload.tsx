import { useRef, useState } from 'react'

interface BannerImageUploadProps {
  imageUrl: string | null
  onImageUrlChange: (url: string | null) => void
  onFileSelected?: (file: File) => void
  onRemove?: () => void
  disabled?: boolean
}

const MAX_SIZE_MB = 5

export function BannerImageUpload({
  imageUrl,
  onImageUrlChange,
  onFileSelected,
  onRemove,
  disabled = false,
}: BannerImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const displayUrl = previewUrl ?? imageUrl

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB}MB`)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
      onFileSelected?.(file)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load image')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    onImageUrlChange(null)
    onRemove?.()
    setError(null)
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {displayUrl ? (
          <img src={displayUrl} alt="" className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-4xl">
            🏓
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? 'Loading…' : displayUrl ? 'Change banner' : 'Upload banner'}
        </button>
        {displayUrl && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={handleRemove}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-gray-400">JPG, PNG, WebP or GIF · max {MAX_SIZE_MB}MB</p>
    </div>
  )
}
