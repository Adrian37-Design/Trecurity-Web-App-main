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
                        :breadcrumbs="[ { label: 'Users', route: '/user/list' } ]"
                    >
                        <template #actions>
                            <Button @click="showCreateUserDialog = true" label="Create User" size="small" />
                        </template>
                    </Table>
                </div>
            </div>
        </div>
    </div>
    
    <Dialog v-model:visible="showCreateUserDialog" modal header="Create User" :style="{ width: '50vw' }">
        <DialogUserCompanyAdminUpsert v-if="user.approval_level === 'COMPANY_ADMIN'" @reloadTable="reloadTable" />
    </Dialog>
    <Dialog v-model:visible="showEditUserDialog" modal header="Edit User" :style="{ width: '50vw' }">
        <DialogUserCompanyAdminUpsert v-if="user.approval_level === 'COMPANY_ADMIN'" :current_data="edit_user_data" @reloadTable="reloadTable" />
    </Dialog>
</template>

<script setup lang="ts">
    import $ from "jquery"
    import moment from 'moment'
    import { type User } from "@prisma/client"

    const token = useCookie('token')
    const { user } = useUser();
    const router = useRouter()

    const showCreateUserDialog = ref<boolean>(false)
    const showEditUserDialog = ref<boolean>(false)
    const edit_user_data = ref<User>()
    const table = ref()

    onBeforeMount(() => {
        if(user.value.approval_level !== 'COMPANY_ADMIN') {
            router.push('/dashboard')
        }
    })

    //DataTable
    const server_side_url = computed(() => {
        if (user.value)
            return `/api/user/company-admin/data-table?user_id=${ user.value.id }&token=${ token.value }`
        else
            return '';
    });

    const columns = computed(() => {
        if (user.value) {
            return [
                {
                    data: 'id',
                    title: 'ID'
                },
                {
                    data: 'name',
                    title: 'Name'
                },
                {
                    data: 'surname',
                    title: 'Surname'
                },
                {
                    data: 'email',
                    title: 'Email'
                },
                {
                    data: 'phone',
                    title: 'Phone'
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
                    data: "approval_level",
                    title: "Approval Level",
                    orderable: false, 
                    searchable: false,
                    render: (data) => {
                        return data ? `<span class="p-tag p-component">
                            <span class="p-tag-value">${ data.replace(/_/g, " ") }</span>
                        </span>` : ''
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
                    data: "is_lock",
                    title: "Is Locked",
                    orderable: false, 
                    searchable: false,
                    render: (data) => {
                        return `<span class="p-tag p-component p-tag-${ !data ? 'success' : 'danger' }">
                            <span class="p-tag-value">${ !data ? 'NOT LOCKED' : 'LOCKED' }</span>
                        </span>`
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
                    render: (_, __, user: User) => {
                        if(user.approval_level !== 'SUPER_ADMIN') {
                            return `
                                <button id="btn-edit-${ user.id }" title="Edit ${ user.name }" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-warning" type="button" aria-label="Edit ${ user.name }">
                                    <span class="pi pi-pencil p-button-icon"></span>
                                    <span class="p-ink" role="presentation" aria-hidden="true"></span>
                                </button>`
                        } else {
                            return ""
                        }
                    }
                }
            ];
        } else {
            return undefined;
        }
    });

    // For information on the drawCallback option visit https://datatables.net/reference/option/drawCallback
    let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    let options = ref({
        fixedColumns: {
            start: isMobile ? 0 : 2,
            end: isMobile ? 0 : 1
        },
        order: [[9, 'desc']],
        drawCallback: ({ json: { data }}) => {
            $('button:regex(id, btn-edit-*)').on('click', (ev)=>{
                const user_id = $(ev.currentTarget)?.attr('id')
                            .split('btn-edit-').at(1)
                edit_user_data.value = data.filter(({ id }) => id === user_id).at(0)
                showEditUserDialog.value = true
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