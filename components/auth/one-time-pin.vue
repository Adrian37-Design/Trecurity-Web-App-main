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
                                <p class="fs-6 text-center">One Time Pin</p>
                                <form @submit.prevent="sendOTP()" class="pt-1">
                                    <div class="form-group">
                                        <InputOtp v-model="oneTimePin" integerOnly :length="6" v-bind="{ 'disabled': isLoadingSendOTP || isLoadingVerifyOTP }" />
                                    </div>
                                    <div class="d-flex justify-content-between mt-3">
                                        <Button :label="isLoadingVerifyOTP ? 'Verifying OTP' : first_time ? 'Sending OTP' : isLoadingSendOTP ? 'Resending OTP' : 'Resend OTP'" :loading="isLoadingSendOTP || isLoadingVerifyOTP" class="me-1" :class="{ 'p-button-secondary': isLoadingSendOTP || isLoadingVerifyOTP }" type="submit" />
                                        <div class="d-flex">
                                            <a @click="goBack()" class="text-primary text-decoration-none m-auto cursor-pointer">Back to {{ backToText }}</a>
                                        </div>
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
    import { useAuthStore } from "~/stores/auth";
    import { useToast } from "primevue/usetoast";
    import { storeToRefs } from "pinia";

    const toast = useToast();

    const authStore = useAuthStore();

    const route: any = useRoute();

    const { backToText, backToLink, onSuccessLink } = defineProps<{
        backToText: string,
        backToLink: string,
        onSuccessLink: string
    }>();

    let { email, oneTimePin, isLoadingSendOTP, isLoadingVerifyOTP, option, invitation_id } = storeToRefs(authStore);
    const first_time = ref<boolean>(true);

    onMounted(() => {
        invitation_id.value = route.query.invitation_id;
    });

    const goBack = () => {
        if(process.client) {
            window.location.href = backToLink
        }
    }

    const sendOTP = async () => {
        try {
            isLoadingSendOTP.value = true;

            let { data, success }: { data: any, success: boolean } = await authStore.sendOTP();
        
            if(success){
                if (data.success) {
                    toast.add({ severity:'success', summary: 'One Time Pin', detail: `If you have an account enter the One Time Pin that has been sent to your email address "${ email.value }"`, life: 15000});
                }
                else {
                    toast.add({ severity:'warn', summary: 'One Time Pin', detail: data?.message, life: 8000});
                }
            }else{
                toast.add({ severity:'warn', summary: 'Connection Error', detail: 'Please check your internet connection and try again', life: 8000});
            }
        } catch (error) {
            console.error(error);
        }
        finally {
            isLoadingSendOTP.value = false;
            first_time.value = false;
        }
    }

    const verifyOTP = async () => {
        try {
            isLoadingVerifyOTP.value = true;

            let { data, success }: { data: any, success: boolean } = await authStore.verifyOTP();
            const { setUser } = useUser();

            if(success){
                if (data.success) {
                    if (option.value === "login") {
                        setUser(data);
                        return navigateTo(onSuccessLink, { external: true });
                    } else if (option.value === "register"){
                        toast.add({ severity:'success', summary: 'One Time Pin', detail: 'Registration was successful. Redirecting to Login page...', life: 0});

                        setTimeout(() => {
                            if(process.client){
                                return navigateTo(onSuccessLink, { external: true });
                            }
                        }, 2000);
                    }else if (option.value === "forgot-password"){
                        toast.add({ severity:'success', summary: 'One Time Pin', detail: "Password reset was successful. You can now use you new credentials to login to your account. Redirecting to Login page...", life: 0});

                        setTimeout(() => {
                            if(process.client){
                                return navigateTo(onSuccessLink, { external: true });
                            }
                        }, 2000);
                    }
                }
                else {
                    if(option.value != "forgot-password"){
                        toast.add({ severity:'warn', summary: 'One Time Pin', detail: data?.message, life: 8000});
                        oneTimePin.value = "";
                    }
                }
            }else{
                toast.add({ severity:'warn', summary: 'Connection Error', detail: 'Please check your internet connection and try again', life: 8000});
            }
        } catch (error) {
            console.error(error);
        }
        finally {
            isLoadingVerifyOTP.value = false;
        }
    }

    const autoSendVerification = () => {
        if(oneTimePin.value.length == 6){
            verifyOTP();
        }
    }

    watch(oneTimePin, () => {
        autoSendVerification();
    });

    onMounted(() => {
        sendOTP();
    });

</script>
