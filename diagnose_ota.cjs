/**
 * OTA DIAGNOSTIC SCRIPT
 * Checks the status of the sketch.bin firmware on the server.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SKETCH_DIR = path.join(process.cwd(), 'sketches');
const SKETCH_PATH = path.join(SKETCH_DIR, 'sketch.bin');

function calculateHash(filePath) {
    const hash = crypto.createHash('md5');
    const data = fs.readFileSync(filePath);
    hash.update(data);
    return hash.digest('hex');
}

console.log('--- OTA STATUS DIAGNOSTIC ---');

// 1. Check Directory
if (!fs.existsSync(SKETCH_DIR)) {
    console.error('❌ sketches/ directory does NOT exist.');
} else {
    console.log('✅ sketches/ directory exists.');
}

// 2. Check File
if (!fs.existsSync(SKETCH_PATH)) {
    console.error('❌ sketches/sketch.bin does NOT exist! This is why boards are not downloading.');
} else {
    const stat = fs.statSync(SKETCH_PATH);
    const hash = calculateHash(SKETCH_PATH);
    
    console.log('✅ sketches/sketch.bin FOUND.');
    console.log(`   File Size: ${stat.size} bytes`);
    console.log(`   MD5 Hash: ${hash}`);
    console.log(`   Modified At: ${stat.mtime}`);
    
    const now = new Date();
    const diffDays = Math.floor((now - stat.mtime) / (1000 * 60 * 60 * 24));
    console.log(`   Age: ${diffDays} days old`);

    if (diffDays > 30) {
        console.warn('\n⚠️  WARNING: Firmware is very old (>30 days).');
        console.warn('   If your client uploaded a new code today, it was NOT saved to this location.');
    }
}

// 3. Permissions Check
try {
    const testFile = path.join(SKETCH_DIR, '.test_write');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('\n✅ Server has WRITE permissions to the sketches/ directory.');
} catch (e) {
    console.error('\n❌ Server does NOT have write permissions to sketches/ directory:', e.message);
}
