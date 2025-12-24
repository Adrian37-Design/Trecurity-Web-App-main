<template>
    <form @submit.prevent="upsert()">
        <div v-if="is_data_loading" class="d-flex">
            <div class="m-auto">Loading...</div>
        </div>
        <div v-else class="row">
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
                    <Dropdown inputId="role" v-model="approval_level" style="width: 93%;" :options="[ 'SUPER_ADMIN', 'COMPANY_ADMIN', 'USER' ]" filter placeholder="Choose the user role" />
                </div>
                <div v-if="approval_level !== 'SUPER_ADMIN'" class="col-md-6 mt-4">
                    <span v-if="approval_level === 'COMPANY_ADMIN'" class="p-float-label">
                        <Dropdown v-model="company_where_user_is_admin" :options="company_list" filter optionLabel="name" :virtualScrollerOptions="{ itemSize: 38 }" placeholder="Select a Company" :input-props="{ 'required': true }" />
                        <label for="company_where_user_is_admin">Is an admin at</label>
                    </span>
                    <span v-else-if="approval_level === 'USER'" class="p-float-label">
                        <Dropdown v-model="company_where_user_is_customer" :options="company_list" filter optionLabel="name" :virtualScrollerOptions="{ itemSize: 38 }" placeholder="Select a Company" :input-props="{ 'required': true }" />
                        <label for="company_where_user_is_customer">Is a customer at</label>
                    </span>
                </div>
                <div v-if="current_data" class="col-md-12 mt-4">
                    <label for="status" class="form-label">Account Status:</label>
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
    import { type User, type ApprovalLevel, type Company } from '@prisma/client'

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
    const company_where_user_is_admin = ref<Company>(current_data?.company_where_user_is_admin)
    const company_where_user_is_customer = ref<Company>(current_data?.company_where_user_is_customer)
    const company_list = ref<any>([])
    const is_loading = ref<boolean>(false)
    const is_data_loading = ref(true);

    onMounted(async () => {
        try {
            // Get Company list
            if (!user.value?.id) return;
            
            const get_company_list = await $fetch('/api/company/list', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: user.value.id,
                    token: token.value
                })
            }) as any

            if(get_company_list?.success) {
                company_list.value = get_company_list.data
            }
        } catch (error) {
            console.error(error)   
        }
        finally {
            is_data_loading.value = false
        }
    })
    
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
                company_where_user_is_admin_id: approval_level.value === 'COMPANY_ADMIN' ? company_where_user_is_admin.value.id : null,
                company_where_user_is_customer_id: approval_level.value === 'USER' ? company_where_user_is_customer.value.id : null,
                user_id: user.value.id,
                token: token.value 
            }



            const { message, success } = await $fetch('/api/user/super-admin/upsert', {
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