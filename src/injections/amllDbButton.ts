import { autoTrimContainer } from '../utils'
import { TypeInjection } from './_type'

export const amllDbButtonInjection: TypeInjection = {
    check(menu) {
        for (const item of menu.itemsContainer.children) {
            if (
                (item as HTMLElement).innerText.trim() ===
                '上传到 AMLL 歌词数据库'
            ) {
                return true
            }
        }
        return false
    },
    inject(menu) {
        for (const item of menu.itemsContainer.children) {
            if (
                (item as HTMLElement).innerText.trim() ===
                '上传到 AMLL 歌词数据库'
            ) {
                item.remove()
            }
        }
        autoTrimContainer(menu.itemsContainer, (el) => el.role === 'separator')
    },
}
