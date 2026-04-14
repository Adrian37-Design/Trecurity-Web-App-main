<template>
    <main>
        <div class="p-dialog-content" data-pc-section="content">
            <div class="d-flex flex-column w-full">
                <p class="font-normal text-base mt-0 mb-3 text-600 modal-text">Protecting your profile and data is our first priority hence by deleting your account you consent to irreversible data loss. Please confirm deletion of your account by entering the authorization code sent to <strong>{{ email }}</strong></p>
                <div class="flex justify-content-between w-full align-items-center mb-4 gap-2">
                    <InputOtp  v-model="delete_pin" :length="6"  />
                </div>
            </div>
        </div>
        <div class="p-dialog-footer">
            <div style="width: 100%;" class="pt-3 d-flex justify-content-between">
                <div class="text-left">
                    <Button @click="sendOTP()" label="Resend OTP" :loading="isLoadingSendOTP" class="me-1" :class="{ 'p-button-secondary': isLoadingSendOTP }" />
                </div>
                <Button @click="verifyOTP()" label="Delete Account" :loading="isLoadingVerifyOTP" :class="{ 'p-button-secondary': delete_pin.length < 6, 'p-button-danger': delete_pin.length === 6 }" v-bind:disabled="delete_pin.length < 6" />
            </div>
        </div>
    </main>
</template>
<script lang="ts" setup>
    import { useAuthStore } from "~/stores/auth"
    import { useToast } from "primevue/usetoast"
    import { type User } from '@prisma/client'
    
    const user = useState<User>("user")
    const token = useCookie("token")
    const toast = useToast()
    const authStore = useAuthStore()
    const delete_pin = ref<string>("")
    const name = ref<string>()
    const surname = ref<string>()
    const email = ref<string>()
    const phone = ref<string>()
    const isLoadingSendOTP = ref<boolean>(false)
    const isLoadingVerifyOTP = ref<boolean>(false)

    const { data }: any = await useFetch('/api/user/find', {
        method: 'POST',
        body: JSON.stringify({
            user_id: user.value.id,
            token: token.value
        })
    });

    name.value = data.value.data.name
    surname.value = data.value.data.surname
    email.value = data.value.data.email
    phone.value = data.value.data.phone

    const sendOTP = async () => {
        try {
            isLoadingSendOTP.value = true

            let info = {
                user_id: user.value.id,
                email: email.value,
                option: "delete",
                token: token.value
            }

            let { data, success }: { data: any, success: boolean } = await authStore.sendDeleteOTP(info)
            
            if(success){
                if (data.success) {
                    toast.add({ severity:'success', summary: 'One Time Pin', detail: `If you have an account enter the One Time Pin that has been sent to your email address "${ email.value }"`, life: 15000});
                }
                else {
                    toast.add({ severity:'warn', summary: 'One Time Pin', detail: data?.message, life: 8000})
                }
            } else{
                toast.add({ severity:'warn', summary: 'Login Failed', detail: 'Server Error has occurred', life: 8000})
            }
        } catch (error) {
            console.error(error)

            toast.add({ severity: 'warn', summary: 'Internal Error', detail: "This is an internal application error. Please try again.", life: 8000})
        } finally {
            isLoadingSendOTP.value = false
        }
    }
    
    const verifyOTP = async () => {
        try {
            isLoadingVerifyOTP.value = true

            let info = {
                user_id: user.value.id,
                email: email.value,
                token: token.value,
                one_time_pin: delete_pin.value
            }

            await authStore.verifyDeleteOTP(info).then(async(result:any) => {
                if(result?.data?.success){
                    toast.add({ severity:'success', summary: 'Account Deleted', detail: 'Account successfully Deleted', life: 8000})
                    await authStore.flushDeletedUser()
                }else{
                    toast.add({ severity:'warn', summary: 'Deleting Failed', detail: result?.data?.message, life: 8000});
                }
            })
        } catch (error) {
            console.error(error)

            toast.add({ severity: 'warn', summary: 'Internal Error', detail: "This is an internal application error. Please try again.", life: 8000})
        } finally {
            isLoadingVerifyOTP.value = false
        }
    }
</script>

<style scoped>
    span.w-4rem.h-4rem.border-circle.flex.justify-content-center.align-items-center.bg-blue-100 {
        background-color: red;
        width: 4rem;
        height: 4rem;
        border-radius: 40px;
        color: white;
    }

    .modal-text {
        font-size: 1rem;
    }

    .modal-text.link {
        text-decoration: none;
    }

    button.p-dialog-header-icon.p-dialog-header-close.p-link {
        display: none;
    }
</style>