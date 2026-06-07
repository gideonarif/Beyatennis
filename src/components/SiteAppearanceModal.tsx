import { useEffect, useRef, useState } from 'react'
import { removeSiteBackgroundImage, uploadSiteBackgroundImage } from '../services/mediaService'
import { isEmbeddedImageUrl } from '../services/cloudErrors'
import { useSiteAppearance } from '../context/SiteAppearanceContext'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  DEFAULT_SITE_APPEARANCE,
  type SiteAppearance,
  type SiteBackgroundMode,
} from '../types/siteAppearance'

interface SiteAppearanceModalProps {
  onClose: () => void
}

const PRESET_GRADIENTS = [
  { from: '#1e3a8a', to: '#312e81', label: 'Blue night' },
  { from: '#0f766e', to: '#115e59', label: 'Teal' },
  { from: '#7c2d12', to: '#431407', label: 'Sunset' },
  { from: '#4c1d95', to: '#831843', label: 'Purple rose' },
]

export function SiteAppearanceModal({ onClose }: SiteAppearanceModalProps) {
  const { appearance, updateAppearance, cloudWarning } = useSiteAppearance()
  const [draft, setDraft] = useState<SiteAppearance>(appearance)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(appearance)
  }, [appearance])

  const setMode = (mode: SiteBackgroundMode) => {
    setDraft((current) => ({ ...current, mode }))
  }

  const handleSave = async () => {
    if (
      isSupabaseConfigured &&
      draft.mode === 'image' &&
      isEmbeddedImageUrl(draft.imageUrl)
    ) {
      setError('Background image must be uploaded to cloud storage. Upload the image again.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await updateAppearance(draft)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save appearance')
    } finally {
      setSaving(false)
    }
  }

  const handleBackgroundFile = async (file: File) => {
    setSaving(true)
    setError(null)
    try {
      const url = await uploadSiteBackgroundImage(file)
      setDraft((current) => ({ ...current, mode: 'image', imageUrl: url }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setSaving(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemoveImage = async () => {
    setSaving(true)
    setError(null)
    try {
      await removeSiteBackgroundImage()
      setDraft((current) => ({
        ...current,
        mode: 'color',
        imageUrl: null,
        color: current.color || DEFAULT_SITE_APPEARANCE.color,
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">Site appearance</h2>
        <p className="mt-1 text-sm text-gray-500">
          Customize the background for the entire platform.
        </p>

        {cloudWarning && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {cloudWarning}
          </p>
        )}

        {isSupabaseConfigured && !cloudWarning && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
            Cloud sync is active — changes will appear on all devices.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          {(['color', 'gradient', 'image'] as SiteBackgroundMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMode(mode)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium capitalize ${
                draft.mode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {draft.mode === 'color' && (
          <div className="mt-4 space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Background color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-gray-200"
              />
              <input
                type="text"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {draft.mode === 'gradient' && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                  From
                </span>
                <input
                  type="color"
                  value={draft.gradientFrom}
                  onChange={(e) => setDraft({ ...draft, gradientFrom: e.target.value })}
                  className="h-10 w-full cursor-pointer rounded border border-gray-200"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                  To
                </span>
                <input
                  type="color"
                  value={draft.gradientTo}
                  onChange={(e) => setDraft({ ...draft, gradientTo: e.target.value })}
                  className="h-10 w-full cursor-pointer rounded border border-gray-200"
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">
                Angle ({draft.gradientAngle}°)
              </span>
              <input
                type="range"
                min={0}
                max={360}
                value={draft.gradientAngle}
                onChange={(e) =>
                  setDraft({ ...draft, gradientAngle: Number(e.target.value) })
                }
                className="w-full"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_GRADIENTS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      gradientFrom: preset.from,
                      gradientTo: preset.to,
                    })
                  }
                  className="rounded-full px-3 py-1 text-xs font-medium text-white"
                  style={{
                    background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {draft.mode === 'image' && (
          <div className="mt-4 space-y-3">
            {draft.imageUrl && (
              <img
                src={draft.imageUrl}
                alt=""
                className="h-32 w-full rounded-xl object-cover"
              />
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleBackgroundFile(file)
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => fileRef.current?.click()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Upload background
              </button>
              {draft.imageUrl && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleRemoveImage()}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>
        )}

        <div
          className="mt-4 h-20 rounded-xl border border-gray-200"
          style={{
            ...(draft.mode === 'image' && draft.imageUrl
              ? {
                  backgroundImage: `url("${draft.imageUrl}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : draft.mode === 'gradient'
                ? {
                    background: `linear-gradient(${draft.gradientAngle}deg, ${draft.gradientFrom}, ${draft.gradientTo})`,
                  }
                : { backgroundColor: draft.color }),
          }}
        />

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
