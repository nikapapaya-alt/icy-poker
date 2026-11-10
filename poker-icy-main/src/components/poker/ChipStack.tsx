import { formatChips } from '@/lib/format';

interface ChipStackProps {
  amount: number;
  label?: string;
}

const CHIP_COLORS = [
  'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-300',
  'bg-gradient-to-br from-sky-400 to-sky-600 border-sky-300',
  'bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-300',
  'bg-gradient-to-br from-gold-300 to-gold-500 border-gold-200',
  'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-400',
];

export function ChipStack({ amount, label }: ChipStackProps) {
  const layers = Math.min(5, Math.max(1, Math.ceil(amount / 500)));
  return (
    <div className="inline-flex items-center gap-1 animate-chip-in">
      <div className="relative h-4 w-5 sm:h-5 sm:w-6">
        {Array.from({ length: layers }).map((_, index) => (
          <span
            key={index}
            style={{ bottom: index * 2.5 }}
            className={`absolute left-0 h-3 w-5 rounded-full border shadow-sm sm:h-3.5 sm:w-6 ${CHIP_COLORS[index % CHIP_COLORS.length]}`}
          />
        ))}
      </div>
      <span className="rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white sm:px-2 sm:text-xs">
        {label ? `${label} ` : ''}
        {formatChips(amount)}
      </span>
    </div>
  );
}
