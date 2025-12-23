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
                                    <div class="mb-4">
                                        <label for="new_password" class="form-label">New Password</label>
                                        <Password v-model="newPassword" toggleMask placeholder="New Password" required validate >
                                            <template #header>
                                                <h6>Pick a password</h6>
                                            </template>
                                            <template #footer>
                                                <Divider />
                                                <p class="mt-2">Suggestions</p>
                                                <ul class="pl-2 ml-2 mt-0" style="line-height: 1.5">
                                                    <li>At least one lowercase</li>
                                                    <li>At least one uppercase</li>
                                                    <li>At least one numeric</li>
                                                    <li>Minimum 8 characters</li>
                                                </ul>
                                            </template>
                                        </Password>
                                    </div>
                                    <div class="mb-4">
                                        <label for="password" class="form-label">Confirm Password</label>
                                        <Password id="password" v-model="confirmNewPassword" :feedback="false" toggleMask placeholder="Password" required validate />
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <Button v-if="!isLoadingForgotPassword" label="Reset Password" :class="{ 'p-button-secondary p-button p-component w-full font-medium': !email || !newPassword || !confirmNewPassword || (newPassword !== confirmNewPassword) || isLoadingForgotPassword, 'p-button-success p-button p-component w-full font-medium': email && newPassword && confirmNewPassword && (newPassword === confirmNewPassword) }" type="submit" />
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

    let { email, newPassword, confirmNewPassword, token, recaptcha_token, openTwoFactorAuth, isLoadingForgotPassword } = storeToRefs(authStore);
    let isGeneratingRecaptchaToken = ref<boolean>(false);

    const forgotPassword = async () => {
        // Check if password contains any segment of the user's name, surname or email
        const check_password = checkIfPasswordIncludesUserData(newPassword.value, [email.value]);

        // Check if the password is strong
        if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/.test(newPassword.value)) {
            toast.add({ severity: 'info', summary: 'Registration', detail: "Your password is not strong enough. Please make sure that it is at least 8 characters long with at least one Uppercase letter, Lowercase letter and a number.", life: 8000});
        } 
        else if (check_password.length > 0) {
            toast.add({ severity: 'info', summary: 'Registration', detail: `Your password cannot contain any segment of your email e.g ${ check_password.slice(0, 5).join(", ") }`, life: 8000});
        }
        else {
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
                        }
                        else if(data.open_two_factor_auth == true) {
                            token.value = data.token;
                            openTwoFactorAuth.value = true;
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
    }

    const checkIfPasswordIncludesUserData = (password: string, list: string[]) => {
        // This function checks if the user's password contains any 4 letters or more in common with the entered user data and then returns then matches
        let arr = [];

        password = password.toLowerCase()
        list = list.map(word => word.toLowerCase())
        
        for (let index = 0; index < password.length; index++) {
            let offset_word = password.slice(index)
            let chunk_arr = [];
            
            for (let i = 1; i <= offset_word.length; i++) {
                if(i >= 4) chunk_arr.push(offset_word.slice(0, i))
            }
            
            arr.push(chunk_arr)
        }

        let matches = [];
        arr.flat().some(chunk => list.some(i => {
            if(i.includes(chunk)) matches.push(chunk)
        }))

        return matches
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