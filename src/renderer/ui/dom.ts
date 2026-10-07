/** `<div class=cls>` with children; strings become text nodes. */
export function div(cls: string, ...children: (Node | string)[]): HTMLDivElement {
  const d = document.createElement('div')
  d.className = cls
  d.append(...children)
  return d
}

export function img(cls: string, src: string): HTMLImageElement {
  const i = document.createElement('img')
  i.className = cls
  i.src = src
  return i
}

/** A clickable `<div>`. */
export function button(cls: string, onClick: () => void, ...children: (Node | string)[]): HTMLDivElement {
  const d = div(cls, ...children)
  d.addEventListener('click', onClick)
  return d
}

/** The pet window is not focusable: `input` takes keyboard focus only while hovered, like the original. */
export function typeable(input: HTMLInputElement): HTMLInputElement {
  let on = false
  input.addEventListener('mouseenter', () => {
    on = true
    window.qqpet.setFocusable(true)
  })
  const leave = (): void => {
    if (!on) return
    on = false
    window.qqpet.setFocusable(false)
    input.blur()
  }
  input.addEventListener('mouseout', leave)
  input.addEventListener('blur', leave)
  return input
}
