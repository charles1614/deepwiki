/**
 * @jest-environment node
 */
// Mock dependencies before imports
jest.mock('@/lib/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}))

// No manual mock for next/server needed as we use globals


// Now import after mocking
import { POST } from '@/app/api/auth/register/route'
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/database'
import { createPostRequest } from '@/tests/unit/factories/request-factory'
import { createUser } from '@/tests/unit/factories'

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('creates a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      }

      // Mock successful user creation
      const mockUser = createUser({
        email: userData.email,
        password: 'hashed_password',
      })
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockBcrypt.hash.mockResolvedValue('hashed_password')
      mockPrisma.user.create.mockResolvedValue(mockUser)

      const request = createPostRequest(
        'http://localhost:3000/api/auth/register',
        userData
      ) as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('User created successfully')
      expect(data.user.email).toBe(userData.email)
      expect(data.user.role).toBe('USER')
      expect(data.user).toHaveRequiredProperties('id', 'email', 'role', 'createdAt', 'updatedAt')
    })

    it('returns error for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      }

      // Mock existing user
      const existingUser = createUser({
        email: userData.email,
      })
      mockPrisma.user.findUnique.mockResolvedValue(existingUser)

      const request = createPostRequest(
        'http://localhost:3000/api/auth/register',
        userData
      ) as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Email already exists',
      })
    })

    it('validates input data', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        password: '123', // too short
        confirmPassword: '456', // doesn't match
      }

      const request = createPostRequest(
        'http://localhost:3000/api/auth/register',
        invalidUserData
      ) as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid input data',
      })
    })

    it('handles server errors gracefully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      }

      // Mock database error
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const request = createPostRequest(
        'http://localhost:3000/api/auth/register',
        userData
      ) as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Internal server error',
      })
    })
  })
})