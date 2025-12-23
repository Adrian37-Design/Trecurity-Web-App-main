<template>
    <Button 
        @click="downloadXLSX" 
        icon="pi pi-download" 
        label="Export to Excel"
        severity="success"
        outlined
        :loading="isExporting"
        title="Download vehicle data as Excel file"
    />
</template>

<script setup lang="ts">
    import { useToast } from 'primevue/usetoast';
    import type { Vehicle } from '@prisma/client';

    const props = defineProps<{
        vehicle: Vehicle
    }>();

    const toast = useToast();
    const { user } = useUser();
    const token = useCookie('token');
    const isExporting = ref(false);

    const downloadXLSX = async () => {
        try {
            isExporting.value = true;

            // Fetch the Excel file
            const response = await $fetch(`/api/export/vehicle-data`, {
                method: 'GET',
                query: {
                    vehicle_id: props.vehicle.id,
                    user_id: user.value.id,
                    token: token.value
                },
                responseType: 'arrayBuffer'
            });

            // Create blob and download
            const blob = new Blob([response], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${props.vehicle.number_plate.replace(/[^a-zA-Z0-9]/g, '_')}_data.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.add({ 
                severity: 'success', 
                summary: 'Export Complete', 
                detail: 'Vehicle data downloaded successfully',
                life: 5000
            });

        } catch (error) {
            console.error('Export error:', error);
            toast.add({ 
                severity: 'error', 
                summary: 'Export Failed', 
                detail: 'Could not export vehicle data. Please try again.',
                life: 5000
            });
        } finally {
            isExporting.value = false;
        }
    };
</script>
