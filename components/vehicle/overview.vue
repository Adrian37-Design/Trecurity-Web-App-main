<template>
    <main>
        <div class="row">
            <div class="col-md-6 p-3 border border-2 rounded mb-2 mb-sm-0">
                <div class="h5">General Data</div>
                <div class="row">
                    <div class="col-md-12">
                        <div class="d-flex justify-content-between mb-2">
                            <span class="text-primary fs-5">{{ props.vehicle?.type }}</span>
                            <div class="d-flex">
                                <span class="me-1">{{ props.vehicle?.tracking_data?.at(0)?.operator_name ?? 'No Data' }}</span>
                                <span v-html="getRealtimeSignalIcon(props.vehicle?.tracking_data?.at(0)?.signal_strength, diff())"></span>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="user?.approval_level === 'SUPER_ADMIN'" class="d-flex justify-content-between">
                    <span>Company</span>
                    <span class="p-tag p-component p-tag-success">
                        <span class="p-tag-value">{{ props.vehicle?.company?.name }}</span>
                    </span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>User(s)</span>
                    <span class="row justify-content-end">
                        <span v-for="({ name, surname, email }) in props?.vehicle?.user" :key="email" class="user-name text-truncate text-end" :title="`${ name } ${ surname } (${ email })`">{{ name }} {{ surname }} ({{ email }})</span>
                    </span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span class="py-1">No. Plate</span>
                    <span class="p-tag p-component p-tag-info">
                        <span class="p-tag-value">{{ props.vehicle?.number_plate }}</span>
                    </span>
                </div>
                <div v-if="props.vehicle?.tracking_data?.at(0)?.geofence_violation_state && props.vehicle?.tracking_data?.at(0)?.geofence_violation_state !== 'NO_POLYGON'" class="d-flex justify-content-between mt-1">
                    <span class="py-1">Geofence State</span>
                    <span class="p-tag p-component" :class="`p-tag-${ props.vehicle?.tracking_data?.at(0)?.geofence_violation_state === 'VIOLATION' ? 'danger' : props.vehicle?.tracking_data?.at(0)?.geofence_violation_state === 'NO_VIOLATION' ? 'success' : 'secondary' }`">
                        <span class="p-tag-value">{{ props.vehicle?.tracking_data?.at(0)?.geofence_violation_state.replace(/_/g, ' ') }}</span>
                    </span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Satellites Used</span>
                    <span>{{ props.vehicle?.tracking_data?.at(0)?.satellites ?? 'No Data' }}</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Altitude</span>
                    <span>{{ props.vehicle?.tracking_data?.at(0)?.altitude ? props.vehicle?.tracking_data?.at(0)?.altitude?.toFixed() + 'm' : 'No Data' }}</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Speed</span>
                    <span>{{ props.vehicle?.tracking_data?.at(0)?.speed ? props.vehicle?.tracking_data?.at(0)?.speed?.toFixed() + 'km/h' : 'No Data' }}</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Direction</span>
                    <span>{{ props.vehicle?.tracking_data?.at(0)?.course > 0 ? getDirection(props.vehicle?.tracking_data?.at(0)?.course) : 'No Data' }}</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Fuel Level</span>
                    <span>{{ props.vehicle?.tracking_data?.at(0)?.fuel_level ? props.vehicle?.tracking_data?.at(0)?.fuel_level + 'L' : 'No Data' }}</span>
                </div>
                <div class="col-md-6 mt-2">
                    <i class="ti ti-battery-charging me-1"></i>
                    <span>{{ props.vehicle?.tracking_data?.at(0)?.battery_percentage ? props.vehicle?.tracking_data?.at(0)?.battery_percentage + '%' : 'No Data' }}</span>
                    <span v-if="props.vehicle?.tracking_data?.at(0)?.battery_percentage" class="ms-2 text-muted">
                        ({{ estimateBatteryVoltage(props.vehicle?.tracking_data?.at(0)?.battery_percentage) }}V)
                    </span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Ignition</span>
                    <span>{{ props.vehicle?.tracking_data?.at(0)?.ignition === null || props.vehicle?.tracking_data?.at(0)?.ignition === undefined ? 'No Data' : props.vehicle?.tracking_data?.at(0)?.ignition ? 'On' : 'Off' }}</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span class="py-1">State</span>
                    <span class="p-tag p-component" :class="`p-tag-${ props.vehicle?.tracking_data?.at(0)?.state === 'STATIONARY' ? 'info' : 'success' }`">
                        <span class="p-tag-value">{{ props.vehicle?.tracking_data?.at(0)?.state }}</span>
                    </span>
                </div>
                <div v-if="props.vehicle?.tracking_data?.at(0)?.state === 'STATIONARY'" class="d-flex justify-content-between mt-1">
                    <span>From</span>
                    <span>{{ moment(props.vehicle?.tracking_data?.at(0)?.time_from).format('ddd, DD MMM, h:mm a') }}</span>
                </div>
                <div v-if="props.vehicle?.tracking_data?.at(0)?.state === 'STATIONARY'" class="d-flex justify-content-between mt-1">
                    <span>To</span>
                    <span>{{ moment(props.vehicle?.tracking_data?.at(0)?.time_to).format('ddd, DD MMM, h:mm a') }}</span>
                </div>
                <div v-if="props.vehicle?.tracking_data?.at(0)?.state === 'STATIONARY'" class="d-flex justify-content-between mt-1">
                    <span>Time Spent</span>
                    <span>{{ timeCalculator(moment(new Date(props.vehicle?.tracking_data?.at(0)?.time_to)).diff(new Date(props.vehicle?.tracking_data?.at(0)?.time_from), "seconds")) }}</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span class="py-1">Last Seen</span>
                    <span class="p-tag p-component p-tag-info">
                        <span class="p-tag-value">{{ moment(props.vehicle?.last_seen).format('ddd, DD MMM yy, h:mm a') }}</span>
                    </span>
                </div>
            </div>
            <div class="col-md-5 ms-0 ms-sm-2">
                <Accordion class="border border-2 rounded">
                    <AccordionTab header="Advanced Data">
                        <div class="d-flex justify-content-between mt-1">
                            <span>Modem Name</span>
                            <span>{{ props.vehicle?.modem_name ?? 'No Data' }}</span>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span>Modem Info</span>
                            <span class="ms-4 text-end">{{ props.vehicle?.modem_info ?? 'No Data' }}</span>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span>CCID</span>
                            <span>{{ props.vehicle?.tracking_data?.at(0)?.ccid ?? 'No Data' }}</span>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span>IMEI</span>
                            <span>{{ props.vehicle?.tracking_data?.at(0)?.imei ?? 'No Data' }}</span>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span>IMSI</span>
                            <span style="max-width: 200px;" class="ms-4 text-end">{{ props.vehicle?.tracking_data?.at(0)?.imsi ?? 'No Data' }}</span>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span>Network IP</span>
                            <span>{{ props.vehicle?.tracking_data?.at(0)?.ip_address ? props.vehicle?.tracking_data?.at(0)?.ip_address : 'No Data' }}</span>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span>Public IP Address</span>
                            <NuxtLink v-if="props.vehicle?.tracking_data?.at(0)?.public_ip_address" :to="`https://whatismyipaddress.com/ip/${ props.vehicle?.tracking_data?.at(0)?.public_ip_address?.split(',')?.at(0) }`" external target="_blank" title="Lookup IP">{{ props.vehicle?.tracking_data?.at(0)?.public_ip_address?.split(",")?.at(0) }}</NuxtLink>
                            <span v-else>No Data</span>
                        </div>
                    </AccordionTab>
                </Accordion>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
    import { type User, type Vehicle, type Company, type Geofence, type TrackingData } from '@prisma/client'
    import moment from 'moment'

    const props = defineProps<{
        vehicle?: Vehicle & { company: Company, user: User[], geofence?: Geofence, tracking_data: TrackingData[] }
    }>()

    const { user } = useUser();
    const token = useCookie('token')

    // See if vehicle is online i.e diff <= 5 minutes
    const diff = () => moment(new Date()).diff(new Date(props.vehicle?.last_seen), 'minutes')

    const getRealtimeSignalIcon = (signal_strength: number, diff: number) => {
        if(diff > 5) return '<i style="color: #b32b23;" class="ti ti-cell-signal-off"></i><span style="color: #475569">Offline</span>'
        else if(signal_strength > 0 && signal_strength <= 9) return '<i style="color: #b32b23;" class="ti ti-cell-signal-2"></i><span style="color: #b32b23;">Poor</span>'
        else if(signal_strength > 9 && signal_strength <= 14) return '<i style="color: #ae510f" class="ti ti-cell-signal-3"></i><span style="color: #ae510f;">Moderate</span>'
        else if(signal_strength > 14 && signal_strength <= 19) return '<i style="color: #10b981;" class="ti ti-cell-signal-4"></i><span style="color: #10b981;">Good</span>'
        else if(signal_strength > 19 && signal_strength <= 30) return '<i style="color: #10b981;" class="ti ti-cell-signal-5"></i><span style="color: #10b981;">Excellent</span>'
    }

    const getDirection = (angle: number) => {
        const directions = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
        const index = Math.round(((angle %= 360) < 0 ? angle + 360 : angle) / 45) % 8;
        return directions[index];
    }

    const timeCalculator = (seconds: number) => {
        let y = Math.floor(seconds / 31536000);
        let mo = Math.floor((seconds % 31536000) / 2628000);
        let d = Math.floor(((seconds % 31536000) % 2628000) / 86400);
        let h = Math.floor((seconds % (3600 * 24)) / 3600);
        let m = Math.floor((seconds % 3600) / 60);
        let s = Math.floor(seconds % 60);

        let yDisplay = y > 0 ? y + "y" + (mo > 0 ? ", " : " ") : "";
        let moDisplay = mo > 0 ? mo + "m" + (d > 0 ? ", " : " ") : "";
        let dDisplay = d > 0 ? d + "d" + (h > 0 ? ", " : " ") : "";
        let hDisplay = h > 0 ? h + "h" + (m > 0 ? ", " : " ") : "";
        let mDisplay = m > 0 ? m + "m" + (s > 0 ? ", " : " ") : "";
        let sDisplay = s > 0 ? s + "s" : "";
        return yDisplay + moDisplay + dDisplay + hDisplay + mDisplay + sDisplay;
    }

    // Calculate estimated battery voltage from percentage
    // Lead-acid battery: 12.6V = 100%, 11.8V = 0%
    const estimateBatteryVoltage = (percentage: number): string => {
        if (!percentage || percentage < 0) return '0.0';
        const voltage = 11.8 + (percentage / 100) * 0.8;
        return voltage.toFixed(1);
    }
</script>

<style scoped>
    .user-name {
        max-width: 300px; 
        cursor: pointer;
    }

    @media (max-width: 756px) {
        .user-name {
            max-width: 200px !important;
        }
    }
</style>