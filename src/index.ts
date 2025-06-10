import { injectToastify, Toastify } from './toastifyLoader'
;(function main(): void {
    'use strict'

    // Project has ended its historical mission
    // Users should use the fork instead: https://fred913.github.io/amll-ttml-tool/

    injectToastify().then(() => {
        Toastify({
            text: '⚠️ ATT Greener 项目已终止\n\n请查看项目 GitHub 主页',
            duration: 20000, // 20 seconds
            close: true,
            gravity: 'top',
            position: 'center',
            stopOnFocus: true,
            onClick: function () {
                window.open('https://github.com/fred913/att-greener', '_blank')
            },
            style: {
                background: 'rgb(18, 18, 18)',
                borderRadius: '16px',
                border: '2px solid #ff6b6b',
                fontSize: '14px',
                padding: '20px',
                maxWidth: '400px',
                textAlign: 'center',
            },
        }).showToast()
    })
})()
