import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'
const prisma = new PrismaClient();

const load = async () => {
    try {
        //Hash password
        const password = "password";
        const hash = await argon2.hash(password);

        await prisma.user.upsert({
            where: {
                email: "admin@gmail.com"
            },
            create: {
                name: "John",
                surname: "Doe",
                email: "admin@gmail.com",
                phone: "263772000002",
                password: hash,
                status: true,
                approval_level: "SUPER_ADMIN",
                two_factor_auth: false
            },
            update: {
                name: "John",
                surname: "Doe",
                email: "admin@gmail.com",
                phone: "263772000002",
                password: hash,
                status: true
            }
        });

        console.log("Added user data");
        console.log('Added permission data');
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    };
}

load();