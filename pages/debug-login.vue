
<template>
    <div class="container mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">Login Debugger</h1>
        <div class="card p-4 border rounded shadow">
            <div class="mb-4">
                <label class="block mb-2">Email</label>
                <input v-model="form.email" type="text" class="border p-2 w-full" />
            </div>
            <div class="mb-4">
                <label class="block mb-2">Password</label>
                <input v-model="form.password" type="text" class="border p-2 w-full" />
            </div>
            <button @click="checkLogin" class="bg-blue-500 text-white px-4 py-2 rounded" :disabled="loading">
                {{ loading ? 'Checking...' : 'Check Login' }}
            </button>
        </div>

        <div v-if="result" class="mt-4 p-4 border rounded bg-gray-100">
            <h2 class="font-bold">Results:</h2>
            <div :class="{'text-green-600': result.success, 'text-red-600': !result.success}" class="text-xl mb-2">
                {{ result.success ? 'LOGIN SUCCESSFUL' : 'LOGIN FAILED' }}
            </div>
            <pre class="whitespace-pre-wrap font-mono text-sm bg-black text-white p-4 rounded">{{ result.logs.join('\n') }}</pre>
        </div>
    </div>
</template>

<script setup>
const form = ref({ email: '', password: '' });
const result = ref(null);
const loading = ref(false);

const checkLogin = async () => {
    loading.value = true;
    result.value = null;
    try {
        const data = await $fetch('/api/debug-login-check', {
            method: 'POST',
            body: form.value
        });
        result.value = data;
    } catch (e) {
        result.value = { success: false, logs: ['API Error: ' + e.message] };
    } finally {
        loading.value = false;
    }
}
</script>
