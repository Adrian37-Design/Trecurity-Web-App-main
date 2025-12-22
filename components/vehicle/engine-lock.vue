<template>
    <main v-if="props?.vehicle?.tracking_data?.length > 0">
        <Button v-if="is_loading" icon="pi pi-spinner pi-spin" rounded severity="secondary" title="Sending Engine Command" disabled />
        <div v-else-if="get_pending_engine_commands() > 0" class="d-flex gap-2">
            <Button @click="waitingForEngineCommand()" icon="pi pi-hourglass" rounded severity="secondary" title="Waiting for the vehicle to execute commands" />
            <Button @click="cancelPendingCommand()" icon="pi pi-times" rounded severity="danger" label="Cancel" title="Cancel pending engine command" />
        </div>
        <Button v-else-if="!is_post_lastest_controller_command_tracking_data()" @click="waitingForNewTrackingData()" icon="pi pi-hourglass" rounded severity="secondary" title="Waiting for the vehicle to send new tracking data" />
        <Button v-else-if="is_geofence_violation() && is_engine_locked() && is_lock_engine_on_geofence_violation()" @click="forceUnLockEngine()" rounded severity="danger" icon="pi pi-lock" label="Force Unlock Engine" title="Engine is locked because of a geofence violation" />
        <Button v-else @click="toggleEngineLock()" :icon="`pi pi-${ is_engine_locked() ? 'lock' : 'lock-open' }`" rounded :severity="is_engine_locked() ? 'danger' : 'success'" :title="is_engine_locked() ? 'Engine is locked' : 'Engine is unlocked'" />
    </main>
</template>

<script setup lang="ts">
    import { useToast } from 'primevue/usetoast'
    import Swal from "sweetalert2";
    import { type User, type Company, type Vehicle, type Geofence, type TrackingData, type ControllerCommand } from '@prisma/client'

    const props = defineProps<{
        vehicle?: Vehicle & { company: Company, user: User[], tracking_data: TrackingData[], geofence?: Geofence, controller_command: ControllerCommand[], _count: { controller_command: number } }
    }>()

    const emit = defineEmits([
        'onSendEngineCommand',
        'onForceEngineUnLock'
    ])
    
    const toast = useToast()

    const { user } = useUser();
    const token = useCookie('token')

    const is_engine_locked = () => props?.vehicle?.tracking_data?.at(0)?.is_engine_locked
    const is_geofence_violation = () => props?.vehicle?.tracking_data?.at(0)?.geofence_violation_state === "VIOLATION"
    const is_lock_engine_on_geofence_violation = () => props?.vehicle?.lock_engine_on_geofence_violation
    const get_pending_controller_commands = () => props?.vehicle?._count?.controller_command
    
    // Get only pending ENGINE commands (not geofence commands)
    const get_pending_engine_commands = () => {
        return props?.vehicle?.controller_command?.filter(cmd => 
            !cmd.is_executed && (cmd.code === 'ENGINE_LOCK' || cmd.code === 'ENGINE_UN_LOCK')
        ).length || 0;
    }
    
    const is_post_lastest_controller_command_tracking_data = () => props?.vehicle?.controller_command?.length > 0 ? (new Date(props?.vehicle?.tracking_data?.at(0).updated_at) > new Date(props?.vehicle?.controller_command?.at(0)?.updated_at) && props?.vehicle?.controller_command?.at(0)?.is_executed) : props?.vehicle?.tracking_data?.length > 0

    const is_loading = ref<boolean>(false)

    const toggleEngineLock = () => {
        Swal.fire({
            icon: 'question',
            title: is_engine_locked() ? 'Unlock Engine' : 'Lock Engine',
            text: `Do you want to ${ is_engine_locked() ? 'unlock' : 'lock' } this vehicle's engine`,
            showCancelButton: true
        }).then(async (result)=>{
            if(result.isConfirmed){  
                is_loading.value = true;

                const result = await $fetch<{ data: Geofence, message: string, success: boolean }>('/api/command/engine', {
                    method: 'POST',
                    body: JSON.stringify({
                        vehicle_id: props.vehicle.id,
                        code: is_engine_locked() ? 'ENGINE_UN_LOCK' : 'ENGINE_LOCK',
                        user_id: user.value.id,
                        token: token.value
                    })
                })
                .catch((error) => {
                    return {
                        data: {},
                        message: error,
                        success: false
                    }
                })
                .finally(() => {
                    is_loading.value = false;
                });

                if(result.success) {
                    toast.add({ severity: 'success', summary: 'Engine Command', detail: `The engine ${ is_engine_locked() ? 'unlock' : 'lock' } command was successfully sent to the server. This might take a few minutes to action depending on the internet connectivity in the vehicle's area.`, life: 15000})
                    emit('onSendEngineCommand', true)
                } else {
                    if(result?.message?.toString().includes("<no response> Failed to fetch") || result?.message?.toString().includes("net::ERR")) {
                        toast.add({ severity: 'warn', summary: 'Network Error', detail: 'Bad internet connection. Please check your internet connection and try again.', life: 8000})
                    } else {
                        toast.add({ severity: 'warn', summary: 'App Error', detail: "An internal application error has occurred. Please try to refresh your page and start again.", life: 8000})
                    }
                }
            }
        })
    }

    const forceUnLockEngine = () => {
        Swal.fire({
            icon: 'question',
            title: 'Force Unlock Engine',
            html: `<span>
                This will unlock the engine and set <span class="p-tag p-component p-tag-info">
                    <span class="p-tag-value">Lock engine on geofence violation</span>
                </span> to <span class="p-tag p-component p-tag-info">
                    <span class="p-tag-value">false</span>
                </span>
            </span>`,
            showCancelButton: true
        }).then(async (result)=>{
            if(result.isConfirmed){  
                is_loading.value = true;

                const result = await $fetch<{ data: Geofence, message: string, success: boolean }>('/api/command/force-unlock-engine', {
                    method: 'POST',
                    body: JSON.stringify({
                        vehicle_id: props.vehicle.id,
                        user_id: user.value.id,
                        token: token.value
                    })
                })
                .catch((error) => {
                    return {
                        data: {},
                        message: error,
                        success: false
                    }
                })
                .finally(() => {
                    is_loading.value = false;
                });

                if(result.success) {
                    toast.add({ severity: 'success', summary: 'Engine Command', detail: "The engine force unlock command was successfully sent to the server. This might take a few minutes to action depending on the internet connectivity in the vehicle's area.", life: 15000})
                    emit('onForceEngineUnLock', true)
                } else {
                    if(result?.message?.toString().includes("<no response> Failed to fetch") || result?.message?.toString().includes("net::ERR")) {
                        toast.add({ severity: 'warn', summary: 'Network Error', detail: 'Bad internet connection. Please check your internet connection and try again.', life: 8000})
                    } else {
                        toast.add({ severity: 'warn', summary: 'App Error', detail: "An internal application error has occurred. Please try to refresh your page and start again.", life: 8000})
                    }
                }
            }
        })
    }

    const waitingForEngineCommand = () => {
        toast.add({ severity: 'info', summary: 'Engine Command', detail: "Waiting for the engine command that was sent to the server to be actioned in the vehicle. This might take a few minutes to action depending on the internet connectivity in the vehicle's area.", life: 15000})
    }

    const waitingForNewTrackingData = () => {
        toast.add({ severity: 'info', summary: 'Tracking Data', detail: "Waiting for the vehicle to send new tracking data. This might take a few minutes to action depending on the internet connectivity in the vehicle's area.", life: 15000})
    }

    const cancelPendingCommand = () => {
        Swal.fire({
            icon: 'warning',
            title: 'Cancel Pending Command',
            text: 'Are you sure you want to cancel the pending engine command?',
            showCancelButton: true,
            confirmButtonText: 'Yes, cancel it',
            cancelButtonText: 'No, keep it'
        }).then(async (result) => {
            if (result.isConfirmed) {
                is_loading.value = true;

                try {
                    // Get the pending ENGINE command (not geofence)
                    const pendingCommand = props.vehicle.controller_command?.find(cmd => 
                        !cmd.is_executed && (cmd.code === 'ENGINE_LOCK' || cmd.code === 'ENGINE_UN_LOCK')
                    );
                    
                    if (!pendingCommand) {
                        toast.add({ severity: 'warn', summary: 'No Pending Command', detail: 'No pending engine command found to cancel.', life: 5000 });
                        return;
                    }

                    const result = await $fetch('/api/command/cancel', {
                        method: 'DELETE',
                        query: {
                            command_id: pendingCommand.id,
                            user_id: user.value.id,
                            token: token.value
                        }
                    });

                    if (result.success) {
                        toast.add({ severity: 'success', summary: 'Command Cancelled', detail: result.message, life: 5000 });
                        emit('onSendEngineCommand', true); // Refresh the vehicle data
                    } else {
                        toast.add({ severity: 'error', summary: 'Cancellation Failed', detail: result.message, life: 5000 });
                    }
                } catch (error) {
                    toast.add({ severity: 'error', summary: 'Error', detail: error.message || 'Failed to cancel command', life: 5000 });
                } finally {
                    is_loading.value = false;
                }
            }
        });
    }
</script>