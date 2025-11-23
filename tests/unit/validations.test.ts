import { registerSchema, loginSchema, passwordResetSchema } from '@/lib/validations'

describe('Form Validation Schemas', () => {
  describe('Registration Form', () => {
    it('should validate correct registration data', () => {

      const validData = {
        email: 'test@example.com',
        password: 'TestPass123',
        confirmPassword: 'TestPass123',
      }

      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'TestPass123',
        confirmPassword: 'TestPass123',
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1)
        expect(result.error.issues[0].message).toBe('Invalid email address')
      }
    })

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'TestPass123',
        confirmPassword: 'DifferentPass123',
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1)
        expect(result.error.issues[0].message).toBe("Passwords don't match")
      }
    })
  })

  describe('Login Form', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'anypassword',
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email in login', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty password in login', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Password Reset Form', () => {
    it('should validate correct password reset data', () => {
      const validData = {
        email: 'test@example.com',
      }

      const result = passwordResetSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email in password reset', () => {
      const invalidData = {
        email: 'invalid-email',
      }

      const result = passwordResetSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})