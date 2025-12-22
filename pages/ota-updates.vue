<template>
  <div id="container">
    <div v-if="loading" style="aspect-ratio: 1; height: 30px;">
      <Spinner />
    </div>
    <div v-else>
      <h2>Current sketch</h2>
      <div id="sketch">
        <div v-if="sketchInfo">
          <div>
            <b>Size</b>: {{ (sketchInfo.size / 1024).toFixed(3) }} KB
          </div>
          <div>
            <b>Last updated</b>: {{ moment(sketchInfo.last_updated_at).format('YYYY-MM-DD HH:mm:ss') }}
          </div>
          <div>
            <b>Hash</b>: {{ sketchInfo.hash }}
          </div>
        </div>
        <div v-else>
          No sketch uploaded yet
        </div>
      </div>
      <FileUpload
        mode="basic"
        accept=".bin"
        auto
        @select="onSelect"
        size="small"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>

import { useToast } from 'primevue/usetoast';
import moment from 'moment';
import FileUpload from 'primevue/fileupload';


definePageMeta({
  title: "OTA Updates",
  layout: "dashboard",
  middleware: ["auth"]
});

const toast = useToast();

const sketchInfo = ref(null);
const loading = ref(false);

const fetchSketchInfo = async () => {

  loading.value = true;

  try {
    const { data } = await $fetch<any>('/api/sketch/info');
    sketchInfo.value = data;
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.message });
  } finally {
    loading.value = false;
  }

};

const getFileBase64 = (file) => {

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = () => {
      const base64 = reader.result.toString().split(',')[1];
      resolve(base64);
    };

    reader.onerror = error => reject(error);

  });

}

const onSelect = async (event: any) => {
  
  // get base64
  const base64 = await getFileBase64(event.files[0]);

  // send to server
  loading.value = true;
  
  try {

    const body = { base64 };
    const { data } = await $fetch<any>('/api/sketch', {
      method: 'POST',
      body
    });

    sketchInfo.value = data;

  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.message });
  } finally {
    loading.value = false;
  }
  
};

onMounted(() => {
  fetchSketchInfo();
});

</script>

<style>

#container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

#container > div {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

#sketch {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

</style>