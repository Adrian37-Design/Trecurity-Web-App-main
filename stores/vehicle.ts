
import { defineStore } from "pinia";

export const useVehicleStore = defineStore('vehicle', {
    state: () => ({
        isLoadingConfigure: false,
    }),
    actions: {
        async configure(payload: any) {
            try {
                this.isLoadingConfigure = true;

                return await $fetch('/api/vehicle/configure', {
                    method: "POST",
                    body: payload
                });

            } catch (err) {
                throw err;
            } finally {
                this.isLoadingConfigure = false;
            }
        }
    }
});
