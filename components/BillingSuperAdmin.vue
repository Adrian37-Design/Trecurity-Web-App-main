<template>
    <div>
        <div class="row">
            <!-- Active Subscriptions -->
            <div class="col-12 mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title fw-bold text-success mb-3">
                            <i class="ti ti-check-circle me-2"></i>Active Subscriptions
                        </h5>
                        <DataTable :value="activeCompanies" paginator :rows="5" tableStyle="min-width: 50rem">
                            <Column field="name" header="Company"></Column>
                            <Column field="email" header="Email"></Column>
                            <Column field="phone" header="Phone"></Column>
                            <Column header="Plan">
                                <template #body="slotProps">
                                    <span v-if="slotProps.data.subscription_plan">
                                        {{ slotProps.data.subscription_plan.name }} 
                                        (${{ slotProps.data.subscription_plan.price }})
                                    </span>
                                    <span v-else class="text-muted">Pay-As-You-Go / Trial</span>
                                </template>
                            </Column>
                            <Column header="Expiry">
                                <template #body="slotProps">
                                    {{ slotProps.data.subscription_expiry ? moment(slotProps.data.subscription_expiry).format('DD MMM YYYY') : 'Never' }}
                                </template>
                            </Column>
                            <Column header="Status">
                                <template #body="slotProps">
                                    <span class="badge bg-success">Active</span>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>
            </div>

            <!-- Inactive / Pending / Expired -->
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title fw-bold text-warning mb-3">
                            <i class="ti ti-clock me-2"></i>Pending / Expired Subscriptions
                        </h5>
                        <DataTable :value="inactiveCompanies" paginator :rows="5" tableStyle="min-width: 50rem">
                            <Column field="name" header="Company"></Column>
                            <Column field="email" header="Email"></Column>
                            <Column field="phone" header="Phone"></Column>
                            <Column header="Plan">
                                <template #body="slotProps">
                                    <span v-if="slotProps.data.subscription_plan">
                                        {{ slotProps.data.subscription_plan.name }} 
                                    </span>
                                    <span v-else class="text-muted">None</span>
                                </template>
                            </Column>
                            <Column header="Expiry">
                                <template #body="slotProps">
                                    <span :class="{'text-danger': isExpired(slotProps.data.subscription_expiry)}">
                                        {{ slotProps.data.subscription_expiry ? moment(slotProps.data.subscription_expiry).format('DD MMM YYYY') : 'N/A' }}
                                    </span>
                                </template>
                            </Column>
                            <Column header="Status">
                                <template #body="slotProps">
                                    <span v-if="isExpired(slotProps.data.subscription_expiry)" class="badge bg-danger">Expired</span>
                                    <span v-else class="badge bg-warning text-dark">Pending</span>
                                </template>
                            </Column>
                        </DataTable>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import moment from 'moment';

const activeCompanies = ref([]);
const inactiveCompanies = ref([]);
const loading = ref(true);

const fetchSummary = async () => {
    loading.value = true;
    try {
        const res: any = await $fetch('/api/subscription/admin-summary');
        if (res.success) {
            activeCompanies.value = res.data.active;
            inactiveCompanies.value = res.data.inactive;
        }
    } catch (e) {
        console.error("Failed to fetch admin billing summary", e);
    } finally {
        loading.value = false;
    }
};

const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
}

onMounted(() => {
    fetchSummary();
});
</script>
