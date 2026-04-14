<template>
    <div>
        <AuthForgotPassword v-if="!openTwoFactorAuth" />
        <AuthOneTimePin v-else backToText="Login" backToLink="/login" onSuccessLink="/login?forgot_password=success" />
    </div>
</template>

<script setup lang="ts">
    import { storeToRefs } from "pinia";
    import { useAuthStore } from "~~/stores/auth";
    
    definePageMeta({
        title: "Forgot Password",
        layout: "auth",
        middleware: ["not-auth"]
    });

    const authStore = useAuthStore();

    const { openTwoFactorAuth, option } = storeToRefs(authStore);

    onMounted(() => {
        option.value = "forgot-password";
    });
</script>
