<template>
    <main>
        <aside class="left-sidebar">
            <!-- Sidebar scroll-->
            <div>
                <div class="brand-logo d-flex align-items-center justify-content-center mt-3">
                    <NuxtLink to="/" class="text-nowrap logo-img">
                        <NuxtImg src="/images/logo-with-payoff-line.svg" width="120" alt="Trecurity Logo"/>
                    </NuxtLink>
                    <div class="close-btn d-xl-none d-block sidebartoggler cursor-pointer" id="sidebarCollapse">
                        <i class="ti ti-x fs-8"></i>
                    </div>
                </div>
                <!-- Sidebar navigation-->
                <nav class="sidebar-nav scroll-sidebar mt-3">
                    <ul id="sidebarnav">
                        <li v-for="item in menuItems" :key="item.to" class="sidebar-item">
                            <NuxtLink :to="item.to" active-class="active" class="sidebar-link row" :class="{ 'active': route.path.includes(item.to) }" aria-expanded="false">
                                <span class="col-2">
                                    <i :class="item.icon"></i>
                                </span>
                                <span class="col-8 hide menu">{{ item.title }}</span>
                            </NuxtLink>
                        </li>
                        <li class="sidebar-item">
                            <a @click="authStore.logout()" href="#" class="sidebar-link row" aria-expanded="false">
                                <span class="col-2">
                                    <i class="ti ti-logout"></i>
                                </span>
                                <span class="col-8 hide-menu">Log Out</span>
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </aside>
    </main>
</template>

<script setup lang="ts">

    import { type User } from '@prisma/client';
    import { useAuthStore } from "~/stores/auth";

    const user = useState<User>('user');

    const menuItems = computed(() => getNavLinks(user.value?.approval_level));

    const authStore = useAuthStore();
    const route = useRoute();


</script>