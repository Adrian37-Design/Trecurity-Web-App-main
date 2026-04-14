
<template>
  <div class="p-5">
    <h1>Auth Debugger</h1>
    <p>If you can see this, the server is running and updated.</p>
    <hr />
    <div v-if="user">
      <h3>User State found</h3>
      <pre>{{ JSON.stringify(user, null, 2) }}</pre>
      <hr />
      <h3>Computed Data</h3>
      <p><strong>Email:</strong> {{ user.email }}</p>
      <p><strong>Companies Managed:</strong> {{ (user as any).companies_managed?.length || 0 }}</p>
      <p><strong>Companies Joined:</strong> {{ (user as any).companies_joined?.length || 0 }}</p>
      <p><strong>Legacy Admin ID:</strong> {{ (user as any).company_where_user_is_admin_id }}</p>
      <p><strong>Legacy Customer ID:</strong> {{ (user as any).company_where_user_is_customer_id }}</p>
    </div>
    <div v-else>
      <h3 class="text-danger">No User State (Not Logged In?)</h3>
      <NuxtLink to="/login" class="btn btn-primary">Go to Login</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUser } from '~/composables/user';
const { user } = useUser();
</script>
