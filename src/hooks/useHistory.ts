import { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { Entry, Status } from '../types';
import { translateError } from '../lib/errorUtils';
import { ts } from '../lib/LanguageContext';

const PAGE_SIZE = 30;

export function useHistory(
  session: Session | null,
  setStatus: (status: Status | null) => void,
  storageMode: 'app' | 'notion' = 'app'
) {
  const [history, setHistory] = useState<Entry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const parseHistoryResponse = useCallback(async (res: Response): Promise<void> => {
    const text = await res.text();
    if (!text) { setHistory([]); return; }

    try {
      const json = JSON.parse(text);

      if (json.data && json.pagination) {
        setHistory(json.data);
        setHasMore(json.pagination.hasMore);
        setTotalCount(json.pagination.total);
        setCurrentPage(json.pagination.page);
      } else if (Array.isArray(json)) {
        setHistory(json);
        setHasMore(false);
        setTotalCount(json.length);
      }
      setStatus(null);
    } catch (e) {
      console.error("Failed to parse history JSON:", text);
      setStatus({ type: 'error', message: translateError('History data format error') });
    }
  }, [setStatus]);

  // Fetch App-only entries from Supabase entries table
  const fetchAppEntries = useCallback(async (): Promise<Entry[]> => {
    if (!session) return [];
    try {
      const res = await fetch(
        `${window.location.origin}/api/entries`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        setHistory(data);
        setTotalCount(data.length);
        setHasMore(false);
        setStatus(null);
        return data;
      } else {
        setStatus({ type: 'error', message: translateError(`Server error: ${res.status}`) });
        return [];
      }
    } catch (err: any) {
      setStatus({ type: 'error', message: translateError(err.message) });
      return [];
    }
  }, [session, setStatus]);

  // Fetch Notion history
  const fetchNotionHistory = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(
        `${window.location.origin}/api/history?page=1&limit=${PAGE_SIZE}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );

      if (res.ok) {
        await parseHistoryResponse(res);
      } else {
        const text = await res.text();
        try {
          const errorData = JSON.parse(text);
          setStatus({ type: 'error', message: translateError(errorData.error || `Server error: ${res.status}`) });
        } catch {
          setStatus({ type: 'error', message: translateError(`Server error: ${res.status}`) });
        }
      }
    } catch (err: any) {
      console.error("Fetch history error:", err);
      setStatus({ type: 'error', message: translateError(err.message) });
    }
  }, [session, parseHistoryResponse]);

  const fetchHistory = useCallback(async (): Promise<Entry[]> => {
    if (storageMode === 'app') {
      return await fetchAppEntries();
    } else {
      await fetchNotionHistory();
      return [];
    }
  }, [storageMode, fetchAppEntries, fetchNotionHistory]);

  // Load more — only for Notion mode (paginated API)
  // App mode loads all entries at once from /api/entries, so pagination is not needed.
  const loadMore = async () => {
    if (!session || !hasMore || isLoadingMore || storageMode === 'app') return;
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const res = await fetch(
        `${window.location.origin}/api/history?page=${nextPage}&limit=${PAGE_SIZE}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );

      if (res.ok) {
        const text = await res.text();
        const json = JSON.parse(text);
        if (json.data && json.pagination) {
          setHistory(prev => [...prev, ...json.data]);
          setHasMore(json.pagination.hasMore);
          setCurrentPage(json.pagination.page);
          setTotalCount(json.pagination.total);
        }
      }
    } catch (err: any) {
      console.error("Load more error:", err);
      toast.error(translateError(err.message));
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (session) fetchHistory();
  }, [session, fetchHistory]);

  // Delete — App mode deletes from entries table, Notion mode from history table
  const handleDeleteHistory = async (id: number) => {
    if (!session) return;
    try {
      if (storageMode === 'app') {
        const res = await fetch(`${window.location.origin}/api/entries/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      } else {
        const res = await fetch(`${window.location.origin}/api/notion/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (!res.ok) throw new Error(`Notion delete failed: ${res.status}`);
      }
      setHistory(prev => prev.filter(item => item.id !== id));
      setTotalCount(prev => prev - 1);
      toast.success(ts('toast_entry_deleted'));
      setStatus({ type: 'success', message: 'Entry deleted successfully!' });
      setTimeout(() => setStatus(null), 2000);
    } catch (err: any) {
      const translatedMsg = translateError(err.message);
      toast.error(translatedMsg);
      setStatus({ type: 'error', message: translatedMsg });
    }
  };

  const handleBulkDeleteHistory = async (ids: number[]) => {
    if (!session) return;
    try {
      if (storageMode === 'app') {
        // Single batch API call instead of N individual calls
        const res = await fetch(`${window.location.origin}/api/entries`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids })
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
      } else {
        const res = await fetch(`${window.location.origin}/api/notion`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids })
        });
        if (!res.ok) throw new Error(`Notion delete failed: ${res.status}`);
      }
      setHistory(prev => prev.filter(item => !ids.includes(item.id!)));
      setTotalCount(prev => prev - ids.length);
      toast.success(ts('toast_entries_deleted', { count: ids.length }));
      setStatus({ type: 'success', message: `${ids.length} entries deleted successfully!` });
      setTimeout(() => setStatus(null), 2000);
    } catch (err: any) {
      const translatedMsg = translateError(err.message);
      toast.error(translatedMsg);
      setStatus({ type: 'error', message: translatedMsg });
    }
  };

  const handleEditHistory = async (id: number, updated: Partial<import('../types').Entry>) => {
    if (!session || storageMode !== 'app') return;
    try {
      const res = await fetch(`${window.location.origin}/api/entries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updated)
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      setHistory(prev => prev.map(item => item.id === id ? { ...item, ...updated } : item));
      toast.success(ts('toast_entry_updated'));
      setStatus({ type: 'success', message: 'Entry updated!' });
      setTimeout(() => setStatus(null), 2000);
    } catch (err: any) {
      toast.error(translateError(err.message));
      setStatus({ type: 'error', message: translateError(err.message) });
    }
  };

  return {
    history,
    fetchHistory,
    handleDeleteHistory,
    handleBulkDeleteHistory,
    loadMore,
    hasMore,
    isLoadingMore,
    totalCount,
    handleEditHistory
  };
}