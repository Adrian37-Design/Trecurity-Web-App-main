import fs from 'fs/promises';
import _fs from 'fs';
import crypto from 'crypto';
import delay from '~/shared/utils/delay';

const SKETCH_DIR = `${process.cwd()}/sketches`;
const SKETCH_PATH = `${SKETCH_DIR}/sketch.bin`;

const sketch = {

   _hash: '',
   _calculatingHashAndSize: false,
   _size: 0,
   _lastUpdatedAt: new Date(0),

   async getSketchInfo() {

      while (this._calculatingHashAndSize) {
         await delay(100);
      }

      if (!(this._hash && this._size && this._lastUpdatedAt.getTime() > 0))
         return null;

      return {
         hash: this._hash,
         size: this._size,
         last_updated_at: this._lastUpdatedAt
      }

   },

   async _calculateSketchInfo() {

      try {
         this._calculatingHashAndSize = true;

         this._hash = await this._calculateHash();
         const { lastUpdatedAt, size } = await this._getSketchFileInfo();

         this._size = size;
         this._lastUpdatedAt = lastUpdatedAt;

         
      } finally {
         this._calculatingHashAndSize = false;
      }

   },

   _calculateHash() {

      return new Promise<string>(async (resolve, reject) => {

         const hash = crypto.createHash('md5');
         const input = _fs.createReadStream(SKETCH_PATH);

         input.on('data', chunk => {
            // @ts-ignore
            hash.update(chunk);
         });

         input.on('end', () => {
            const result = hash.digest('hex');
            resolve(result);
         });

         input.on('error', reject);
         
      });
   },

   async _getSketchFileInfo() {
      const stat = await fs.stat(SKETCH_PATH);
      return {
         size: stat.size,
         lastUpdatedAt: stat.mtime
      }
   },

   async saveSketch(data: string) {
      // make sure dir exists
      try {
         await fs.access(SKETCH_DIR);
      } catch {
         await fs.mkdir(SKETCH_DIR, { recursive: true });
      }

      // save file
      await fs.writeFile(SKETCH_PATH, data, 'base64');
      await this._calculateSketchInfo();
   },

   async getSketchPath() {
      return SKETCH_PATH;
   },

}

sketch._calculateSketchInfo()
   .catch(console.error);

export default sketch;