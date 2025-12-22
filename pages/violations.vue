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
                /> 
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

  const server_side_url = ref(`/api/violations`);

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
        })
      }
  });

  const dt = (e) => {
      console.log(e)
  }
  
</script>