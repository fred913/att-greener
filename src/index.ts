import { createRadixMenuObs } from './injector'
import { initLyricsHold } from './lyricsHold'
import { injectToastify, Toastify } from './toastifyLoader'
;(function main(): void {
    'use strict'
    injectToastify().then(() => {
        initLyricsHold()
        createRadixMenuObs()

        Toastify({
            text: 'ATT Greener 加载成功\n当前功能：导出指定格式歌词\n测试版本，遇到问题欢迎在交流群反馈',
            duration: 3000,
            close: true,
            gravity: 'top', // `top` or `bottom`
            position: 'right', // `left`, `center` or `right`
            stopOnFocus: true, // Prevents dismissing of toast on hover
            onClick: function () {},
            style: {
                background: 'rgb(18, 18, 18)',
                borderRadius: '16px',
            },
        }).showToast()
    })
})()
