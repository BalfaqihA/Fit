import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  markNotificationsRead,
  subscribeNotifications,
  type AppNotification,
} from '@/lib/community-notifications';

/**
 * The signed-in user's in-app community notifications (realtime). Created
 * server-side by the like/comment/follow/post triggers, so they reflect what
 * other users do and update live.
 */
export function useCommunityNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeNotifications(user.uid, (next) => {
      setItems(next);
      setLoading(false);
    });
  }, [user]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  const markAllRead = useCallback(async () => {
    const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length) await markNotificationsRead(unreadIds);
  }, [items]);

  return { items, loading, unreadCount, markAllRead };
}
