
const links = {

   _link(base: string, id?: string) {
      return id ? `${base}/${id}` : base;
   },

   vehicle(id?: string) {
      return this._link('/vehicles', id);
   }
}

export default links;