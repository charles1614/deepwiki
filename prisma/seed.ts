import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') })

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminEmail = 'admin@deepwiki.com'
  const adminPassword = 'Admin123!'

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
      },
    })

    console.log('✅ Admin user created successfully:')
    console.log(`   Email: ${admin.email}`)
    console.log(`   Password: ${adminPassword}`)
    console.log(`   Role: ${admin.role}`)
  } else {
    console.log('ℹ️  Admin user already exists')
  }

  // Create test user
  const testEmail = 'user@deepwiki.com'
  const testPassword = 'User123!'

  const existingTestUser = await prisma.user.findUnique({
    where: { email: testEmail }
  })

  if (!existingTestUser) {
    const hashedPassword = await bcrypt.hash(testPassword, 12)

    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        role: 'USER',
      },
    })

    console.log('✅ Test user created successfully:')
    console.log(`   Email: ${testUser.email}`)
    console.log(`   Password: ${testPassword}`)
    console.log(`   Role: ${testUser.role}`)
  } else {
    console.log('ℹ️  Test user already exists')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })