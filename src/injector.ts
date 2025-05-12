import { DROPDOWN_MENU_SELECTOR, MENU_ITEM_CONTAINER_SELECTOR } from './config'
import { ALL_INJECTORS } from './injections/_all'
import { MenuReferences } from './injections/_type'

export function injectItemsInto(menu: HTMLElement): void {
    if (menu.dataset._injected) return
    menu.dataset._injected = 'true'

    const menuItemContainer = menu.querySelector<HTMLElement>(
        MENU_ITEM_CONTAINER_SELECTOR
    )
    if (!menuItemContainer) {
        console.warn('Failed to find menu item container')
        return
    }

    const ref: MenuReferences = {
        itemsContainer: menuItemContainer as HTMLDivElement,
        menu: menu as HTMLDivElement,
    }

    for (const injector of ALL_INJECTORS) {
        if (injector.check(ref)) {
            injector.inject(ref)
        }
    }
}

export function createRadixMenuObs(): void {
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of Array.from(m.addedNodes)) {
                if (!(node instanceof HTMLElement)) continue
                // if there appears a new Radix menu, do the injection
                if (node.matches(DROPDOWN_MENU_SELECTOR)) {
                    injectItemsInto(node)
                }
                if (node.childNodes.length == 1) {
                    const child = node.firstChild
                    if (!(child instanceof HTMLElement)) continue
                    if (child.matches(DROPDOWN_MENU_SELECTOR)) {
                        console.log('Found Radix menu in the first child')
                        injectItemsInto(child)
                    }
                }
            }
        }
    })

    observer.observe(document.body, { childList: true, subtree: true })
}
