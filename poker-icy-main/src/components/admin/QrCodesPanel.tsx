import { useEffect, useState } from 'react';
import { ImagePlus, Loader as Loader2, RotateCcw } from 'lucide-react';
import { adminSetQrImage, fetchQRCodes } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import { DEFAULT_QR_IMAGE, fileToQrDataUrl } from '@/lib/qr';
import type { QRCodeRow } from '@/lib/models';

export function QrCodesPanel({ adminKey }: { adminKey: string }) {
  const [codes, setCodes] = useState<QRCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    try {
      setCodes(await fetchQRCodes());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function replaceImage(qr: QRCodeRow, image: string | null) {
    setBusyId(qr.id);
    setError(null);
    setNotice(null);
    try {
      await adminSetQrImage(adminKey, qr.id, image);
      await load();
      setNotice(image ? `${qr.label} QR image updated. Players see it on their next cash-in.` : `${qr.label} now uses the default image.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleFile(qr: QRCodeRow, file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (PNG, JPEG or WebP).');
      return;
    }
    try {
      const dataUrl = await fileToQrDataUrl(file);
      await replaceImage(qr, dataUrl);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-400">Loading QR codes...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Payment QR codes</h2>
        <p className="mt-1 text-sm text-slate-400">
          Upload the QR code players scan when they cash in. Each payment method has its own image.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      {notice && <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{notice}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {codes.map((qr) => {
          const busy = busyId === qr.id;
          const hasCustomImage = !!qr.image_data;
          return (
            <section key={qr.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">{qr.label}</h3>
                  <p className="text-xs text-slate-400">
                    {qr.account_name} · {qr.account_number}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                  {hasCustomImage ? 'Custom' : 'Default'}
                </span>
              </div>

              <div className="mx-auto rounded-2xl bg-white p-2">
                <img
                  src={qr.image_data ?? DEFAULT_QR_IMAGE}
                  alt={`${qr.label} QR code`}
                  className="h-40 w-40 rounded-xl object-contain"
                />
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2">
                <label
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-3 py-2.5 text-sm font-bold text-slate-900 transition hover:brightness-110 ${busy ? 'pointer-events-none opacity-50' : ''}`}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {hasCustomImage ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void handleFile(qr, file);
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || !hasCustomImage}
                  onClick={() => void replaceImage(qr, null)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/30 disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
