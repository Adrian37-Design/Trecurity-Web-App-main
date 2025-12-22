<template>
    <main>
        <Head>
            <Meta charset="utf-8" />
            <Meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>

        <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6" data-sidebartype="full"
            data-sidebar-position="fixed" data-header-position="fixed">
            <SideBar />
            <div class="body-wrapper">
                <Navbar />
                <div class="container-fluid">
                    <slot />
                </div>
            </div>
            <NetworkStatusBanner />
        </div>
    </main>
</template>

<script lang="ts">
    export default defineNuxtComponent({
        head() {
            return {
                script: [
                    {
                        src: "/libs/jquery/dist/jquery.min.js"
                    },  
                    {
                        src: "/libs/simplebar/dist/simplebar.js"
                    }
                ] 
            }
        },
    });
</script>

<style>
    @import "~/public/css/styles.min.css";

    .body-wrapper {
        height: 100vh;
    }
    
    .page-wrapper {
        background: #f8fafc;
    }

    .container-fluid {
        height: 100%;
    }
</style>