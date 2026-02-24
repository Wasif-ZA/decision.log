const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    const user = await prisma.user.findFirst({ where: { login: 'Wasif-ZA' } });
    if (!user) {
        console.log('User Wasif-ZA not found');
        return;
    }
    const repo = await prisma.repo.findFirst({ where: { fullName: 'decisionlog/demo-architecture' } });
    if (!repo) {
        console.log('Mock repo not found');
        return;
    }

    // Assign repo to Wasif-ZA
    await prisma.repo.update({
        where: { id: repo.id },
        data: { userId: user.id }
    });

    // Assign candidates and decisions to Wasif-ZA
    await prisma.candidate.updateMany({
        where: { repoId: repo.id },
        data: { userId: user.id }
    });

    await prisma.decision.updateMany({
        where: { repoId: repo.id },
        data: { userId: user.id }
    });

    console.log('Successfully transferred mock data to Wasif-ZA');
}

main().finally(() => prisma.$disconnect());
