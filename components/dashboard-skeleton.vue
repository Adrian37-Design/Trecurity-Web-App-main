<template>  
    <main>
        <div class="tab-content tab-content-basic">
            <div class="tab-pane fade show active" id="overview" role="tabpanel" aria-labelledby="overview">
                <div class="row">
                    <div class="col-md-12 d-flex flex-column mt-3">
                        <div class="row flex-grow">
                            <div v-for="item in [1, 2, 3, 4]" :key="item" class="col-md-3 col-sm-4 mb-4 py-1 py-sm-0">
                                <Skeleton borderRadius="10px" class="col-md-2" height="112px"></Skeleton>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="row d-flex justify-content-center mb-1 p-1">
                            <div class="col-md-12 d-flex justify-content-center mt-2">
                                <Skeleton width="214px" height="42px"></Skeleton>
                            </div>
                            <div class="d-flex justify-content-center col-md-3 mt-2">
                                <Skeleton width="40px" height="40px" style="border-radius: 50%;" class="me-2"></Skeleton>
                                <Skeleton width="214px" height="42px"></Skeleton>
                            </div>
                            <div class="col-md-12 mt-2">
                                <Skeleton height="520px"></Skeleton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">

</script>

<style>

</style>