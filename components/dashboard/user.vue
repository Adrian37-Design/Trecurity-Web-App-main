<template>
    <main>
        <div class="row flex-grow mt-3">
            <div class="col-md-12">
                <div class="d-flex align-items-center mb-3">
                    <div class="fs-6 ms-3">{{ data?.company?.name }}</div>
                    
                    <!-- Offline/Sync Status -->
                    <div class="ms-3">
                        <span v-if="!isOnline" class="badge bg-danger rounded-pill">
                            <i class="ti ti-wifi-off me-1"></i> Offline
                        </span>
                        <span v-else-if="queueSize > 0" class="badge bg-warning text-dark rounded-pill">
                            <i class="ti ti-refresh me-1" :class="{'ti-spin': isSyncing}"></i> 
                            {{ isSyncing ? 'Syncing...' : 'Pending Sync' }} ({{ queueSize }})
                        </span>
                    </div>
                </div>
            </div>
            <div class="col-md-3 col-sm-4 mb-4">
                <NuxtLink to="vehicles" class="icon-card mb-30 text-decoration-none text-dark">
                    <div class="icon blue">
                        <i class="ti ti-car"></i>
                    </div>
                    <div class="content">
                        <h5 class="mb-10">Vehicles</h5>
                        <h3 style="font-size: 1.7rem;" class="text-bold mb-10">{{ data?.vehicles ?? 0 }}</h3>
                    </div>
                </NuxtLink>
            </div>
        </div>
        <ClientOnly>
            <Map class="mt-sm-0 mt-4" />
        </ClientOnly>
        <div style="height: 25px;"></div>
    </main>
</template>

<script setup lang="ts">
    const token = useCookie('token')
    const user = useCookie<any>('user')

    const { isOnline, isSyncing, queueSize } = useOfflineSync()

    const { data: result, error } = await useFetch('/api/dashboard/user')
    const data = computed(() => result.value?.data);

    if (error.value) {
        console.error("Dashboard API Error:", error.value);
    }
</script>
