
<template>
    <div class="p-fluid">
        <TabView>
            <TabPanel header="General">
                <div class="field">
                    <label for="speed_limit">Speed Limit (km/h)</label>
                    <InputText id="speed_limit" v-model="form.speed_limit" type="number" placeholder="e.g. 80" />
                </div>
                <!-- Phone Number is typically SIM phone, but maybe user wants to override config phone -->
                <div class="field" v-if="!isCompanyAdmin">
                    <label for="phone_number">Device Phone Number</label>
                    <InputText id="phone_number" v-model="form.phone_number" />
                </div>
                <div class="field" v-if="!isCompanyAdmin">
                    <label for="config">Additional Configuration (Text)</label>
                    <Textarea id="config" v-model="form.config" rows="5" />
                </div>
            </TabPanel>

            <TabPanel header="Installation" v-if="!isCompanyAdmin">
                <div class="field">
                    <label for="company_name">Company Name</label>
                    <InputText id="company_name" v-model="form.company_name" />
                </div>
                <div class="field">
                    <label for="installer_name">Installer Name</label>
                    <InputText id="installer_name" v-model="form.installer_name" />
                </div>
                <div class="field">
                    <label for="installation_date">Installation Date</label>
                    <Calendar id="installation_date" v-model="form.installation_date" dateFormat="dd/mm/yy" />
                </div>
            </TabPanel>

            <TabPanel header="Network / APN" v-if="!isCompanyAdmin">
                <div class="field">
                    <label class="font-bold">APN 1</label>
                </div>
                <div class="formgrid grid">
                    <div class="field col">
                        <label for="apn_1">APN Name</label>
                        <InputText id="apn_1" v-model="form.apn_1" />
                    </div>
                    <div class="field col">
                        <label for="apn_user_1">Username</label>
                        <InputText id="apn_user_1" v-model="form.apn_user_1" />
                    </div>
                </div>
                <div class="field">
                    <label for="apn_password_1">Password</label>
                    <InputText id="apn_password_1" v-model="form.apn_password_1" />
                </div>

                <Divider />

                <div class="field">
                    <label class="font-bold">APN 2</label>
                </div>
                <div class="formgrid grid">
                    <div class="field col">
                        <label for="apn_2">APN Name</label>
                        <InputText id="apn_2" v-model="form.apn_2" />
                    </div>
                    <div class="field col">
                        <label for="apn_user_2">Username</label>
                        <InputText id="apn_user_2" v-model="form.apn_user_2" />
                    </div>
                </div>
                <div class="field">
                    <label for="apn_password_2">Password</label>
                    <InputText id="apn_password_2" v-model="form.apn_password_2" />
                </div>
            </TabPanel>

            <TabPanel header="Calibration" v-if="!isCompanyAdmin">
                <div class="field">
                    <label for="fuel_calibration">Fuel Calibration Variables</label>
                    <Textarea id="fuel_calibration" v-model="form.fuel_calibration" rows="8" />
                    <small>Enter generic variables or specific calibration data.</small>
                </div>
            </TabPanel>
        </TabView>

        <div class="flex justify-content-end mt-4">
            <Button label="Save & Send Command" icon="pi pi-send" :loading="isLoadingConfigure" @click="save" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useVehicleStore } from '~~/stores/vehicle';
import { useToast } from 'primevue/usetoast';

    const props = defineProps({
        vehicle: {
            type: Object,
            required: true
        }
    });

    const { user } = useUser();
    const isCompanyAdmin = computed(() => user.value.approval_level === 'COMPANY_ADMIN');


const emit = defineEmits(['close', 'reloadTable']);

const vehicleStore = useVehicleStore();
const { isLoadingConfigure } = storeToRefs(vehicleStore);
const toast = useToast();

const form = ref({
    vehicle_id: props.vehicle.id,
    speed_limit: null,
    phone_number: props.vehicle.tracker_sim_phone || '',
    config: '',
    company_name: '',
    installer_name: '',
    installation_date: null,
    apn_1: '',
    apn_user_1: '',
    apn_password_1: '',
    apn_2: '',
    apn_user_2: '',
    apn_password_2: '',
    fuel_calibration: ''
});

// Load existing config if available
onMounted(() => {
    if (props.vehicle.configuration) {
        // Merge existing config into form
        const config = typeof props.vehicle.configuration === 'string' 
            ? JSON.parse(props.vehicle.configuration) 
            : props.vehicle.configuration;
            
        form.value = { ...form.value, ...config };
        
        // Ensure Installation Date is parsed if it was stored as string
        if (config.installation_date) {
            form.value.installation_date = new Date(config.installation_date);
        }
    }
});

const save = async () => {
    try {
        await vehicleStore.configure(form.value);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Configuration sent to device!', life: 3000 });
        emit('reloadTable');
        emit('close');
    } catch (error: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.statusMessage || 'Failed to send configuration', life: 5000 });
    }
};
</script>
