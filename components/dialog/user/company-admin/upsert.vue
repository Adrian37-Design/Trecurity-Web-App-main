<template>
    <form @submit.prevent="upsert()">
        <div class="row">
            <div class="form-group row">
                <div class="col-md-6 col-sm-6 mt-4">
                    <span class="p-float-label">
                        <InputText id="name" v-model="name" required />
                        <label for="name">Name</label>
                    </span>
                </div>
                <div class="col-md-6 col-sm-6 mt-4">
                    <span class="p-float-label">
                        <InputText id="surname" v-model="surname" required />
                        <label for="surname">Surname</label>
                    </span>
                </div>
                <div class="col-md-6 col-sm-6 mt-4">
                    <span class="p-float-label">
                        <InputText id="email" type="email" v-model="email" required validate/>
                        <label for="email">Email</label>
                    </span>
                </div>
                <div class="col-md-6 col-sm-6 mt-4">
                    <span class="p-float-label">
                        <InputText id="phone" v-model="phone" required />
                        <label for="phone">Phone</label>
                    </span>
                </div>
                <div class="col-md-6 col-sm-6 mt-4">
                    <Dropdown inputId="role" v-model="approval_level" style="width: 93%;" :options="[ 'COMPANY_ADMIN', 'USER' ]" filter placeholder="Choose the user role" />
                </div>
                <div v-if="current_data" class="col-md-12 mt-4">
                    <SelectButton id="status" v-model="status" :allow-empty="false" optionLabel="name" optionValue="value" :options="[{ name: 'ENABLE', value: true }, { name: 'DISABLE', value: false }]" class="float-end" aria-labelledby="basic" />
                </div>
            </div>
            <div class="d-flex justify-content-between mt-3">
                <Button type="submit" :loading="is_loading" :label="current_data ? 'Update' : 'Create'" :class="{ 'p-button-secondary': !name || !surname || !email || !phone }" />
            </div>
        </div>
    </form>
</template>

<script setup lang="ts">
    import { useToast } from 'primevue/usetoast'
    import $ from "jquery"
    import { type User, type ApprovalLevel } from '@prisma/client'

    const toast = useToast();
    
    const token = useCookie('token')
    const { user } = useUser();

    const { current_data } = defineProps<{
        current_data?: any
    }>()

    const name = ref<string>(current_data?.name)
    const surname = ref<string>(current_data?.surname)
    const email = ref<string>(current_data?.email)
    const phone = ref<string>(current_data?.phone)
    const status = ref<boolean>(current_data?.status)
    const approval_level = ref<ApprovalLevel>(current_data?.approval_level)
    const is_loading = ref<boolean>(false)
    
    const upsert = async () => {
        try {
            is_loading.value = true

            const details = {
                name: name.value,
                surname: surname.value,
                email: email.value,
                phone: phone.value,
                status: status.value,
                update_user_id: current_data?.id,
                approval_level: approval_level.value,
                user_id: user.value.id,
                token: token.value 
            }

            const { message, success } = await $fetch('/api/user/company-admin/upsert', {
                method: 'POST',
                body: JSON.stringify(details)
            })
            .catch(error => {
                return {
                    message: error,
                    success: false
                }
            })

            if(success) {
                toast.add({ severity: 'success', summary:  `${ current_data ? 'Update' : 'Create' } User`, detail: `The user was successfully ${ current_data ? 'updated' : 'created and we have sent their login credentials to ' + email.value + '.' }`, life: 8000 })
                $('.p-dialog-header-close').click()
            } else {
                if(message?.toString().includes("<no response> Failed to fetch") || message?.toString().includes("net::ERR")) {
                    toast.add({ severity: 'warn', summary: 'Network Error', detail: 'Bad internet connection. Please check your internet connection and try again.', life: 8000})
                } else {
                    toast.add({ severity: 'warn', summary: 'App Error', detail: "An internal application error has occurred. Please try to refresh your page and start again.", life: 8000})
                }
            }
        } catch (error) {
            console.error(error)
            toast.add({ severity: 'warn', summary: 'Connection Error', detail: "An error has occurred trying to connect. Please check your internet connection and try again.", life: 8000 })
        } finally {
            is_loading.value = false
        }
    }
</script>

<style>

</style>