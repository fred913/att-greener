export function applyRadixDropdownMenuHighlightStyles(element: HTMLElement) {
    // hover: add [data-highlighted]
    element.addEventListener('mouseover', () => {
        element.setAttribute('data-highlighted', 'true')
    })

    // mouseout: remove [data-highlighted]
    element.addEventListener('mouseout', () => {
        element.removeAttribute('data-highlighted')
    })

    // blur: remove [data-highlighted]
    element.addEventListener('blur', () => {
        element.removeAttribute('data-highlighted')
    })
}
export function closeCurrentRadixMenuView() {
    document.dispatchEvent(new PointerEvent('pointerdown'))
}
