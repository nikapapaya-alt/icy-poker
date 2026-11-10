import { QrCode } from 'lucide-react';
import { DEFAULT_QR_IMAGE } from '@/lib/qr';
import type { QRCodeRow } from '@/lib/models';

interface PaymentQrCardProps {
  qr: QRCodeRow;
}

export function PaymentQrCard({ qr }: PaymentQrCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-300">
        <QrCode className="h-4 w-4" /> {qr.label}
      </div>
      <div className="mt-3 flex flex-col items-center gap-3">
        <div className="rounded-2xl bg-white p-2 shadow-lg shadow-black/40">
          <img
            src={qr.image_data ?? DEFAULT_QR_IMAGE}
            alt={`${qr.label} QR code`}
            className="h-44 w-44 rounded-xl object-contain"
          />
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-400">{qr.account_name}</p>
          <p className="text-sm font-semibold text-white">{qr.account_number}</p>
        </div>
      </div>
    </div>
  );
}
