import { defineStore } from "pinia";
import Swal from "sweetalert2";

export const useAuthStore = defineStore('auth', {
  state: () => ({
      // Login
      email: "",
      password: "",
      isLoadingLogin: false,
      // Register
      name: "",
      surname: "",
      phone: "",
      confirmPassword: "",
      isLoadingRegister: false,
      // One Time Pin
      oneTimePin: "",
      isLoadingSendOTP: false,
      isLoadingVerifyOTP: false,
      openTwoFactorAuth: false,
      token: "",
      option: "",
      // Recaptcha
      recaptcha_token: "",
      // Forgot Password
      newPassword: "",
      confirmNewPassword: "",
      isLoadingForgotPassword: false,
      // Affiliate
      affiliate_code: "",
      // Invitation
      invitation_id: ""
  }),
  actions: {
    async login() {

      try {

        this.isLoadingLogin = true;

        let _navigator = {};
        for (let i in navigator) _navigator[i] = navigator[i];
        
        return await $fetch('/api/auth/login', { 
          method: "POST",
          body: {
              email: this.email,
              password: this.password,
              recaptcha_token: this.recaptcha_token,
              device_information: _navigator
          }
        });

      } catch (err) {
        throw err;
      } finally {
        this.isLoadingLogin = false;
      }
    },
    async forgotPassword() {
      try {
        this.isLoadingForgotPassword = true;

        return await $fetch('/api/auth/forgot-password', { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: this.email,
            newPassword: this.newPassword,
            confirmNewPassword: this.confirmNewPassword,
            recaptcha_token: this.recaptcha_token
          }) 
        }).then((data)=>{
          this.isLoadingForgotPassword = false;
          
          return {
            data,
            success: true
          }
        });
      } catch (error) {
        this.isLoadingForgotPassword = false;
        console.error(error);
        return {
          data: {},
          message: "An internal application error has occurred. Please try to refresh your page and start again.",
          success: false
        }
      }
    },
    async sendDeleteOTP(info:any) { 
      try {
        this.isLoadingSendOTP = true;

        return await $fetch('/api/auth/send-delete-otp', { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              user: info.user_id,
              email: info.email,
              token: info.token,
              option: info.option
          }) 
        }).then((data)=>{
          this.isLoadingSendOTP = false;
          return {
            data,
            success: true
          }
        });
      } catch (error) {
        this.isLoadingSendOTP = false;
        console.error(error);
        return {
          data: {},
          message: "An internal application error has occurred. Please try to refresh your page and start again.",
          success: false
        }
      }
    },
    async sendOTP() { 
      try {
        this.isLoadingSendOTP = true;

        return await $fetch('/api/auth/send-otp', { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              email: this.email,
              token: this.token,
              option: this.option
          }) 
        }).then((data)=>{
          this.isLoadingSendOTP = false;
          return {
            data,
            success: true
          }
        });
      } catch (error) {
        this.isLoadingSendOTP = false;
        console.error(error);
        return {
          data: {},
          message: "An internal application error has occurred. Please try to refresh your page and start again.",
          success: false
        }
      }
    },
    async verifyDeleteOTP(info:any) { 
      try {
        this.isLoadingVerifyOTP = true;
        let _navigator = {};
        for (let i in navigator) _navigator[i] = navigator[i];
        
        return await $fetch('/api/auth/verify-delete-otp', { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: info.user_id,
            email: info.email,
            token: info.token,
            option: info.option,
            one_time_pin: info.one_time_pin,
            device_information: _navigator
          }) 
        }).then((data)=>{
          this.isLoadingVerifyOTP = false;
          return {
            data,
            success: true
          }
        });
      } catch (error) {
        this.isLoadingVerifyOTP = false;
        console.error(error);
        return {
          data: {},
          message: "An internal application error has occurred. Please try to refresh your page and start again.",
          success: false
        }
      }
    },
    async verifyOTP() { 
      try {
        this.isLoadingVerifyOTP = true;
        let _navigator = {};
        for (let i in navigator) _navigator[i] = navigator[i];
        
        return await $fetch('/api/auth/verify-otp', { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: this.name,
            surname: this.surname,
            phone: this.phone,
            email: this.email,
            password: this.password,
            newPassword: this.newPassword,
            token: this.token,
            option: this.option,
            one_time_pin: this.oneTimePin,
            affiliate_code: this.affiliate_code,
            invitation_id: this.invitation_id,
            device_information: _navigator
          }) 
        }).then((data)=>{
          this.isLoadingVerifyOTP = false;
          return {
            data,
            success: true
          }
        });
      } catch (error) {
        this.isLoadingVerifyOTP = false;
        console.error(error);
        return {
          data: {},
          message: "An internal application error has occurred. Please try to refresh your page and start again.",
          success: false
        }
      }
    },
    async deleteUser(info:any) { 
      try {
        this.isLoadingVerifyOTP = true;

        return await $fetch('/api/auth/delete-user', { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: info.user_id,
            email: info.email,
            token: info.token,
          }) 
        }).then((data)=>{
          this.isLoadingVerifyOTP = false;
          return {
            data,
            success: true
          }
        });
      } catch (error) {
        this.isLoadingVerifyOTP = false;
        console.error(error);
        return {
          data: {},
          message: "An internal application error has occurred. Please try to refresh your page and start again.",
          success: false
        }
      }
    },
    async flushDeletedUser() {
      try {
        return await $fetch('/api/auth/logout', { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }).then(()=>{
          reloadNuxtApp();
        });
      } catch (error) {
        console.error(error);
      }
    },
    async logout() {

      // confirm
      const result = await Swal.fire({
        icon: 'question',
        title: 'Log Out',
        text: 'Do you want to log out',
        showCancelButton: true
      });

      if (!result.isConfirmed)
        return;
      
      try {
        // Clear session
        await $fetch('/api/auth/logout', { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        // clear user
        const { setUser } = useUser();
        setUser(null);

        // redirect to login
        navigateTo('/login');

      } catch (error) {
        console.error(error);
      }
    }
  }
});

