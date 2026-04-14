
<template>
  <div v-if="availableCompanies.length > 1" class="company-switcher d-flex align-items-center ms-3">
    <select class="form-select form-select-sm" :value="currentCompanyId" @change="switchCompany">
      <option v-for="company in availableCompanies" :key="company.id" :value="company.id">
        {{ company.name }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useUser } from '~/composables/user';

const { user } = useUser();

const fetchedCompanies = ref<any[]>([]);

onMounted(async () => {
    // Force fetch to ensure we have data, regardless of login state
    try {
        const res = await $fetch('/api/user/my-companies');
        if (res.success && res.data) {
            fetchedCompanies.value = res.data;
        }
    } catch (e) {
        console.error("Failed to fetch companies", e);
    }
})

const availableCompanies = computed(() => {
  // 1. Prefer fetched companies (source of truth)
  if (fetchedCompanies.value.length > 0) return fetchedCompanies.value;

  // 2. Fallback to user session execution
  const account = user.value;
  if (!account) return [];

  const managed = (account as any).companies_managed || [];
  const joined = (account as any).companies_joined || [];
  
  const all = [...managed, ...joined];
  // Dedup by ID
  const unique = Array.from(new Map(all.map(c => [c.id, c])).values());
  return unique;
});

const currentCompanyId = computed(() => {
    // CRITICAL: Read from JWT cookie, not localStorage
    // The JWT contains the authoritative company_id after switching
    const tokenCookie = useCookie('token').value;
    
    if (tokenCookie && typeof tokenCookie === 'string') {
        try {
            // Decode JWT (format: header.payload.signature)
            const parts = tokenCookie.split('.');
            if (parts.length === 3) {
                // Decode base64url to JSON
                const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                const decoded = decodeURIComponent(
                    atob(base64)
                        .split('')
                        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                        .join('')
                );
                const payload = JSON.parse(decoded);
                if (payload.company_id) {
                    return payload.company_id;
                }
            }
        } catch (e) {
            console.error('Failed to decode JWT', e);
        }
    }
    
    // Fallback: use first available company
    return availableCompanies.value[0]?.id || '';
});

const switchCompany = async (event: Event) => {
  const targetId = (event.target as HTMLSelectElement).value;
  if (!targetId || targetId === currentCompanyId.value) return;

  try {
    const { success, token, active_company_id } = await $fetch('/api/auth/switch-company', {
        method: 'POST',
        body: { 
            target_company_id: targetId,
            user_id: user.value?.id,
            approval_level: user.value?.approval_level,
            token: useCookie('token').value
        }
    });

    if (success) {
        if (user.value) {
            (user.value as any).active_company_id = active_company_id;
            window.location.reload(); 
        }
    }
  } catch (e) {
    console.error("Failed to switch company", e);
    alert("Failed to switch company. Please try again.");
  }
};
</script>

<style scoped>
.company-switcher {
    width: 200px;
}
</style>
