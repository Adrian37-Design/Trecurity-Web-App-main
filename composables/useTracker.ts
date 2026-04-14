import { ref, onUnmounted } from 'vue';

export function useTracker() {
    const isTracking = ref(false);
    const currentLocation = ref<GeolocationPosition | null>(null);
    const error = ref<string | null>(null);
    let watchId: number | null = null;
    let vehicleId: string | null = null;
    let lastPositionTime = 0;

    // Minimum time between updates in ms (e.g. 5 seconds)
    const MIN_UPDATE_INTERVAL = 5000;

    const { enqueue } = useOfflineSync();

    const startTracking = (selectedVehicleId: string) => {
        if (!navigator.geolocation) {
            error.value = "Geolocation is not supported by your browser";
            return;
        }

        if (!selectedVehicleId) {
            error.value = "No vehicle selected";
            return;
        }

        vehicleId = selectedVehicleId;
        isTracking.value = true;
        error.value = null;

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                currentLocation.value = position;
                processPosition(position);
            },
            (err) => {
                error.value = `GPS Error: ${err.message}`;
            },
            options
        );
    };

    const stopTracking = () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        isTracking.value = false;
        currentLocation.value = null;
    };

    const processPosition = (pos: GeolocationPosition) => {
        const now = Date.now();
        if (now - lastPositionTime < MIN_UPDATE_INTERVAL) return; // Debounce
        lastPositionTime = now;

        const dataPoint = {
            vehicle_id: vehicleId,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            speed: (pos.coords.speed || 0) * 3.6, // Convert m/s to km/h
            altitude: pos.coords.altitude || 0,
            course: pos.coords.heading || 0,
            time_from: new Date(pos.timestamp).toISOString(),
            time_to: new Date(pos.timestamp).toISOString(),
            hdop: pos.coords.accuracy || 0,
            signal_strength: 100, // Browser GPS assumed good if working
            satellites: 0, // N/A for browser
            state: (pos.coords.speed || 0) > 0.5 ? 'MOVING' : 'STATIONARY',
            is_engine_locked: false
        };

        enqueue(dataPoint);
    };

    onUnmounted(() => {
        stopTracking();
    });

    return {
        isTracking,
        currentLocation,
        error,
        startTracking,
        stopTracking
    };
}
