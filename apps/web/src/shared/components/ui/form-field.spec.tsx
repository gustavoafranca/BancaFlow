import { render, screen } from '@testing-library/react'
import { FormField } from './form-field'

describe('FormField', () => {
  it('associa o rótulo ao campo via htmlFor/id e renderiza os filhos', () => {
    render(
      <FormField label="Nome" htmlFor="name">
        <input id="name" />
      </FormField>,
    )
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
  })

  it('exibe a mensagem de erro com role alert quando informada', () => {
    render(
      <FormField label="Nome" htmlFor="name" error="Campo obrigatório">
        <input id="name" />
      </FormField>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório')
  })

  it('não renderiza alerta quando não há erro', () => {
    render(
      <FormField label="Nome" htmlFor="name">
        <input id="name" />
      </FormField>,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
