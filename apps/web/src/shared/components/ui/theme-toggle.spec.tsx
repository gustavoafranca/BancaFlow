import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from './theme-toggle'

describe('ThemeToggle', () => {
  it('chama onToggle ao clicar', async () => {
    const onToggle = jest.fn()
    const user = userEvent.setup()
    render(<ThemeToggle dark={true} onToggle={onToggle} />)

    await user.click(screen.getByRole('button', { name: 'Alternar tema' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('aplica paletas diferentes para dark e light', () => {
    const { rerender } = render(<ThemeToggle dark={true} onToggle={jest.fn()} />)
    expect(screen.getByRole('button').className).toContain('rgba(255,255,255,0.08)')

    rerender(<ThemeToggle dark={false} onToggle={jest.fn()} />)
    expect(screen.getByRole('button').className).toContain('rgba(0,0,0,0.07)')
  })

  it('aceita className extra para posicionamento do consumidor', () => {
    render(<ThemeToggle dark={true} onToggle={jest.fn()} className="absolute right-4 top-4" />)
    expect(screen.getByRole('button').className).toContain('absolute right-4 top-4')
  })
})
