declare const unsafeWindow: any

export async function injectToastify() {
    document.head.insertAdjacentHTML(
        'beforeend',
        '<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">'
    )

    const script = unsafeWindow.document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/toastify-js'

    return new Promise((resolve) => {
        script.onload = () => {
            resolve(true)
        }
        unsafeWindow.document.body.appendChild(script)
    })
}

declare namespace StartToastifyInstance {
    function reposition(): void
    const defaults: Options
    interface Offset {
        x: number | string
        y: number | string
    }

    interface Options {
        text?: string | undefined
        node?: Node | undefined
        duration?: number | undefined
        selector?: string | Node | undefined
        destination?: string | undefined
        newWindow?: boolean | undefined
        close?: boolean | undefined
        gravity?: 'top' | 'bottom' | undefined
        position?: 'left' | 'center' | 'right' | undefined
        /**
         * Announce the toast to screen readers
         * @default 'polite'
         */
        ariaLive?: 'off' | 'polite' | 'assertive' | undefined
        /**
         * @deprecated use style.background option instead
         */
        backgroundColor?: string | undefined
        /**
         * Image/icon to be shown before text
         */
        avatar?: string | undefined
        className?: string | undefined
        /**
         * @default true
         */
        stopOnFocus?: boolean | undefined
        /**
         * Invoked when the toast is dismissed
         */
        callback?: (() => void) | undefined
        onClick?: (() => void) | undefined
        offset?: Offset | undefined
        /**
         * Toggle the default behavior of escaping HTML markup
         */
        escapeMarkup?: boolean | undefined
        /**
         * HTML DOM Style properties to add any style directly to toast
         */
        style?: { [cssRule: string]: string }
        /**
         * Set the order in which toasts are stacked in page
         */
        oldestFirst?: boolean | undefined
    }
}

declare class ForeignToastify {
    /**
     * The configuration object to configure Toastify
     */
    readonly options: StartToastifyInstance.Options
    /**
     * The element that is the Toast
     */
    readonly toastElement: Element | null
    /**
     * Display the toast
     */
    showToast(): void
    /**
     * Hide the toast
     */
    hideToast(): void
}

function getForeignToastify() {
    if (unsafeWindow.Toastify) {
        return unsafeWindow.Toastify as (
            options?: StartToastifyInstance.Options
        ) => ForeignToastify
    }
    throw new Error("Toastify hasn't loaded yet")
}

export function Toastify(
    options: StartToastifyInstance.Options
): ForeignToastify {
    const ref = getForeignToastify()
    return ref(options)
}
