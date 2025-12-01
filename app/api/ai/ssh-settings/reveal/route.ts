import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { decrypt } from '@/lib/encryption'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    // @ts-ignore
    include: { sshConnections: true }
  })

  if (!user) {
    return new NextResponse('User not found', { status: 404 })
  }

  // @ts-ignore
  const connection = user.sshConnections[0]
  if (!connection) {
    return NextResponse.json(null)
  }

  // Determine which credentials to return based on mode
  const isProxyMode = connection.connectionMode === 'proxy'

  // Helper to safely decrypt
  const safeDecrypt = (text: string) => {
    try {
      return decrypt(text)
    } catch (e) {
      console.warn('Decryption failed (key mismatch?): Returning empty string. User should update settings.')
      return ''
    }
  }

  let webHost = connection.webHost
  let webPort = connection.webPort
  let webUsername = connection.webUsername
  let webPassword = connection.encryptedWebPassword ? safeDecrypt(connection.encryptedWebPassword) : ''

  // Always return SSH target details if they exist, as they are needed for the proxy connection
  let sshHost = connection.sshHost
  let sshPort = connection.sshPort
  let sshUsername = connection.sshUsername
  let sshPassword = connection.encryptedSshPassword ? safeDecrypt(connection.encryptedSshPassword) : ''

  return NextResponse.json({
    webHost,
    webPort,
    webUsername,
    webPassword,
    sshHost,
    sshPort,
    sshUsername,
    sshPassword,
    anthropicAuthToken: connection.encryptedAuthToken ? safeDecrypt(connection.encryptedAuthToken) : undefined,
    proxyUrl: connection.proxyUrl // Client needs this too
  })
}
