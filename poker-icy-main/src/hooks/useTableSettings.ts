import { useCallback } from 'react';
import { fetchTableSettings } from '@/lib/api';
import { DEFAULT_TABLE_SETTINGS, type TableSettings } from '@/lib/models';
import { useLiveData } from '@/hooks/useLiveData';

const SETTINGS_TABLES = ['settings'];

export function useTableSettings() {
  const load = useCallback(() => fetchTableSettings(), []);
  const { data, error, refresh } = useLiveData<TableSettings>(load, SETTINGS_TABLES, DEFAULT_TABLE_SETTINGS);
  return { settings: data, error, refresh };
}
