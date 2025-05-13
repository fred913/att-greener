import { CoreLyric } from './core/lyric'
import { ATTForeign, attLinesToCoreLyric } from './foreignTypes'

let lastLyricsReceived: ATTForeign.Lyric | null = null

// hook console.log: ("lyricLines atom changed", x), here record the new x
const oldConsoleLog = console.log
const fakeConsoleLog = (...args: any[]) => {
    if (args.length === 2 && typeof args[0] === 'string') {
        const [msg, x] = args
        if (msg === 'lyricLines atom changed') {
            oldConsoleLog('got new lyricLines', x)
            lastLyricsReceived = x
        }
    }
    oldConsoleLog(...args)
}

export function getCurrentLyrics(): ATTForeign.Lyric | null {
    return lastLyricsReceived
}

export function currentLyricsToCoreLyric():
    | CoreLyric.SyllableSyncedLine[]
    | null {
    const lyricLines = getCurrentLyrics()
    if (lyricLines) {
        const res = attLinesToCoreLyric(lyricLines.lyricLines)
        console.log('currentLyricsToCoreLyric', res)
        return res
    }
    return null
}

declare const unsafeWindow: any

export function initLyricsHold() {
    unsafeWindow.console.log = fakeConsoleLog
}
