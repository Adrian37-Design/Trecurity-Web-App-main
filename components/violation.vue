<template>
  <Dialog v-model:visible="show" header="Violation" modal>
    <div>
      <div class="row g-4">
        <div class="item col-12 col-sm-6" v-for="(value, key) in items" :key="key">
          <div class="item-key">{{ key }}</div>
          <div class="item-value">{{ value }}</div>
        </div>
      </div>
    </div>
    <div class="mt-4">
      <MapMarker
        v-if="data"
        :lat="data.lat"
        :lon="data.lon"
        popup="This is where the violation took place"
      />
    </div>
  </Dialog>
</template>

<script lang="ts" setup>

import moment from 'moment';

const show = defineModel('show', {
  type: Boolean,
  required: true,
});

const props = defineProps<{
  vehicle: {
    id: number
    number_plate: string
  },
  user: {
    id: number
    name: string,
    surname: string
  },
  type: string,
  data?: {
    lat: number,
    lon: number,
    satellites: number,
    speed: number,
    course: number,
    hdop: number,
  },
  created_at: string
}>();

const items = computed(() => {

  const { vehicle, user, type, created_at, data } = props;

  const items = {
    vehicle: vehicle.number_plate,
    user: `${user.name} ${user.surname}`,
    type,
    'Date & Time': moment(created_at).format('YYYY-MM-DD HH:mm'),
  }

  if (data) {

    items["Satellites Used"] = data.satellites;
    items["Speed"] = data.speed;
    items["HDOP"] = data.hdop;

  }

  return items;

});

const data = computed(() => props.data);


</script>

<style>

  .item {
    color: $gray-600;
  }

  .item .item-key {
    color: $gray-400;
    font-size: 12px;
    text-transform: capitalize;
  }

  .item .item-value {
    font-size: 18px;
  }
</style>