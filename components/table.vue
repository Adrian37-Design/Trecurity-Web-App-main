<template>
    <div class="row mb-4">
        <div class="col-sm">
            <Breadcrumb :home="{ icon: 'ti ti-home', route: '/dashboard' }" :model="breadcrumbs || []">
                <template #item="{ item, props }">
                    <router-link v-if="item.route" v-slot="{ href, navigate }" :to="item.route" custom>
                        <a :href="href" v-bind="props.action" @click="navigate">
                            <span :class="[item.icon, 'text-color']" />
                            <span class="text-primary font-semibold">{{ item.label }}</span>
                        </a>
                    </router-link>
                </template>
            </Breadcrumb>
        </div>
        <div class="col-sm">
            <div class="d-flex justify-content-end gap-2">
                <div class="flex justify-end">
                    <Button type="button" severity="secondary" icon="pi pi-refresh" size="small" @click="reloadTable" />
                </div>
                <div>
                    <slot name="actions" />
                </div>
            </div>
        </div>
    </div>

    <SkeletonTable v-if="isPageLoading" :columns="columns" />
    <div v-show="!isPageLoading">
        <ClientOnly>
            <DataTable v-show="!isPageLoading"
                :columns="columns"
                :options="_options"
                class="table"
                ref="table"
            />
        </ClientOnly>
    </div>
</template>

<script setup lang="ts">

    import { useToast } from 'primevue/usetoast';

    const { columns, server_side_url, options, breadcrumbs } = defineProps<{
        columns?: any[],
        server_side_url: string,
        options: any,
        breadcrumbs: { label: string, route: string}[],
    }>();

    let headers = ref([]);

    const table = ref();

    const reloadTable = () => {
        table.value?.dt.ajax.reload();
    }

    const emit = defineEmits(['dt']);
    defineExpose({ table });

    const toast = useToast();

    const _options = {
        fixedColumns: {
            start: 0,
            end: 1
        },
        scrollX: true,
        scrollY: 300,
        scrollCollapse: true,
        responsive: true,
        select: true,
        serverSide: true,
        processing: true,
        ...options,
        ajax: {
            url: server_side_url,
            method: "GET",
            dataSrc: (json) => {
                return json.data
            },
            error: (xhr, error, thrown) => {
                const message = xhr.responseJSON?.message || xhr.statusText || thrown;
                toast.add({ severity: 'error', summary: 'Error', detail: message});
                
                const status = xhr.status;
                if ([ 401, 403 ].includes(status)) reloadNuxtApp();
            }
        }
    };

    const nuxtApp = useNuxtApp();
    
    const isPageLoading = ref(true);

    nuxtApp.hook("page:finish", () => {
        isPageLoading.value = false;
    }); 

    watch(isPageLoading, (new_value) => {
        if(!new_value){
            headers.value = columns.map(({ title }) => title);
            const dt = table.value?.dt;
            emit('dt', dt);
        }
    }, 
    {
        deep: true
    }); 

    // TODO: fix pagination
    // TODO: rename to TablePage
    // TODO: further refactor the pages

</script>

<style lang="scss">
    @import 'datatables.net-bs5';
    @import 'datatables.net-fixedcolumns-dt';

    th {
        text-wrap: nowrap !important;
    }

    .datatable .dt-row {
        overflow-x: auto;
    }

    .dataTables_length select {
        width: 65px !important;
    }

    .dt-scroll-body::-webkit-scrollbar {
        background-color: transparent;
        height: 5px;
        width: 10px;
    }

    .dt-scroll-body::-webkit-scrollbar-thumb {
        background-color: rgba(32,33,36,0.38);
        border: none;
        -webkit-border-radius: 5px;
        border-radius: 5px;
        -webkit-box-shadow: none;
        box-shadow: none;
    }
</style>