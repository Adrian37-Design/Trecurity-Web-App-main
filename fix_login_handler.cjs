const fs = require('fs');
const filePath = '/var/www/trecurity/.output/server/chunks/routes/api/auth/login.mjs';

try {
    console.log('Reading file:', filePath);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix 1: Body fallback
    if (content.includes('const body = await readBody(event);')) {
        content = content.replace('const body = await readBody(event);', 'const body = await readBody(event) || {};');
        console.log('Fixed body destructuring.');
        modified = true;
    }

    // Fix 2: approval_level reference in logging
    if (content.includes('Level: ${approval_level}')) {
        content = content.replace('Level: ${approval_level}', 'Level: ${user.approval_level}');
        console.log('Fixed approval_level logging.');
        modified = true;
    }

    // Fix 3: createAppJwtToken call
    if (content.includes('createAppJwtToken(JWT_APP_TOKEN_SECRET, user.id, approval_level')) {
        content = content.replace(
            'createAppJwtToken(JWT_APP_TOKEN_SECRET, user.id, approval_level',
            'createAppJwtToken(JWT_APP_TOKEN_SECRET, user.id, user.approval_level'
        );
        console.log('Fixed createAppJwtToken call.');
        modified = true;
    }

    // Fix 4: accessToken usage (setCookie)
    if (content.includes('setCookie(event, "auth_token", accessToken,')) {
        content = content.replace('setCookie(event, "auth_token", accessToken,', 'setCookie(event, "auth_token", token,');
        console.log('Fixed setCookie accessToken -> token');
        modified = true;
    }

    // Fix 5: return object (accessToken AND refreshToken)
    // The structure is:
    // return {
    //   data: {
    //     accessToken,
    //     refreshToken,
    //
    // We need to fix both now.

    // Replace accessToken,
    if (content.includes('accessToken,')) {
        content = content.replace(/accessToken,/g, 'accessToken: token,');
        console.log('Fixed return object accessToken -> token');
        modified = true;
    }

    // Replace refreshToken, -> refreshToken: "",
    if (content.includes('refreshToken,')) {
        content = content.replace(/refreshToken,/g, 'refreshToken: "",');
        console.log('Fixed return object refreshToken -> ""');
        modified = true;
    }

    // Fallback for refreshToken if it was somehow on the same line or differently formatted
    // but regex should catch it.

    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log('File written successfully.');
    } else {
        console.log('No changes needed (or patterns not found).');
    }

} catch (e) {
    console.error('Error processing file:', e);
    process.exit(1);
}
