<template>
    <main>
        <div class="row flex-grow mt-3">
            <div class="col-md-3 col-sm-4 mb-4">
                <NuxtLink to="user/list" class="icon-card mb-30 text-decoration-none text-dark">
                    <div class="icon orange">
                        <i class="ti ti-user"></i>
                    </div>
                    <div class="content">
                        <h5 class="mb-10">Super Admins</h5>
                        <h3 style="font-size: 1.7rem;" class="text-bold mb-10">{{ data?.super_admins ?? 0 }}</h3>
                    </div>
                </NuxtLink>
            </div>
            <div class="col-md-3 col-sm-4 mb-4">
                <NuxtLink to="/company/list" class="icon-card mb-30 text-decoration-none text-dark">
                    <div class="icon purple">
                        <i class="ti ti-building"></i>
                    </div>
                    <div class="content">
                        <h5 class="mb-10">Companies</h5>
                        <h3 style="font-size: 1.7rem;" class="text-bold mb-10">{{ data?.companies ?? 0 }}</h3>
                    </div>
                </NuxtLink>
            </div>
            <div class="col-md-3 col-sm-4 mb-4">
                <NuxtLink to="user/list" class="icon-card mb-30 text-decoration-none text-dark">
                    <div class="icon success">
                        <i class="ti ti-users"></i>
                    </div>
                    <div class="content">
                        <h5 class="mb-10">Users</h5>
                        <h3 style="font-size: 1.7rem;" class="text-bold mb-10">{{ data?.users ?? 0 }}</h3>
                    </div>
                </NuxtLink>
            </div>
            <div class="col-md-3 col-sm-4 mb-4">
                <NuxtLink to="vehicles" class="icon-card mb-30 text-decoration-none text-dark">
                    <div class="icon blue">
                        <i class="ti ti-car"></i>
                    </div>
                    <div class="content">
                        <h5 class="mb-10">Vehicles</h5>
                        <h3 style="font-size: 1.7rem;" class="text-bold mb-10">{{ data?.vehicles ?? 0 }}</h3>
                    </div>
                </NuxtLink>
            </div>
        </div>
        <ClientOnly>
            <Map class="mt-sm-0 mt-4" />
        </ClientOnly>
        <div style="height: 25px;"></div>
    </main>
</template>

<script setup lang="ts">

    const token = useCookie('token')
    const { user } = useUser();

    const { data }: any = await $fetch('/api/dashboard/super-admin');
</script>
