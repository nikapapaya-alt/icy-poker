import { supabase } from '@/lib/supabase';
import {
  DEFAULT_TABLE_SETTINGS,
  type AccountStatus,
  type GameLogRow,
  type PaymentMethod,
  type PlayerRow,
  type PokerTableRow,
  type QRCodeRow,
  type TableSettings,
  type TransactionRow,
  type TransactionType,
} from '@/lib/models';

function must<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function createPlayer(displayName: string): Promise<PlayerRow> {
  const { data: authData } = await supabase.auth.getUser();
  const authId = authData.user?.id ?? null;
  const row = must(
    await supabase.from('players').insert({ display_name: displayName, auth_id: authId }).select('*').single()
  );
  return row as PlayerRow;
}

export async function fetchPlayerByAuthId(authId: string): Promise<PlayerRow | null> {
  return must(
    await supabase.from('players').select('*').eq('auth_id', authId).maybeSingle()
  ) as PlayerRow | null;
}

export async function fetchPlayer(playerId: string): Promise<PlayerRow | null> {
  return must(await supabase.from('players').select('*').eq('id', playerId).maybeSingle()) as PlayerRow | null;
}

export async function fetchAllPlayers(): Promise<PlayerRow[]> {
  return must(
    await supabase.from('players').select('*').order('created_at', { ascending: false }).limit(500)
  ) as PlayerRow[];
}

export async function fetchPlayerTransactions(playerId: string): Promise<TransactionRow[]> {
  return must(
    await supabase
      .from('transactions')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(20)
  ) as TransactionRow[];
}

export async function fetchAllTransactions(): Promise<TransactionRow[]> {
  return must(
    await supabase
      .from('transactions')
      .select('*, players(display_name, balance)')
      .order('created_at', { ascending: false })
      .limit(200)
  ) as TransactionRow[];
}

export async function submitTransactionRequest(input: {
  playerId: string;
  type: TransactionType;
  amount: number;
  method: PaymentMethod;
  accountDetails: string;
  proofUrl?: string | null;
  qrCodeId?: string | null;
}): Promise<void> {
  must(
    await supabase.from('transactions').insert({
      player_id: input.playerId,
      type: input.type,
      amount: input.amount,
      method: input.method,
      account_details: input.accountDetails,
      proof_url: input.proofUrl ?? null,
      qr_code_id: input.qrCodeId ?? null,
    })
  );
}

export async function fetchGameLogs(): Promise<GameLogRow[]> {
  return must(
    await supabase.from('game_logs').select('*').order('id', { ascending: false }).limit(200)
  ) as GameLogRow[];
}

export async function fetchTableSettings(): Promise<TableSettings> {
  const rows = must(await supabase.from('settings').select('key, value')) as {
    key: string;
    value: unknown;
  }[];
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const aggression = map.get('bot_aggression');
  return {
    rakePercent: Number(map.get('rake_percent') ?? DEFAULT_TABLE_SETTINGS.rakePercent),
    botAggression:
      aggression === 'passive' || aggression === 'aggressive' || aggression === 'balanced'
        ? aggression
        : DEFAULT_TABLE_SETTINGS.botAggression,
    minBuyIn: Number(map.get('min_buy_in') ?? DEFAULT_TABLE_SETTINGS.minBuyIn),
    maxBuyIn: Number(map.get('max_buy_in') ?? DEFAULT_TABLE_SETTINGS.maxBuyIn),
  };
}

export async function fetchPokerTables(): Promise<PokerTableRow[]> {
  return must(
    await supabase
      .from('poker_tables')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
  ) as PokerTableRow[];
}

export async function fetchQRCodes(): Promise<QRCodeRow[]> {
  return must(
    await supabase
      .from('qr_codes')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
  ) as QRCodeRow[];
}

export async function verifyAdminKey(adminKey: string): Promise<boolean> {
  return must(await supabase.rpc('admin_verify', { p_admin_key: adminKey })) as boolean;
}

export async function resolveTransaction(
  adminKey: string,
  transactionId: string,
  decision: 'approve' | 'reject',
  note: string | null
): Promise<void> {
  must(
    await supabase.rpc('resolve_transaction', {
      p_admin_key: adminKey,
      p_id: transactionId,
      p_decision: decision,
      p_note: note,
    })
  );
}

export async function adminSetBalance(adminKey: string, playerId: string, balance: number): Promise<void> {
  must(
    await supabase.rpc('admin_set_balance', {
      p_admin_key: adminKey,
      p_player: playerId,
      p_balance: balance,
    })
  );
}

export async function adminSetPlayerStatus(
  adminKey: string,
  playerId: string,
  status: AccountStatus
): Promise<void> {
  must(
    await supabase.rpc('admin_set_player_status', {
      p_admin_key: adminKey,
      p_player: playerId,
      p_status: status,
    })
  );
}

export async function adminSetQrImage(adminKey: string, qrId: string, image: string | null): Promise<void> {
  must(await supabase.rpc('admin_set_qr_image', { p_admin_key: adminKey, p_id: qrId, p_image: image }));
}

export async function adminSetSetting(adminKey: string, key: string, value: string | number): Promise<void> {
  must(await supabase.rpc('admin_set_setting', { p_admin_key: adminKey, p_key: key, p_value: value }));
}

export async function updateProfile(input: {
  playerId: string;
  displayName?: string;
  avatarUrl?: string | null;
  avatarEmoji?: string;
}): Promise<void> {
  must(
    await supabase.rpc('update_profile', {
      p_player: input.playerId,
      p_display_name: input.displayName ?? null,
      p_avatar_url: input.avatarUrl ?? null,
      p_avatar_emoji: input.avatarEmoji ?? null,
    })
  );
}

export async function uploadAvatar(playerId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${playerId}/avatar-${Date.now()}.${ext}`;
  must(await supabase.storage.from('avatars').upload(path, file, { upsert: true }));
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export async function uploadPaymentProof(playerId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${playerId}/proof-${Date.now()}.${ext}`;
  must(await supabase.storage.from('payment-proofs').upload(path, file, { upsert: false }));
  const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 3600 * 24 * 7);
  return data?.signedUrl ?? path;
}

export async function createSignedProofUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function pokerBuyIn(playerId: string, amount: number, tableId?: string): Promise<string> {
  return must(
    await supabase.rpc('poker_buy_in', { p_player: playerId, p_amount: amount, p_table_id: tableId ?? null })
  ) as string;
}

export async function pokerCashOut(sessionId: string, amount: number): Promise<number> {
  return must(
    await supabase.rpc('poker_cash_out', { p_session: sessionId, p_amount: amount })
  ) as number;
}
