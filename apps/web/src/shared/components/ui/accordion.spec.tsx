import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion'

function SampleAccordion({ type = 'single' as 'single' | 'multiple' }) {
  const items = (
    <>
      <AccordionItem value="lancamentos">
        <AccordionTrigger>Lançamentos</AccordionTrigger>
        <AccordionContent>Permissões de lançamentos</AccordionContent>
      </AccordionItem>
      <AccordionItem value="premios">
        <AccordionTrigger>Prêmios</AccordionTrigger>
        <AccordionContent>Permissões de prêmios</AccordionContent>
      </AccordionItem>
    </>
  )
  if (type === 'multiple') {
    return <Accordion type="multiple">{items}</Accordion>
  }
  return (
    <Accordion type="single" collapsible defaultValue="lancamentos">
      {items}
    </Accordion>
  )
}

describe('Accordion', () => {
  it('inicia com o grupo default aberto e os demais recolhidos', () => {
    render(<SampleAccordion />)
    expect(screen.getByRole('button', { name: 'Lançamentos' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Prêmios' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Permissões de lançamentos')).toBeVisible()
    expect(screen.queryByText('Permissões de prêmios')).not.toBeInTheDocument()
  })

  it('expande outro grupo e recolhe o anterior no modo single', async () => {
    const user = userEvent.setup()
    render(<SampleAccordion />)

    await user.click(screen.getByRole('button', { name: 'Prêmios' }))

    expect(screen.getByRole('button', { name: 'Prêmios' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Lançamentos' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('modo multiple permite mais de um grupo aberto simultaneamente', async () => {
    const user = userEvent.setup()
    render(<SampleAccordion type="multiple" />)

    await user.click(screen.getByRole('button', { name: 'Lançamentos' }))
    await user.click(screen.getByRole('button', { name: 'Prêmios' }))

    expect(screen.getByRole('button', { name: 'Lançamentos' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Prêmios' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('alterna por teclado (Enter) mantendo foco no trigger', async () => {
    const user = userEvent.setup()
    render(<SampleAccordion />)

    screen.getByRole('button', { name: 'Prêmios' }).focus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: 'Prêmios' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Prêmios' })).toHaveFocus()
  })
})
