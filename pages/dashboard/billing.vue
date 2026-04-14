<template>
    <main>
        <div class="card">
            <div class="card-header">
                <h3>Billing & Subscription</h3>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <div class="p-3 border rounded">
                            <h5>Current Status</h5>
                            <p class="mb-1"><strong>Plan:</strong> Standard Enterprise</p>
                            <p class="mb-1"><strong>Status:</strong> <span class="badge bg-success">Active</span></p>
                            <p class="mb-1"><strong>Expires:</strong> {{ expiryDate }}</p>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="p-3 border rounded bg-light">
                            <h5>Top Up Subscription</h5>
                            <p class="text-muted text-sm">Secure payment via Paynow (EcoCash, OneMoney, Visa/Mastercard)</p>
                            
                            <div class="mb-3">
                                <label class="form-label">Amount (USD)</label>
                                <InputText v-model="amount" type="number" class="w-100" placeholder="e.g. 15.00" />
                            </div>

                            <Button @click="initiatePayment" label="Pay with Paynow" icon="pi pi-credit-card" :loading="loading" />
                        </div>
                    </div>
                </div>

                <div v-if="paymentLink" class="alert alert-success mt-3">
                    Payment initiated! <a :href="paymentLink" target="_blank" class="fw-bold">Click here to complete payment</a> if not redirected automatically.
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { useToast } from 'primevue/usetoast';

const { user } = useUser();
const toast = useToast();

definePageMeta({
    layout: "dashboard",
    middleware: ["auth"]
})

const loading = ref(false);
const amount = ref('15.00');
const paymentLink = ref('');
const expiryDate = ref('Loading...');

onMounted(async () => {
    // Fetch company expiry details (Mock for now, or fetch from API)
    expiryDate.value = "2026-12-31"; // TODO: Fetch real date
});

const initiatePayment = async () => {
    if(!amount.value || parseFloat(amount.value) <= 0) {
        toast.add({ severity: 'warn', summary: 'Invalid Amount', detail: 'Please enter a valid amount', life: 3000 });
        return;
    }

    loading.value = true;
    paymentLink.value = '';

    try {
        const result: any = await $fetch('/api/paynow/initiate', {
            method: 'POST',
            body: {
                amount: amount.value,
                email: user.value.email,
                company_id: user.value.company_where_user_is_customer_id || user.value.company_where_user_is_admin_id
            }
        });

        if (result.success) {
            paymentLink.value = result.redirect_link;
            toast.add({ severity: 'success', summary: 'Redirecting...', detail: 'Please complete payment on Paynow', life: 5000 });
            
            // Redirect immediately
            window.location.href = result.redirect_link;
        } else {
            toast.add({ severity: 'error', summary: 'Payment Failed', detail: result.message, life: 5000 });
        }

    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Server error initiating payment', life: 5000 });
    } finally {
        loading.value = false;
    }
}
</script>
