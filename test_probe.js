import fs from 'fs';

async function probe() {
    const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf-8'));

    console.log("Probing with UTF8 Token...");
    try {
        const resUTF8 = await fetch('https://trecurity.com/api/controller/upsert', {
            method: 'POST',
            headers: {
                'Cookie': `token=${tokens.utf8}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        console.log(`UTF8_STAT:${resUTF8.status}`);
    } catch (e) { console.error("UTF8 Error:", e.message); }

    /*
    console.log("Probing with HEX Token...");
    try {
        const resHex = await fetch('https://trecurity.com/api/controller/upsert', {
            method: 'POST',
            headers: {
                'Cookie': `token=${tokens.hex}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        console.log(`HEX_STAT:${resHex.status}`);
    } catch (e) { console.error("HEX Error:", e.message); }
    */
}

probe();
