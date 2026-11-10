import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader as Loader2, X } from 'lucide-react';
import { decodeQrFromFile, decodeQrFromImageData } from '@/lib/qr';

const SCAN_MAX_WIDTH = 480;

interface QrScannerProps {
  onDetected: (value: string) => void;
  onCancel: () => void;
}

export function QrScanner({ onDetected, onCancel }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This device has no camera access here. Upload a picture of the QR code instead.');
      return;
    }

    let active = true;
    let frame = 0;
    let stream: MediaStream | null = null;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      const video = videoRef.current;
      if (!active || !video || !context) return;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        const scale = Math.min(1, SCAN_MAX_WIDTH / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const value = decodeQrFromImageData(context.getImageData(0, 0, canvas.width, canvas.height));
        if (value) {
          active = false;
          onDetectedRef.current(value);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(async (mediaStream) => {
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = mediaStream;
        await video.play();
        frame = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (active) setError('Camera access was blocked. Allow camera access, or upload a picture of the QR code instead.');
      });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function handleFile(file: File) {
    setReading(true);
    setError(null);
    try {
      const value = await decodeQrFromFile(file);
      if (value) onDetected(value);
      else setError('No QR code was found in that picture. Try a clearer image.');
    } catch {
      setError('That file could not be read. Upload a PNG or JPEG picture.');
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-gold-400/30 bg-slate-950 p-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gold-300">
        <span className="inline-flex items-center gap-2">
          <Camera className="h-4 w-4" /> Point the camera at a QR code
        </span>
        <button type="button" onClick={onCancel} aria-label="Close scanner" className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-gold-400/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
          <span className="absolute left-0 right-0 top-0 h-0.5 animate-scan-line bg-gold-300/80" />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={reading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-sm text-slate-300 transition hover:border-gold-400/50 hover:text-gold-300 disabled:opacity-50"
      >
        {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        Upload a QR picture instead
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}
