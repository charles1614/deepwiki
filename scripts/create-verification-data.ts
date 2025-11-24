import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'verify@example.com'
  const password = 'password123'
  const hashedPassword = await bcrypt.hash(password, 10)

  // Cleanup existing user
  await prisma.user.deleteMany({ where: { email } })
  console.log('Cleaned up existing user')

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: 'USER'
    },
  })

  console.log(`User created: ${user.email}`)

  // Create wiki
  const wikiSlug = 'verification-wiki'
  const wiki = await prisma.wiki.create({
    data: {
      title: 'Verification Wiki',
      slug: wikiSlug,
      description: 'Wiki for verifying UI features',
      isPublic: true,
      ownerId: user.id,
    },
  })

  console.log(`Wiki created: ${wiki.slug}`)

  // Create index page
  const file = await prisma.wikiFile.create({
    data: {
      wikiId: wiki.id,
      filename: 'index.md',
      originalName: 'index.md',
      size: 100,
      url: 'https://example.com/dummy.md',
    }
  })

  console.log('Index page created')

  // Create version for content
  await prisma.wikiVersion.create({
    data: {
      fileId: file.id,
      versionNumber: 1,
      content: '# Verification Wiki\n\nThis is a test wiki.',
      changeType: 'CREATE',
      authorId: user.id,
      contentSize: 100,
      checksum: 'dummy-checksum'
    }
  })

  console.log('Version created')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
