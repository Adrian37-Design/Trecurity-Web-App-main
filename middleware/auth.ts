import { checkAppJwtToken } from "~/vendors/jwt";
import * as jose from 'jose';

export default defineNuxtRouteMiddleware (async (c) => {

  // NOTE: no need for verification here. This is for user
  // experience only. The server will verify the token.
  const token = useCookie('token').value || "";
  let isTokenValid = false;

  if (token) {

    const decoded = jose.decodeJwt(token);
    
    if (decoded.exp > Date.now() / 1000) {
      isTokenValid = true;
    }

  }
  
  if (!isTokenValid)
    return navigateTo('/login');

});

