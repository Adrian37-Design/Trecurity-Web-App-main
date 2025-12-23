<template>
    <main>
        <div class="position-relative overflow-hidden radial-gradient min-vh-100 d-flex align-items-center justify-content-center">
            <div class="d-flex align-items-center justify-content-center w-100">
                <div class="row justify-content-center w-100">
                    <div class="col-md-8 col-lg-4 col-xxl-3">
                        <div class="card mb-0">
                            <div class="card-body">
                                <div class="d-flex justify-content-center">
                                    <img src="/images/logo-with-payoff-line.svg" width="150" alt="">
                                </div>
                                <p class="fs-6 text-center my-2">Sign In</p>
                                <form @submit.prevent="login()">
                                    <div class="mb-3">
                                        <label for="email" class="form-label">Email</label>
                                        <InputText id="email" v-model="email" type="email" placeholder="Email" required validate />
                                    </div>
                                    <div class="mb-4">
                                        <div class="d-flex justify-content-between">
                                            <label for="password" class="form-label">Password</label>
                                            <NuxtLink class="text-primary fw-bold" to="/forgot-password">Forgot Password</NuxtLink>
                                        </div>
                                        <Password inputId="password" v-model="password" :feedback="false" toggleMask placeholder="Password" required validate />
                                    </div>
                                    <Button v-if="!isLoadingLogin" label="Sign In" :class="{ 'p-button-secondary p-button p-component w-full font-medium': !email || !password || isLoadingLogin, 'p-button-success p-button p-component w-full font-medium': email && password }" type="submit" />
                                    <Button v-else :loading="true" :label="isGeneratingRecaptchaToken ? 'Verifying' : 'Loading'" class="w-full" severity="secondary" disabled />
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
    import { useAuthStore } from "~~/stores/auth";
    import { useToast } from "primevue/usetoast";
    import { storeToRefs } from "pinia";
    import { load } from 'recaptcha-v3';

    const toast = useToast();
    const authStore = useAuthStore();

    let { email, password, isLoadingLogin, token, recaptcha_token, openTwoFactorAuth } = storeToRefs(authStore);

    const route: any = useRoute();

    const isGeneratingRecaptchaToken = ref<boolean>(false);

    onMounted(() => {
        if(route.query.forgot_password === 'success') {
            toast.add({ severity: 'success', summary: 'Password Reset', detail: "The password reset was successful. Now use your new password to sign into your account.", life: 15000});
        }
    })

    const login = async () => {
        try {
            isLoadingLogin.value = true;

            // Generate recaptcha token
            const verify = await loadRecaptcha();

            if (!verify.success) {
                toast.add({ severity: 'warn', summary: 'Verification Failed', detail: 'Verification has failed. Please check your internet connection and try again.', life: 8000 });
                return;
            }
                
            recaptcha_token.value = verify.token;

            try {
                const { data, success, open_two_factor_auth, token: strToken } = await authStore.login();
                
                if (data) {
                    const { setUser } = useUser();
                    setUser(data);
                }
                
                if (open_two_factor_auth == true) {
                    token.value = strToken;
                    openTwoFactorAuth.value = true;
                    return;
                }
                
                if (process.client) {
                    const router = useRouter();
                    router.push('/dashboard');
                }

            } catch (error) {
                toast.add({ severity: 'error', summary: 'Login Failed', detail: error.message, life: 8000 });
            }
                
        } catch (error) {
            console.error(error);
        } finally {
            isLoadingLogin.value = false;
        }
    }

    const loadRecaptcha = async () => {
        if(process.env.NODE_ENV === 'production') {
            isGeneratingRecaptchaToken.value = true;

            const { public: { RECAPTCHA_CLIENT_SITE_KEY } }: any = useRuntimeConfig();
            
            // Skip reCAPTCHA if key is not configured
            if (!RECAPTCHA_CLIENT_SITE_KEY || RECAPTCHA_CLIENT_SITE_KEY === '' || RECAPTCHA_CLIENT_SITE_KEY === 'dummy-recaptcha-key') {
                isGeneratingRecaptchaToken.value = false;
                return {
                    token: "",
                    success: true
                }
            }
        
            return await load(RECAPTCHA_CLIENT_SITE_KEY, {
                autoHideBadge: true
            }).then(async (recaptcha) => {
                return await recaptcha.execute('login').then((token) => {
                    return {
                        token,
                        success: true
                    }
                })
                .catch(error => {
                    console.error(error)

                    return {
                        token: "",
                        success: false
                    }
                })
            })
            .catch(error => {
                console.error(error)

                return {
                    token: "",
                    success: false
                }
            })
            .finally(() => isGeneratingRecaptchaToken.value = false);
        } else {
            return {
                token: "",
                success: true
            }
        }
    }
</script>