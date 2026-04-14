<template>
    <div class="card">
        <div class="card-body row">
            <div class="block">
                <div class="col-md-12">
                    <Table
                        :columns="columns"
                        :server_side_url="server_side_url"
                        :options="options"
                        :breadcrumbs="[{ label: 'Users', route: '/user/list' }]"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import $ from "jquery"
    import moment from 'moment'

    const token = useCookie('token')
    const { user } = useUser();
    
    //DataTable
    let server_side_url = ref(`/api/user/user/data-table?user_id=${ user.value.id }&token=${ token.value }`)

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
            data: "approval_level",
            title: "Access Level",
            orderable: false, 
            searchable: false,
            render: (data) => {
                return data ? `<span class="p-tag p-component">
                    <span class="p-tag-value">${ data.replace(/_/g, " ") }</span>
                </span>` : ''
            }
        },
        {
            data: "created_at",
            title: "Joined",
            render: (data) => {
                return moment(data).format('ddd, DD MMM yy')
            }
        }
    ])

    let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    let options = ref({
        fixedColumns: {
            start: isMobile ? 0 : 0,
            end: isMobile ? 0 : 0
        },
        order: [[5, 'desc']]
    });

</script>
