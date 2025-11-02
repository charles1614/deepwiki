// Mock dependencies before imports
jest.mock('@/lib/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
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
import { POST } from '@/app/api/auth/reset-password/request/route'
import { prisma } from '@/lib/database'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/auth/reset-password/request', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    console.log = jest.fn()
  })

  describe('POST', () => {
    it('sends reset email for existing user', async () => {
      const requestData = {
        email: 'test@example.com',
      }

      // Mock existing user
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new Request('http://localhost:3000/api/auth/reset-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        message: 'Password reset email sent',
      })
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
    })

    it('returns success message for non-existent user (prevents email enumeration)', async () => {
      const requestData = {
        email: 'nonexistent@example.com',
      }

      // Mock non-existing user
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/auth/reset-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        message: 'Password reset email sent',
      })
    })

    it('validates input data', async () => {
      const invalidRequestData = {
        email: 'invalid-email', // invalid email format
      }

      const request = new Request('http://localhost:3000/api/auth/reset-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequestData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid email address',
      })
    })

    it('handles server errors gracefully', async () => {
      const requestData = {
        email: 'test@example.com',
      }

      // Mock database error
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const request = new Request('http://localhost:3000/api/auth/reset-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Internal server error',
      })
    })

    it('handles missing email field', async () => {
      const invalidRequestData = {
        // missing email field
      }

      const request = new Request('http://localhost:3000/api/auth/reset-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequestData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({
        error: 'Invalid email address',
      })
    })
  })
})