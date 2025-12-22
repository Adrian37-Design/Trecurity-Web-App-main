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
    </div>
</template>

<script setup lang="ts">
    import $ from "jquery"
    import moment from 'moment'
    import { type Company } from "@prisma/client"

    const token = useCookie('token')
    const { user } = useUser();
    const router = useRouter()

    const showCreateCompanyDialog = ref<boolean>(false)
    const showEditCompanyDialog = ref<boolean>(false)
    const edit_company_data = ref<Company>()
    const table = ref()

    definePageMeta({
        title: "Companies",
        layout: "dashboard",
        middleware: ["auth"]
    })

    onBeforeMount(() => {
        if(user.value.approval_level !== 'SUPER_ADMIN') {
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
                        <span class="p-ink" role="presentation" aria-hidden="true"></span>
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