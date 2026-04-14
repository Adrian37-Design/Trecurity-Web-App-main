import sketch from "./sketch";
import fs from 'fs';

export default defineEventHandler(async (event) => {

  // auth
  const number_plate: string = event.context.vehicle?.number_plate;

  //Get env variables
  const FALLBACK_SECRET = "bbeef3426a1ed2b5cbbf7ad63e58689ec7bb9a7b9e5426aa1d6f7035b3cb0b704d7c6318";
  const config = useRuntimeConfig();
  let JWT_APP_TOKEN_SECRET = process.env.NUXT_JWT_APP_TOKEN_SECRET || process.env.NUXT_PUBLIC_JWT_APP_TOKEN_SECRET;
  if (!JWT_APP_TOKEN_SECRET) {
    JWT_APP_TOKEN_SECRET = (config.jwtAppTokenSecret || config.public?.jwtAppTokenSecret || FALLBACK_SECRET) as string;
  }

  if (!number_plate) {
    setResponseStatus(event, 401)
    return { data: {}, message: "Unauthorized", success: false }
  }

  // check if update is available
  const info = await sketch.getSketchInfo();

  if (!info) {
    setResponseStatus(event, 404)
    return { data: {}, message: "No update available", success: false }
  }

  const hash = event.headers.get('current-sketch-hash');

  if (hash === info.hash) {
    setResponseStatus(event, 404)
    return { data: {}, message: "No update available", success: true }
  }

  // stream sketch
  const path = await sketch.getSketchPath();

  setResponseHeader(event, 'Content-Type', 'application/octet-stream');
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="sketch.bin"`);
  setResponseHeader(event, 'Content-Length', info.size);

  const stream = fs.createReadStream(path);

  return stream;

});
