<template>
    <main>
        <Head>
            <Meta charset="utf-8" />
            <Meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6" data-sidebartype="full"
    data-sidebar-position="fixed" data-header-position="fixed">
            <slot />
        </div>
    </main>
</template>

<style>
    @import "~/public/css/styles.min.css";
</style>