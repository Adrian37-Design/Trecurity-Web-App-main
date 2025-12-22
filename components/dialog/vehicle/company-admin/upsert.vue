<template>
    <form @submit.prevent="upsert()">
        <div v-if="is_data_loading" class="d-flex">
            <div class="m-auto">Loading...</div>
        </div>
        <div v-else class="row">
            <div class="form-group row">
                <div class="col-md-6">
                    <label for="number_plate" class="text-muted fs-2 mb-1 ms-2">Number Plate</label>
                    <InputText v-model="number_plate" />
                </div>
                <div class="col-md-6 mt-4">
                    <span class="p-float-label">
                        <Dropdown inputId="vehicle_type" v-model="type" style="width: 93%;" optionLabel="name" optionValue="name" :options="type_list" filter placeholder="Choose Vehicle Type">
                            <template #option="slotProps">
                                <div style="width: 100%;" class="d-flex justify-content-between">
                                    <div>{{ slotProps.option.name }}</div>
                                    <span>
                                        <i style="color: #10b981;" class="fs-6 text-primary" :class="slotProps.option.icon"></i>
                                    </span>
                                </div>
                            </template> 
                        </Dropdown>
                        <label for="vehicle_type">Vehicle Type</label>
                    </span>
                </div>
                <div class="col-md-12 mt-4">
                    <span class="p-float-label">
                        <MultiSelect v-model="users" :options="user_list" :optionLabel="({ name, surname }) => `${ name } ${ surname }`" display="chip" filter :filterFields="[ 'name', 'surname', 'email' ]" :virtualScrollerOptions="{ itemSize: 38 }" placeholder="Select Users" class="w-full md:w-20rem">
                            <template #option="slotProps">
                                <div>{{ slotProps.option.name }} {{ slotProps.option.surname }} ({{ slotProps.option.email }})</div>
                            </template>
                        </MultiSelect>
                        <label for="users">Owners</label>
                    </span>
                </div>
                <div v-if="current_data" class="col-md-12 mt-4">
                    <SelectButton id="status" v-model="status" :allow-empty="false" optionLabel="name" optionValue="value" :options="[{ name: 'ENABLE', value: true }, { name: 'DISABLE', value: false }]" class="float-end" aria-labelledby="basic" />
                </div>
            </div>
            <div class="d-flex justify-content-between mt-3">
                <Button type="submit" :loading="is_loading" :label="current_data ? 'Update' : 'Create'" :class="{ 'p-button-secondary': !number_plate || !type || users.length === 0 }" />
            </div>
        </div>
    </form>
</template>

<script setup lang="ts">
    import { useToast } from 'primevue/usetoast'
    import $ from "jquery"
    import { type User, type Vehicle, type Company } from '@prisma/client'

    const toast = useToast();
    
    const token = useCookie('token')
    const { user } = useUser();

    const { current_data } = defineProps<{
        current_data?: Vehicle & { company: Company, user: User[] }
    }>()

    const emit = defineEmits(['reloadTable'])

    const number_plate = ref<string>(current_data?.number_plate)
    const type = ref<string>(current_data?.type)
    const type_list = ref<any>([
        { name: "MOTORBIKE", icon: "ti ti-motorbike" },
        { name: "CAR", icon: "ti ti-car" },
        { name: "TRUCK", icon: "ti ti-truck" },
        { name: "TRACTOR", icon: "ti ti-tractor" },
        { name: "FORKLIFT", icon: "ti ti-forklift" },
        { name: "ESCAVATOR", icon: "ti ti-backhoe" },
        { name: "BULLDOZER", icon: "ti ti-bulldozer" },
        { name: "BUS", icon: "ti ti-bus" }
    ])
    const users = ref<User[]>(current_data?.user ?? [])
    const user_list = ref<any>([])
    const status = ref<boolean>(current_data?.status)
    const is_loading = ref<boolean>(false)
    const is_data_loading = ref(true);

    onMounted(async () => {
        try {
            // Get User List
            const get_user_list = await $fetch('/api/user/company-admin/list', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: user.value.id,
                    token: token.value
                })
            })

            if(get_user_list.success) {
                user_list.value = get_user_list.data
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
                number_plate: number_plate.value.toUpperCase(),
                type: type.value,
                users: users.value,
                status: status.value,
                vehicle_id: current_data?.id,
                user_id: user.value.id,
                token: token.value 
            }

            const { message, success } = await $fetch('/api/vehicle/company-admin/upsert', {
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
                toast.add({ severity: 'success', summary:  `${ current_data ? 'Update' : 'Create' } User`, detail: `The vehicle was successfully ${ current_data ? 'updated' : 'created' }`, life: 8000 })
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