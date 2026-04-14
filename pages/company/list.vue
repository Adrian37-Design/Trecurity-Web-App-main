<template>
    <div class="card">
        <div class="card-body row">
            <div class="block">
                <div class="col-md-12">
                    <Table
                        ref="table"
                        :columns="columns"
                        :server_side_url="server_side_url"
                        :options="options"
                        :breadcrumbs="[ { label: 'Companies', route: '/company/list' } ]"
                    >
                        <template #actions>
                            <Button @click="showCreateCompanyDialog = true" label="Create Company" size="small" />
                        </template>
                    </Table>
                </div>
            </div>
        </div>
        <Dialog v-model:visible="showCreateCompanyDialog" modal header="Create Company" :style="{ width: '50vw' }">
            <DialogCompanyUpsert @reloadTable="reloadTable" />
        </Dialog>
        <Dialog v-model:visible="showEditCompanyDialog" modal header="Edit Company" :style="{ width: '50vw' }">
            <DialogCompanyUpsert :current_data="edit_company_data" @reloadTable="reloadTable" />
        </Dialog>
        <Dialog v-model:visible="showDeleteCompanyDialog" :style="{ width: '450px' }" header="Confirm Deletion" :modal="true">
            <div class="confirmation-content mt-3">
                <i class="pi pi-exclamation-triangle mr-3 mt-2" style="font-size: 2rem; color: #f59e0b;" />
                <span v-if="companyToDelete">Are you sure you want to delete company <b>{{ companyToDelete.name }}</b>? <br><br> <span class="text-danger fw-bold">WARNING:</span> This action is permanent and will remove all associated vehicles, tracking history, and violations.</span>
            </div>
            <template #footer>
                <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="showDeleteCompanyDialog = false" :disabled="is_deleting"/>
                <Button label="Yes, Delete" icon="pi pi-check" class="p-button-danger" @click="deleteCompany" :loading="is_deleting" />
            </template>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
    import { useToast } from 'primevue/usetoast'
    import $ from "jquery"
    import moment from 'moment'
    import { type Company } from "@prisma/client"

    const token = useCookie('token')
    const { user } = useUser();
    const router = useRouter()

    const showCreateCompanyDialog = ref<boolean>(false)
    const showEditCompanyDialog = ref<boolean>(false)
    const showDeleteCompanyDialog = ref<boolean>(false)
    const edit_company_data = ref<Company>()
    const companyToDelete = ref<Company>()
    const is_deleting = ref<boolean>(false)
    const table = ref()
    const toast = useToast()

    definePageMeta({
        title: "Companies",
        layout: "dashboard",
        middleware: ["auth"]
    })

    onBeforeMount(() => {
        if(user.value.approval_level !== 'SUPER_ADMIN' && user.value.approval_level !== 'MASTER_ADMIN') {
            router.push('/dashboard')
        }
    })

    //DataTable
    let server_side_url = ref(`/api/company/data-table?user_id=${ user.value?.id }&token=${ token.value }`)

    let columns = ref([
        {
            data: 'name',
            title: 'Name'
        },
        {
            data: "_count",
            title: "Admins",
            orderable: false, 
            searchable: false,
            render: ({ admins }) => {
                return `<span class="p-tag p-component ${ admins === 0 ? 'p-tag-secondary' : '' }">
                    <span class="p-tag-value">${ admins }</span>
                </span>`
            }
        },
        {
            data: "_count",
            title: "Customers",
            orderable: false, 
            searchable: false,
            render: ({ customers }) => {
                return `<span class="p-tag p-component ${ customers === 0 ? 'p-tag-secondary' : '' }">
                    <span class="p-tag-value">${ customers }</span>
                </span>`
            }
        },
        {
            data: "_count",
            title: "Vehicles",
            orderable: false, 
            searchable: false,
            render: ({ vehicles }) => {
                return `<span class="p-tag p-component ${ vehicles === 0 ? 'p-tag-secondary' : '' }">
                    <span class="p-tag-value">${ vehicles }</span>
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
            data: "email",
            title: "Email"
        },
        {
            data: "phone",
            title: "Phone"
        },
        {
            data: "website",
            title: "Website"
        },
        {
            data: "physical_address",
            title: "Physical Address"
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
            render: (_, __, company: Company) => {
                return `
                    <button id="btn-edit-${ company.id }" title="Edit ${ company.name }" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-warning" type="button" aria-label="Edit ${ company.name }">
                        <span class="pi pi-pencil p-button-icon"></span>
                    </button>
                    <button id="btn-delete-${ company.id }" title="Delete ${ company.name }" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-danger" type="button" aria-label="Delete ${ company.name }">
                        <span class="pi pi-trash p-button-icon"></span>
                    </button>`
            }
        }
    ])

    // For information on the drawCallback option visit https://datatables.net/reference/option/drawCallback
    let isMobile = process.client ? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent): false;

    let options = ref({
        fixedColumns: {
            start: isMobile ? 0 : 1,
            end: isMobile ? 0 : 1
        },
        order: [[9, 'desc']],
        drawCallback: ({ json: { data }}) => {
            $('button:regex(id, btn-edit-*)').on('click', (ev)=>{
                const company_id = $(ev.currentTarget)?.attr('id')
                            .split('btn-edit-').at(1)
                edit_company_data.value = data.filter(({ id }) => id === company_id).at(0)
                showEditCompanyDialog.value = true
            })

            $('button:regex(id, btn-delete-*)').on('click', (ev)=>{
                const company_id = $(ev.currentTarget)?.attr('id')
                            .split('btn-delete-').at(1)
                companyToDelete.value = data.filter(({ id }) => id === company_id).at(0)
                showDeleteCompanyDialog.value = true
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
        table.value.table.dt.ajax.reload()
    }

    const deleteCompany = async () => {
        if (!companyToDelete.value) return;

        try {
            is_deleting.value = true;
            const { message, success } = await $fetch('/api/company/delete', {
                method: 'POST',
                body: {
                    delete_company_id: companyToDelete.value.id,
                    user_id: user.value.id,
                    token: token.value
                }
            });

            if (success) {
                toast.add({ severity: 'success', summary: 'Delete Company', detail: 'Company successfully deleted', life: 5000 });
                showDeleteCompanyDialog.value = false;
                reloadTable();
            } else {
                toast.add({ severity: 'warn', summary: 'Deletion Failed', detail: message || 'Failed to delete company', life: 8000 });
            }
        } catch (error) {
            console.error(error);
            toast.add({ severity: 'error', summary: 'Error', detail: 'An unexpected error occurred during deletion.', life: 8000 });
        } finally {
            is_deleting.value = false;
        }
    }

    // TODO: /company/list -> /companies
    
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