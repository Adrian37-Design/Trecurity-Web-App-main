<template>
    <main>
        <DashboardSkeleton v-if="isPageLoading" />
        <div v-else>
            <DashboardSuperAdmin v-if="user.approval_level === 'SUPER_ADMIN'" />
            <DashboardCompanyAdmin v-else-if="user.approval_level === 'COMPANY_ADMIN'" />
            <DashboardUser v-else-if="user.approval_level === 'USER'" />
        </div>
    </main>
</template>

<script setup lang="ts">

    const { user } = useUser();

    definePageMeta({
        title: "Dashboard",
        layout: "dashboard",
        middleware: ["auth"]
    })

    const nuxtApp = useNuxtApp();
    
    const isPageLoading = ref(true);

    nuxtApp.hook("page:finish", () => {
        setTimeout(() => {
            isPageLoading.value = false;
        }, 1000)
    });
</script>