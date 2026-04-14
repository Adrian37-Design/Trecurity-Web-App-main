<template>
    <div>
        <div class="row mb-5">
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h5 class="card-title fw-semibold">Subscription & Billing</h5>
                        </div>

                        <div class="row">
                            <div class="col-md-6">
                                <div class="p-4 border rounded bg-light-success">
                                    <h5 class="mb-3">Current Status</h5>
                                    <p class="mb-2"><strong>Plan:</strong> Standard Enterprise</p>
                                    <p class="mb-2"><strong>Status:</strong> <span class="badge bg-success">Active</span></p>
                                    <p class="mb-0"><strong>Expires:</strong> {{ expiryDate }}</p>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="p-4 border rounded bg-light">
                                    <h5 class="mb-3">Top Up Subscription</h5>
                                    <p class="text-muted text-sm mb-3">Secure payment via Paynow (EcoCash, OneMoney, Visa/Mastercard)</p>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Amount (USD)</label>
                                        <InputText v-model="amount" type="number" class="w-100 p-2 border rounded" placeholder="e.g. 15.00" />
                                    </div>

                                    <Button @click="initiatePayment" label="Pay with Paynow" icon="pi pi-credit-card" :loading="loading" class="w-100" />
                                </div>
                            </div>
                        </div>

                        <div v-if="paymentLink" class="alert alert-success mt-4">
                            Payment initiated! <a :href="paymentLink" target="_blank" class="fw-bold text-decoration-underline">Click here to complete payment</a> if not redirected automatically.
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';

definePageMeta({
    layout: 'dashboard',
    middleware: ['auth']
});

const toast = useToast();
const { user } = useUser();
const loading = ref(false);
const amount = ref('15.00');
const paymentLink = ref('');
const expiryDate = ref('Loading...');

onMounted(async () => {
    // Fetch company expiry details (Mock for now, or fetch from API)
    // TODO: Ideally verify this against the actual expiry date in DB
    expiryDate.value = "2026-12-31"; 
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
            // Ensure endpoint URL is correct relative to server root
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
