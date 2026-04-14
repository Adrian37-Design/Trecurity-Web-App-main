<template>
    <div>
        <AuthLogin v-if="!openTwoFactorAuth" />
        <AuthOneTimePin v-else backToText="Login" backToLink="/login" onSuccessLink="/dashboard" />
    </div>
</template>

<script setup lang="ts">
    import { storeToRefs } from "pinia";
    import { useAuthStore } from "~~/stores/auth";
    
    definePageMeta({
        title: "Login",
        layout: "auth",
        middleware: ["not-auth"]
    });

    const authStore = useAuthStore();

    const { openTwoFactorAuth, option } = storeToRefs(authStore);

    onMounted(() => {
        option.value = "login";
    });
</script>
