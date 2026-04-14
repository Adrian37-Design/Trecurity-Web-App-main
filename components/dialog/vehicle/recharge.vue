<template>
    <Dialog v-model:visible="visible" modal header="Airtime Recharge" :style="{ width: '450px' }">
        <div class="p-fluid">
            <!-- Phone Number -->
            <div class="field mb-3">
                <label for="phone">Tracker SIM Number</label>
                <div class="p-inputgroup">
                    <span class="p-inputgroup-addon">
                        <i class="ti ti-phone"></i>
                    </span>
                    <InputText id="phone" v-model="form.phone" placeholder="077..." />
                </div>
                <small class="text-muted">The number to be recharged.</small>
            </div>

            <!-- Amount -->
            <div class="field mb-3">
                <label for="amount">Amount (USD)</label>
                <InputNumber id="amount" v-model="form.amount" mode="currency" currency="USD" locale="en-US" :min="0.5" :max="100" placeholder="Enter amount" />
            </div>

            <!-- Email -->
            <div class="field mb-3">
                <label for="email">Receipt Email (Optional)</label>
                <InputText id="email" v-model="form.email" placeholder="admin@example.com" />
            </div>

            <!-- Payment Method -->
            <div class="field mb-4">
                <label class="mb-2">Payment Method</label>
                <div class="d-flex align-items-center border p-3 rounded cursor-pointer" @click="form.provider = 'paynow'" :class="{ 'border-primary bg-light': form.provider === 'paynow' }">
                    <RadioButton v-model="form.provider" value="paynow" inputId="paynow" />
                    <label for="paynow" class="ms-2 mb-0 cursor-pointer fw-bold">Paynow</label>
                    <div class="ms-auto text-muted text-sm">
                        EcoCash / OneMoney / Visa
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <Button label="Cancel" icon="pi pi-times" text @click="close" />
            <Button label="Pay & Recharge" icon="ti ti-bolt" severity="success" @click="submit" :loading="loading" :disabled="!form.phone || !form.amount" />
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import RadioButton from 'primevue/radiobutton';
import { useToast } from 'primevue/usetoast';

const props = defineProps<{
    vehicle: any
}>();

const emit = defineEmits(['close']);

const visible = ref(false);
const loading = ref(false);
const toast = useToast();
const { user } = useUser();
const token = useCookie('token');

const form = reactive({
    phone: '',
    amount: null,
    email: '',
    provider: 'paynow'
});

// Initialize
watch(() => props.vehicle, (newVal) => {
    if (newVal) {
        form.phone = newVal.tracker_sim_phone || '';
    }
}, { immediate: true });

const open = () => {
    visible.value = true;
    form.phone = props.vehicle?.tracker_sim_phone || '';
    form.amount = null;
    form.email = user.value?.email || '';
};

const close = () => {
    visible.value = false;
    emit('close');
};

const submit = async () => {
    if (!form.phone || !form.amount) {
        toast.add({ severity: 'warn', summary: 'Missing Info', detail: 'Please enter phone number and amount', life: 3000 });
        return;
    }

    loading.value = true;

    try {
        const result: any = await $fetch('/api/vehicle/recharge', {
            method: 'POST',
            body: {
                vehicle_id: props.vehicle.id,
                phone: form.phone,
                amount: form.amount,
                email: form.email,
                provider: form.provider,
                user_id: user.value.id,
                token: token.value
            }
        });

        if (result.success) {
            // If Paynow returns a redirect URL (Poll URL + Browser URL)
            if (result.data?.redirect_url) {
                // Open Paynow in new tab
                window.open(result.data.redirect_url, '_blank');
                toast.add({ severity: 'info', summary: 'Payment Initiated', detail: 'Complete payment in the new tab', life: 5000 });
                close();
            } else {
                toast.add({ severity: 'success', summary: 'Success', detail: 'Recharge successful', life: 3000 });
                close();
            }
        } else {
            toast.add({ severity: 'error', summary: 'Error', detail: result.message || 'Recharge failed', life: 5000 });
        }
    } catch (error: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: error.message || 'Network error', life: 5000 });
    } finally {
        loading.value = false;
    }
};

defineExpose({ open });
</script>

<style scoped>
.cursor-pointer {
    cursor: pointer;
}
.text-sm {
    font-size: 0.85rem;
}
</style>
