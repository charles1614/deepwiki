
const { prisma } = require('./lib/database');

async function main() {
  try {
    console.log('Attempting to connect to database...');
    const userCount = await prisma.user.count();
    console.log(`Successfully connected! Found ${userCount} users.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

main();
