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
                    :breadcrumbs="[ { label: 'Routes', route: '/routes' } ]"
                >
                    <template #actions>
                      <div class="d-flex align-items-center gap-2">
                        <Calendar v-model="date_from" placeholder="Date From" showTime hourFormat="24" dateFormat="d/m/yy" />
                        <Calendar v-model="date_to" placeholder="Date To" showTime hourFormat="24" dateFormat="d/m/yy" />
                        <Button icon="pi pi-search" rounded raised severity="info" @click="applyFilter" title="Filter" :disabled="!date_from || !date_to" />
                        <Button icon="pi pi-times" rounded text severity="secondary" @click="resetFilter" title="Reset" v-if="date_from || date_to" />
                        <Button label="Add Route" icon="ti ti-plus" severity="primary" @click="showingRouteFormDialog=true" size="small" />
                      </div>
                    </template>
                </Table> 
            </div>
        </div>
    </div>
    <Dialog v-model:visible="showingRouteFormDialog" modal :header="formDialogTitle" :style="{ width: '55vw' }">
        <RoutesForm
            @add="closeFormDialog"
            @edit="closeFormDialog"
            :editRoute="selectedRoute"
        />
    </Dialog>
</div>
</template>

<script setup lang="ts">

import moment from 'moment';
import { useToast } from 'primevue/usetoast';
import Swal from 'sweetalert2';
import $ from 'jquery';
import Calendar from 'primevue/calendar';
import Button from 'primevue/button';

  definePageMeta({
      title: "Routes",
      layout: "dashboard",
      middleware: ["auth"]
  })

  const columns = ref([
      {
          data: 'id',
          title: 'ID',
          render: (id:String) => id.slice(-4)
      },
      {
          data: 'name',
          title: 'Name',
          orderable: false, 
          searchable: false,
      },
      {
          data: 'created_at',
          title: 'Created',
          render: (date:string) => {
            return moment(date).format('DD/MM/YYYY HH:mm')
          }
      },
      {
          data: 'updated_at',
          title: 'Updated',
          render: (date:string) => {
            return moment(date).format('DD/MM/YYYY HH:mm')
          }
      },
      {
        data: 'id',
        title: 'Actions',
        orderable: false, 
        searchable: false,
        render: (id:String) => {
            return `
                <button class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-info" data-id="${id}" data-operation="edit">
                    <i class="ti ti-pencil"></i>
                </button>
                <button class="p-button p-component p-button-icon-only p-button-rounded p-button-text p-button-danger" data-id="${id}" data-operation="delete">
                    <i class="ti ti-trash"></i>
                </button>
            `
        }
    }
  ]);

  const date_from = ref<Date | null>(null);
  const date_to = ref<Date | null>(null);
  const base_url = `/api/routes`;
  const server_side_url = ref(base_url);

  const applyFilter = () => {
      const params = new URLSearchParams();
      if(date_from.value) params.append('date_from', date_from.value.toISOString());
      if(date_to.value) params.append('date_to', date_to.value.toISOString());
      server_side_url.value = `${base_url}?${params.toString()}`;
  }

  const resetFilter = () => {
      date_from.value = null;
      date_to.value = null;
      server_side_url.value = base_url;
  }

  const selectedRoute = ref(null);
  const formDialogTitle = computed(() => selectedRoute.value ? 'Edit Route' : 'Add Route');

  const toast = useToast();

  const options = ref({
      order: [[0, 'desc']],
      serverSide: true,
      processing: true,
      searching: true,
      lengthChange: true,
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],
      drawCallback: (settings) => {
        
        $('button[data-operation="edit"]').on('click', function(e) {
            const id = $(e.currentTarget).data('id');
            const route = settings.json.data.find((route) => route.id === id);
            showingRouteFormDialog.value = true;
            selectedRoute.value = route;
        });

        $('button[data-operation="delete"]').on('click', async function(e) {
            const id = $(e.currentTarget).data('id');
            const route = settings.json.data.find((route) => route.id === id);
            
            const confirm = await Swal.fire({
                title: 'Confirm',
                text: `Are you sure you want to delete the route "${route.name}"? This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            });

            if (!confirm.isConfirmed)
                return;

            try {
                await $fetch(`/api/routes/${id}`, {
                    method: 'DELETE'
                });

                toast.add({ severity: 'success', summary: 'Success', detail: 'Route deleted successfully', life: 3000 });
                reloadTable();

            } catch (error) {
                toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 });
            }

            // TODO: show loading status

        });
      }
  });

  const closeFormDialog = () => {
    showingRouteFormDialog.value = false;
    reloadTable();
  }

  const table = ref();

  const reloadTable = () => {
        // Reload DataTable
        table.value.table.dt.ajax.reload()
    }

  const showingRouteFormDialog = ref<boolean>(false);

  watch(showingRouteFormDialog, (value) => {
    if (!value) {
        selectedRoute.value = null;
    }
  });
  
</script>