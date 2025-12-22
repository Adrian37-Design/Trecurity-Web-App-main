import { checkAppJwtToken, checkControllerJwtToken } from "~/vendors/jwt";

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'token') || "";

  // verify jwt token
  const secret = process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
  const payload = await checkAppJwtToken(token, secret);

  if (payload.success) {
    event.context.user = {
      id: payload.user_id,
      approval_level: payload.approval_level,
      company_id: payload.company_id
    };
  } else {

    const secret = process.env.NUXT_JWT_CONTROLLER_TOKEN_SECRET;
    const payload = await checkControllerJwtToken(token, secret);

    if (payload) {
      event.context.vehicle = {
        number_plate: payload.number_plate,
      };
    }
  }

  // TODO: use one secret for all jwt tokens

})
