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
                    :breadcrumbs="[ { label: 'SOS Alerts', route: '/sos-alerts' } ]"
                    ref="table"
                /> 
            </div>
        </div>
    </div>
</div>
</template>

<script setup lang="ts">

  import moment from 'moment';
  import $ from 'jquery';
  import { useToast } from 'primevue/usetoast'
import links from '~/vendors/links';

  definePageMeta({
      title: "SOS Alerts",
      layout: "dashboard",
      middleware: ["auth"]
  });

  const toast = useToast();

  const columns = ref([
      {
          data: 'id',
          title: 'ID',
          render: (id:String) => id.slice(-4)
      },
      {
          data: 'user',
          title: 'User',
          orderable: false, 
          searchable: false,
          render: (user) => {
            return user && `${user.name} ${user.surname}`
          }
      },
      {
        data: 'type',
        title: 'Type',
        orderable: false,
        searchable: false,
      },
      {
          data: 'vehicle',
          title: 'Vehicle',
          orderable: false, 
          searchable: false,
          render: ({ number_plate }) => {
            return `<a href="${links.vehicle(number_plate)}">${number_plate}</a>`
          }
      },
      {
        data: 'location',
        title: 'Location',
        orderable: false,
        searchable: false,
        render: (_, __, alert) => {
          return `<a href="//maps.google.com?q=${alert.lat},${alert.lon}" target="_blank">View on map</a>`
        }
      },
      {
        data: 'help_dispatched',
        title: 'Status',
        orderable: false,
        searchable: false,
        render: help_dispatched => {
          return help_dispatched ? 'Help dispatched' : 'Pending'
        }
      },
      {
        data: 'created_at',
        title: 'Date',
        render: (date) => {
          return moment(date).format('DD/MM/YYYY HH:mm')
        }
      },
      {
        data: "id",
        orderable: false, 
        searchable: false,
        title: "Action",
        render: (_, __, alert) => {
          if (alert.help_dispatched) {
            return ``;
          } else {
            return `
              <button data-operation="dispatch" data-id="${alert.id}" class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-info" type="button" title="Mark as resolved">
                <span class="pi pi-check p-button-icon"></span>
                <span class="p-ink" role="presentation" aria-hidden="true"></span>
              </button>
            `
          }
        }
      }
  ]);

  const server_side_url = ref(`/api/sos-alerts`);
  let isMobile = process.client ? /iPhone|iPad|iPod|Android/i.test(navigator.userAgent): false; // TODO: replace this with ismobile library

  const options = ref({
      fixedColumns: {
        end: isMobile ? 0 : 1
      },
      order: [[0, 'desc']],
      serverSide: true,
      processing: true,
      searching: true,
      lengthChange: true,
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],

      drawCallback: (settings) => {
        
        $('button[data-operation="dispatch"]').on('click', async (e) => {
            const id = $(e.currentTarget).data('id');
            
            try {

              // Call the API to mark the alert as resolved
              await $fetch(`/api/sos-alerts/${id}`, {
                method: 'PATCH',
                body: { help_dispatched: true }
              });

              // Reload the table
              reloadTable();

              toast.add({ severity: 'success', summary: 'Success', detail: 'Alert has been marked as resolved', life: 3000 });

            } catch (err) {
              toast.add({ severity: 'error', summary: 'Error', detail: err.message, life: 3000 });
            }
        });
      }
  });

  let reloadTable: Function;

  const dt = (dt) => {
    reloadTable = () => {
      dt.ajax.reload();
    }
  }

  
</script>