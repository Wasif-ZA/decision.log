const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    // Check all users
    const users = await db.user.findMany();
    console.log('=== ALL USERS ===');
    users.forEach(user => {
        console.log('ID:', user.id);
        console.log('Login:', user.login);
        console.log('GitHub ID:', user.githubId);
        console.log('Token Encrypted:', user.githubTokenEncrypted ? user.githubTokenEncrypted.substring(0, 20) + '...' : 'NULL');
        console.log('Token IV:', user.githubTokenIv || 'NULL');
        console.log('---');
    });
}

main().finally(() => db.$disconnect());
