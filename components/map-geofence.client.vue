<template>
    <div ref="map_el">
        <Accordion class="mb-3 border border-2 rounded">
            <AccordionTab header="Geofence Violation Settings">
                <div class="row">
                    <div class="col-md-6">
                        <div class="fs-5">Alert Recipient(s)</div>
                        <Chips v-model="recipients" :addOnBlur="true" separator="," style="width: 100%; margin-bottom: -1rem;" placeholder="Recipient Email(s)" :max="15" />
                        <div>
                            <small v-if="recipients.length < 15" class="text-muted">Click "ENTER" after every email</small>
                            <small v-else class="text-danger">You have exceeded the maximum number of recipients, i.e 15 recipients</small>
                        </div>
                    </div>
                    <div class="col-md-6 mt-2 mt-sm-0">
                        <div class="fs-5">Lock engine on geofence violation</div>
                        <InputSwitch v-model="lock_engine_on_geofence_violation" />
                    </div>
                    <div class="col-12">
                        <Button @click="updateGeofenceViolationSettings" class="float-end" label="Update" :loading="is_geofence_violation_settings_update_loading" />
                    </div>
                </div>
            </AccordionTab>
        </Accordion>
        <div class="text-center my-4">
            <SelectButton v-model="geofenceMethod" :options="Object.values(GeofenceMethod)" :disabled="user.approval_level !== 'SUPER_ADMIN'" :allowEmpty="false" />
        </div>
        <p v-if="is_loading">Updating the geofence <i class="pi pi-spinner pi-spin ms-1"></i></p>
        <div v-if="geofenceMethod === GeofenceMethod.Custom" class="card">
            <MapBounds
                v-model="geometry"
                :canDelete="false"
            />
        </div>
        <div v-if="geofenceMethod === GeofenceMethod.Route" class="card">
            <DropDown
                v-model="selectedRoute"
                :options="routes"
                optionLabel="name"
                placeholder="Select a route"
                v-on:vue:Mounted="fetchRoutesIfNotAvailable()"
            />
            <div class="my-4">
                <MapBounds
                    v-if="selectedRoute"
                    :disabled="true"
                    v-model="selectedRoute.bounds"
                />
                <MapBounds
                    v-else
                    :disabled="true"
                />
            </div>
        </div> 

        <Divider />

        <div class="d-flex justify-content-end gap-2">
            <Button size="small" severity="danger" :disabled="disableDeleteButton" @click="addGeofence('delete')">
                DELETE
            </Button>
            <Button size="small" @click="addGeofence()" :disabled="disableSaveButton">
                SAVE
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { useToast } from 'primevue/usetoast'
    import { type Vehicle, type Geofence } from '@prisma/client'
    import { type LatLng } from 'leaflet'
    import SelectButton from 'primevue/selectbutton';
    import DropDown from 'primevue/dropdown';
    import Divider from 'primevue/divider';
    import Button from 'primevue/button'

    enum GeofenceMethod {
        Custom = 'Custom',
        Route = 'Route'
    }

    const geofenceMethod = ref<GeofenceMethod>(GeofenceMethod.Custom);

    const props = defineProps<{
        vehicle: Vehicle & { geofence?: Geofence, route: any } | undefined
    }>()

    const emit = defineEmits([
        'onGeofenceChange'
    ]);

    const selectedRoute = ref<{ id: String, name: String, bounds: Array<any> }>(null)
    const routes = ref(null);

    const toast = useToast()
    const { user } = useUser();

    const geometry = ref<LatLng[]>([])
    const map_el = ref<HTMLElement>()
    const recipients = ref<any>([])
    const lock_engine_on_geofence_violation = ref<boolean>(false)
    const is_geofence_violation_settings_update_loading = ref<boolean>(false)
    const is_loading = ref<boolean>(false);

    const vehicle = computed(() => props.vehicle);

    if (vehicle.value.geofence) {
        // @ts-ignore
        geometry.value = props.vehicle.geofence.geometry;
        geofenceMethod.value = GeofenceMethod.Custom;
        selectedRoute.value = null;
    } else if (vehicle.value.route) {
        selectedRoute.value = vehicle.value.route;
        geofenceMethod.value = GeofenceMethod.Route;
        geometry.value = [];
    } else {
        selectedRoute.value = null;
        geometry.value = [];
    }


    const disableDeleteButton = computed(() => {

        if (geofenceMethod.value === GeofenceMethod.Custom) {
            return !vehicle.value.geofence?.geometry;
        } else if (geofenceMethod.value === GeofenceMethod.Route) {
            return !vehicle.value.route;
        } else {
            return true;
        }

    });

    const disableSaveButton = computed(() => {
        // disable when there is no change
        if (geofenceMethod.value === GeofenceMethod.Custom) {
            return JSON.stringify(geometry.value) === JSON.stringify(vehicle.value.geofence?.geometry);
        } else {
            return !selectedRoute.value || (selectedRoute.value?.id === vehicle.value.route?.id);
        }
    });

    const addGeofence = async (code?: 'create' | 'edit' | 'delete') => {

        if (!code) {
            // decide if its an update or create
            if (vehicle.value.geofence?.geometry || vehicle.value.route) {
                code = 'edit';
            } else {
                code = 'create';
            }
        }

        is_loading.value = true;

        try {

            const body = {
                vehicle_id: props.vehicle.id,
                code,
            }

            if (code !== 'delete') {
                if (geofenceMethod.value === GeofenceMethod.Custom) {
                    body['geometry'] = geometry.value ?? [];
                } else if (geofenceMethod.value === GeofenceMethod.Route) {
                    body['route_id'] = selectedRoute.value.id;
                }
            }
            
            await $fetch('/api/vehicle/geofence-upsert', {
                method: 'POST',
                body,
            });

            emit('onGeofenceChange', true);

            toast.add({
                severity: 'success',
                summary: 'Geofence',
                detail: `The command to ${ code } your geofence was successfully sent to the server. This might take a few minutes to action depending on the internet connectivity in the vehicle's area.`,
                life: 15000
            });

            if (geofenceMethod.value === GeofenceMethod.Custom) {
                selectedRoute.value = null;
            } else if (geofenceMethod.value === GeofenceMethod.Route) {
                geometry.value = [];
            }

        } catch (error){
            toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
        } finally {
            is_loading.value = false;
        }
    }

    const updateGeofenceViolationSettings = async () => {
        is_geofence_violation_settings_update_loading.value = true;

        try {
            const result = await $fetch<{ data: Geofence, message: string, success: boolean }>('/api/vehicle/geofence-violation-settings-upsert', {
                method: 'POST',
                body: {
                    vehicle_id: props.vehicle.id,
                    geofence_alert_recipients: recipients.value,
                    lock_engine_on_geofence_violation: lock_engine_on_geofence_violation.value,
                }
            });

            toast.add({ severity: 'success', summary: 'Geofence Violation Settings', detail: "Your geofence violation settings were successfully sent to the server. This might take a few minutes to action depending on the internet connectivity in the vehicle's area.", life: 15000})
            
        } catch(error) {
            return {
                data: {},
                message: error,
                success: false
            }
        } finally {
            is_geofence_violation_settings_update_loading.value = false;
        }
    }

    const fetchRoutes = async () => {
        
        try {
            const res = await $fetch<any>('/api/routes');
            routes.value = res.data;
        } catch (error) {
            toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
        }  
    }

    const fetchRoutesIfNotAvailable = () => {
        if(!routes.value) {
            fetchRoutes();
        }
    }

</script>