
import { H3Event } from 'h3';

function getPaginationParams(event: H3Event) {
   const params = getQuery(event);

   const draw: number = Number(params['draw']) || 1;
   const start: number = Number(params['start']) || 0;
   const search: any = params['search[value]'];
   const length: number = Number(params['length']) || 10;
   const orderColumnNumber: number = Number(params['order[0][column]']);
   const orderColumnKey: any = params[`columns[${ orderColumnNumber }][data]`] ?? 'created_at';
   const orderDir: any = params['order[0][dir]'] ?? 'asc'; // asc

   return {
      draw,
      start,
      search,
      length,
      orderColumnKey,
      orderDir
   }

   // TODO: use this function on all paginated endpoints

}

export {
   getPaginationParams,
}