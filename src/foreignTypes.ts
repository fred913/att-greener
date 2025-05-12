import { CoreLyric, LyricIO } from './core/lyric'

export namespace ATTForeign {
    export interface KV {
        key: string
        value: string[]
    }

    export interface Line {
        id: string
        words: Word[]
        translatedLyric: string
        romanLyric: string
        isBG: boolean
        isDuet: boolean
        startTime: number
        endTime: number
        ignoreSync: boolean
    }

    export interface Word {
        id: string
        word: string
        startTime: number
        endTime: number
        obscene: boolean
        emptyBeat: number
    }

    export interface Lyric {
        metadata: KV[]
        lyricLines: Line[]
    }
}

export function attLinesToCoreLyric(
    lines: ATTForeign.Line[]
): CoreLyric.SyllableSyncedLine[] {
    return lines.map((line) => {
        const syllables = line.words.map((word) => {
            const syl: CoreLyric.Syllable = {
                start: new CoreLyric.Timestamp(word.startTime),
                end: new CoreLyric.Timestamp(word.endTime),
                text: word.word,
                annotations: [],
            }

            return syl
        })

        const voiceAgentIndex = line.isDuet ? 2 : 1
        const voiceAgent: CoreLyric.VoiceAgent = {
            n: voiceAgentIndex,
            type: line.isBG
                ? CoreLyric.VoiceAgentType.BackgroundVocal
                : CoreLyric.VoiceAgentType.Vocal,
        }

        const anno: CoreLyric.LineAnnotation[] = []
        if (line.translatedLyric) {
            anno.push({
                role: CoreLyric.LineAnnotationRole.Translation,
                line: new CoreLyric.LineSyncedLine({
                    text: line.translatedLyric,
                }),
            })
        }
        if (line.romanLyric) {
            anno.push({
                role: CoreLyric.LineAnnotationRole.Prononciation,
                line: new CoreLyric.LineSyncedLine({
                    text: line.romanLyric,
                }),
            })
        }

        const newSylSyncedLine = new CoreLyric.SyllableSyncedLine({
            syllables,
            voiceAgent: voiceAgent,
            annotations: anno,
        })

        return newSylSyncedLine
    })
}

export function attKvToObject(kv: ATTForeign.KV[]): {
    [key: string]: string[]
} {
    const obj: { [key: string]: string[] } = {}
    for (const item of kv) {
        obj[item.key] = item.value
    }
    return obj
}

export function attMetaToLrcHeader(metaKv: ATTForeign.KV[]): string {
    const meta = attKvToObject(metaKv)
    let header = ''
    if (meta.musicName) {
        for (const item of meta.musicName) {
            header += `[ti:${item}]\n`
        }
    }
    if (meta.isrc) {
        for (const item of meta.isrc) {
            header += `[isrc:${item}]\n`
        }
    }
    if (meta.album) {
        for (const item of meta.album) {
            header += `[al:${item}]\n`
        }
    }
    if (meta.artists) {
        for (const item of meta.artists) {
            header += `[ar:${item}]\n`
        }
    }
    if (meta.ncmMusicId) {
        for (const item of meta.ncmMusicId) {
            header += `[ncm-id:${item}]\n`
        }
    }
    if (meta.qqMusicId) {
        for (const item of meta.qqMusicId) {
            header += `[qqmusic-id:${item}]\n`
        }
    }
    if (meta.spotifyId) {
        for (const item of meta.spotifyId) {
            header += `[spotify-id:${item}]\n`
        }
    }
    if (meta.appleMusicId) {
        for (const item of meta.appleMusicId) {
            header += `[applemusic-id:${item}]\n`
        }
    }
    if (meta.ttmlAuthorGithubLogin && meta.ttmlAuthorGithub) {
        const login = meta.ttmlAuthorGithubLogin[0]
        const id = meta.ttmlAuthorGithub[0]
        header += `[by:${login}]\n`
        header += `[by-github-login:${login}]\n`
        header += `[by-github-id:${id}]\n`
    }

    return header
}

export function attMetaToYrcHeader(metaKv: ATTForeign.KV[]) {
    const meta = attKvToObject(metaKv)
    const params: LyricIO.Dumping.YRC.CreateHeaderParams = {
        lyricists: meta.lyricists || [],
        musicians: meta.musicians || meta.artists || [],
    }
    return LyricIO.Dumping.YRC.createHeaderLines(params)
}
