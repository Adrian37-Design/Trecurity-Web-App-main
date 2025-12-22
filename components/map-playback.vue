<template>
    <div style="width: 100%;" class="row mt-3 mb-sm-0 mb-0 ms-sm-3 me-sm-3 me-0 ms-0">
        <div class="d-flex col-sm-2 col-5">
            <Button @click="playbackPrev()" icon="pi pi-backward" :severity="playback_current_marker_index === 0 ? 'secondary' : 'primary'" :disabled="playback_current_marker_index === 0" rounded text />

            <Button v-if="(playback_current_marker_index + 1) < props.playback_markers.length" @click="togglePlaybackState" class="ms-3 me-3" :icon="`pi ${ playback_state === 'PLAY' ? 'pi-pause' : 'pi-play'}`" rounded text />
            <Button v-else @click="restartPlayback" class="ms-3 me-3" icon="pi pi-replay" :severity="props.playback_markers.length === 0 ? 'secondary' : 'primary'" rounded text :disabled="props.playback_markers.length === 0"/>

            <Button @click="playbackNext()" icon="pi pi-forward" :severity="(playback_current_marker_index + 1) === props.playback_markers.length || (playback_current_marker_index + 1) === props.playback_markers.length ? 'secondary' : 'primary'" :disabled="(playback_current_marker_index + 1) === props.playback_markers.length || (playback_current_marker_index + 1) === playback_markers.length" rounded text />
        </div>
        <div class="d-flex col-sm-8 col-5">
            <Slider v-model="playback_progress_level" style="width: 100%" disabled class="m-auto" />
        </div>
        <div class="col-sm-2 col-2">
            <Button @click="increasePlayBackSpeed" :label="`${ playback_speed }x`" rounded text />
        </div>
        <div class="col-12">
            <div class="text-center fw-bold fs-4">{{ props.playback_markers.length > 0 ? playback_current_marker_index + 1 : 0 }}/{{ props.playback_markers.length }} {{ getTimestamp() }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { type TrackingData } from '@prisma/client'
    import moment from 'moment'

    const props = defineProps<{
        playback_markers: TrackingData[]
    }>()

    const emit = defineEmits(['updateMarkerLocation']);

    const playback_state = ref<'PLAY' | 'PAUSE'>('PAUSE')
    const playback_speed = ref<number>(1)
    const playback_current_marker_index = ref<number>(0)
    const playback_progress_level = ref<number>(0)

    const getTimestamp = () => {
        return props.playback_markers.length > 0 ? `- ${ moment(props.playback_markers[playback_current_marker_index.value]?.created_at).format("ddd, DD MMM yy, h:mm a") }` : ''
    }

    onMounted(() => {
        playback_progress_level.value = (1 / props.playback_markers.length) * 100

        if(props.playback_markers[playback_current_marker_index.value]) {
            emit('updateMarkerLocation', props.playback_markers[playback_current_marker_index.value], playback_current_marker_index.value)
        }
    })

    class LoopTimer {
        private timer: null | NodeJS.Timer;
        private callback: (...args: any[]) => void;
        private ms: number;
        private started: boolean;

        constructor(callback: (...args: any[]) => void, ms: number) {
            this.callback = callback;
            this.ms = ms;
            this.timer = null;
            this.started = false;
        }

        start() {
            if (!this.started) {
                this.timer = setInterval(this.callback, this.ms);
                this.started = true;
            }
        }

        stop() {
            if (this.timer) {
            //@ts-ignore
            clearInterval(this.timer);
                this.timer = null;
                this.started = false;
            }
        }

        get getStarted(): boolean {
            return this.started;
        }

        setInterval(ms: number) {
            this.ms = ms;
            if (this.started) {
                this.stop();
                this.start();
            }
        }
    }

    let playback_timer = new LoopTimer(() => {
        if((playback_current_marker_index.value + 1) < props.playback_markers.length) {
            // Update Progress Level
            playback_current_marker_index.value += 1
        } else {
            // Auto stop the play back when the markers are finished
            togglePlaybackState()
        }
    }, (2000 / playback_speed.value));

    watch(props, (value) => {
        // Rest playback
        playback_state.value = "PAUSE"
        playback_current_marker_index.value = 0
        playback_progress_level.value = (1 / props.playback_markers.length) * 100
        
        if(value.playback_markers[playback_current_marker_index.value]) {
            emit('updateMarkerLocation', value.playback_markers[playback_current_marker_index.value], playback_current_marker_index.value)
        }
    }, {
        deep: true
    })

    const increasePlayBackSpeed = () => {
        if(playback_speed.value === 2.5) playback_speed.value = 0.2
        else if(playback_speed.value === 0.2) playback_speed.value = 0.5
        else if(playback_speed.value === 0.5) playback_speed.value = 1
        else if(playback_speed.value === 1) playback_speed.value = 1.5
        else if(playback_speed.value === 1.5) playback_speed.value = 2
        else playback_speed.value = 2.5
    }

    const playbackNext = () => {
        if((playback_current_marker_index.value + 1) < props.playback_markers.length) {
            playback_current_marker_index.value += 1
        }
    }

    const playbackPrev = () => {
        if((playback_current_marker_index.value + 1) > 1) {
            playback_current_marker_index.value -= 1
        }
    }

    watch(playback_speed, (speed) => {
        playback_timer.setInterval((1000 / speed))
    })

    watch(playback_current_marker_index, (index) => {
        playback_progress_level.value = ((index + 1) / props.playback_markers.length) * 100

        if(props.playback_markers[index]) {
            emit('updateMarkerLocation', props.playback_markers[index], index)
        }
    })

    const startPlayback = () => {
        playback_timer.start()
    }

    const restartPlayback = () => {
        playback_current_marker_index.value = 0
        playback_progress_level.value = 0
        togglePlaybackState()

        if(props.playback_markers[playback_current_marker_index.value]) {
            emit('updateMarkerLocation', props.playback_markers[playback_current_marker_index.value], playback_current_marker_index.value)
        }
    }

    const togglePlaybackState = () => {
        if(playback_state.value === 'PAUSE') {
            playback_state.value = 'PLAY'
            startPlayback()
        } else {
            playback_state.value = 'PAUSE'
            playback_timer.stop()
        }
    }
</script>