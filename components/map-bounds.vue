

<template>
  <div>
    <div id="div-map" style="height: 400px;"></div>
  </div>
</template>

<script setup lang="ts">

  // imports
  import L from "leaflet"
  import 'leaflet-draw'
  import 'leaflet-draw/dist/leaflet.draw'
  import 'leaflet.fullscreen'

  // props
  const { disabled, canDelete } = defineProps({
    disabled: {
      type: Boolean,
      default: false
    },
    canDelete: {
      type: Boolean,
      default: true
    }
  });

  const coordinates = defineModel({
    type: Array<L.LatLng>,
    default: []
  });

  // emits
  const emit = defineEmits(['draw', 'edit', 'delete']);

  // map objects
  const editableLayers = new L.FeatureGroup();

  const drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
        polygon: {
            allowIntersection: false, // Restricts shapes to simple polygons
            showLength: true,
            icon: L.divIcon({
                html : `
                    <div class="marker">
                        <div class="marker-body">
                            <div class="ping"></div>
                        </div>
                    </div>
                `
            })
        },
        polyline: false,
        circlemarker: false,
        circle: false,
        rectangle: false,
        marker: false
    }
  });

  const editDrawControl = new L.Control.Draw({
    position: 'topleft',
    // @ts-ignore
    draw: false,
    edit: {
      featureGroup: editableLayers,
      remove: canDelete,
      // @ts-ignore
      poly: {
        allowIntersection: false
      }
    }
  });


  let map: L.Map;

  const clearBounds = () => {
    clearMap();
    drawControl.addTo(map);

    const emitDelete = Boolean(coordinates.value?.length); // shouldn't emit delete if there are no coordinates
    coordinates.value = [];

    if (emitDelete)
      emit('delete');

  }

  const clearMap = () => {
    editableLayers.clearLayers();
    drawControl.remove();
    editDrawControl.remove();
  }

  const drawMap = () => {
    if (coordinates.value?.length) {
      const polygon = L.polygon(coordinates.value);
      editableLayers.addLayer(polygon);
      map.fitBounds(polygon.getBounds());
    }

    if (!disabled) {
      if (coordinates.value?.length) 
        editDrawControl.addTo(map);
      else 
        drawControl.addTo(map);
    }
  }

  const redrawMap = () => {
    clearMap();
    drawMap();
  }

  watch(coordinates, () => {
    redrawMap();
  });

  // onMounted
  onMounted(() =>  {

    // map object
    map = L.map('div-map', {
      fullscreenControl: true,
        fullscreenControlOptions: {
            position: 'topright'
        },
        layers: [
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19
            })
        ]
    }).setView([-19.12440952808487, 30.014648437500004], 13);

    map.on('draw:created', (e) => {
      const bounds = e.layer.getLatLngs()[0];
      const polygon = L.polygon(bounds);
      
      editableLayers.addLayer(polygon);
      coordinates.value = bounds;
      emit('draw', bounds);

      map.fitBounds(polygon.getBounds());
      drawControl.remove();
      editDrawControl.addTo(map);

    });

    map.on('draw:deleted', (e) => {
      clearBounds();
    });

    map.on('draw:edited', (e) => {
      // @ts-ignore
      const layers = e.layers; 
      layers.eachLayer(function (layer) {
          if (layer instanceof L.Polygon) {
            const bounds = layer.getLatLngs()[0];
            // @ts-ignore
            coordinates.value = bounds;
            emit('edit', bounds);
          }
      });

    });

    // add layers to map
    map.addLayer(editableLayers);

    drawMap();
    

  });

  // TODO: Make this editable

</script>

<style>
    @import "leaflet/dist/leaflet.css";
    @import "leaflet-draw/dist/leaflet.draw.css";
    @import "leaflet.fullscreen/Control.FullScreen.css";

    #div-map { 
        height: 520px; 
        border-radius: 12px;
    }
</style>