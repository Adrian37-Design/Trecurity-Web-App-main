<template>
  <div class="form-group d-flex flex-column gap-3">
    <div>
      <label for="number_plate" class="text-muted fs-2 mb-1 ms-2">Name</label>
      <InputText v-model="name" required />
    </div>

    <ClientOnly>
      <div>
        <label for="number_plate" class="text-muted fs-2 mb-1 ms-2">Bounds</label>
        <MapBounds v-model="bounds" />
      </div>
    </ClientOnly>

    <div class="text-end">
      <Button label="Save" icon="ti ti-save" type="primary" @click="save" />
    </div>
  </div>
</template>

<script lang="ts" setup>

import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';

const { editRoute } = defineProps([ 'editRoute' ]);

const name = ref('');
const bounds = ref([]);

if (editRoute) {
  name.value = editRoute.name;
  bounds.value = editRoute.bounds;
}

const toast = useToast();

const emit = defineEmits([ 'add', 'edit' ]);

const save = async () => {
  if (!name.value) {
    return toast.add({ severity: 'error', summary: 'Error', detail: 'Name is required' });
  }

  if (!bounds.value.length) {
    return toast.add({ severity: 'error', summary: 'Error', detail: 'Bounds are required' });
  }

  try {

    const body = {
      name: name.value,
      bounds: bounds.value
    };

    let method, url = '/api/routes';

    if (editRoute) {
      method = 'PATCH';
      url += `/${editRoute.id}`;
    } else {
      method = 'POST';
    }

    await $fetch(url, {
      method,
      body,
    });

    toast.add({ severity: 'success', summary: 'Success', detail: `Route ${editRoute ? 'updated' : 'added'} successfully` });
    emit(editRoute ? 'edit' : 'add', body);

    // TODO: detect changes if in edit mode before saving
  
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.message });
  }
}

</script>

<style>

</style>