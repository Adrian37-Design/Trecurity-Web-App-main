const fs = require('fs');
const path = '/trecurity/Trecurity-Web-App/nuxt.config.ts';
try {
    let content = fs.readFileSync(path, 'utf8');
    // Replace the environment variable usage with the hardcoded string
    const newContent = content.replace(/process\.env\.NUXT_PUBLIC_RECAPTCHA_SITE_KEY/g, "'6LfB-UMsAAAAAErpo7GNwefulO-wNmTI6HpEZ8td'");
    fs.writeFileSync(path, newContent);
    console.log('Successfully patched nuxt.config.ts');
} catch (e) {
    console.error('Error patching file:', e);
    process.exit(1);
}
