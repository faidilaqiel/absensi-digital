const OFFLINE_QUEUE_KEY = 'sdnp3_offline_queue';

export function getOfflineQueue() {
  try {
    const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToOfflineQueue(item) {
  const queue = getOfflineQueue();
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const date = now.toISOString().split('T')[0];

  const newItem = {
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    qr_code: item.qr_code,
    date: item.date || date,
    time: item.time || time,
    student_name: item.student_name || 'Scan Offline',
    scanned_at: new Date().toISOString()
  };

  queue.push(newItem);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return newItem;
}

export function clearOfflineQueue() {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export function removeFromOfflineQueue(id) {
  const queue = getOfflineQueue().filter(q => q.id !== id);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

