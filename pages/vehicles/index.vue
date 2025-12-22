<template>
    <main>
        <VehicleSuperAdminList v-if="user?.approval_level === 'SUPER_ADMIN'" />
        <VehicleCompanyAdminList v-if="user?.approval_level === 'COMPANY_ADMIN'" />
        <VehicleUserList v-if="user?.approval_level === 'USER'" />
    </main>
</template>

<script setup lang="ts">

    const { user } = useUser();

    definePageMeta({
        title: "Vehicles",
        layout: "dashboard",
        middleware: ["auth"]
    });

    // TODO: unify the list components. Remember no "Create Vehicle" button for users
    // TODO: fix issue: not loading when visited directly

</script>