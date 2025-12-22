<template>
    <div v-if="user">
        <LogsSuperAdminList v-if="user.approval_level === 'SUPER_ADMIN'" />
        <LogsCompanyAdminList v-if="user.approval_level === 'COMPANY_ADMIN'" />
        <LogsUserList v-if="user.approval_level === 'USER'" />
    </div>
</template>

<script setup lang="ts">

    const { user } = useUser();

    definePageMeta({
        title: "Logs",
        layout: "dashboard",
        middleware: ["auth"]
    });

    // TODO: consolidate Lists into one component
    // TODO: fix issue: not loading if visiting directly
</script>