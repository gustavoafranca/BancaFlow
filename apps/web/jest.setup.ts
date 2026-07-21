import '@testing-library/jest-dom'

// jsdom não implementa estas APIs de layout/ponteiro usadas pelos primitives
// Radix com popup posicionado (`@radix-ui/react-select` via
// `@radix-ui/react-use-size`, que usa `ResizeObserver`; `hasPointerCapture`/
// `scrollIntoView` no fluxo de abertura/seleção por teclado e mouse). Sem
// isto, qualquer teste que abra um `Select` falha com
// "... is not a function", não por um bug do componente.
if (typeof window !== 'undefined') {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {}
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }

  // Radix `FocusScope` (usado por Dialog e, sempre que aberto, por Select)
  // reage a `focusin`/`focusout` reforçando o foco dentro do próprio escopo.
  // Em navegador real isso é assíncrono e nunca colide; no jsdom,
  // `HTMLElement.focus()` dispara esses eventos de forma síncrona e
  // reentrante, então dois `FocusScope`s aninhados (Select dentro de um
  // Dialog/Drawer, ex.: papel no formulário de usuário) entram num ping-pong
  // infinito de "foco de volta pra mim" que estoura a call stack. Não é um
  // bug do componente — é uma limitação conhecida do jsdom com múltiplos
  // focus traps aninhados. Um limite de profundidade de reentrância
  // transforma o loop infinito num no-op inofensivo sem alterar o
  // comportamento de foco em uso normal (não aninhado).
  const nativeFocus = HTMLElement.prototype.focus
  let focusReentrancyDepth = 0
  HTMLElement.prototype.focus = function focusWithReentrancyGuard(this: HTMLElement, ...args) {
    if (focusReentrancyDepth > 4) return
    focusReentrancyDepth += 1
    try {
      nativeFocus.apply(this, args)
    } finally {
      focusReentrancyDepth -= 1
    }
  }
}
