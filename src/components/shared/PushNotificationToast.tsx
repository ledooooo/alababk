import React, { useEffect, useState } from 'react';
import { useToast } from './Toast';
import { subscribeToStorageChange } from '../../lib/storage';
import { NotificationItem } from '../../types/domain';

interface PushNotificationToastProps {
  onNavigate?: (path: string) => void;
}

export const PushNotificationToast: React.FC<PushNotificationToastProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [lastNotifId, setLastNotifId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'notification' && detail.action === 'save') {
        const notif = detail.data as NotificationItem;
        if (notif && notif.id !== lastNotifId) {
          setLastNotifId(notif.id);
          showToast({
            type: 'info',
            title: notif.title,
            message: notif.body || notif.message || '',
            duration: 5000,
          });
        }
      }
    });
    return unsubscribe;
  }, [lastNotifId, showToast]);

  return null;
};