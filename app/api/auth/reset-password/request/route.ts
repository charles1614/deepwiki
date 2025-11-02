import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { passwordResetSchema } from '@/lib/validations'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validatedFields = passwordResetSchema.safeParse(body)

    if (!validatedFields.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const { email } = validatedFields.data

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Return success to prevent email enumeration attacks
      return NextResponse.json(
        { message: 'Password reset email sent' },
        { status: 200 }
      )
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // In a real implementation, you would:
    // 1. Store the reset token in the database
    // 2. Send an email with the reset link
    // For now, we'll just log it for development

    console.log('Password reset token (development only):', resetToken)
    console.log('Reset link would be:', `${process.env.NEXTAUTH_URL}/reset-password/confirm/${resetToken}`)

    // TODO: Implement email sending
    // await sendPasswordResetEmail(email, resetToken)

    return NextResponse.json(
      { message: 'Password reset email sent' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}