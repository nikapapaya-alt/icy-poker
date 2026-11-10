import { useState } from 'react';
import { Camera, Check, Loader as Loader2, Save, CircleUser as UserCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile, uploadAvatar } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import { AVATAR_EMOJIS } from '@/lib/models';
import type { PlayerRow } from '@/lib/models';

interface SettingsPageProps {
  player: PlayerRow;
}

export function SettingsPage({ player }: SettingsPageProps) {
  const { refreshPlayer } = useAuth();
  const [name, setName] = useState(player.display_name);
  const [emoji, setEmoji] = useState(player.avatar_emoji);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const trimmedName = name.trim();
  const nameChanged = trimmedName !== player.display_name;
  const emojiChanged = emoji !== player.avatar_emoji;
  const canSave = trimmedName.length >= 2 && trimmedName.length <= 24 && (nameChanged || emojiChanged);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadAvatar(player.id, file);
      await updateProfile({ playerId: player.id, avatarUrl: url });
      await refreshPlayer();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      if (nameChanged) await updateProfile({ playerId: player.id, displayName: trimmedName });
      if (emojiChanged) await updateProfile({ playerId: player.id, avatarEmoji: emoji });
      await refreshPlayer();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const avatarDisplay = player.avatar_url ? (
    <img src={player.avatar_url} alt="Profile" className="h-full w-full rounded-full object-cover" />
  ) : (
    <span className="text-4xl">{player.avatar_emoji}</span>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
          <UserCircle className="h-5 w-5 text-gold-300" /> Profile Settings
        </h1>
        <p className="mt-1 text-sm text-slate-400">Update your display name, profile photo, and avatar emoji.</p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      {/* Profile photo section */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Profile Photo</h2>
        <div className="mt-4 flex items-center gap-6">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-gold-400/30 bg-slate-950">
            {avatarDisplay}
            <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 opacity-0 transition hover:opacity-100">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-6 w-6 text-white" />}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
            </label>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{player.display_name}</p>
            <p className="text-xs text-slate-500">Click the photo to upload a new image.</p>
            <p className="text-xs text-slate-500">PNG, JPEG, or WebP. Your photo is visible to all players at the table.</p>
          </div>
        </div>
      </section>

      {/* Avatar emoji selection */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Avatar Emoji</h2>
        <p className="mt-1 text-xs text-slate-500">Used when no profile photo is uploaded.</p>
        <div className="mt-4 grid grid-cols-8 gap-2">
          {AVATAR_EMOJIS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEmoji(option)}
              className={`flex h-12 items-center justify-center rounded-xl border text-2xl transition ${
                emoji === option
                  ? 'border-gold-400 bg-gold-400/10'
                  : 'border-white/10 hover:border-white/25'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      {/* Display name section */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Display Name</h2>
        <input
          type="text"
          maxLength={24}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-gold-400/60"
        />
        <p className="mt-1 text-xs text-slate-500">2 to 24 characters. Other players see this at the table.</p>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:brightness-110 disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
