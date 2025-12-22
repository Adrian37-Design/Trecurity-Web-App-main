<template>
    <div v-if="showBanner" class="network-status-banner-container" :class="{ 'online': networkStatus, 'offline': !networkStatus }">
        <div class="status-banner">
            {{ networkStatus ? 'Internet connection' : 'No internet connection' }}
        </div>
    </div>
</template>

<script setup lang="ts">
    const showBanner = ref<boolean>(false);
    const networkStatus = ref<boolean>(true);

    const isOnline = () => {
        showBanner.value = true;
        networkStatus.value = true;

        setTimeout(() => {
            if(networkStatus.value === true){
                showBanner.value = false;
            }
        }, 3000)
    }

    onMounted(() => {
        if(process.client) {
            if(!navigator.onLine){
                showBanner.value = true;
                networkStatus.value = false;
            }

            window.addEventListener('online', () => {
                isOnline();
            });

            window.addEventListener('offline', () => {
                showBanner.value = true;
                networkStatus.value = false;
            });
        }
    })
</script>

<style scoped>
    .network-status-banner-container {
        position: fixed;
        bottom: 0;
        width: 100%;
        color: white;
        z-index: 1000;
    }

    .status-banner {
        text-align: center;
        width: 100%;
        font-family: "Roboto","Arial",sans-serif;
        font-size: 0.9rem;
        line-height: 28px;
        font-weight: 500;
    }

    .offline {
        background: #212121;
    }

    .online {
        background: #22c55e;
    }
</style>