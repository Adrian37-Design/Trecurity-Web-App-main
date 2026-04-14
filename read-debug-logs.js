const fs = require('fs');
const path = require('path');

const logFile = path.join(process.env.HOME, '.pm2/logs/ecosystem-out.log');

try {
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.split('\n');

    // Get last 300 lines
    const recentLines = lines.slice(-300);

    // Find DEBUG OTP lines
    const debugLines = recentLines.filter(line => line.includes('DEBUG OTP'));

    if (debugLines.length > 0) {
        console.log('🔍 Found DEBUG OTP logs:');
        console.log('===================================');
        debugLines.forEach(line => console.log(line));
        console.log('===================================');
    } else {
        console.log('❌ No DEBUG OTP logs found in recent output');
        console.log('Last 10 lines of log:');
        console.log(recentLines.slice(-10).join('\n'));
    }
} catch (error) {
    console.error('Error reading log file:', error.message);
}
