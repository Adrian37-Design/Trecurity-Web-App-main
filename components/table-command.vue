<template>
    <main>
        <div ref="command_table_el">
            <DataTable
                :columns="columns"
                :options="options"
                :ajax="server_side_url"
                class="table"
                ref="table"
            /> 
        </div>
    </main>
</template>

<script setup lang="ts">
    import { type User } from '@prisma/client'
    import moment from 'moment'
    import { useElementVisibility } from '@vueuse/core'

    const emit = defineEmits(['pendingCommands'])

    const { params: { number_plate } }: any = useRoute();

    const { user } = useUser();
    const token = useCookie('token')

    const command_table_el = ref<HTMLElement>()
    const command_tab_is_visible = useElementVisibility(command_table_el)
    const reload_data_table = ref<boolean>(true)
    const table = ref()
    
    const reloadDataTable = async () => {
        if(command_tab_is_visible.value) {
            table.value.dt.ajax.reload()
            reload_data_table.value = false
        } else {
            await $fetch('/api/command/pending', {
                method: 'POST',
                body: JSON.stringify({
                    number_plate,
                    user_id: user.value.id,
                    token: token.value
                })
            })
            .then(({ data, success}) => {
                if(success) {
                    emit('pendingCommands', data)
                    reload_data_table.value = true
                }
            })
            .catch(error => {
                console.error(error)
            })
        }
    }

    defineExpose({ reloadDataTable })

    //DataTable
    let server_side_url = ref(`/api/command/data-table?number_plate=${ number_plate }&user_id=${ user.value.id }&token=${ token.value }`)

    const options = {
        order: [[4, 'desc']],
        scrollX: true,
        scrollY: 300,
        scrollCollapse: true,
        responsive: true,
        select: true,
        serverSide: true,
        processing: true,
        drawCallback: ({ json: { pendingCommandsTotal }})=>{
            emit('pendingCommands', pendingCommandsTotal);
        }
    }

    let columns = ref([
        {
            data: 'code',
            title: 'Code',
            render: (data) => {
                return `<span title="${ data.includes('GEOFENCE') ? `${ data.replace('_GEOFENCE', '') } the geofence` : data === 'ENGINE_UN_LOCK' ? 'Unlock the engine' : data === 'ENGINE_LOCK' ? 'Lock the engine' : '' }" class="p-tag p-component p-tag-${ data === 'CREATE_GEOFENCE' ? 'sucess' : data === 'UPDATE_GEOFENCE' ? 'info' : data === 'DELETE_GEOFENCE' ? 'warning' : data === 'ENGINE_UN_LOCK' ? 'success' : data === 'ENGINE_LOCK' ? 'danger' : '' }">
                    <span class="p-tag-value">${ data.replace(/_/g, ' ') }</span>
                </span>`
            }
        },
        {
            data: 'user',
            title: 'Action By',
            orderable: false, 
            searchable: false,
            render: (data) => {
                return `<span title="${ data?.name } ${ data?.surname }\n${ data?.email }\n${ data?.approval_level }" style="cursor: pointer;" class="text-primary">${ data?.name } ${ data?.surname }</span>`
            }
        },
        {
            data: 'is_executed',
            title: 'Status',
            render: (data) => {
                return `<span class="p-tag p-component p-tag-${ data ? 'success' : 'info' }">
                    <span class="p-tag-value" title="${ data ? `The command sent to #${ number_plate } was successfully received and executed` : `The command sent to #${ number_plate } is yet to be received and executed. This can take a few minutes, depending on the internet connectivity in the vehicle's area.` }">${ data ? 'Executed' : 'Pending' }</span>
                </span>`
            }
        },
        {
            data: "updated_at",
            title: "Executed At",
            render: (data, _, { is_executed }) => {
                return is_executed ? moment(data).format('ddd, DD MMM yy, h:mmA') : '<span class="text-muted text-center">Not yet executed</span>'
            }
        },
        {
            data: "created_at",
            title: "Created At",
            render: (data) => {
                return moment(data).format('ddd, DD MMM yy, h:mmA')
            }
        }
    ])

    watch(command_tab_is_visible, (value) => {
        if(value && reload_data_table.value) {
            reloadDataTable()
        }
    })
</script>