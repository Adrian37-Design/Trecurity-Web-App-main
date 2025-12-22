<template>
    <div v-if="user">
        <UserSuperAdminList v-if="user.approval_level === 'SUPER_ADMIN'" />
        <UserCompanyAdminList v-else-if="user.approval_level === 'COMPANY_ADMIN'" />
    </div>
</template>

<script setup lang="ts">

    const { user } = useUser();

    definePageMeta({
        title: "Users",
        layout: "dashboard",
        middleware: ["auth"]
    });

    // TODO: /user/list -> /users
    // TODO: unify list components
    // TODO: fix issue: not loading when visited directly
</script>