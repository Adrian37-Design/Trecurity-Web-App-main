import { _ as __nuxt_component_0 } from './nuxt-link-D35ckuRb.mjs';
import { s as storeToRefs, u as useToast, j as useRoute } from './server.mjs';
import { useSSRContext, defineComponent, unref, ref, resolveComponent, isRef, withCtx, createTextVNode } from 'vue';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderAttr } from 'vue/server-renderer';
import { _ as _imports_0, a as _sfc_main$2 } from './one-time-pin-BRvFaAU-.mjs';
import { u as useAuthStore } from './auth-BZzbFMcV.mjs';
import '../runtime.mjs';
import 'node:http';
import 'node:https';
import 'lru-cache';
import 'fs';
import 'path';
import 'assert';
import 'cheerio/lib/slim';
import 'cheerio';
import 'node:crypto';
import 'node:fs';
import 'node:url';
import 'morgan';
import 'jose';
import 'crypto';
import 'xss';
import 'ipx';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'devalue';
import '@unhead/ssr';
import 'unhead';
import '@unhead/shared';
import 'vue-router';
import './user-BP3xvSzq.mjs';
import 'sweetalert2';

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "login",
  __ssrInlineRender: true,
  setup(__props) {
    useToast();
    const authStore = useAuthStore();
    let {
      email,
      password,
      isLoadingLogin,
      token,
      recaptcha_token,
      openTwoFactorAuth
    } = storeToRefs(authStore);
    useRoute();
    const isGeneratingRecaptchaToken = ref(false);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_InputText = resolveComponent("InputText");
      const _component_NuxtLink = __nuxt_component_0;
      const _component_Password = resolveComponent("Password");
      const _component_Button = resolveComponent("Button");
      _push(`<main${ssrRenderAttrs(_attrs)}><div class="position-relative overflow-hidden radial-gradient min-vh-100 d-flex align-items-center justify-content-center"><div class="d-flex align-items-center justify-content-center w-100"><div class="row justify-content-center w-100"><div class="col-md-8 col-lg-4 col-xxl-3"><div class="card mb-0"><div class="card-body"><div class="d-flex justify-content-center"><img${ssrRenderAttr("src", _imports_0)} width="150" alt=""></div><p class="fs-6 text-center my-2">Sign In</p><form><div class="mb-3"><label for="email" class="form-label">Email</label>`);
      _push(ssrRenderComponent(_component_InputText, {
        id: "email",
        modelValue: unref(email),
        "onUpdate:modelValue": ($event) => isRef(email) ? email.value = $event : email = $event,
        type: "email",
        placeholder: "Email",
        required: "",
        validate: ""
      }, null, _parent));
      _push(`</div><div class="mb-4"><div class="d-flex justify-content-between"><label for="password" class="form-label">Password</label>`);
      _push(ssrRenderComponent(_component_NuxtLink, {
        class: "text-primary fw-bold",
        to: "/forgot-password"
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`Forgot Password`);
          } else {
            return [createTextVNode("Forgot Password")];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div>`);
      _push(ssrRenderComponent(_component_Password, {
        inputId: "password",
        modelValue: unref(password),
        "onUpdate:modelValue": ($event) => isRef(password) ? password.value = $event : password = $event,
        feedback: false,
        toggleMask: "",
        placeholder: "Password",
        required: "",
        validate: ""
      }, null, _parent));
      _push(`</div>`);
      if (!unref(isLoadingLogin)) {
        _push(ssrRenderComponent(_component_Button, {
          label: "Sign In",
          class: {
            "p-button-secondary p-button p-component w-full font-medium": !unref(email) || !unref(password) || unref(isLoadingLogin),
            "p-button-success p-button p-component w-full font-medium": unref(email) && unref(password)
          },
          type: "submit"
        }, null, _parent));
      } else {
        _push(ssrRenderComponent(_component_Button, {
          loading: true,
          label: unref(isGeneratingRecaptchaToken) ? "Verifying" : "Loading",
          class: "w-full",
          severity: "secondary",
          disabled: ""
        }, null, _parent));
      }
      _push(`</form></div></div></div></div></div></div></main>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/auth/login.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "login",
  __ssrInlineRender: true,
  setup(__props) {
    const authStore = useAuthStore();
    const {
      openTwoFactorAuth,
      option
    } = storeToRefs(authStore);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_AuthLogin = _sfc_main$1;
      const _component_AuthOneTimePin = _sfc_main$2;
      _push(`<div${ssrRenderAttrs(_attrs)}>`);
      if (!unref(openTwoFactorAuth)) {
        _push(ssrRenderComponent(_component_AuthLogin, null, null, _parent));
      } else {
        _push(ssrRenderComponent(_component_AuthOneTimePin, {
          backToText: "Login",
          backToLink: "/login",
          onSuccessLink: "/dashboard"
        }, null, _parent));
      }
      _push(`</div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/login.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=login-k8wvL97H.mjs.map
