<template>
    <div ref="map_el">
        <div>
            <div class="row d-flex justify-content-center mb-1 p-1">
                <div class="col-md-12 d-flex justify-content-center mt-2">
                    <SelectButton id="status" style="margin-right: 5px;" v-model="option" :options="['REALTIME', 'HISTORY']" :allow-empty="false" aria-labelledby="basic" />
                </div>
                <div class="d-flex justify-content-center col-md-3">
                    <Button v-if="!props.vehicle" @click="home()" icon="ti ti-home" :loading="is_loading" class="mt-2" style="margin-right: 10px;" severity="info" rounded aria-label="Home" />
                    <AutoComplete v-model="current_vehicle" :style="!props.vehicle ? 'margin-right: 5px; width: 75%;' : 'width: 75%;'" class="mt-2" :optionLabel="({ number_plate }) => number_plate" :suggestions="search_results" @complete="search" @item-select="selectVehicle()" @input="unselectVehicle" placeholder="Search" :disabled="!!props.vehicle">
                        <template #option="slotProps">
                            <div>{{ slotProps.option.number_plate }} | {{ slotProps.option.type }}</div>
                        </template>
                    </AutoComplete>
                </div>
                <div v-if="option === 'HISTORY'" class="col-md-6 d-flex mt-sm-2 mt-3">
                    <Calendar v-model="date_from" style="margin-right: 5px; width: 48%; height: fit-content;" placeholder="Date From" showTime hourFormat="24" dateFormat="d/m/yy" :disabled="!current_vehicle?.number_plate" />
                    <Calendar v-model="date_to" style="margin-right: 5px; width: 48%; height: fit-content;" placeholder="Date To" showTime hourFormat="24" dateFormat="d/m/yy" :disabled="!current_vehicle?.number_plate" />
                    <Button @click="getVehicles('HISTORY', current_vehicle?.id)" icon="ti ti-search" :loading="is_history_loading" severity="info" rounded aria-label="Search" />
                </div>
                <div v-if="option === 'HISTORY'" class="col-md-12 d-flex justify-content-center mt-2">
                    <SelectButton id="status" style="margin-right: 5px;" v-model="history_option" :options="['PLAYBACK', 'CLUSTER']" :allow-empty="false" aria-labelledby="basic" />
                </div>
                <MapPlayback v-if="option === 'HISTORY' && history_option === 'PLAYBACK' && date_from && date_to" :playback_markers="history_markers" class="d-flex justify-content-center col-12 ps-sm-0 pe-sm-3 ps-0 pe-0" @updateMarkerLocation="updateHistoryPlayback" />
            </div>
        </div>
        <div class="card">
            <div id="map"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { useToast } from 'primevue/usetoast'
    import { type User, type Vehicle, type Geofence, type TrackingData, type Company } from '@prisma/client'
    import moment from "moment"
    import L from "leaflet"
    import "leaflet.markercluster"
    import "leaflet.markercluster/dist/leaflet.markercluster"
    import 'leaflet.fullscreen'
    import { type Map, type MarkerClusterGroup, type Marker, type FeatureGroup, type Polygon } from 'leaflet'
    import { useElementVisibility } from '@vueuse/core'
    import links from '~/vendors/links'

    type RealTimeData = Vehicle & { tracking_data: TrackingData, user: User[], company: Company };
    type SelectedVehicle = Vehicle & { company: Company }

    const props = defineProps<{
        vehicle?: Vehicle & { tracking_data: TrackingData[], geofence?: Geofence }
    }>()

    const toast = useToast();

    const { user } = useUser();
    const token = useCookie('token')

    const option = ref<'REALTIME' | 'HISTORY'>("REALTIME")
    const current_vehicle = ref<Vehicle & { tracking_data: TrackingData[] }>()
    const search_results = ref<Vehicle[]>([]);
    const date_from = ref<Date>()
    const date_to = ref<Date>()
    const history_markers = ref<(TrackingData & { vehicle: Vehicle & { company: Company } })[]>([])
    const history_option = ref<"PLAYBACK" | "CLUSTER">("PLAYBACK")
    const is_history_loading = ref<boolean>(false)
    const map_el = ref<HTMLElement>()
    const map_is_visible = useElementVisibility(map_el)
    const is_loading = ref<boolean>(false)

    let map: Map, drawItems: FeatureGroup, polygon: Polygon

    const search = async (event) => {
        try {

            const { data } = await $fetch<{ data: Vehicle[] }>('/api/vehicle/search', {
                query: { query: event.query }
            });

            search_results.value = data
        } catch (err) {
            toast.add({
                severity: 'warn',
                summary: 'Request error',
                detail: err.message,
                life: 8000
            })
        }
    }

    let realtime_marker_arr: RealTimeData[] = [];

    const getRealTimeData = async (vehicle_id?: string, isBackgroundError=false) => {
        try {

            // show loading indicator
            if (!isBackgroundError)
                is_loading.value = true

            const { data } = await $fetch<{ data: RealTimeData[] }>('/api/tracking-data', {
                query: { vehicle_id }
            });

            updateRealtimeMarkers(data);
            realtime_marker_arr = data;
            
        } catch (err) {
            if (isBackgroundError) {
                console.error(err);
            } else {
                toast.add({
                    severity: 'warn',
                    summary: 'App Error',
                    detail: err.message,
                    life: 8000
                });
            }
        } finally {
            if (!isBackgroundError)
                is_loading.value = false;
        }
    }

    const getVehicleHistory = async (id: string, isBackgroundError=false) => {

        try {

            if (!isBackgroundError)
                is_history_loading.value = true


            const { data } = await $fetch<{ data: TrackingData[] }>(`/api/vehicle/${id}/history`, {
                query: {
                    date_from: date_from.value.toISOString(),
                    date_to: date_to.value.toISOString(),
                }
            });

            history_markers.value = data.map(item => ({
                ...item,
                vehicle: current_vehicle as any,
            }))

            // Remove the playback marker
            history_playback_marker?.remove()
            history_playback_marker = null

            // Clear all markers
            if(clusters_created) {
                markers.eachLayer(layer => {
                    markers.removeLayer(layer)
                })
            }

            // Remove geofence polygon
            if(!polygon?.isEmpty() && polygon) {
                map.removeLayer(polygon)
            }

            if(data.length > 0) {
                if(history_option.value === "PLAYBACK")
                    map.setView([data[0].lat, data[0].lon], 21)
                else if(history_option.value === "CLUSTER")
                    updateHistoryClusterMarkers(history_markers.value)
            } else {
                toast.add({ severity: 'info', summary:  "No data was found", life: 8000 })
            }
        
        
        } catch (err) {
            if (isBackgroundError) {
                console.error(err);
            } else {
                toast.add({
                    severity: 'warn',
                    summary: 'App Error',
                    detail: err.message,
                    life: 8000
                });
            }
        } finally {
            if (!isBackgroundError)
                is_history_loading.value = false;
        }
    }

    const getVehicles = (type: "REALTIME" | "HISTORY", vehicle_id?: string, isBackgroundError=false) => {
        if (type === 'REALTIME')
            return getRealTimeData(vehicle_id, isBackgroundError);
        else if (type == 'HISTORY')
            return getVehicleHistory(vehicle_id, isBackgroundError);
    }

    const getDirection = (angle: number) => {
        // TODO: refactor this to use in other places (e.g components/vehicle/overview.vue)
        const directions = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West'];
        const index = Math.round(((angle %= 360) < 0 ? angle + 360 : angle) / 45) % 8;
        return directions[index];
    }

    const getIcon = (vehicle_type: string) => {
        if (vehicle_type === "MOTORBIKE") return "ti ti-motorbike";
        if (vehicle_type === "CAR") return "ti ti-car";
        if (vehicle_type === "TRUCK") return "ti ti-truck";
        if (vehicle_type === "TRACTOR") return "ti ti-tractor";
        if (vehicle_type === "FORKLIFT") return "ti ti-forklift";
        if (vehicle_type === "ESCAVATOR") return "ti ti-backhoe";
        if (vehicle_type === "BULLDOZER") return "ti ti-bulldozer";
        if (vehicle_type === "BUS") return "ti ti-bus";
    }

    const getHistorySignalIcon = (signal_strength: number) => {
        if(signal_strength == 0) return '<i style="color: #b32b23;" class="ti ti-cell-signal-off"></i><span style="color: #475569">Offline</span>'
        else if(signal_strength > 0 && signal_strength <= 9) return '<i style="color: #b32b23;" class="ti ti-cell-signal-2"></i><span style="color: #b32b23;">Poor</span>'
        else if(signal_strength > 9 && signal_strength <= 14) return '<i style="color: #ae510f" class="ti ti-cell-signal-3"></i><span style="color: #ae510f;">Moderate</span>'
        else if(signal_strength > 14 && signal_strength <= 19) return '<i style="color: #10b981;" class="ti ti-cell-signal-4"></i><span style="color: #10b981;">Good</span>'
        else if(signal_strength > 19 && signal_strength <= 30) return '<i style="color: #10b981;" class="ti ti-cell-signal-5"></i><span style="color: #10b981;">Excellent</span>'
    }

    const getRealtimeSignalIcon = (signal_strength: number, diff: number) => {
        if(diff > 5) return '<i style="color: #b32b23;" class="ti ti-cell-signal-off"></i><span style="color: #475569">Offline</span>'
        else if(signal_strength > 0 && signal_strength <= 9) return '<i style="color: #b32b23;" class="ti ti-cell-signal-2"></i><span style="color: #b32b23;">Poor</span>'
        else if(signal_strength > 9 && signal_strength <= 14) return '<i style="color: #ae510f" class="ti ti-cell-signal-3"></i><span style="color: #ae510f;">Moderate</span>'
        else if(signal_strength > 14 && signal_strength <= 19) return '<i style="color: #10b981;" class="ti ti-cell-signal-4"></i><span style="color: #10b981;">Good</span>'
        else if(signal_strength > 19 && signal_strength <= 30) return '<i style="color: #10b981;" class="ti ti-cell-signal-5"></i><span style="color: #10b981;">Excellent</span>'
    }

    const flyTo = (lat: number, lon: number) => {
        map.flyTo([lat, lon], 19)
    }

    const getMarkerPopupHTML = (tracking_data) => {
        // TODO: implement this and reuse it in updateHistoryPlayback(), updateHistoryClusterMarkers()
        // and updateRealtimeMarkers(). Please not that these functions don't necessarily have the same
        // popup HTML layout, so the logic here should reflect that
    }

    let history_playback_marker: Marker;
    const updateHistoryPlayback = (tracking_data: TrackingData & { vehicle: Vehicle & { user: User[], company: Company }, geofence: Geofence }, current_index: number) => {
        const { lat, lon, satellites, geofence_violation_state, is_engine_locked, altitude, speed, fuel_level, battery_percentage, ignition, state, time_from, time_to, course, signal_strength, operator_name, vehicle, geofence, updated_at } = tracking_data;

        // Reset the playback
        if(current_index === 0) {
            if(!polygon?.isEmpty() && polygon) {
                map.removeLayer(polygon)
            }

            // Remove the playback marker
            if(history_playback_marker) {
                history_playback_marker?.remove()
                history_playback_marker = null  
            }
        }

        let marker_html = L.divIcon({
            html : `
                <div class="marker">
                    <div class="marker-body">
                        <div class="ping ${ geofence_violation_state === 'VIOLATION' ? 'vehicle-history-geofence-violation' : state === 'STATIONARY' ? 'vehicle-history-stationary' : 'vehicle-history-moving'}"></div>
                        ${ course ? `<div style="transform: rotate(${ course }deg)" class="arrowhead-container">
                            <div class="arrowhead-container-row">
                                <div class="arrowhead"></div>
                            </div>
                        </div>` : '' }
                    </div>
                </div>
            `
        });

        const popup_contents = `
            <main style="width: 250px">
                <div class="d-flex justify-content-between mb-2">
                    <span class="text-primary fs-5">
                        <span>${ vehicle.type }</span>
                        <span title="${ is_engine_locked ? 'Engine was locked' : 'Engine is unlocked' }"><i style="color: ${ is_engine_locked ? '#ef4444' : '#22c55e' }" class="pi pi-${ is_engine_locked ? 'lock' : 'unlock' }"></i></span>
                    </span>
                    <div class="d-flex">
                        <span class="me-1">${ operator_name ?? 'No Data' }</span>${ getHistorySignalIcon(signal_strength) ?? 'No Data' }
                    </div>
                </div>
                ${ user.value.approval_level === 'SUPER_ADMIN' ? `<div class="d-flex justify-content-between">
                    <span>Company</span>
                    <span>${ vehicle.company.name }</span>
                </div>` : '' }
                <div class="d-flex justify-content-between mt-1">
                    <span class="py-1">No. Plate</span>
                    <span class="p-tag p-component p-tag-info">
                        <span class="p-tag-value">${ vehicle.number_plate }</span>
                    </span>
                </div>
                ${
                    (geofence_violation_state ?? false) && geofence_violation_state !== 'NO_POLYGON' ? `
                        <div class="d-flex justify-content-between mt-1">
                            <span class="py-1">Geofence State</span>
                            <span class="p-tag p-component p-tag-${ geofence_violation_state === 'VIOLATION' ? 'danger' : geofence_violation_state === 'NO_VIOLATION' ? 'success' : 'secondary' }">
                                <span class="p-tag-value">${ geofence_violation_state.replace(/_/g, ' ') }</span>
                            </span>
                        </div>
                    ` : ''
                }
                <div class="d-flex justify-content-between mt-1">
                    <span>Satellites Used</span>
                    <span>${ satellites }</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Altitude</span>
                    <span>${ altitude ? altitude.toFixed() + 'm' : 'No Data' }</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Speed</span>
                    <span>${ typeof speed === 'number' ? speed.toFixed() + 'km/h' : 'No Data' }</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Direction</span>
                    <span>${ course > 0 ? getDirection(course) : 'No Data' }</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Fuel Level</span>
                    <span>${ fuel_level ? fuel_level + 'L' : 'No Data' }</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Battery Percentage</span>
                    <span>${ battery_percentage ? battery_percentage + '%' : 'No Data' }</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span>Ignition</span>
                    <span>${ ignition === null || ignition === undefined ? 'No Data' : ignition ? 'On' : 'Off' }</span>
                </div>
                <div class="d-flex justify-content-between mt-1">
                    <span class="py-1">State</span>
                    <span class="p-tag p-component p-tag-${ state === "STATIONARY" ? 'info' : 'success' }">
                        <span class="p-tag-value">${ state }</span>
                    </span>
                </div>${  
                    state === "STATIONARY" ? `
                    <div class="d-flex justify-content-between mt-1">
                        <span>From</span>
                        <span>${ moment(time_from).format('ddd, DD MMM, h:mm a') }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>To</span>
                        <span>${ moment(time_to).format('ddd, DD MMM, h:mm a') }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Time Spent</span>
                        <span>${ timeCalculator(moment(new Date(time_to)).diff(new Date(time_from), "seconds")) }</span>
                    </div>
                    ` : ''
                }
                <div class="d-flex justify-content-between mt-1">
                    <span class="py-1">Timestamp</span>
                    <span class="p-tag p-component p-tag-info">
                        <span class="p-tag-value">${ moment(updated_at).format('ddd, DD MMM yy, h:mm a') }</span>
                    </span>
                </div>
                <div class="d-flex justify-content-center mt-2">
                    <button onclick="$(this).attr('disabled', true); setTimeout(() => $(this).removeAttr('disabled'), 5000); navigator.share({ title: 'Vehicle Location', url: '${ `https://www.google.com/maps/search/?api=1&query=${ lat },${ lon }` }' })" class="p-button p-button-secondary p-component p-button-sm me-2" type="button" aria-label="Share" data-pc-name="button" data-pc-section="root" data-p-severity="info" data-pd-ripple="true">
                        <span class="p-button-label" data-pc-section="label">Share</span>
                        <span role="presentation" aria-hidden="true" data-p-ink="true" data-p-ink-active="false" class="p-ink" data-pc-name="ripple" data-pc-section="root"></span>
                    </button>
                    <button onclick="document.getElementById('map')._leaflet_map.flyTo([${ lat }, ${ lon }], 19); document.getElementsByClassName('leaflet-popup-close-button')[0].click();" class="p-button p-component p-button-sm p-button-info" type="button" aria-label="Location" data-pc-name="button" data-pc-section="root" data-pd-ripple="true">
                        <span class="p-button-label" data-pc-section="label">Location</span>
                        <span role="presentation" aria-hidden="true" data-p-ink="true" data-p-ink-active="false" class="p-ink" data-pc-name="ripple" data-pc-section="root"></span>
                    </button>
                    ${ !props.vehicle ? `<button onclick="$(this).attr('disabled', true); window.location.href = '${links.vehicle(vehicle.number_plate)}'" class="p-button p-component p-button-sm p-button-info ms-2" type="button" aria-label="More" data-pc-name="button" data-pc-section="root" data-pd-ripple="true">
                            <span class="p-button-label" data-pc-section="label">More</span>
                            <span role="presentation" aria-hidden="true" data-p-ink="true" data-p-ink-active="false" class="p-ink" data-pc-name="ripple" data-pc-section="root"></span>
                        </button>` : '' }
                </div>
            </main>
        `

        // Update map center view
        map.panTo([lat, lon])

        // Update the marker
        if(!history_playback_marker) {
            // Add new marker to map
            history_playback_marker = L.marker([lat, lon], { icon: marker_html }).bindPopup(popup_contents).addTo(map)
        } else {
            // Update marker location
            history_playback_marker.setLatLng([lat, lon]) 

            // Update popup contents
            history_playback_marker.setPopupContent(popup_contents)

            // Update marker icon
            history_playback_marker.setIcon(marker_html)
        }

        // Update Geofence if it exists
        //@ts-ignore
        if(geofence?.geometry.length > 0) {
            if(polygon?.isEmpty()) {
                //@ts-ignore
                polygon = L.polygon(geofence.geometry.map(i => [ i.lat, i.lng ]));

                drawItems = new L.FeatureGroup();
                map.addLayer(drawItems);
                drawItems.addLayer(polygon);
            } else {
                //@ts-ignore
                polygon.setLatLngs(geofence.geometry.map(i => [ i.lat, i.lng ]))

                drawItems = new L.FeatureGroup();
                map.addLayer(drawItems);
                drawItems.addLayer(polygon);
            }
        } else {
            if(!polygon?.isEmpty() && polygon) map.removeLayer(polygon)
        }
    }

    let clusters_created = false;
    let markers: MarkerClusterGroup;
    let history_markers_arr = [];

    const updateHistoryClusterMarkers = (tracking_data: (TrackingData & { vehicle: Vehicle & { company: Company } })[]) => {
        // Clear history marker arr
        history_markers_arr = []

        // Create a cluster
        if(!clusters_created) {
            markers = new L.MarkerClusterGroup({
                maxClusterRadius: 1
            })
        } else {
            markers.eachLayer(layer => {
                markers.removeLayer(layer)
            })
        }

        // Remove existing geofence polygon
        if(!polygon?.isEmpty() && polygon) map.removeLayer(polygon)

        for (let index = 0; index < tracking_data.length; index++) {
            const { lat, lon, satellites, geofence_violation_state, is_engine_locked, altitude, speed, fuel_level, battery_percentage, ignition, state, time_from, time_to, course, signal_strength, operator_name, vehicle, updated_at } = tracking_data[index];

            let marker_html = L.divIcon({
                html : `
                    <div class="marker">
                        <div class="marker-body">
                            <div class="ping ${ geofence_violation_state === 'VIOLATION' ? 'vehicle-history-geofence-violation' : state === 'STATIONARY' ? 'vehicle-history-stationary' : 'vehicle-history-moving'}"></div>
                            ${ course ? `<div style="transform: rotate(${ course }deg)" class="arrowhead-container">
                                <div class="arrowhead-container-row">
                                    <div class="arrowhead"></div>
                                </div>
                            </div>` : '' }
                        </div>
                    </div>
                `
            });

            const marker = L.marker([lat, lon], { icon: marker_html }).bindPopup(`
                    <main style="width: 250px">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-primary fs-5">
                            <span>${ vehicle.type }</span>
                            <span title="${ is_engine_locked ? 'Engine was locked' : 'Engine is unlocked' }"><i style="color: ${ is_engine_locked ? '#ef4444' : '#22c55e' }" class="pi pi-${ is_engine_locked ? 'lock' : 'unlock' }"></i></span>
                        </span>
                        <div class="d-flex">
                            <span class="me-1">${ operator_name ?? 'No Data' }</span>${ getHistorySignalIcon(signal_strength) ?? 'No Data' }
                        </div>
                    </div>
                    ${ user.value.approval_level === 'SUPER_ADMIN' ? `<div class="d-flex justify-content-between">
                        <span>Company</span>
                        <span>${ vehicle.company.name }</span>
                    </div>` : '' }
                    <div class="d-flex justify-content-between mt-1">
                        <span class="py-1">No. Plate</span>
                        <span class="p-tag p-component p-tag-info">
                            <span class="p-tag-value">${ vehicle.number_plate }</span>
                        </span>
                    </div>
                    ${
                        (geofence_violation_state ?? false) && geofence_violation_state !== 'NO_POLYGON' ? `
                            <div class="d-flex justify-content-between mt-1">
                                <span class="py-1">Geofence State</span>
                                <span class="p-tag p-component p-tag-${ geofence_violation_state === 'VIOLATION' ? 'danger' : geofence_violation_state === 'NO_VIOLATION' ? 'success' : 'secondary' }">
                                    <span class="p-tag-value">${ geofence_violation_state.replace(/_/g, ' ') }</span>
                                </span>
                            </div>
                        ` : ''
                    }
                    <div class="d-flex justify-content-between mt-1">
                        <span>Satellites Used</span>
                        <span>${ satellites }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Altitude</span>
                        <span>${ altitude ? altitude.toFixed() + 'm' : 'No Data' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Speed</span>
                        <span>${ typeof speed === 'number' ? speed.toFixed() + 'km/h' : 'No Data' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Direction</span>
                        <span>${ course > 0 ? getDirection(course) : 'No Data' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Fuel Level</span>
                        <span>${ fuel_level ? fuel_level + 'L' : 'No Data' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Battery Percentage</span>
                        <span>${ battery_percentage ? battery_percentage + '%' : 'No Data' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Ignition</span>
                        <span>${ ignition === null || ignition === undefined ? 'No Data' : ignition ? 'On' : 'Off' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span class="py-1">State</span>
                        <span class="p-tag p-component p-tag-${ state === "STATIONARY" ? 'info' : 'success' }">
                            <span class="p-tag-value">${ state }</span>
                        </span>
                    </div>${  
                        state === "STATIONARY" ? `
                        <div class="d-flex justify-content-between mt-1">
                            <span>From</span>
                            <span>${ moment(time_from).format('ddd, DD MMM, h:mm a') }</span>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span>To</span>
                            <span>${ moment(time_to).format('ddd, DD MMM, h:mm a') }</span>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span>Time Spent</span>
                            <span>${ timeCalculator(moment(new Date(time_to)).diff(new Date(time_from), "seconds")) }</span>
                        </div>
                        ` : ''
                    }
                    <div class="d-flex justify-content-between mt-1">
                        <span class="py-1">Timestamp</span>
                        <span class="p-tag p-component p-tag-info">
                            <span class="p-tag-value">${ moment(updated_at).format('ddd, DD MMM yy, h:mm a') }</span>
                        </span>
                    </div>
                    <div class="d-flex justify-content-center mt-2">
                        <button onclick="$(this).attr('disabled', true); setTimeout(() => $(this).removeAttr('disabled'), 5000); navigator.share({ title: 'Vehicle Location', url: '${ `https://www.google.com/maps/search/?api=1&query=${ lat },${ lon }` }' })" class="p-button p-button-secondary p-component p-button-sm me-2" type="button" aria-label="Share" data-pc-name="button" data-pc-section="root" data-p-severity="info" data-pd-ripple="true">
                            <span class="p-button-label" data-pc-section="label">Share</span>
                            <span role="presentation" aria-hidden="true" data-p-ink="true" data-p-ink-active="false" class="p-ink" data-pc-name="ripple" data-pc-section="root"></span>
                        </button>
                        <button onclick="document.getElementById('map')._leaflet_map.flyTo([${ lat }, ${ lon }], 19); document.getElementsByClassName('leaflet-popup-close-button')[0].click();" class="p-button p-component p-button-sm p-button-info" type="button" aria-label="Location" data-pc-name="button" data-pc-section="root" data-pd-ripple="true">
                            <span class="p-button-label" data-pc-section="label">Location</span>
                            <span role="presentation" aria-hidden="true" data-p-ink="true" data-p-ink-active="false" class="p-ink" data-pc-name="ripple" data-pc-section="root"></span>
                        </button>
                        ${ !props.vehicle ? `<button onclick="$(this).attr('disabled', true); window.location.href = '${links.vehicle(vehicle.number_plate)}'" class="p-button p-component p-button-sm p-button-info ms-2" type="button" aria-label="More" data-pc-name="button" data-pc-section="root" data-pd-ripple="true">
                            <span class="p-button-label" data-pc-section="label">More</span>
                            <span role="presentation" aria-hidden="true" data-p-ink="true" data-p-ink-active="false" class="p-ink" data-pc-name="ripple" data-pc-section="root"></span>
                        </button>` : '' }
                    </div>
                </main>
            `)

            history_markers_arr.push([ lat, lon ])
            
            markers.addLayer(marker)
        }
        
        map.addLayer(markers).fitBounds(history_markers_arr)
        clusters_created = true

        // Add the current geofence polygon if it exists
        if(!polygon?.isEmpty() && polygon) map.addLayer(polygon)
    }

    let realtime_marker_bounds_arr: ([number, number])[] = [];
    const updateRealtimeMarkers = (tracking_data: RealTimeData[]) => {
        // Clear realtime marker array
        realtime_marker_bounds_arr = []

        // Create a cluster
        if(!clusters_created) {
            markers = new L.MarkerClusterGroup({
                maxClusterRadius: 20
            })
        } else {
            markers.eachLayer(layer => {
                markers.removeLayer(layer)
            })
        }
        
        for (let index = 0; index < tracking_data.length; index++) {
            const item = tracking_data[index];
            const { last_seen, type, company, number_plate, user: users } = item;
            const vehicleUser = users[0];
            const { lat, lon, satellites, geofence_violation_state, is_engine_locked, altitude, speed, fuel_level, battery_percentage, ignition, state, time_from, time_to, course, signal_strength, operator_name } = item.tracking_data;

            // See if vehicle is online i.e diff <= 5 minutes
            const diff = moment(new Date()).diff(new Date(last_seen), 'minutes')

            let marker_html = L.divIcon({
                html : `
                    <div class="marker ${ diff <= 5 ? (geofence_violation_state === 'VIOLATION' ? 'vehicle-online-geofence-violation' : state === "STATIONARY" ? 'vehicle-online-stationary' : 'vehicle-online-moving') : '' }">
                        <div class="marker-body">
                            <div class="vehicle-icon-container">
                                <i class="vehicle-icon ti ti-${ getIcon(type) }"></i>
                            </div>
                            ${ course ? `<div style="transform: rotate(${ course }deg)" class="arrowhead-container">
                                <div class="arrowhead-container-row">
                                    <div class="arrowhead"></div>
                                </div>
                            </div>` : '' }
                        </div>
                        ${ diff <= 5 ? '<div class="ping-effect"></div>' : '' }
                    </div>
                `
            });

            const marker = L.marker([lat, lon], { icon: marker_html }).bindPopup(`
                <main style="width: 250px">
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-primary fs-5">
                            <span>${ type }</span>
                            <span title="${ is_engine_locked ? 'Engine is locked' : 'Engine is unlocked' }"><i style="color: ${ is_engine_locked ? '#ef4444' : '#22c55e' }" class="pi pi-${ is_engine_locked ? 'lock' : 'unlock' }"></i></span>
                        </span>
                        <div class="d-flex">
                            <span class="me-1">${ operator_name ?? 'No Data' }</span>${ getRealtimeSignalIcon(signal_strength, diff) ?? 'No Data' }
                        </div>
                    </div>
                    ${ user.value.approval_level === 'SUPER_ADMIN' ? `<div class="d-flex justify-content-between">
                        <span>Company</span>
                        <span>${ company.name }</span>
                    </div>` : '' }
                    <div class="d-flex justify-content-between mt-1">
                        <span class="py-1">No. Plate</span>
                        <span class="p-tag p-component p-tag-info">
                            <span class="p-tag-value">${ number_plate }</span>
                        </span>
                    </div>
                    ${
                        (geofence_violation_state ?? false) && geofence_violation_state !== 'NO_POLYGON' ? `
                            <div class="d-flex justify-content-between mt-1">
                                <span class="py-1">Geofence State</span>
                                <span class="p-tag p-component p-tag-${ geofence_violation_state === 'VIOLATION' ? 'danger' : geofence_violation_state === 'NO_VIOLATION' ? 'success' : 'secondary' }">
                                    <span class="p-tag-value">${ geofence_violation_state.replace(/_/g, ' ') }</span>
                                </span>
                            </div>
                        ` : ''
                    }
                    <div class="d-flex justify-content-between mt-1">
                        <span>Satellites Used</span>
                        <span>${ satellites }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Altitude</span>
                        <span>${ altitude ? altitude.toFixed() + 'm' : 'No Data' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Speed</span>
                        <span>${ typeof speed === 'number' ? speed.toFixed() + 'km/h' : 'No Data' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Direction</span>
                        <span>${ course > 0 ? getDirection(course) : 'No Data' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Fuel Level</span>
                        <span>${ fuel_level ? fuel_level + 'L' : 'No Data' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Battery Percentage</span>
                        <span>${ battery_percentage ? battery_percentage + '%' : 'No Data' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span>Ignition</span>
                        <span>${ ignition === null || ignition === undefined ? 'No Data' : ignition ? 'On' : 'Off' }</span>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <span class="py-1">State</span>
                        <span class="p-tag p-component p-tag-${ state === "STATIONARY" ? 'info' : 'success' }">
                            <span class="p-tag-value">${ state }</span>
                        </span>
                    </div>${  
                        state === "STATIONARY" ? `
                        <div class="d-flex justify-content-between mt-1">
                            <span>From</span>
                            <span>${ moment(time_from).format('ddd, DD MMM, h:mm a') }</span>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span>To</span>
                            <span>${ moment(time_to).format('ddd, DD MMM, h:mm a') }</span>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <span>Time Spent</span>
                            <span>${ timeCalculator(moment(new Date(time_to)).diff(new Date(time_from), "seconds")) }</span>
                        </div>
                        ` : ''
                    }
                    <div class="d-flex justify-content-between mt-1">
                        <span class="py-1">Last Seen</span>
                        <span class="p-tag p-component p-tag-${ diff <= 5 ? 'info' : 'secondary' }">
                            <span class="p-tag-value">${ moment(last_seen).format('ddd, DD MMM yy, h:mm a') }</span>
                        </span>
                    </div>
                    <div class="d-flex justify-content-center mt-2">
                        <button onclick="$(this).attr('disabled', true); setTimeout(() => $(this).removeAttr('disabled'), 5000); navigator.share({ title: 'Vehicle Location', url: '${ `https://www.google.com/maps/search/?api=1&query=${ lat },${ lon }` }' })" class="p-button p-button-secondary p-component p-button-sm me-2" type="button" aria-label="Share" data-pc-name="button" data-pc-section="root" data-p-severity="info" data-pd-ripple="true">
                            <span class="p-button-label" data-pc-section="label">Share</span>
                            <span role="presentation" aria-hidden="true" data-p-ink="true" data-p-ink-active="false" class="p-ink" data-pc-name="ripple" data-pc-section="root"></span>
                        </button>
                        <button onclick="document.getElementById('map')._leaflet_map.flyTo([${ lat }, ${ lon }], 19); document.getElementsByClassName('leaflet-popup-close-button')[0].click();" class="p-button p-component p-button-sm p-button-info" type="button" aria-label="Location" data-pc-name="button" data-pc-section="root" data-pd-ripple="true">
                            <span class="p-button-label" data-pc-section="label">Location</span>
                            <span role="presentation" aria-hidden="true" data-p-ink="true" data-p-ink-active="false" class="p-ink" data-pc-name="ripple" data-pc-section="root"></span>
                        </button>
                        ${ !props.vehicle ? `<button onclick="$(this).attr('disabled', true); window.location.href = '${links.vehicle(number_plate)}'" class="p-button p-component p-button-sm p-button-info ms-2" type="button" aria-label="More" data-pc-name="button" data-pc-section="root" data-pd-ripple="true">
                            <span class="p-button-label" data-pc-section="label">More</span>
                            <span role="presentation" aria-hidden="true" data-p-ink="true" data-p-ink-active="false" class="p-ink" data-pc-name="ripple" data-pc-section="root"></span>
                        </button>` : '' }
                    </div>
                </main>
            `)
            
            realtime_marker_bounds_arr.push([ lat, lon ])

            markers.addLayer(marker)
        }
        
        map.addLayer(markers)

        clusters_created = true;
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

    let interval;
    const updateRealTimeMarkersInterval = async (isBackground=false) => {

        await getVehicles("REALTIME", current_vehicle.value?.id, isBackground);

        if(realtime_marker_bounds_arr.length > 0 && !props.vehicle) {
            map.fitBounds(realtime_marker_bounds_arr)
        }

        if(interval != null) {
            clearInterval(interval)
            interval = null
        }
        
        interval = setInterval(() => {
            if(option.value === "REALTIME") {
                getVehicles("REALTIME", current_vehicle.value?.id, true);
            } else {
                clearInterval(interval)
                interval = null
            }
        }, 30000)
    }

    const selectVehicle = () => {
        if (option.value === "REALTIME") {
            // Get latest selected vehicle's tracking data
            const markers = realtime_marker_arr.filter((marker) => marker.id === current_vehicle.value.id)

            // Update map with selected marker
            updateRealtimeMarkers(markers);

            // Fly to location
            flyTo(current_vehicle.value.tracking_data[0]?.lat, current_vehicle.value.tracking_data[0]?.lon)
        } else if (option.value === "HISTORY") {
            date_from.value = moment().subtract(1, 'd').toDate()
            date_to.value = new Date()
            getVehicles('HISTORY', current_vehicle.value.id);
        }
    }

    const unselectVehicle = (ev) => {
        if (option.value === "REALTIME" && ev.target.value.length === 0) {
            getVehicles('REALTIME');
        }
    }

    const home = () => {
        current_vehicle.value = null; 

        if (option.value === "HISTORY") {
            option.value = "REALTIME"
        } else {
            updateRealTimeMarkersInterval()
        }
    }

    watch(option, (value) => {
        // Remove all the markers
        if(clusters_created) {
            markers.eachLayer(layer => {
                markers.removeLayer(layer)
            })
        }

        if(value === "REALTIME") {
            // Re add geofence polygon if it exists
            if(props.vehicle?.geofence?.geometry && !polygon?.isEmpty() && polygon) map.addLayer(polygon)

            updateRealTimeMarkersInterval()
        } else {
            // Remove geofence polygon if it exists
            if(props.vehicle?.geofence?.geometry && !polygon?.isEmpty() && polygon) map.removeLayer(polygon)

            if(current_vehicle.value?.number_plate) {
                date_from.value = moment().subtract(1, 'd').toDate()
                date_to.value = new Date()
                getVehicles("HISTORY", current_vehicle.value?.id)
            }
        }
    })

    watch(history_option, (value) => {
        // Remove all the cluster markers
        if(clusters_created) {
            markers.eachLayer(layer => {
                markers.removeLayer(layer)
            })
        }

        // Remove the playback marker
        history_playback_marker?.remove()
        history_playback_marker = null

        // Remove geofence polygon
        if(!polygon?.isEmpty() && polygon) map.removeLayer(polygon)
        
        if(history_markers.value.length > 0) {
            if(value === "PLAYBACK") {
                map.setView([history_markers.value[0].lat, history_markers.value[0].lon], 21)
            } else {
                updateHistoryClusterMarkers(history_markers.value)
            }
        }
    })

    watch(map_is_visible, () => {
        setTimeout(() => {
            if(!map) {
                L.Map.addInitHook(function () {
                    // Store a reference of the Leaflet map object on the map container,
                    // so that it could be retrieved from DOM selection.
                    // https://leafletjs.com/reference-1.3.4.html#map-getcontainer
                    // @ts-ignore
                    this.getContainer()._leaflet_map = this;
                });

                map = L.map('map', {
                    fullscreenControl: true,
                    fullscreenControlOptions: {
                        position: 'topleft'
                    }
                }).setView([-19.12440952808487, 30.014648437500004], 6)

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                    maxZoom: 19
                }).addTo(map);

                // Prepopulate with current geofence
                if(props.vehicle?.geofence?.geometry) {
                    //@ts-ignore
                    polygon = L.polygon(props.vehicle.geofence.geometry.map(i => [ i.lat, i.lng ]));

                    drawItems = new L.FeatureGroup();
                    map.addLayer(drawItems);
                    drawItems.addLayer(polygon);
                }
            }

            if(props.vehicle) {
                current_vehicle.value = props.vehicle;
                if(current_vehicle.value?.tracking_data?.length > 0) map.setView([current_vehicle.value?.tracking_data?.at(0)?.lat, current_vehicle.value?.tracking_data?.at(0)?.lon], 21)
            }
    
            updateRealTimeMarkersInterval(true);
            
        }, 500)
    }, {
        once: true
    });

    onBeforeUnmount(() => {
        clearInterval(interval)
    })
</script>

<style>
    @import "leaflet/dist/leaflet.css";
    @import "leaflet.markercluster/dist/MarkerCluster.css";
    @import "leaflet.markercluster/dist/MarkerCluster.Default.css";
    @import "leaflet.fullscreen/Control.FullScreen.css";

    #map { 
        height: 520px; 
        border-radius: 12px;
    }

    .card {
        border-radius: 12px !important;
    }

    .vehicle-online-moving .vehicle-icon {
        color: #10b981 !important;
    }

    .vehicle-online-stationary .vehicle-icon {
        color:  rgba(5, 124, 255, 1) !important;
    }

    .vehicle-online-geofence-violation {
        color: #f87171 !important;
    }

    .vehicle-history-stationary {
        background: rgba(5, 124, 255, 1);
    }

    .vehicle-history-moving {
        background: #10b981 !important;
    }

    .vehicle-history-geofence-violation {
        background: #f87171 !important;
    }

    .vehicle-icon {
        font-size: 30px;
        color: #2a3547;
        margin: auto;
        background: #edf0fe;
        border-radius: 50%;
    }

    .vehicle-icon-container {
        position: absolute;
        display: flex;
        width: 40px;
        height: 40px;
    }

    .arrowhead-container {
        position: absolute;
        width: 40px;
        height: 40px;
    }

    .arrowhead-container-row {
        width: 100%;
        display: flex;
        justify-content: center;
    }

    .arrowhead {
        border: 6px solid transparent;
        border-top: 0;
        border-right-color: transparent;
        border-bottom-color: red;
        border-left-color: transparent;
        display: block;
        width: 0px;
        height: 0px;
    }

    .marker {
        margin-top: -15px;
        margin-left: -15px;
        width: 40px;
        height: 40px;
        position: absolute;
        display: block;  
    }

    .marker-body {
        position: relative;
    }

    .ping {
        width: 20px;
        height: 20px;
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(5, 124, 255, 1);    
        border: 2px solid #FFF;
        border-radius: 50%;
        z-index: 1000;
    }

    .ping-effect {
        width: 80px;
        height: 80px;
        position: absolute;
        top: -20px;
        left: -20px;
        display: block;
        background: rgba(5, 124, 255, 0.6);
        border-radius: 50%;
        opacity: 0;
        animation: pulsate 3000ms ease-out infinite;
    }

    .vehicle-online-geofence-violation .ping-effect {
        background: rgba(248, 113, 113, 0.6) !important;
    }

    @keyframes pulsate {
        0% {
            transform: scale(0.1);
            opacity: 0;
        }
        50% {
            opacity: 1;
        }
        100% {
            transform: scale(1.2);
            opacity: 0;
        }
    }
</style>
