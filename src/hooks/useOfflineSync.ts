import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface OfflineEntry {
  id: string;
  url: string;
  payload: any;
  timestamp: number;
}

export function useOfflineSync(sessionToken: string | undefined, onSyncComplete?: () => void) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("အင်တာနက် မပွင့်နေပါ။ Offline Mode ဖြင့် အသုံးပြုနေပါသည်။", { duration: 5000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync if queue exists
    if (navigator.onLine && localStorage.getItem('offlineQueue')) {
      syncOfflineData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [sessionToken]);

  const saveOffline = (url: string, payload: any) => {
    const current = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    const newEntry: OfflineEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      url,
      payload,
      timestamp: Date.now(),
    };
    localStorage.setItem('offlineQueue', JSON.stringify([...current, newEntry]));
    toast.success("အင်တာနက်မရှိချိန် လုံခြုံစွာ သိမ်းဆည်းထားပါသည်။ ချိတ်ဆက်မှုရရှိချိန် အလိုအလျောက် ပေးပို့ပါမည်။", { duration: 5000 });
  };

  const syncOfflineData = async () => {
    if (!sessionToken) return;
    const queue: OfflineEntry[] = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    if (queue.length === 0) return;

    toast.info("Offline မှတ်တမ်းများကို Server သို့ အလိုအလျောက် ပေးပို့နေပါသည်...", { duration: 4000 });

    let successCount = 0;
    const failedQueue: OfflineEntry[] = [];

    for (const item of queue) {
      try {
        const res = await fetch(item.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify(item.payload),
        });

        if (res.ok) {
          successCount++;
        } else {
          failedQueue.push(item);
        }
      } catch (err) {
        failedQueue.push(item);
      }
    }

    if (failedQueue.length === 0) {
      localStorage.removeItem('offlineQueue');
      toast.success(`Offline မှတ်တမ်း ${successCount} ခု အောင်မြင်စွာ ပေးပို့ပြီးပါပြီ။`);
      if (onSyncComplete) onSyncComplete();
    } else {
      localStorage.setItem('offlineQueue', JSON.stringify(failedQueue));
      if (successCount > 0) {
        toast.warning(`မှတ်တမ်း ${successCount} ခု ပေးပို့ပြီးပါပြီ။ ${failedQueue.length} ခု ကျန်ရှိနေပါသည်။`);
        if (onSyncComplete) onSyncComplete();
      } else {
        toast.error("Offline မှတ်တမ်းများကို ပေးပို့၍မရပါ။ ခေတ္တစောင့်ပြီးမှ ပြန်လည်စမ်းသပ်ပါမည်။");
      }
    }
  };

  return { isOnline, saveOffline };
}
