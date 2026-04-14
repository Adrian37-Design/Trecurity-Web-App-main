
import morgan from 'morgan';
import { defineEventHandler } from 'h3';

const logger = morgan('tiny');

export default defineEventHandler((event) => {
  logger(event.node.req, event.node.res, function () {});
});