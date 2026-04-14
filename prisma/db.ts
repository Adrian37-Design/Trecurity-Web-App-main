import { PrismaClient } from '@prisma/client'

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma = global.__prisma || new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: 'mysql://root:AP4e5ES2KHV3@localhost:3306/trecurity',
    },
  },
});

if (process.env.NODE_ENV !== 'production') global.__prisma = prisma