<template>
  <DataTable :value="violations" striped-rows :totalRecords="totalRecords" :first='first' :rows="pageSize" paginator :loading="loading" lazy @page="onPageChange">
    <template #header>
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <span class="h4 font-weight-bold">Violations</span>
        <div>
          <Button icon="pi pi-refresh" rounded raised severity="primary" @click="refresh" />
        </div>
      </div>
    </template>
    <Column field="id" header="ID">
      <template #body="slotProps">
        <span>
          #{{ slotProps.data.id.slice(-4) }}
        </span>
      </template>
    </Column>
    <Column header="Driver">
      <template #body="slotProps">
        <span>{{ slotProps.data.user ? `${slotProps.data.user.name} ${slotProps.data.user.surname}` : '-' }}</span>
      </template>
    </Column>
    <Column header="Type">
      <template #body="slotProps">
        <Tag :value="slotProps.data.type" severity="danger" />
      </template>
    </Column>
    <Column header="Date">
      <template #body="slotProps">
        <span>{{ moment(slotProps.data.created_at).format('DD/MM/YYYY @HH:mm') }}</span>
      </template>
    </Column>
    <Column header="Actions" >
      <template #body="slotProps">
        <Button icon="pi pi-eye" rounded severity="secondary" size="small" @click="showViolation(slotProps.data)" />
      </template>
    </Column>
  </DataTable>
  <Violation
    v-if="selectedViolation"
    :vehicle="selectedViolation.vehicle"
    :user="selectedViolation.user"
    :type="selectedViolation.type"
    :data="selectedViolation.data"
    :created_at="selectedViolation.created_at"
    v-model:show="showingViolationDialog"
  />

</template>

<script lang="ts" setup>

  const { filterBy, filterValue } = defineProps<{
    filterBy: 'vehicle_id' | 'user_id',
    filterValue: string,
  }>();

  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import moment from 'moment';
  import Tag from 'primevue/tag';
  import Button from 'primevue/button';
  import { useToast } from 'primevue/usetoast';


  const violations = ref<Array<any> | null>([]);
  const loading = ref<boolean>(false);
  const totalRecords = ref<number>(0);
  const first = ref<number>(0);
  const showingViolationDialog = ref<boolean>(false);
  const selectedViolation = ref<any>(null);

  const pageSize = 10;

  const toast = useToast();

  const onPageChange = (event: any) => {
    first.value = event.first;
    fetchViolations();
  }

  const refresh = () => {
    first.value = 0;
    fetchViolations();
  }

  const fetchViolations = async () => {

    try {

      loading.value = true;

      const query = {
        [filterBy]: filterValue,
        start: first.value,
        length: pageSize,
      };

      const queryString = Object
        .keys(query)
        .map(key => key + '=' + query[key])
        .join('&');
        

      const url = `/api/violations?${queryString}`;
      const res = await $fetch<any>(url);

      violations.value = res.data;
      totalRecords.value = res.recordsTotal;

    } catch (err) {
      toast.add({ severity: 'error', summary: 'Error', detail: err.message });
    } finally {
      loading.value = false;
    }
  }

  const showViolation = (data: any) => {
    showingViolationDialog.value = true;
    selectedViolation.value = data;
  }

  onMounted(() => {
    fetchViolations();
  });
  

</script>
