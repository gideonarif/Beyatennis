import { useRef, useState } from 'react'
import { Avatar } from './Avatar'

interface ProfilePhotoUploadProps {
  playerId: string
  playerName: string
  isAdmin: boolean
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
}

const MAX_SIZE_MB = 3

export function ProfilePhotoUpload({
  playerId,
  playerName,
  isAdmin,
  onUpload,
  onRemove,
}: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      await onUpload(file)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!confirm(`Remove photo for ${playerName}?`)) return
    setUploading(true)
    setError(null)
    try {
      await onRemove()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed')
    } finally {
      setUploading(false)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Profile photo
      </p>
      <div className="flex items-center gap-3">
        <Avatar name={playerName} playerId={playerId} size="lg" />
        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={handleRemove}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Remove photo
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-gray-400">JPG, PNG, WebP or GIF · max {MAX_SIZE_MB}MB</p>
    </div>
  )
}
