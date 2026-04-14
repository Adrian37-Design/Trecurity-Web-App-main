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
                                <p class="fs-6 text-center">Forgot Password</p>
                                <form @submit.prevent="forgotPassword()">
                                    <div class="mb-3">
                                        <label for="email" class="form-label">Email</label>
                                        <InputText id="email" v-model="email" type="email" placeholder="Email" required validate />
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <Button v-if="!isLoadingForgotPassword" label="Reset Password" :class="{ 'p-button-secondary p-button p-component w-full font-medium': !email || isLoadingForgotPassword, 'p-button-success p-button p-component w-full font-medium': email }" type="submit" />
                                        <Button v-else :loading="true" :label="isGeneratingRecaptchaToken ? 'Verifying' : 'Loading'" class="w-auto" severity="secondary" disabled />
                                        <NuxtLink to="/login" class="mt-1">Back to Login</NuxtLink>
                                    </div>
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

    let { email, recaptcha_token, isLoadingForgotPassword } = storeToRefs(authStore);
    let isGeneratingRecaptchaToken = ref<boolean>(false);

    const forgotPassword = async () => {
   
        try {
            isLoadingForgotPassword.value = true;

            // Generate recaptcha token
            const verify = await loadRecaptcha();
            
            if(verify.success) {
                recaptcha_token.value = verify.token;

                let { data, success }: { data: any, success: boolean } = await authStore.forgotPassword();

                if(success){
                    if(!data.success){
                        toast.add({ severity:'warn', summary: 'Password Reset Failed', detail: data?.message, life: 8000});
                    } else {
                        toast.add({ severity:'success', summary: 'Success', detail: data?.message, life: 8000});
                    }
                }else{
                    toast.add({ severity:'warn', summary: 'Connection Error', detail: 'Please check your internet connection and try again.', life: 8000});
                }
            } 
            else {
                toast.add({ severity: 'warn', summary: 'Verification Failed', detail: 'Verification has failed. Please check your internet connection and try again.', life: 8000 });
            }
        }
        catch (error) {
            console.error(error);
        }
        finally {
            isLoadingForgotPassword.value = false;
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