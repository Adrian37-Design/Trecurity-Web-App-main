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
                    >
                        <template #actions>
                            <div class="d-flex align-items-center gap-2">
                                <Calendar v-model="date_from" placeholder="Date From" showTime hourFormat="24" dateFormat="d/m/yy" />
                                <Calendar v-model="date_to" placeholder="Date To" showTime hourFormat="24" dateFormat="d/m/yy" />
                                <Button icon="pi pi-search" rounded raised severity="info" @click="applyFilter" title="Filter" :disabled="!date_from || !date_to" />
                                <Button icon="pi pi-times" rounded text severity="secondary" @click="resetFilter" title="Reset" v-if="date_from || date_to" />
                            </div>
                        </template>
                    </Table> 
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import moment from 'moment'
    import Calendar from 'primevue/calendar';
    import Button from 'primevue/button';

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
    const base_url = computed(() => `/api/logs/company-admin/data-table?user_id=${ user.value?.id }&token=${ token.value }`);
    let server_side_url = ref(base_url.value);

    watch(base_url, (val) => {
        server_side_url.value = val;
    });

    const date_from = ref<Date | null>(null);
    const date_to = ref<Date | null>(null);

    const applyFilter = () => {
        const params = new URLSearchParams();
        if(date_from.value) params.append('date_from', date_from.value.toISOString());
        if(date_to.value) params.append('date_to', date_to.value.toISOString());
        server_side_url.value = `${base_url.value}&${params.toString()}`;
    }

    const resetFilter = () => {
        date_from.value = null;
        date_to.value = null;
        server_side_url.value = base_url.value;
    }

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