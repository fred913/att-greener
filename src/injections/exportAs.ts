import { CoreLyric, LyricFormat, LyricIO } from '../core/lyric'
import {
    applyRadixDropdownMenuHighlightStyles,
    closeCurrentRadixMenuView,
} from '../core/radixIntegration'
import { attMetaToLrcHeader, attMetaToYrcHeader } from '../foreignTypes'
import { currentLyricsToCoreLyric, getCurrentLyrics } from '../lyricsHold'
import { Toastify } from '../toastifyLoader'
import { TypeInjection } from './_type'

function fixLineForLys<T extends CoreLyric.LineType>(line: T): T {
    if (line instanceof CoreLyric.SyllableSyncedLine) {
        let i = 1
        while (i < line.syllables.length) {
            const curr = line.syllables[i]
            if (curr.text == ' ') {
                line.syllables.splice(i, 1)
                line.syllables[i - 1].text += ' '
            }
            i++
        }
    }

    if (line.voiceAgent?.type === CoreLyric.VoiceAgentType.BackgroundVocal) {
        if (line instanceof CoreLyric.SyllableSyncedLine) {
            // if first syllable starts with （ or (, remove it
            while (
                line.syllables[0].text.startsWith('(') ||
                line.syllables[0].text.startsWith('（')
            ) {
                line.syllables[0].text = line.syllables[0].text.slice(1)
            }
            // if last syllable ends with ) or )， remove it
            while (
                line.syllables[line.syllables.length - 1].text.endsWith(')') ||
                line.syllables[line.syllables.length - 1].text.endsWith('）')
            ) {
                line.syllables[line.syllables.length - 1].text = line.syllables[
                    line.syllables.length - 1
                ].text.slice(0, -1)
            }

            // add new ()
            line.syllables[0].text = `(${line.syllables[0].text}`
            line.syllables[line.syllables.length - 1].text = `${
                line.syllables[line.syllables.length - 1].text
            })`
        } else if (line instanceof CoreLyric.LineSyncedLine) {
            // if first syllable starts with （ or (, remove it
            while (line.text.startsWith('(') || line.text.startsWith('（')) {
                line.text = line.text.slice(1)
            }
            // if last syllable ends with ) or )， remove it
            while (line.text.endsWith(')') || line.text.endsWith('）')) {
                line.text = line.text.slice(0, -1)
            }

            // add new ()
            line.text = `(${line.text})`
        }
    }

    return line
}

export const exportAsInjection: TypeInjection = {
    check(menu) {
        for (const item of menu.itemsContainer.children) {
            if (
                (item as HTMLElement).innerText.toLowerCase().trim() ===
                '导出到 lyric'
            ) {
                return true
            }
        }
        return false
    },
    inject(menu) {
        console.log(menu)
        console.log('Detected exportAs menu, doing injection')

        for (let i = 0; i < menu.itemsContainer.children.length; ) {
            const item = menu.itemsContainer.children[i]
            if ((item as HTMLElement).innerText.trim() !== '导出到 ASS 字幕') {
                ;(item as HTMLElement).innerText =
                    '导出到 ASS (.ass) (旧版选项)'
                i++
                continue
            }
            menu.itemsContainer.removeChild(item)
        }

        const currAtt = getCurrentLyrics()
        const currCl = currentLyricsToCoreLyric()

        function handleExport(
            mode: 'download' | 'clipboard',
            formatType: LyricFormat.Type
        ) {
            closeCurrentRadixMenuView()
            if (!currCl) {
                Toastify({
                    text: '当前无歌词数据，无法导出',
                    duration: 2600,
                    close: true,
                    gravity: 'top',
                    position: 'right',
                    stopOnFocus: true,
                    style: {
                        background: 'rgb(18, 18, 18)',
                        borderRadius: '16px',
                        boxShadow: 'unset',
                    },
                }).showToast()
                return
            }

            let footer = '',
                header = ''
            switch (formatType) {
                case 'lyl':
                    header += '[type:LyricifyLines]\n'
                case 'lys':
                case 'qrc':
                case 'lrc':
                    header += attMetaToLrcHeader(currAtt?.metadata || []).trim()
                    header += '\n'
                    break

                case 'yrc':
                    header += attMetaToYrcHeader(currAtt?.metadata || [])
                        .map((d) => {
                            return JSON.stringify(d)
                        })
                        .join('\n')
                    header += '\n'
                    break

                case 'lqe':
                    // [Lyricify Quick Export] // 作为统一的头部标记，用于识别
                    // [version:1.0] // 此处记录 Lyricify Quick Export 的定义版本
                    // [ti:xxx] // Tag 信息直接写在最前面，不放进歌词
                    // [ar, al, by, ... 同理]
                    header += '[Lyricify Quick Export]\n'
                    header += '[version:1.0]\n'
                    header += attMetaToLrcHeader(currAtt?.metadata || []).trim()
                    header += '\n\n'
                    break

                default:
                    break
            }

            let fixedCl
            switch (formatType) {
                case 'lys':
                case 'qrc':
                case 'lqe':
                    // special fix
                    // `\((\d+),(\d+)\) \(0,0\)` TO ` ($1,$2)`
                    fixedCl = currCl.map(fixLineForLys)
                    break
                default:
                    fixedCl = currCl
                    break
            }

            const content =
                header + LyricIO.Dumping.dump(formatType, fixedCl) + footer
            const fileExtensions =
                LyricFormat.getLyricFormatFileExtensions(formatType)
            const dispName = LyricFormat.getLyricFormatDisplayName(formatType)

            if (mode === 'clipboard') {
                navigator.clipboard
                    .writeText(content)
                    .then(() => {
                        Toastify({
                            text: `歌词内容已复制为 ${dispName} 格式`,
                            duration: 2600,
                            close: true,
                            gravity: 'top',
                            position: 'right',
                            stopOnFocus: true,
                            style: {
                                background: 'rgb(18, 18, 18)',
                                borderRadius: '16px',
                                boxShadow: 'unset',
                            },
                        }).showToast()
                    })
                    .catch(() => {
                        Toastify({
                            text: '复制失败',
                            duration: 2000,
                            close: true,
                            gravity: 'top',
                            position: 'right',
                            stopOnFocus: true,
                            style: {
                                background: 'rgb(18, 18, 18)',
                                borderRadius: '16px',
                                boxShadow: 'unset',
                            },
                        }).showToast()
                    })
            } else {
                LyricFormat.requestWriteLyricsFile(
                    LyricFormat.getLyricFormatDisplayName(formatType),
                    fileExtensions,
                    content,
                    { fileName: 'lyrics' }
                ).then((success) => {
                    Toastify({
                        text: success
                            ? `歌词已导出为 ${dispName} 格式`
                            : '导出失败：已取消',
                        duration: success ? 2600 : 1800,
                        close: true,
                        gravity: 'top',
                        position: 'right',
                        stopOnFocus: true,
                        style: {
                            background: 'rgb(18, 18, 18)',
                            borderRadius: '16px',
                            boxShadow: 'unset',
                        },
                    }).showToast()
                })
            }
        }

        function createExportAsMenuItem(
            formatType: LyricFormat.Type,
            lines?: CoreLyric.LineSyncedLine[],
            overrideItemName?: string
        ) {
            const dispName = LyricFormat.getLyricFormatDisplayName(formatType)
            const fileExt = LyricFormat.getLyricFormatFileExtensions(formatType)

            const item = document.createElement('div')
            item.classList.add(
                'rt-reset',
                'rt-BaseMenuItem',
                'rt-DropdownMenuItem'
            )
            item.tabIndex = -1
            item.setAttribute('role', 'menuitem')
            item.setAttribute('data-orientation', 'vertical')
            item.setAttribute('data-radix-collection-item', '')
            item.innerText =
                overrideItemName || `导出到 ${dispName} (${fileExt.join(', ')})`
            if (!LyricIO.Dumping.supportDump(formatType)) {
                item.innerText += ' (尚未实现)'
            }

            applyRadixDropdownMenuHighlightStyles(item)

            item.addEventListener('click', (ev) => {
                // Skip if it's an auxiliary click (handled below)
                if (ev instanceof MouseEvent && ev.button !== 0) return
                handleExport('download', formatType)
            })

            item.addEventListener('contextmenu', (ev) => {
                ev.preventDefault()
                ev.stopPropagation()
                handleExport('clipboard', formatType)
                return false
            })

            return item
        }

        for (const formatType of LyricFormat.allTypes) {
            if (!LyricIO.Dumping.supportDump(formatType)) continue

            const item = createExportAsMenuItem(formatType)
            menu.itemsContainer.appendChild(item)
        }

        if (currCl) {
            const trans = CoreLyric.Utils.extractLineAnnotations(
                currCl,
                CoreLyric.LineAnnotationRole.Translation
            )
            if (trans.length > 0) {
                const item = createExportAsMenuItem(
                    'lrc',
                    trans,
                    '导出翻译为 LRC (.lrc)'
                )
                menu.itemsContainer.appendChild(item)
            }

            const pron = CoreLyric.Utils.extractLineAnnotations(
                currCl,
                CoreLyric.LineAnnotationRole.Prononciation
            )
            if (pron.length > 0) {
                const item = createExportAsMenuItem(
                    'lrc',
                    pron,
                    '导出音译为 LRC (.lrc)'
                )
                menu.itemsContainer.appendChild(item)
            }
        }
    },
}
