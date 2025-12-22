<template>
  <NuxtLoadingIndicator color="#0d6efd" />
  <NuxtLayout>
    <Toast />
    <NuxtPage />
  </NuxtLayout>
</template>

<style lang="scss">
  #main-wrapper[data-layout=vertical][data-header-position=fixed] .app-header {
    position: fixed;
    z-index: 1001 !important;
  }

  @media (max-width: 767.98px) {
    .body-wrapper>.container-fluid, .body-wrapper>.container-lg, .body-wrapper>.container-md, .body-wrapper>.container-sm, .body-wrapper>.container-xl, .body-wrapper>.container-xxl {
      padding-right: 0px !important;
      padding-left: 0px !important;
    }
  }

  .p-tag {
    cursor: pointer;
  }

  .table td {
    vertical-align: middle;
    line-height: 1;
    white-space: nowrap;
    padding: 0.125rem 0.5rem;
  }

  .p-dialog {
    &.p-component {
        @media (max-width: 1000px) {
          transition: none;
          transition: none;
          transform: none;
          width: 100vw !important;
          height: 100vh !important;
          top: 0px !important;
          left: 0px !important;
          max-height: 100% !important;
          height: 100%;
          border-radius: 0px;
        }
    }
  } 

  .p-toast {
    width: 320px;
  }

  .p-inputtext, .p-password, .p-dropdown, .p-multiselect {
    width: 100% !important;
  }

  .p-breadcrumb-list {
    margin-bottom: 0 !important;
  }

  .p-breadcrumb {
    padding: 0 !important;
  }

  .icon-card {
    font-family: "Manrope", sans-serif;
    display: flex;
    height: 7rem;
    align-items: center;
    background: #fff;
    padding: 30px 20px;
    border: none;
    box-shadow: 0px 10px 20px rgba(200, 208, 216, 0.3);
    border-radius: 10px; 
  }

  .icon-card.icon-card-3 {
    display: block;
    padding: 0px; 
  }
      
  .icon-card.icon-card-3 .card-content {
    display: flex;
    padding: 20px;
    padding-bottom: 0; 
  }

  @media only screen and (min-width: 1200px) and (max-width: 1399px) {
    .icon-card h6 {
        font-size: 15px; 
    }
  }

  @media only screen and (min-width: 1200px) and (max-width: 1399px) {
    .icon-card h3 {
        font-size: 20px; 
    }
  }
  
  .icon-card.icon-card-2 {
      display: block; 
  }
      
  .icon-card.icon-card-2 .progress {
      height: 7px; 
  }
      
  .icon-card.icon-card-2 .progress .progress-bar {
      border-radius: 4px; 
  }

  .icon-card .icon {
    max-width: 46px;
    width: 100%;
    height: 46px;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    margin-right: 20px;
    background: rgba(74, 108, 247, 0.1);
    color: #4a6cf7;
    font-weight: 700; 
  }

  @media only screen and (min-width: 1200px) and (max-width: 1399px) {
    .icon-card .icon {
        margin-right: 10px; 
    } 
  }

  .icon-card .icon.purple {
    background: rgba(155, 81, 224, 0.1);
    color: #9b51e0; 
  }

  .icon-card .icon.success {
    background: rgba(33, 150, 83, 0.1);
    color: #219653; 
  }
  
  .icon-card .icon.primary {
    background: rgba(74, 108, 247, 0.1);
    color: #4a6cf7; 
  }
  
  .icon-card .icon.orange {
    background: rgba(242, 153, 74, 0.1);
    color: #f2994a; 
  }
  
  .icon-card .icon.opacity-100.purple {
    background: #9b51e0;
    color: #fff; 
  }
  
  .icon-card .icon.opacity-100.success {
    background: #219653;
    color: #fff; 
  }
  
  .icon-card .icon.opacity-100.primary {
    background: #4a6cf7;
    color: #fff; 
  }
  
  .icon-card .icon.opacity-100.orange {
    background: #f2994a;
    color: #fff; 
  }
  
  .icon-card .icon.opacity-100.deep-blue {
    background: #345d9d;
    color: #fff; 
  }

  .page-enter-active,
  .page-leave-active {
    transition: all 0.4s;
  }
  .page-enter-from,
  .page-leave-to {
    opacity: 0;
    filter: blur(1rem);
  }

  .layout-enter-active,
  .layout-leave-active {
    transition: all 0.4s;
  }
  .layout-enter-from,
  .layout-leave-to {
    opacity: 0;
    filter: blur(1rem);
  }
</style>

<script setup>
  
  onNuxtReady(() => {
    const { setUser } = useUser();
    setUser();
  });

</script>