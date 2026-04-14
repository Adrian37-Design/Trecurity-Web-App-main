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
        <DialogUserSuperAdminUpsert v-if="user.approval_level === 'SUPER_ADMIN' || user.approval_level === 'MASTER_ADMIN'" @reloadTable="reloadTable" />
    </Dialog>
    <Dialog v-model:visible="showEditUserDialog" modal header="Edit User" :style="{ width: '50vw' }">
        <DialogUserSuperAdminUpsert v-if="user.approval_level === 'SUPER_ADMIN' || user.approval_level === 'MASTER_ADMIN'" :current_data="edit_user_data" @reloadTable="reloadTable" />
    </Dialog>
    <Dialog v-model:visible="showDeleteConfirmDialog" modal header="Delete User" :style="{ width: '30vw' }">
        <p>Are you sure you want to delete <strong>{{ delete_user_data?.name }} {{ delete_user_data?.surname }}</strong>?</p>
        <p style="color: #666; font-size: 0.9em;">This will disable the user and hide their data from the platform. The user can be restored later.</p>
        <template #footer>
            <Button label="Cancel" severity="secondary" @click="showDeleteConfirmDialog = false" />
            <Button label="Delete User" severity="danger" :loading="isDeleting" @click="deleteUser" />
        </template>
    </Dialog>
</template>

<script setup lang="ts">
    import $ from "jquery"
    import moment from 'moment'
    import { type User } from "@prisma/client"
    import { useToast } from 'primevue/usetoast'

    const token = useCookie('token')
    const { user } = useUser();
    const router = useRouter()

    const showCreateUserDialog = ref<boolean>(false)
    const showEditUserDialog = ref<boolean>(false)
    const showDeleteConfirmDialog = ref<boolean>(false)
    const edit_user_data = ref<User>()
    const delete_user_data = ref<User>()
    const table = ref()
    const isDeleting = ref<boolean>(false)

    onBeforeMount(() => {
        if(user.value.approval_level !== 'SUPER_ADMIN' && user.value.approval_level !== 'MASTER_ADMIN') {
            router.push('/dashboard')
        }
    })

    //DataTable
    let server_side_url = ref(`/api/user/super-admin/data-table`)

    // Capture logged-in user's approval level for use in column render functions
    const loggedInUserApprovalLevel = user.value.approval_level;

    let columns = ref([
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
            data: "company_where_user_is_admin",
            title: "Admin At",
            orderable: false, 
            searchable: false,
            render: (data) => {
                return data ? `<span style="white-space: nowrap" class="p-tag p-component p-tag-info">
                    <span class="p-tag-value">${ data?.name }</span>
                </span>` : 'N/A'
            }
        },
        {
            data: "company_where_user_is_customer",
            title: "Customer At",
            orderable: false, 
            searchable: false,
            render: (data) => {
                return data ? `<span style="white-space: nowrap" class="p-tag p-component p-tag-info">
                    <span class="p-tag-value">${ data?.name }</span>
                </span>` : 'N/A'
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
            data: "is_locked",
            title: "Locked",
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
                // Show buttons if:
                // 1. User is not SUPER_ADMIN OR
                // 2. Logged-in user is MASTER_ADMIN (can manage SUPER_ADMIN)
                const isMasterAdmin = loggedInUserApprovalLevel === 'MASTER_ADMIN';
                const canEdit = user.approval_level !== 'SUPER_ADMIN' || isMasterAdmin;
                
                if(canEdit) {
                    return `
                        <button id="btn-edit-${ user.id }" title="Edit ${ user.name }" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-warning" type="button" aria-label="Edit ${ user.name }">
                            <span class="pi pi-pencil p-button-icon"></span>
                            <span class="p-ink" role="presentation" aria-hidden="true"></span>
                        </button>
                        <button id="btn-delete-${ user.id }" title="Delete ${ user.name }" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-danger" type="button" aria-label="Delete ${ user.name }">
                            <span class="pi pi-trash p-button-icon"></span>
                            <span class="p-ink" role="presentation" aria-hidden="true"></span>
                        </button>`
                } else {
                    return ""
                }
            }
        }
    ])

    // For information on the drawCallback option visit https://datatables.net/reference/option/drawCallback
    let isMobile = process.client ? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) : false;

    let options = ref({
        fixedColumns: {
            start: isMobile ? 0 : 2,
            end: isMobile ? 0 : 1
        },
        order: [[10, 'desc']],
        drawCallback: ({ json: { data }}) => {
            $('button:regex(id, btn-edit-*)').on('click', (ev)=>{
                const user_id = $(ev.currentTarget)?.attr('id')
                            .split('btn-edit-').at(1)
                edit_user_data.value = data.filter(({ id }) => id === user_id).at(0)
                showEditUserDialog.value = true
            })
            
            $('button:regex(id, btn-delete-*)').on('click', (ev)=>{
                const user_id = $(ev.currentTarget)?.attr('id')
                            .split('btn-delete-').at(1)
                delete_user_data.value = data.filter(({ id }) => id === user_id).at(0)
                showDeleteConfirmDialog.value = true
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


    const toast = useToast();

    const deleteUser = async () => {
        if (!delete_user_data.value) return;
        
        isDeleting.value = true;
        
        try {
            const { data, success, message } = await $fetch('/api/user/super-admin/permanent-delete', {
                method: 'POST',
                body: {
                    delete_user_id: delete_user_data.value.id,
                    user_id: user.value.id,
                    token: token.value
                }
            });

            if (success) {
                showDeleteConfirmDialog.value = false;
                delete_user_data.value = undefined;
                reloadTable();
                
                toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: message || 'User deleted successfully',
                    life: 3000
                });
            } else {
                toast.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: message || 'Failed to delete user',
                    life: 5000
                });
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.add({
                severity: 'error',
                summary: 'Error',
                detail: 'An error occurred while deleting the user',
                life: 5000
            });
        } finally {
            isDeleting.value = false;
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