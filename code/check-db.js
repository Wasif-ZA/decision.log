const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ 
    adapter,
    log: ['error']
});

async function main() {
    try {
        const users = await prisma.user.findMany();
        console.log('Users:', users.map(u => ({ login: u.login, id: u.id })));
        const repos = await prisma.repo.findMany();
        console.log('Repos:', repos.map(r => ({ fullName: r.fullName, userId: r.userId })));
    } catch (e) {
        console.error(e);
    }
}
main().finally(() => prisma.$disconnect());
