<template>
    <div class="card">
        <div class="card-body row">
            <div class="block">
                <div class="col-md-12">
                    <Table
                        :columns="columns"
                        :server_side_url="server_side_url"
                        :options="options"
                        @dt="dt"
                        :breadcrumbs="[ { label: 'Logs', route: '/logs' } ]"
                    /> 
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import moment from 'moment'

    const token = useCookie('token')
    const { user } = useUser();
    const router = useRouter()

    definePageMeta({
        layout: "dashboard",
        middleware: ["auth"]
    })

    onBeforeMount(() => {
        if(user.value.approval_level !== 'COMPANY_ADMIN') {
            router.push('/dashboard')
        }
    })

    //DataTable
    let server_side_url = ref(`/api/logs/company-admin/data-table?user_id=${ user.value.id }&token=${ token.value }`)

    let columns = ref([
        {
            data: 'id',
            title: 'ID'
        },
        {
            data: 'user',
            title: 'User',
            orderable: false, 
            searchable: false,
            render: ({ name, surname, email }) => {
                return `${ name } ${ surname } (${ email })`
            }
        },
        {
            data: 'section',
            title: 'Section'
        },
        {
            data: 'action',
            title: 'Action'
        },
        {
            data: 'change',
            title: 'Details'
        },
        {
            data: "created_at",
            title: "Created At",
            render: (data) => {
                return moment(data).format('ddd, DD MMM yy, h:mmA')
            }
        }
    ])

    // For information on the drawCallback option visit https://datatables.net/reference/option/drawCallback
    let options = ref({
        order: [[5, 'desc']]
    });

    // Api
    let dt_api

    const dt = (api) => {
        dt_api = api
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