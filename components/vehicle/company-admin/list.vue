
<template>
    <div class="card">
        <div class="card-body row">
            <div class="block">
                <div class="col-md-12">
                    <Table
                        :columns="columns"
                        :server_side_url="server_side_url"
                        :options="options"
                        :breadcrumbs="[{ label: 'Vehicles', route: '/vehicles' }]"
                        ref="table"
                    >
                        <template #actions>
                            <Button @click="showCreateVehicleDialog = true" label="Create Vehicle" size="small" />
                        </template> 
                    </Table>
                </div>
            </div>
        </div>
    </div>

    <Dialog v-model:visible="showCreateVehicleDialog" modal header="Create Vehicle" :style="{ width: '55vw' }">
        <DialogVehicleCompanyAdminUpsert v-if="user.approval_level === 'COMPANY_ADMIN'" @reloadTable="reloadTable" />
    </Dialog>
    <Dialog v-model:visible="showEditVehicleDialog" modal header="Edit Vehicle" :style="{ width: '55vw' }">
        <DialogVehicleCompanyAdminUpsert v-if="user.approval_level === 'COMPANY_ADMIN'" :current_data="edit_vehicle_data" @reloadTable="reloadTable" />
    </Dialog>
    <Dialog v-model:visible="showConfigureVehicleDialog" header="Configuration" :style="{ width: '50vw' }" :modal="true"> 
        <DialogVehicleConfiguration v-if="edit_vehicle_data" :vehicle="edit_vehicle_data" @reloadTable="reloadTable" @close="showConfigureVehicleDialog = false" />
    </Dialog>

    <Dialog v-model:visible="showDeleteVehicleDialog" modal header="Confirm Deletion" :style="{ width: '30vw' }">
        <div class="flex flex-column align-items-center justify-content-center p-4">
            <i class="pi pi-exclamation-triangle text-danger" style="font-size: 3rem"></i>
            <p class="mt-4 text-center">Are you sure you want to delete vehicle <strong>${ delete_vehicle_plate }</strong>?<br>This action cannot be undone and will delete all associated tracking data.</p>
        </div>
        <template #footer>
            <div class="flex justify-content-end gap-2">
                <Button label="Cancel" icon="pi pi-times" text @click="showDeleteVehicleDialog = false" />
                <Button label="Yes, Delete" icon="pi pi-trash" severity="danger" :loading="isDeleting" @click="deleteVehicle" />
            </div>
        </template>
    </Dialog>
</template>

<script setup lang="ts">
    import $ from "jquery"
    import moment from 'moment'
    import { type User, type Vehicle, type Company } from "@prisma/client"
    import { useToast } from 'primevue/usetoast'

    const toast = useToast()
    const token = useCookie('token')
    const { user } = useUser();
    const router = useRouter()

    const showCreateVehicleDialog = ref<boolean>(false)
    const showEditVehicleDialog = ref<boolean>(false)
    const showConfigureVehicleDialog = ref<boolean>(false)
    const showDeleteVehicleDialog = ref<boolean>(false)
    const edit_vehicle_data = ref<Vehicle & { company: Company, user: User[] }>()
    const delete_vehicle_id = ref('')
    const delete_vehicle_plate = ref('')
    const isDeleting = ref(false)
    const table = ref()

    onBeforeMount(() => {
        if(user.value.approval_level !== 'COMPANY_ADMIN') {
            router.push('/dashboard')
        }
    })

    const deleteVehicle = async () => {
        if (!delete_vehicle_id.value) return;

        try {
            isDeleting.value = true
            const { message, success } = await $fetch('/api/vehicle/delete', {
                method: 'POST',
                body: {
                    vehicle_id: delete_vehicle_id.value,
                    user_id: user.value.id,
                    token: token.value
                }
            })

            if (success) {
                toast.add({ severity: 'success', summary: 'Deleted', detail: message, life: 3000 });
                showDeleteVehicleDialog.value = false
                reloadTable()
            } else {
                toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
            }
        } catch (error: any) {
            toast.add({ severity: 'error', summary: 'Error', detail: error.data?.message || 'Delete failed', life: 5000 });
        } finally {
            isDeleting.value = false
        }
    }

    //DataTable
    let server_side_url = ref(`/api/vehicle/company-admin/data-table?user_id=${ user.value.id }&token=${ token.value }`)

    let columns = ref([
        {
            data: 'number_plate',
            title: 'Number Plate'
        },
        {
            data: "user",
            title: "Users",
            orderable: false, 
            searchable: false,
            render: (data) => {
                if (!data || data.length === 0) return '<span class="text-muted fst-italic">No Owners</span>';
                return data?.length > 1 ? `<span ${ data?.length > 1 ? 'style="cursor: pointer;" title="' + data.map(({ name, surname, email }) => `${ name } ${ surname } (${ email })`).join('\n') + '"' : '' }>${ data[0]?.name } ${ data[0]?.surname } and <span class="text-primary">${ data.length - 1 } more</span></span>` : `${ data[0]?.name } ${ data[0]?.surname }`
            }
        },
        {
            data: "type",
            title: "Type",
            render: (data) => {
                return `<span class="p-tag p-component p-tag-info">
                    <span class="p-tag-value">${ data }</span>
                </span>`
            }
        },
        {
            data: "status",
            title: "Status",
            render: (data) => {
                return `<span class="p-tag p-component p-tag-${ data ? 'success' : 'danger' }">
                    <span class="p-tag-value">${ data ? 'ENABLED' : 'DISABLED' }</span>
                </span>`
            }
        },
        {
            data: "last_seen",
            title: "Last Seen",
            render: (data) => {
                return data ? moment(data).format('ddd, DD MMM yy, h:mmA') : "Not yet connected"
            }
        },
        {
            data: "tracking_data",
            title: "State",
            orderable: false, 
            searchable: false,
            render: ([ data ]) => {
                return data?.state ? `
                <span class="p-tag p-component p-tag-${ data?.state === 'STATIONARY' ? 'info' : 'success' }">
                    <span class="p-tag-value">${ data?.state }</span>
                </span>
                ` : 'No Data'
            }
        },
        {
            data: "tracking_data",
            title: "Network",
            orderable: false, 
            searchable: false,
            render: ([ data ]) => {
                return data?.operator_name ? data?.operator_name : 'No Data'
            }
        },
        {
            data: "tracking_data",
            title: "IP Address",
            orderable: false, 
            searchable: false,
            render: ([ data ]) => {
                return data?.ip_address ? data?.ip_address : 'No Data'
            }
        },
        {
            data: "tracking_data",
            title: "CCID",
            orderable: false, 
            searchable: false,
            render: ([ data ]) => {
                return data?.ccid ? data?.ccid : 'No Data'
            }
        },
        {
            data: "tracking_data",
            title: "IMEI",
            orderable: false, 
            searchable: false,
            render: ([ data ]) => {
                return data?.imei && (/^\d+$/g).test(data?.imei) ? data?.imei : 'No Data'
            }
        },
        {
            data: "tracking_data",
            title: "IMSI",
            orderable: false, 
            searchable: false,
            render: ([ data ]) => {
                return data?.imsi && (/^\d+$/g).test(data?.imsi) ? data?.imsi  : 'No Data' 
            }
        },
        {
            data: "created_at",
            title: "Created At",
            render: (data) => {
                return moment(data).format('ddd, DD MMM yy, h:mmA')
            }
        },
        {
            data: "id",
            orderable: false, 
            searchable: false,
            title: "Action",
            render: (_, __, vehicle: Vehicle) => {
                return `
                    <button id="btn-view-${ vehicle.id }" title="View ${ vehicle.number_plate }" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-info" type="button" aria-label="Edit ${ vehicle.number_plate }">
                        <span class="pi pi-eye p-button-icon"></span>
                        <span class="p-ink" role="presentation" aria-hidden="true"></span>
                    </button>
                    <button id="btn-edit-${ vehicle.id }" title="Edit ${ vehicle.number_plate }" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-warning" type="button" aria-label="Edit ${ vehicle.number_plate }">
                        <span class="pi pi-pencil p-button-icon"></span>
                        <span class="p-ink" role="presentation" aria-hidden="true"></span>
                    </button>
                    <button id="btn-config-${ vehicle.id }" title="Configure ${ vehicle.number_plate }" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-secondary" type="button" aria-label="Configure ${ vehicle.number_plate }">
                        <span class="pi pi-cog p-button-icon"></span>
                        <span class="p-ink" role="presentation" aria-hidden="true"></span>
                    </button>
                    <button id="btn-delete-${ vehicle.id }" title="Delete ${ vehicle.number_plate }" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-danger" type="button" aria-label="Delete ${ vehicle.number_plate }">
                        <span class="pi pi-trash p-button-icon"></span>
                        <span class="p-ink" role="presentation" aria-hidden="true"></span>
                    </button>`
            }
        }
    ])

    // For information on the drawCallback option visit https://datatables.net/reference/option/drawCallback
    let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    let options = ref({
        fixedColumns: {
            start: isMobile ? 0 : 1,
            end: isMobile ? 0 : 1
        },
        order: [[11, 'desc']],
        drawCallback: ({ json: { data }}) => {
            $('button:regex(id, btn-edit-*)').on('click', (ev)=>{
                const vehicle_id = $(ev.currentTarget)?.attr('id')
                            .split('btn-edit-').at(1)
                edit_vehicle_data.value = data.filter(({ id }) => id === vehicle_id).at(0)
                showEditVehicleDialog.value = true
            })

            $('button:regex(id, btn-config-*)').on('click', (ev)=>{
                const vehicle_id = $(ev.currentTarget)?.attr('id')
                            .split('btn-config-').at(1)
                edit_vehicle_data.value = data.filter(({ id }) => id === vehicle_id).at(0)
                showConfigureVehicleDialog.value = true
            })

            $('button:regex(id, btn-view-*)').on('click', (ev)=>{
                const vehicle_id = $(ev.currentTarget)?.attr('id')
                            .split('btn-view-').at(1)
                const vehicle = data.filter(({ id }) => id === vehicle_id).at(0)
                if (vehicle) {
                    router.push(`/vehicles/${vehicle.number_plate}`)
                }
            })

            $('button:regex(id, btn-delete-*)').on('click', (ev)=>{
                const vehicle_id = $(ev.currentTarget)?.attr('id')
                            .split('btn-delete-').at(1)
                const vehicle = data.filter(({ id }) => id === vehicle_id).at(0)
                delete_vehicle_id.value = vehicle_id
                delete_vehicle_plate.value = vehicle?.number_plate || ''
                showDeleteVehicleDialog.value = true
            })
        }
    });

    //Padolsey's regex filter
    if(process.client){
        //@ts-ignore
        $.expr[':'].regex = function(elem, index, match) {
            var matchParams = match[3].split(','),
                validLabels = /^(data|css):/,
                attr = {
                    method: matchParams[0].match(validLabels) ? 
                                matchParams[0].split(':')[0] : 'attr',
                    property: matchParams.shift().replace(validLabels,'')
                },
                regexFlags = 'ig',
                regex = new RegExp(matchParams.join('').replace(/^\s+|\s+$/g,''), regexFlags);
            return regex.test($(elem)[attr.method](attr.property));
        }
    }

    const reloadTable = () => {
        // Reload DataTable
        table.value.table.dt.ajax.reload()
    }
</script>

<style>
    .icon-card {
        font-family: "Manrope", sans-serif;
        display: flex;
        height: 7rem;
        align-items: center;
        background: #fff;
        padding: 30px 20px;
        border: none;
        box-shadow: 0px 10px 20px rgba(200, 208, 216, 0.3);
        border-radius: 10px; 
    }

    .icon-card.icon-card-3 {
        display: block;
        padding: 0px; 
    }
        
    .icon-card.icon-card-3 .card-content {
        display: flex;
        padding: 20px;
        padding-bottom: 0; 
    }
</style>