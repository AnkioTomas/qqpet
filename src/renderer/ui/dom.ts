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
