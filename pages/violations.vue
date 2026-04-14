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
                    :breadcrumbs="[ { label: 'Violations', route: '/violations' } ]"
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
    <Violation
        v-if="selectedViolation"
        :vehicle="selectedViolation.vehicle"
        :user="selectedViolation.user"
        :type="selectedViolation.type"
        :data="selectedViolation.data"
        :created_at="selectedViolation.created_at"
        v-model:show="showingViolationDialog"
    />
</div>
</template>

<script setup lang="ts">

import moment from 'moment';
import $ from 'jquery';
import Calendar from 'primevue/calendar';
import Button from 'primevue/button';

  definePageMeta({
      title: "Violations",
      layout: "dashboard",
      middleware: ["auth"]
  });

  const selectedViolation = ref(null);
  const showingViolationDialog = ref(false);

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
          render: ({ name, surname }) => {
            return `${name} ${surname}`
          }
      },
      {
        data: 'type',
        title: 'Violation',
        orderable: false,
        searchable: false,
      },
      {
          data: 'vehicle',
          title: 'Vehicle',
          orderable: false, 
          searchable: false,
          render: ({ number_plate }) => {
            return number_plate
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
          data: 'id',
          title: 'Actions',
          orderable: false,
          searchable: false,
          render: (id) => {
            return `<button class="btn" data-id="${id}" data-operation="view">
                <span class="pi pi-eye p-button-icon"></span>
            </button>`
          }
      }
  ]);

  const date_from = ref<Date | null>(null);
  const date_to = ref<Date | null>(null);
  const base_url = `/api/violations`;
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

  const options = ref({
      order: [[0, 'desc']],
      serverSide: true,
      processing: true,
      searching: true,
      lengthChange: true,
      pageLength: 10,
      lengthMenu: [10, 25, 50, 100],
      drawCallback: function(settings) {
        $('button[data-operation="view"]').on('click', function(e) {
            const id = $(e.currentTarget).data('id');
            const violation = settings.json.data.find(v => v.id === id);
            selectedViolation.value = violation;
            showingViolationDialog.value = true;
            selectedViolation.value = violation;
            showingViolationDialog.value = true;
        })
      }
  });

  const dt = (e) => {
      console.log(e)
  }
  
</script>