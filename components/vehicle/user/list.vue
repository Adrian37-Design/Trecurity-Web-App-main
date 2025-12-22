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
                    /> 
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import $ from "jquery"
    import moment from 'moment'
    import { type Vehicle } from "@prisma/client"

    const token = useCookie('token')
    const { user } = useUser();
    
    //DataTable
    let server_side_url = ref(`/api/vehicle/user/data-table?user_id=${ user.value.id }&token=${ token.value }`)

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
        order: [[12, 'desc']],
        drawCallback: ({ json: { data }}) => {
            $('button:regex(id, btn-view-*)').on('click', (ev)=>{
                const vehicle_id = $(ev.currentTarget)?.attr('id')
                            .split('btn-edit-').at(1)
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