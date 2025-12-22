import sketch from "./sketch";
import fs from 'fs';

export default defineEventHandler(async (event) => {
  
  // auth
  const number_plate: string = event.context.vehicle?.number_plate;

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
