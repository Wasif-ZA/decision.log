const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
    const userCount = await prisma.user.count();
    const repoCount = await prisma.repo.count();
    const artifactCount = await prisma.artifact.count();
    const candidateCount = await prisma.candidate.count();
    const decisionCount = await prisma.decision.count();
    const syncOpCount = await prisma.syncOperation.count();
    const costCount = await prisma.extractionCost.count();

    console.log({
        users: userCount,
        repos: repoCount,
        artifacts: artifactCount,
        candidates: candidateCount,
        decisions: decisionCount,
        syncOperations: syncOpCount,
        extractionCosts: costCount
    });
}
main().finally(() => prisma.$disconnect());
