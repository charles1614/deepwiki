import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordResetForm } from '@/components/auth/PasswordResetForm'

describe('PasswordResetForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders password reset form elements', () => {
    render(<PasswordResetForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument()
  })

  it('submits form with valid email', async () => {
    const user = userEvent.setup()

    // Mock successful password reset response
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Password reset email sent' }),
    })

    render(<PasswordResetForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/reset-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })
    })
  })

  it('shows success message when email is sent', async () => {
    const user = userEvent.setup()

    // Mock successful password reset response
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Password reset email sent' }),
    })

    render(<PasswordResetForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument()
      expect(screen.getByText(/check your email for instructions/i)).toBeInTheDocument()
    })
  })

  it('shows error message when email does not exist', async () => {
    const user = userEvent.setup()

    // Mock failed password reset response
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email not found' }),
    })

    render(<PasswordResetForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'nonexistent@example.com')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email not found/i)).toBeInTheDocument()
    })
  })

  it('displays loading state during submission', async () => {
    const user = userEvent.setup()

    // Mock slow password reset response
    global.fetch = jest.fn().mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<PasswordResetForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/sending/i)).toBeInTheDocument()
    })
    expect(submitButton).toBeDisabled()
  })

  it('disables form after successful submission', async () => {
    const user = userEvent.setup()

    // Mock successful password reset response
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Password reset email sent' }),
    })

    render(<PasswordResetForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    await user.type(emailInput, 'test@example.com')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/password reset email sent/i)).toBeInTheDocument()
    })

    // Form should no longer be rendered after success
    expect(emailInput).not.toBeInTheDocument()
    expect(submitButton).not.toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<PasswordResetForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('autocomplete', 'email')
    expect(submitButton).toHaveAttribute('type', 'submit')
  })

  it('shows back to login link', () => {
    render(<PasswordResetForm />)

    const backToLoginLink = screen.getByRole('link', { name: /back to login/i })
    expect(backToLoginLink).toBeInTheDocument()
    expect(backToLoginLink).toHaveAttribute('href', '/login')
  })
})