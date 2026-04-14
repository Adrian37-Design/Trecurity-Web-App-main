export default defineNuxtPlugin(() => {
    // Initialize user state from localStorage on client-side mount
    // This ensures user state is available immediately after page load/navigation
    const { setUser } = useUser();
    setUser(); // Calls setUser without argument, which loads from localStorage
});
