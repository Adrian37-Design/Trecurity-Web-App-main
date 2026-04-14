<template>
    <main>
        <Head>
            <Meta charset="utf-8" />
            <Meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div class="page-wrapper" id="main-wrapper" data-layout="vertical" data-navbarbg="skin6" data-sidebartype="full"
    data-sidebar-position="fixed" data-header-position="fixed">
            <slot />
            <div class="py-6 px-6 text-center position-absolute bottom-0 w-100">
                <p class="mb-0 fs-4">&copy; NetroZim</p>
            </div>
        </div>
    </main>
</template>

<style>
    @import "~/public/css/styles.min.css";
</style>