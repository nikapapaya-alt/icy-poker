export interface DealerPersona {
  name: string;
  avatarUrl: string;
  tagline: string;
}

const DEALER_PERSONAS: DealerPersona[] = [
  {
    name: 'Rico',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    tagline: 'Keeps the game fast and the pot honest.',
  },
  {
    name: 'Bianca',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face',
    tagline: 'Eagle-eyed — no chip slide gets past her.',
  },
  {
    name: 'Marco',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
    tagline: 'Steady hands, calm voice, reads the table.',
  },
  {
    name: 'Lara',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a32d69d4c4?w=200&h=200&fit=crop&crop=face',
    tagline: 'Sharp dresser, sharper eyes.',
  },
  {
    name: 'Tomas',
    avatarUrl: 'https://images.unsplash.com/photo-1546961329-78bef0414d7c?w=200&h=200&fit=crop&crop=face',
    tagline: 'Tournament veteran who never misses a bet.',
  },
  {
    name: 'Nina',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
    tagline: 'Cool under pressure, fair to every player.',
  },
];

export function dealerFor(tableId: string): DealerPersona {
  let hash = 0;
  for (const char of tableId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return DEALER_PERSONAS[hash % DEALER_PERSONAS.length];
}

export function dealerNameFor(tableId: string): string {
  return dealerFor(tableId).name;
}
