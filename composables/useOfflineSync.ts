import { ref, onMounted, onUnmounted } from 'vue';

const SYNC_QUEUE_KEY = 'offline_tracking_queue';
const SYNC_INTERVAL = 10000; // Check sync every 10 seconds if online

export function useOfflineSync() {
    const isOnline = ref(navigator.onLine);
    const isSyncing = ref(false);
    const queueSize = ref(0);

    // Initialize queue size on load
    const updateQueueSize = () => {
        try {
            const raw = localStorage.getItem(SYNC_QUEUE_KEY);
            const queue = raw ? JSON.parse(raw) : [];
            queueSize.value = queue.length;
        } catch (e) {
            queueSize.value = 0;
        }
    };

    // Add item to queue
    const enqueue = (data: any) => {
        try {
            const raw = localStorage.getItem(SYNC_QUEUE_KEY);
            const queue = raw ? JSON.parse(raw) : [];
            queue.push(data);
            localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
            queueSize.value = queue.length;

            // Try to sync immediately if online
            if (isOnline.value) {
                sync();
            }
        } catch (e) {
            console.error('Failed to save offline data', e);
        }
    };

    // Sync process
    const sync = async () => {
        if (!navigator.onLine || isSyncing.value) return;

        try {
            const raw = localStorage.getItem(SYNC_QUEUE_KEY);
            if (!raw) return;

            const fullQueue = JSON.parse(raw);
            if (fullQueue.length === 0) return;

            // Capture a snapshot of what we are about to sync
            const itemsToSync = [...fullQueue];

            isSyncing.value = true;
            console.log(`Starting sync of ${itemsToSync.length} items...`);

            // Send batch to API
            const { data, error } = await useFetch('/api/device/tracking-data', {
                method: 'POST',
                body: itemsToSync
            });

            if (!error.value) {
                // Success - Clear ONLY the items we synced
                // This prevents losing items added to the queue while the sync was in progress
                const currentRaw = localStorage.getItem(SYNC_QUEUE_KEY);
                const currentQueue = currentRaw ? JSON.parse(currentRaw) : [];
                
                // Keep items that were NOT in the batch we just sent
                // We use a simple JSON string comparison for deduplication of the objects in the queue
                const itemsToSyncStrings = new Set(itemsToSync.map(i => JSON.stringify(i)));
                const updatedQueue = currentQueue.filter((item: any) => !itemsToSyncStrings.has(JSON.stringify(item)));

                localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));
                updateQueueSize();
                console.log(`Sync successful, ${itemsToSync.length} items cleared.`);
            } else {
                console.error('Sync failed:', error.value);
            }

        } catch (e) {
            console.error('Sync error:', e);
        } finally {
            isSyncing.value = false;
        }
    };

    // Network listeners
    const updateOnlineStatus = () => {
        isOnline.value = navigator.onLine;
        if (isOnline.value) {
            sync();
        }
    };

    let syncTimer: any = null;

    onMounted(() => {
        // Initial check
        updateOnlineStatus();
        updateQueueSize();

        // Listeners
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        // Background sync interval (to retry failures)
        syncTimer = setInterval(() => {
            if (isOnline.value && queueSize.value > 0) {
                sync();
            }
        }, SYNC_INTERVAL);
    });

    onUnmounted(() => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
        if (syncTimer) clearInterval(syncTimer);
    });

    return {
        isOnline,
        isSyncing,
        queueSize,
        enqueue,
        sync
    };
}
