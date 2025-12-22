import { defineNuxtPlugin } from "#app";
import DataTable from 'datatables.net-vue3';
import DataTablesCore from 'datatables.net-bs5';
import FixedColumns from 'datatables.net-fixedcolumns-dt';
 
DataTable.use(DataTablesCore);
DataTable.use(FixedColumns);

export default defineNuxtPlugin((nuxtApp) => { 
    nuxtApp.vueApp.component('DataTable', DataTable);
});