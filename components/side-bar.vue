<template>
    <main>
        <aside class="left-sidebar">
            <!-- Sidebar scroll-->
            <div class="d-flex flex-column h-100">
                <div class="brand-logo d-flex align-items-center justify-content-center mt-3 flex-shrink-0">
                    <NuxtLink to="/" class="text-nowrap logo-img">
                        <NuxtImg src="/images/logo-with-payoff-line.svg" width="120" alt="Trecurity Logo"/>
                    </NuxtLink>
                    <div class="close-btn d-xl-none d-block sidebartoggler cursor-pointer" id="sidebarCollapse">
                        <svg xmlns="http://www.w3.org/2000/svg" class="text-dark" width="40" height="40" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                            <path d="M18 6l-12 12"></path>
                            <path d="M6 6l12 12"></path>
                        </svg>
                    </div>
                </div>
                <!-- Sidebar navigation-->
                <nav class="sidebar-nav scroll-sidebar mt-3">
                    <ul id="sidebarnav">
                        <li v-for="item in menuItems" :key="item.to" class="sidebar-item">
                            <NuxtLink :to="item.to" active-class="active" class="sidebar-link row" aria-expanded="false">
                                <span class="col-3 d-flex align-items-center justify-content-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler" width="40" height="40" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                        <path :d="item.iconPath"></path>
                                    </svg>
                                </span>
                                <span class="col-8 hide menu">{{ item.title }}</span>
                            </NuxtLink>
                        </li>
                    </ul>
                </nav>
                
                <!-- Fixed Bottom Section -->
                <div class="sidebar-footer">
                    <ul id="sidebarnav-footer">
                        <li class="sidebar-item">
                            <a @click="authStore.logout()" href="#" class="sidebar-link row" aria-expanded="false">
                                <span class="col-3 d-flex align-items-center justify-content-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="text-danger" width="28" height="28" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                        <path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2 M7 12h14l-3 -3m0 6l3 -3"></path>
                                    </svg>
                                </span>
                                <span class="col-8 hide-menu text-danger fw-bold">Log Out</span>
                            </a>
                        </li>
                    </ul>
                </div>

            </div>
        </aside>
    </main>
</template>

<script setup lang="ts">

    import { type User } from '@prisma/client';
    import { useAuthStore } from "~/stores/auth";

    const user = useState<User>('user');

    const menuItems = computed(() => {
        if (!user.value) return getNavLinks(undefined);
        return getNavLinks(user.value.approval_level);
    });

    const authStore = useAuthStore();
    const route = useRoute();


</script>

<style scoped>
    .left-sidebar {
        height: 100vh;
        /* Removed position: relative; as flex handles layout */
        background: #fff; /* Ensure generic background */
    }
    
    .scroll-sidebar {
        flex: 1; /* Takes available space */
        overflow-y: auto;
        /* Removed padding-bottom: 100px; - no longer needed as footer is in flow */
    }

    #sidebarnav {
        display: flex;
        flex-direction: column;
    }

    .sidebar-footer {
        /* Removed absolute positioning */
        width: 100%;
        padding-top: 15px;
        padding-bottom: 15px;
        border-top: 1px solid #eee;
        background: #fff;
        z-index: 9;
    }
    
    #sidebarnav-footer {
        padding-left: 0;
        list-style: none;
        margin-bottom: 0;
    }
</style>