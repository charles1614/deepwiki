import { render, screen } from '@testing-library/react'
import Home from '../app/page'

describe('Home Page', () => {
  it('renders a heading with DeepWiki title', () => {
    render(<Home />)

    const heading = screen.getByRole('heading', { name: /welcome to deepwiki/i })

    expect(heading).toBeInTheDocument()
  })

  it('renders the built with Claude Code text', () => {
    render(<Home />)

    const description = screen.getByText(/built with claude code scaffolding/i)

    expect(description).toBeInTheDocument()
  })
})