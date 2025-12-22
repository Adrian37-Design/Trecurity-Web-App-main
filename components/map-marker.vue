<template>
  <div id="map" style="height: 400px; width: 100%">
    
  </div>
</template>

<script lang="ts" setup>

import L from 'leaflet';

const { lat, lon, popup } = defineProps<{
  lat: number,
  lon: number,
  popup?: string,
}>();


onMounted(() => {
  const map = L.map('map').setView([ lat, lon ], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  
  const marker = L.marker([ lat, lon ]).addTo(map);

  if (popup) {
    marker.bindPopup(popup).openPopup();
  }

})


</script>

<style>
@import "leaflet/dist/leaflet.css";
@import "leaflet.fullscreen/Control.FullScreen.css";



</style>