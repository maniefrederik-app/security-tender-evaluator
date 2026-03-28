import { db } from '../config/firebase';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';

export const subscribeToEvaluationUpdates = (tenderId, callback) => {
  const updatesRef = collection(db, 'scoring_live', tenderId, 'updates');
  const q = query(updatesRef, orderBy('timestamp', 'desc'), limit(10));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const updates = [];
    snapshot.forEach((doc) => {
      updates.push({ id: doc.id, ...doc.data() });
    });
    callback(updates);
  }, (error) => {
    console.error('Real-time subscription error:', error);
  });

  return unsubscribe;
};

export const subscribeToNotifications = (tenderId, callback) => {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('tenderId', '==', tenderId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications = [];
    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    callback(notifications);
  }, (error) => {
    console.error('Notification subscription error:', error);
  });

  return unsubscribe;
};
