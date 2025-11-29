import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { encrypt, decrypt } from '@/lib/encryption'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    // @ts-ignore - sshConnections is added in schema but types might not be updated yet
    include: { sshConnections: true }
  })

  if (!user) {
    return new NextResponse('User not found', { status: 404 })
  }

  // Return settings but mask sensitive data
  // @ts-ignore - sshConnections is added in schema but types might not be updated yet
  const connection = user.sshConnections[0]
  if (!connection) {
    return NextResponse.json(null)
  }

  return NextResponse.json({
    id: connection.id,
    host: connection.host,
    port: connection.port,
    username: connection.username,
    hasPassword: !!connection.encryptedPassword,
    hasAuthToken: !!connection.encryptedAuthToken,
    anthropicBaseUrl: connection.anthropicBaseUrl || process.env.ANTHROPIC_BASE_URL
  })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const data = await req.json()
  const { host, port, username, password, anthropicAuthToken, anthropicBaseUrl } = data

  if (!host || !port || !username) {
    return new NextResponse('Missing required fields', { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    return new NextResponse('User not found', { status: 404 })
  }

  // Check if connection exists
  // @ts-ignore - sshConnection is added in schema but types might not be updated yet
  const existingConnection = await prisma.sshConnection.findFirst({
    where: { userId: user.id }
  })

  const encryptedPassword = password ? encrypt(password) : existingConnection?.encryptedPassword
  const encryptedAuthToken = anthropicAuthToken ? encrypt(anthropicAuthToken) : existingConnection?.encryptedAuthToken

  if (!encryptedPassword) {
    return new NextResponse('Password is required for new connections', { status: 400 })
  }

  if (existingConnection) {
    // @ts-ignore
    const updated = await prisma.sshConnection.update({
      where: { id: existingConnection.id },
      data: {
        host,
        port: parseInt(String(port)),
        username,
        encryptedPassword,
        encryptedAuthToken,
        anthropicBaseUrl
      }
    })
    return NextResponse.json({ id: updated.id })
  } else {
    // @ts-ignore
    const created = await prisma.sshConnection.create({
      data: {
        userId: user.id,
        host,
        port: parseInt(String(port)),
        username,
        encryptedPassword,
        encryptedAuthToken,
        anthropicBaseUrl
      }
    })
    return NextResponse.json({ id: created.id })
  }
}
