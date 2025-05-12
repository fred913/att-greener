export function waitFor<T extends Element>(
    selector: string,
    timeout = 5000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const el = document.querySelector<T>(selector)
        if (el) return resolve(el)

        const observer = new MutationObserver((_, obs) => {
            const found = document.querySelector<T>(selector)
            if (found) {
                obs.disconnect()
                resolve(found)
            }
        })

        observer.observe(document.body, { childList: true, subtree: true })
        setTimeout(() => {
            observer.disconnect()
            reject(new Error(`Timed out waiting for ${selector}`))
        }, timeout)
    })
}

export function autoTrimContainer(
    container: HTMLElement,
    judgement: (el: HTMLElement) => boolean
) {
    while (
        container.firstChild &&
        judgement(container.firstChild as HTMLElement)
    ) {
        container.removeChild(container.firstChild)
    }
    while (
        container.lastChild &&
        judgement(container.lastChild as HTMLElement)
    ) {
        container.removeChild(container.lastChild)
    }
}
