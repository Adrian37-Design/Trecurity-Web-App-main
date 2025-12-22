<template>
    <main>
        <div class="card">
            <div class="card-body row">
                <div class="block">
                    <div class="d-flex justify-content-between mb-4">
                        <div class="d-flex fs-6">
                            <span class="mt-1">Vehicle</span>
                            <span class="mt-1 ms-2 text-muted">#{{ number_plate }}</span>
                            <VehicleEngineLock :vehicle="vehicle" class="ms-2" @onSendEngineCommand="getVehicle(true); reloadCommandsDataTable();" @onForceEngineUnLock="getVehicle(true); reloadCommandsDataTable(); reset_geofence_component = true" />
                            <span v-if="is_loading" title="Loading data">
                                <i class="pi pi-spinner pi-spin fs-6 mt-2 ms-2"></i>
                            </span>
                        </div>
                        <Breadcrumb :home="{ icon: 'ti ti-home', route: '/dashboard' }" :model="[ { label: 'Vehicle List', route: '/vehicles' }, { label: `#${number_plate}`, route: links.vehicle(number_plate) } ]">
                            <template #item="{ item, props }">
                                <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
                                    <a :href="href" v-bind="props.action" @click="navigate">
                                        <span :class="[item.icon, 'text-color']" />
                                        <span class="text-primary font-semibold">{{ item.label }}</span>
                                    </a>
                                </router-link>
                            </template>
                        </Breadcrumb>
                    </div>
                    <div v-if="error_occurred" class="d-flex justify-content-center">
                        <Button @click="getVehicle()" label="Refresh" severity="info" :disabled="is_loading" />
                    </div>
                    <div v-else-if="vehicle?.tracking_data?.at(0)" class="col-md-12">
                        <div>
                            <ClientOnly>
                                <TabView :scrollable="true" :disabled="is_loading" lazy>
                                    <TabPanel header="Overview">
                                        <VehicleOverview :vehicle="vehicle" />
                                    </TabPanel>
                                    <TabPanel header="Map">
                                        <Map :vehicle="vehicle" :key="map_key" />
                                    </TabPanel>
                                    <TabPanel header="Analytics">
                                        <VehicleAnalytics :vehicle="vehicle" />
                                    </TabPanel>
                                    <TabPanel header="Geofence">
                                        <MapGeofence :vehicle="vehicle" :key="geofence_key" @onGeofenceChange="getVehicle(true); reloadCommandsDataTable();" />
                                    </TabPanel>
                                    <TabPanel>
                                        <template #header>
                                            <div class="d-flex">
                                                <span class="p-tabview-title">Commands</span>
                                                <Badge v-if="pending_commands" :value="pending_commands" severity="info" class="ms-1" style="margin-top: -3px; margin-bottom: -12px;" />
                                            </div>
                                        </template>
                                        <TableCommand ref="table_command_component" @pendingCommands="getPendingCommands" />
                                    </TabPanel>
                                    <TabPanel header="Violations">
                                        <Violations filter-by="vehicle_id" :filter-value="vehicle.id" />
                                    </TabPanel>
                                </TabView>
                            </ClientOnly>
                        </div>
                    </div>
                    <div v-else-if="vehicle && vehicle?.tracking_data?.length === 0" class="d-flex justify-content-center">
                        <div class="block">
                            <NuxtImg src="/images/waiting-for-data.svg" width="300" />
                            <p class="text-center"><strong>Waiting for data from this vehicle</strong> <i class="pi pi-spinner pi-spin ms-1"></i></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
    import { useToast } from 'primevue/usetoast'
    // import { type User, type Company, type Vehicle, type Geofence, type TrackingData, type ControllerCommand } from '@prisma/client';
    import TabPanel from 'primevue/tabpanel';
    import TabView from 'primevue/tabview';
    import Badge from 'primevue/badge';
    import links from '~/vendors/links';

    const { params: { number_plate } }: any = useRoute();

    const toast = useToast();

    definePageMeta({
        layout: "dashboard",
        middleware: ["auth"]
    })

    const vehicle = ref()
    const map_key = ref<string>()
    const geofence_key = ref<string>()
    const table_command_component = ref()
    const pending_commands = ref<number>(0)
    const reset_geofence_component = ref<boolean>(false)
    const is_loading = ref<boolean>(true)
    const error_occurred = ref<boolean>(false)

    // Get Pending Commands
    const getPendingCommands = (count: number) => {
        pending_commands.value = count;
    }

    // Get vehicle information
    const getVehicle = async (rerender_main_map = false, silent_update = false) => {

        if (!silent_update)
            is_loading.value = true;
        
        try {

            const result: any = await $fetch(`/api/vehicle/${number_plate.toUpperCase()}`);

            if (rerender_main_map)
                map_key.value = (new Date()).toString()

            if (reset_geofence_component.value) {
                geofence_key.value = (new Date).toString()
                reset_geofence_component.value = false
            }

            vehicle.value = result.data
            error_occurred.value = false;

        } catch (error) {
            if (!silent_update) {
                toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
                error_occurred.value = true
            }
        } finally {
            if (!silent_update)
                is_loading.value = false;
        }
    }

    const reloadCommandsDataTable = () => {
        // TODO: Load commands here and pass to the table as props
        try {
            table_command_component.value.reloadDataTable();
        } catch (error) {
            
        }
    }
    
    let interval;
    onMounted(async() => {
        await getVehicle()

        interval = setInterval(async() => {
            if(!error_occurred.value) {
                await Promise.all([
                    getVehicle(false, true),
                    reloadCommandsDataTable()
                ])
            }
        }, 30000)
    })

    onBeforeUnmount(() => {
        clearInterval(interval)
    })
</script>

<style>
    .p-tabview-panels {
        padding: 0px !important;
    }
</style>