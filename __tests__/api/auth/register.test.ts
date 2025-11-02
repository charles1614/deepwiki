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

jest.mock('next/server', () => ({
  NextRequest: class {
    constructor(url, options) {
      this.url = url
      this.method = options.method || 'GET'
      this.headers = options.headers || {}
      this.body = options.body
    }

    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
  },
  NextResponse: {
    json: jest.fn().mockImplementation((data, init = {}) => ({
      status: init.status || 200,
      json: async () => data,
      headers: new Map(),
    })),
  },
}))

// Now import after mocking
import { POST } from '@/app/api/auth/register/route'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/database'

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
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockBcrypt.hash.mockResolvedValue('hashed_password')
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('User created successfully')
      expect(data.user.id).toBe('1')
      expect(data.user.email).toBe('test@example.com')
      expect(data.user.role).toBe('USER')
      expect(data.user.createdAt).toBeDefined()
      expect(data.user.updatedAt).toBeDefined()
    })

    it('returns error for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      }

      // Mock existing user
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'existing@example.com',
        password: 'hashed_password',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

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

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidUserData),
      })

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

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Internal server error',
      })
    })
  })
})