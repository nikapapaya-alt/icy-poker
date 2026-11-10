import { isRedSuit, rankLabel, suitSymbol, type Card } from '@/poker/cards';

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'sm' | 'md';
  delayMs?: number;
}

export function PlayingCard({ card, faceDown = false, size = 'md', delayMs = 0 }: PlayingCardProps) {
  const dimensions =
    size === 'sm'
      ? 'h-[44px] w-[32px] text-[8px] sm:h-[60px] sm:w-[42px] sm:text-[10px]'
      : 'h-[68px] w-[48px] text-xs sm:h-[84px] sm:w-[60px] sm:text-sm';
  const style = { animationDelay: `${delayMs}ms` };

  if (!card || faceDown) {
    return (
      <div
        style={style}
        className={`${dimensions} animate-deal-in rounded-[5px] border border-gold-500/60 bg-gradient-to-br from-emerald-800 to-emerald-950 shadow-lg shadow-black/50`}
      >
        <div className="m-[2px] h-[calc(100%-4px)] rounded-[3px] border border-gold-400/25 bg-[repeating-linear-gradient(45deg,rgba(232,192,106,0.10)_0_3px,transparent_3px_6px)]" />
      </div>
    );
  }

  const color = isRedSuit(card.suit) ? 'text-rose-600' : 'text-slate-900';
  const label = rankLabel(card.rank);
  return (
    <div
      style={style}
      className={`${dimensions} ${color} animate-deal-in flex flex-col justify-between rounded-[5px] border border-slate-300/60 bg-gradient-to-br from-white to-slate-50 p-1 shadow-lg shadow-black/40 sm:p-1.5`}
    >
      <div className="flex flex-col items-start leading-none">
        <span className="font-black">{label}</span>
        <span className="text-[10px] sm:text-xs">{suitSymbol(card.suit)}</span>
      </div>
      <div className="self-center text-sm leading-none sm:text-xl">{suitSymbol(card.suit)}</div>
      <div className="flex rotate-180 flex-col items-start leading-none">
        <span className="font-black">{label}</span>
        <span className="text-[10px] sm:text-xs">{suitSymbol(card.suit)}</span>
      </div>
    </div>
  );
}
