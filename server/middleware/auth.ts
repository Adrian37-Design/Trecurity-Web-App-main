import { checkAppJwtToken, checkControllerJwtToken } from "~/vendors/jwt";

// Hardcoded fallback secret to prevent crashes when env vars fail to load
const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";

export default defineEventHandler(async (event) => {
  let token = getCookie(event, 'token') || "";

  // Check Authorization header if no cookie
  if (!token) {
    const authHeader = getHeader(event, 'Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // Check query parameter if still no token (fallback)
  if (!token) {
    const query = getQuery(event);
    if (query.token) {
      token = String(query.token);
    }
  }

  // Skip verification if no token - don't crash on login page
  if (!token) {
    return;
  }

  try {
    const config = useRuntimeConfig();

    // Get secret with multiple fallbacks to prevent undefined.trim() crash
    const secret = (
      config.jwtAppTokenSecret ||
      config.public?.jwtAppTokenSecret ||
      process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET ||
      process.env.NUXT_JWT_APP_TOKEN_SECRET ||
      FALLBACK_SECRET
    ) as string;

    const payload = await checkAppJwtToken(token, secret);

    if (payload.success) {
      event.context.user = {
        id: payload.user_id,
        approval_level: payload.approval_level,
        company_id: payload.company_id
      };
    } else {
      // Try controller JWT as fallback
      const controllerPayload = await checkControllerJwtToken(token, secret);

      if (controllerPayload) {
        event.context.vehicle = {
          number_plate: controllerPayload.number_plate,
        };
      }
    }
  } catch (error: any) {
    // Middleware must NEVER crash - just log and continue
    console.error("Auth middleware error (non-fatal):", error.message);
  }
})

