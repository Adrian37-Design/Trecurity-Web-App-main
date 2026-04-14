const fs = require('fs');
const filePath = '/var/www/trecurity/.output/server/chunks/routes/api/auth/login.mjs';

try {
    console.log('Reading file:', filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix 1: Body fallback
    // Search for: const body = await readBody(event);
    // Replace with: const body = await readBody(event) || {};
    if (content.includes('const body = await readBody(event);')) {
        content = content.replace('const body = await readBody(event);', 'const body = await readBody(event) || {};');
        console.log('Fixed body destructuring.');
        modified = true;
    } else if (content.includes('|| {};')) {
        console.log('Body already fixed.');
    } else {
        console.warn('Could not find body line to fix.');
    }

    // Fix 2: approval_level reference
    // Pattern: Level: ${approval_level}
    if (content.includes('Level: ${approval_level}')) {
        content = content.replace('Level: ${approval_level}', 'Level: ${user.approval_level}');
        console.log('Fixed approval_level logging.');
        modified = true;
    }

    // Fix 3: createAppJwtToken call
    // Pattern: createAppJwtToken(JWT_APP_TOKEN_SECRET, user.id, approval_level,
    if (content.includes('createAppJwtToken(JWT_APP_TOKEN_SECRET, user.id, approval_level')) {
        content = content.replace(
            'createAppJwtToken(JWT_APP_TOKEN_SECRET, user.id, approval_level',
            'createAppJwtToken(JWT_APP_TOKEN_SECRET, user.id, user.approval_level'
        );
        console.log('Fixed createAppJwtToken call.');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log('File written successfully.');
    } else {
        console.log('No changes needed.');
    }

} catch (e) {
    console.error('Error processing file:', e);
    process.exit(1);
}
