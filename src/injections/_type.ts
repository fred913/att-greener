export interface MenuReferences {
    menu: HTMLDivElement
    itemsContainer: HTMLDivElement
}

export interface TypeInjection {
    check(menu: MenuReferences): boolean
    inject(menu: MenuReferences): void
}
