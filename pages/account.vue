<template>
    <main>
        <div class="tab-content tab-content-basic">
            <div class="tab-pane fade show active" id="overview" role="tabpanel" aria-labelledby="overview">
                <div class="h4 mb-2">Account</div>
                <div class="row">
                    <div class="col-lg-12 d-flex flex-column">
                        <div class="row flex-grow">
                            <div class="card card-rounded">
                                <div class="card-body">
                                    <form @submit.prevent="update()" class="pt-3">
                                        <div class="form-group row">
                                            <div class="col-md-6 mb-3">
                                                <InputText v-model="name"  type="text" placeholder="Name" required validate />
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <InputText v-model="surname"  type="text" placeholder="Surname" required validate />
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <InputText v-model="email"  type="text" placeholder="Email" disabled />
                                            </div>
                                            <div class="col-md-6 mb-3">
                                                <InputText v-model="phone"  type="text" class="mb-2" placeholder="Phone" required validate />
                                            </div>
                                            <div class="col-md-12 row">
                                                <div class="col-md-4 mb-3">
                                                    <Password v-model="old_password" :feedback="false" toggleMask placeholder="Old Password (Optional)" />
                                                </div>
                                                <div class="col-md-4 mb-3">
                                                    <Password v-model="new_password" toggleMask placeholder="New Password (Optional)" >
                                                        <template #header>
                                                            <h6>Pick a password</h6>
                                                        </template>
                                                        <template #footer>
                                                            <Divider />
                                                            <p class="mt-2">Suggestions</p>
                                                            <ul class="pl-2 ml-2 mt-0" style="line-height: 1.5">
                                                                <li>At least one lowercase</li>
                                                                <li>At least one uppercase</li>
                                                                <li>At least one numeric</li>
                                                                <li>Minimum 8 characters</li>
                                                            </ul>
                                                        </template>
                                                    </Password>
                                                </div>
                                                <div class="col-md-4 mb-3">
                                                    <Password v-model="new_confirm_password" :feedback="false" toggleMask :class="{ 'p-invalid': new_password && !new_confirm_password || new_password != new_confirm_password }" placeholder="New Confirm Password (Optional)" />
                                                    <small v-if="new_password && !new_confirm_password || new_password != new_confirm_password" class="text-danger" id="confirm-password-help">The password does not match the confirm password</small>
                                                </div>
                                            </div>
                                            <div class="col-md-12 mb-3">
                                                 <div class="d-flex align-items-center justify-content-center">
                                                <Checkbox v-model="two_factor_auth" inputId="two_factor_auth" name="two_factor_auth" :binary="true" />
                                                <label for="two_factor_auth" class="text-muted fw-bold ms-2">Two Factor Authentication</label>
                                                 </div>
                                            </div>
                                            <div class="d-flex mb-3">
                                                <div class="m-3">
                                                <Button label="Update" :class="{ 'p-button-secondary': !name || !surname || !phone || (!old_password && new_password != new_confirm_password) || (old_password && (!new_password || !new_confirm_password)) || (old_password && (new_password != new_confirm_password)), 'p-button-success':  name && surname && phone && old_password && new_password && new_confirm_password && (old_password && new_password == new_confirm_password) }" type="submit" />
                                                </div>
                                                <div class="mt-3">
                                                    <Button @click="deleteUserAccount()" :loading="loading" label="Delete Account" severity="danger"    />
                                                </div>
                                                <Dialog v-model:visible="showDeleteUserDialog" modal header="Delete Account" :style="{ width: '50rem' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }">
                                                    <DialogAccountDelete/>
                                                </Dialog>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
    import { storeToRefs } from "pinia"
    import { useToast } from "primevue/usetoast"
    import Swal from "sweetalert2"
    import { useAuthStore } from "~/stores/auth"

    definePageMeta({
        title: "Account",
        layout: "dashboard",
        middleware: ["auth"]
    });

    const toast = useToast();
    const authStore = useAuthStore()
    const token = useCookie("token")
    const { user } = useUser();
    const loading = storeToRefs(authStore).isLoadingSendOTP
    const showDeleteUserDialog = ref<boolean>(false)
    const name = ref<string>()
    const surname = ref<string>()
    const email = ref<string>()
    const phone = ref<string>()
    const old_password = ref<string>()
    const new_password = ref<string>()
    const new_confirm_password = ref<string>()
    const two_factor_auth = ref<string>()
    
    const { data }: any = await useFetch('/api/account/find');

    name.value = data.value?.data?.name;
    surname.value = data.value?.data?.surname;
    email.value = data.value?.data?.email;
    phone.value = data.value?.data?.phone;
    two_factor_auth.value = data.value?.data?.two_factor_auth;

    const update = async () => {
        if((!old_password.value && new_password.value != new_confirm_password.value) || (old_password.value && (!new_password.value || !new_confirm_password.value)) || (old_password.value && (new_password.value != new_confirm_password.value))){
            toast.add({ severity: 'info', summary: 'Please fill in all the password fields in order to change your password', detail: data.value.message, life: 8000});
        }else {
            Swal.fire({
                icon: 'question',
                title: 'Update Account',
                text: 'Do you want to update your account',
                showCancelButton: true
            }).then(async (result)=>{

                if(result.isConfirmed){ 

                    const { data, success, message }: any = await $fetch('/api/account', {
                        method: 'PATCH',
                        body: {
                            name: name.value,
                            surname: surname.value,
                            phone: phone.value,
                            password: new_password.value,
                            old_password: old_password.value,
                            two_factor_auth: two_factor_auth.value,
                        }
                    });

                    if (success) {

                        // Don't refresh user state here - it causes unwanted navigation
                        // const { setUser } = useUser();
                        // setUser(data);
                        
                        toast.add({
                            severity:'warn',
                            summary: 'Update Account',
                            detail: message || 'Your account was successfully updated',
                            life: 8000
                        });

                    } else {
                        toast.add({ severity:'warn', summary: 'Update Account', detail: message, life: 8000});
                    }
                }
            });
        }
    }

    const deleteUserAccount = async () => {
        Swal.fire({
            icon: 'question',
            title: 'Delete Account',
            text: 'Do you want to delete your account',
            showCancelButton: true
        }).then(async (result)=>{
            if(result.isConfirmed){  
                let info = {
                    user_id: user.value.id,
                    email: email.value,
                    option: "delete",
                    token: token.value
                }

                let { data, success }: { data: any, success: boolean } = await authStore.sendDeleteOTP(info);
                
                if(success){
                    if (data.success) {
                        showDeleteUserDialog.value = true
                    }
                    else {
                        toast.add({ severity:'warn', summary: 'One Time Pin', detail: data?.message, life: 8000});
                    }
                } else{
                    toast.add({ severity:'warn', summary: 'Login Failed', detail: 'Server Error has occurred', life: 8000});
                }
            }
        })
    }
</script>

