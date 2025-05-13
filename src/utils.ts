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

export function isCJKChar(char: string): boolean {
    if (char.length !== 1) {
        for (const c of char) {
            if (isCJKChar(c)) return true
        }
        return false
    }

    const code = char.codePointAt(0)! // Using `codePointAt` to handle surrogate pairs
    // Check if the character is in any of the CJK ranges
    const resp =
        (code >= 0x4e00 && code <= 0x9fff) || // Basic CJK Unified Ideographs
        (code >= 0x3400 && code <= 0x4dbf) || // CJK Unified Ideographs Extension A
        (code >= 0x20000 && code <= 0x2a6df) || // CJK Unified Ideographs Extension B
        (code >= 0x2a700 && code <= 0x2b73f) || // CJK Unified Ideographs Extension C
        (code >= 0x2b740 && code <= 0x2b81f) || // CJK Unified Ideographs Extension D
        (code >= 0x2b820 && code <= 0x2ceaf) || // CJK Unified Ideographs Extension E
        (code >= 0x2ceb0 && code <= 0x2ebef) || // CJK Unified Ideographs Extension F
        (code >= 0x2f800 && code <= 0x2fa1f) || // CJK Compatibility Ideographs Supplement
        (code >= 0x3040 && code <= 0x309f) || // Hiragana
        (code >= 0x30a0 && code <= 0x30ff) || // Katakana
        (code >= 0xac00 && code <= 0xd7af) // Hangul Syllables

    // console.debug(`isCJKChar(${char}) = ${resp}`)
    return resp
}
