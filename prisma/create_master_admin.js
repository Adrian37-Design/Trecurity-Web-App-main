import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url';

// Manually load .env since we are running via raw Node
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim().replace(/^"(.*)"$/, '$1'); // Remove quotes

            // Clean up user copy-paste errors (like 'psql ' prefix or single quotes)
            value = value.replace(/^psql\s+'?/, '').replace(/'$/, '');

            // Fix for Neon/Prisma: Removing channel_binding=require often fixes "Can't reach database"
            // But since 'npx prisma db pull' worked, we should try keeping it.
            // if (key === 'DATABASE_URL' && value.includes('channel_binding=require')) {
            //    console.log("Removing 'channel_binding=require' from DATABASE_URL for compatibility...");
            //    value = value.replace('&channel_binding=require', '').replace('?channel_binding=require', '?');
            // }

            process.env[key] = value;
        }
    });
    console.log("Loaded .env file manually");
} else {
    console.log(".env file not found at " + envPath);
}

const prisma = new PrismaClient();

const load = async () => {
    try {
        console.log("Connecting to database: " + (process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 15) + "..." : "UNDEFINED"));

        //Hash password
        const password = "password";
        const hash = await argon2.hash(password);

        await prisma.user.upsert({
            where: {
                email: "master@gmail.com"
            },
            create: {
                name: "Master",
                surname: "Admin",
                email: "master@gmail.com",
                phone: "263772000000",
                password: hash,
                status: true,
                approval_level: "MASTER_ADMIN",
                two_factor_auth: false
            },
            update: {
                name: "Master",
                surname: "Admin",
                email: "master@gmail.com",
                phone: "263772000000",
                password: hash,
                status: true,
                approval_level: "MASTER_ADMIN"
            }
        });

        console.log("SUCCESS: Master Admin user upserted: master@gmail.com / password");
    } catch (e) {
        console.error("ERROR:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    };
}

load();
