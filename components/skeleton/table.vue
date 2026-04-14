<template>
    <main>
        <div>
            <Skeleton class="float-start mb-3" width="162px" height="32px" />
            <Skeleton class="float-end mb-3" width="270px" height="32px" />
        </div>
        <div class="overflow-x">
            <table style="margin-bottom: 12px;" class="table">
                <thead>
                    <tr>
                        <th v-for="{ title } in columns" :key="title">{{ title }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in [1, 2, 3, 4]" :key="item">
                        <td v-for="{ title } in columns" :key="title">
                            <Skeleton />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div>
            <Skeleton class="float-start" width="200px" height="16px" />
            <Skeleton class="float-end" width="130px" height="37.73px" />
        </div>
    </main>
</template>

<script setup lang="ts">
    const { columns } = defineProps<{
        columns?: any[]
    }>();
</script>

<style>
    .overflow-x {
        position: relative;
        overflow: auto;
        width: 100%;
    }
</style>