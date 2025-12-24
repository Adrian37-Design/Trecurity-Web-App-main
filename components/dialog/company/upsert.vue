<template>
    <form @submit.prevent="upsert()">
        <div class="row">
            <div class="text-muted fs-5">Company Details</div>
            <div class="form-group row">
                <div class="col-md-6 col-sm-6 mt-3">
                    <span class="p-float-label">
                        <InputText id="name" v-model="name" autofocus required />
                        <label for="name">Name</label>
                    </span>
                </div>
                <div class="col-md-6 col-sm-6 mt-3">
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
                    <span class="p-float-label">
                        <InputText id="website" v-model="website" />
                        <label for="website">Website (Optional)</label>
                    </span>
                </div>
                <div class="col-md-12 mt-4">
                    <span class="p-float-label">
                        <InputText id="physical_address" v-model="physical_address" />
                        <label for="physical_address">Physical Address (Optional)</label>
                    </span>
                </div>
                <div v-if="current_data" class="col-md-12 mt-4">
                    <SelectButton id="status" v-model="status" :allow-empty="false" optionLabel="name" optionValue="value" :options="[{ name: 'ENABLE', value: true }, { name: 'DISABLE', value: false }]" class="float-end" aria-labelledby="basic" />
                </div>
            </div>
            <div v-if="!current_data" class="text-muted mt-4 fs-5">Initial Admin User</div>
            <div v-if="!current_data" class="form-group row">
                <div class="col-md-6 col-sm-6 mt-3">
                    <span class="p-float-label">
                        <InputText id="name" v-model="initial_admin_name" required />
                        <label for="name">Name</label>
                    </span>
                </div>
                <div class="col-md-6 col-sm-6 mt-3">
                    <span class="p-float-label">
                        <InputText id="surname" v-model="initial_admin_surname" required />
                        <label for="surname">Surname</label>
                    </span>
                </div>
                <div class="col-md-6 col-sm-6 mt-4">
                    <span class="p-float-label">
                        <InputText id="email" type="email" v-model="initial_admin_email" required validate/>
                        <label for="email">Email</label>
                    </span>
                </div>
                <div class="col-md-6 col-sm-6 mt-4">
                    <span class="p-float-label">
                        <InputText id="phone" v-model="initial_admin_phone" required />
                        <label for="phone">Phone</label>
                    </span>
                </div>
            </div>
            <div class="mt-3">
                <Button type="submit" :loading="is_loading" :label="current_data ? 'Update' : 'Create'" :class="{ 'p-button-secondary': !name || !email || !phone || (!current_data && (!initial_admin_name || !initial_admin_surname || !initial_admin_email || !initial_admin_phone)) }" />
            </div>
        </div>
    </form>
</template>

<script setup lang="ts">
    import { useToast } from 'primevue/usetoast'
    import $ from "jquery"
    import { type Company, type User } from '@prisma/client'

    const toast = useToast();
    
    const token = useCookie('token')
    const { user } = useUser();

    const { current_data } = defineProps<{
        current_data?: Company
    }>()

    const emit = defineEmits(['reloadTable'])

    const name = ref<string>(current_data?.name)
    const email = ref<string>(current_data?.email)
    const phone = ref<string>(current_data?.phone)
    const website = ref<string>(current_data?.website)
    const physical_address = ref<string>(current_data?.physical_address)
    const status = ref<boolean>(current_data?.status)
    const initial_admin_name = ref<string>()
    const initial_admin_surname = ref<string>()
    const initial_admin_email = ref<string>()
    const initial_admin_phone = ref<string>()
    const is_loading = ref<boolean>(false)
    
    const upsert = async () => {
        try {
            is_loading.value = true

            const details = {
                name: name.value,
                email: email.value,
                phone: phone.value,
                website: website.value,
                physical_address: physical_address.value,
                status: status.value,
                initial_admin_name: initial_admin_name.value,
                initial_admin_surname: initial_admin_surname.value,
                initial_admin_email: initial_admin_email.value,
                initial_admin_phone: initial_admin_phone.value,
                company_id: current_data?.id,
                user_id: user.value.id,
                token: token.value 
            }

            const { message, success } = await $fetch('/api/company/upsert', {
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
                toast.add({ severity: 'success', summary:  `${ current_data ? 'Update' : 'Create' } Company`, detail: `The company was successfully ${ current_data ? 'updated' : 'created and we have sent the initial admin their login credentials on ' + initial_admin_email.value + '.' }`, life: 8000 })
                emit('reloadTable', true)
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