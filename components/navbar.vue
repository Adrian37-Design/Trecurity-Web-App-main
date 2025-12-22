<template>
    <main>
        <header class="app-header">
            <nav class="navbar navbar-expand-lg navbar-light">
                <ul class="navbar-nav">
                    <li class="nav-item d-block d-xl-none">
                        <div @click="openSideBar = true;" class="nav-link nav-icon-hover">
                            <i class="ti ti-menu-2"></i>
                        </div>
                    </li>
                </ul>
                <div class="d-flex navbar-collapse justify-content-between px-0" id="navbarNav">
                    <div class="fs-5 fw-bold ms-sm-5">Trecurity <span class="p-tag p-component ms-2">
                        <span class="p-tag-value">{{ approval_level?.replace(/_/g, ' ') }}</span>
                    </span></div>
                    <NuxtLink to="/account">
                        <i v-if="two_factor_auth" class="ti ti-shield-check two-factor-auth-on" title="Two Factor Authentication is On (Account Secure)"></i>
                        <i v-else class="ti ti-shield-off two-factor-auth-off" title="Two Factor Authentication is Off (Account Not Secure)" ></i>
                        <Avatar :label="initials" class="m-auto" size="normal" shape="circle" />
                    </NuxtLink>
                </div>
                <Sidebar v-model:visible="openSideBar" position="left">
                    <div class="d-flex justify-content-center">
                        <NuxtLink @click="openSideBar = false" to="/account" class="nav-link" id="UserDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                            <i v-if="two_factor_auth" class="ti ti-shield-check two-factor-auth-on" title="Two Factor Authentication is On (Account Secure)"></i>
                            <i v-else class="ti ti-shield-off two-factor-auth-off" title="Two Factor Authentication is Off (Account Not Secure)" ></i>
                            <Avatar :label="initials" class="mr-2" size="normal" shape="circle" />
                        </NuxtLink>
                    </div>
                    <p class="h3 mb-1 mt-2 font-weight-semibold text-center text-truncate">{{ name }} {{ surname }}</p>
                    <p class="h4 fw-light mb-0 text-center text-truncate">{{ email }}</p>
                    <ul class="list mt-3">
                        <li class="nav-item" v-for="menuItem in menuItems" :key="menuItem.to">
                            <NuxtLink @click="openSideBar = false" class="sidebar-link" :to="menuItem.to">
                                <span class="menu-title">{{ menuItem.title }}</span>
                            </NuxtLink>
                        </li>
                        <li class="nav-item">
                            <a @click="openSideBar = false; authStore.logout();" href="#" class="sidebar-link">
                                <span class="menu-title">Log Out</span>
                            </a>
                        </li>
                    </ul>
                </Sidebar>
            </nav>
        </header>
    </main>
</template>

<script setup>
    import { useAuthStore } from '~/stores/auth';
    
    const authStore = useAuthStore();

    const { user } = useUser();

    const openSideBar = ref(false);

    const initials = computed(() => user.value?.name?.at(0)?.toUpperCase() + user.value?.surname?.at(0)?.toUpperCase() || '');
    const approval_level = computed(() => user.value?.approval_level);
    const name = computed(() => user.value?.name);
    const surname = computed(() => user.value?.surname);
    const email = computed(() => user.value?.email);
    const two_factor_auth = computed(() => user.value?.two_factor_auth);
    
    const menuItems = computed(() => getNavLinks(user.value?.approval_level));

</script>

<style>
    header.app-header {
        border: 1px #ebf1f6 solid;
    }

    .sidebar-link {
        display: flex;
        justify-content: center;
        padding-top: 0.5rem;
        padding-bottom: 0.5rem;
    }

    .two-factor-auth-on {
        color: #22c55e;
        text-decoration: none;
        top: 14px;
        left: 10px;
        position: relative;
        font-size: larger;
    }

    .two-factor-auth-off {
        color: red;
        text-decoration: none;
        top: 14px;
        left: 10px;
        position: relative;
        font-size: larger;
    }
</style>