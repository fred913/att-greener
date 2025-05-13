import { isCJKChar } from '../utils'

export namespace CoreLyric {
    export class Timestamp {
        static max(...timestamps: (Timestamp | null)[]): Timestamp {
            return new Timestamp(
                Math.max(
                    ...timestamps
                        .filter((t) => t !== null)
                        .map((t) => t.milliSeconds)
                )
            )
        }
        static min(...timestamps: (Timestamp | null)[]): Timestamp {
            return new Timestamp(
                Math.min(
                    ...timestamps
                        .filter((t) => t !== null)
                        .map((t) => t.milliSeconds)
                )
            )
        }

        milliSeconds: number = 0

        constructor(milliSeconds: number) {
            this.milliSeconds = milliSeconds
        }

        seconds(): number {
            return this.milliSeconds / 1000
        }

        formatted(): string {
            const seconds = Math.floor(this.seconds())
            const minutes = Math.floor(seconds / 60)
            const remainingSeconds = seconds % 60
            return `${minutes}:${
                remainingSeconds < 10 ? '0' : ''
            }${remainingSeconds}`
        }
    }

    export enum VoiceAgentType {
        Vocal = 'vocal',
        BackgroundVocal = 'background-vocal',
        Other = 'other',
    }

    export interface VoiceAgent {
        /**
         * The type of the voice agent.
         */
        type: VoiceAgentType

        /**
         * The number of the voice agent. Should be above 0 (included). 0 stands for unknown, and singers should start from 1.
         */
        n: number
    }

    export interface SyllableAnnotation {
        syllable: string
        role: LineAnnotationRole
    }

    export interface Syllable {
        text: string
        start: Timestamp | null
        end: Timestamp | null

        annotations: SyllableAnnotation[]
    }

    export enum LineAnnotationRole {
        Prononciation = 'pron',
        Translation = 'trans',
    }

    export interface LineAnnotation {
        role: LineAnnotationRole
        line: CoreLyric.LineSyncedLine
    }

    export class SyllableSyncedLine {
        syllables: Syllable[]
        voiceAgent: VoiceAgent | null

        annotations: LineAnnotation[]

        constructor(opt: {
            syllables: Syllable[]
            voiceAgent: VoiceAgent | null
            annotations: LineAnnotation[]
        }) {
            this.syllables = opt.syllables
            this.voiceAgent = opt.voiceAgent
            this.annotations = opt.annotations
        }

        toLineSyncedLine(): LineSyncedLine {
            const lineText = this.syllables.map((s) => s.text).join('')

            const lineStart = Timestamp.min(
                ...this.syllables
                    .filter(
                        (syl) =>
                            syl.start?.milliSeconds != 0 ||
                            syl.end?.milliSeconds != 0 ||
                            syl.text.trim() != ''
                    )
                    .map((s) => s.start)
            )
            const lineEnd = Timestamp.max(
                ...this.syllables
                    .filter(
                        (syl) =>
                            syl.start?.milliSeconds != 0 ||
                            syl.end?.milliSeconds != 0 ||
                            syl.text.trim() != ''
                    )
                    .map((s) => s.end)
            )

            return new LineSyncedLine({
                text: lineText,
                start: lineStart,
                end: lineEnd,
                voiceAgent: this.voiceAgent,
                annotations: this.annotations,
            })
        }

        extractAnnotations(role: LineAnnotationRole): LineSyncedLine[] {
            return this.toLineSyncedLine().extractAnnotations(role)
        }
    }

    export class LineSyncedLine {
        static checkOverlap(a: LineSyncedLine, b: LineSyncedLine): boolean {
            if (
                a.start === null ||
                a.end === null ||
                b.start === null ||
                b.end === null
            ) {
                return false
            }

            const res =
                a.start.milliSeconds < b.end.milliSeconds &&
                b.start.milliSeconds < a.end.milliSeconds

            return res
        }

        static fromText(tr: string): LineSyncedLine {
            return new LineSyncedLine({
                text: tr,
            })
        }

        text: string
        start: Timestamp | null
        end: Timestamp | null

        voiceAgent: VoiceAgent | null
        annotations: LineAnnotation[]

        constructor(opt: {
            text: string
            start?: Timestamp | null
            end?: Timestamp | null
            voiceAgent?: VoiceAgent | null
            annotations?: LineAnnotation[]
        }) {
            this.text = opt.text
            this.start = opt.start || null
            this.end = opt.end || null
            this.voiceAgent = opt.voiceAgent || null
            this.annotations = opt.annotations || []
        }

        extractAnnotations(role: LineAnnotationRole): LineSyncedLine[] {
            return this.annotations
                .filter((a) => a.role === role)
                .map((a) => {
                    const l2 = a.line
                    l2.start = this.start
                    l2.end = this.end
                    return l2
                })
        }
    }

    export type LineType = SyllableSyncedLine | LineSyncedLine

    export namespace Utils {
        export function extractLineAnnotations(
            lines: LineType[],
            role: LineAnnotationRole
        ): LineSyncedLine[] {
            return lines.flatMap((line) => {
                if (
                    line instanceof SyllableSyncedLine ||
                    line instanceof LineSyncedLine
                ) {
                    return line.extractAnnotations(role)
                } else {
                    return []
                }
            })
        }

        export function splitWordSyllables(syl: Syllable): Syllable[] {
            const res: Syllable[] = []
            const totalDur = syl.end?.milliSeconds! - syl.start?.milliSeconds!
            let pos = 0
            let buf = ''
            let remaining = syl.text
            while (remaining.length > 0) {
                const c = remaining[0]
                if (isCJKChar(c) && buf.length > 0) {
                    const partLength = (totalDur / syl.text.length) * buf.length
                    res.push({
                        text: buf,
                        start: new Timestamp(syl.start?.milliSeconds! + pos),
                        end: new Timestamp(
                            syl.start?.milliSeconds! + pos + partLength
                        ),
                        annotations: syl.annotations,
                    })
                    pos += partLength
                    buf = ''
                }
                buf += c
                remaining = remaining.slice(1)
            }

            if (buf.length > 0) {
                res.push({
                    text: buf,
                    start: new Timestamp(syl.start?.milliSeconds! + pos),
                    end: new Timestamp(syl.end?.milliSeconds!),
                    annotations: syl.annotations,
                })
            }

            return res
        }

        export function preprocessLinesForLyricify(
            lines: LineType[]
        ): LineType[] {
            return lines.map((line) => {
                if (line instanceof SyllableSyncedLine) {
                    const newSyls: CoreLyric.Syllable[] =
                        line.syllables.flatMap(
                            CoreLyric.Utils.splitWordSyllables
                        )
                    return new SyllableSyncedLine({
                        syllables: newSyls,
                        voiceAgent: line.voiceAgent,
                        annotations: line.annotations,
                    })
                } else {
                    return line
                }
            })
        }
    }
}

export namespace LyricIO {
    export namespace Abstraction {
        export namespace ALRC {
            export interface ALRCLyricInfo {
                lng?: string
                author?: string
                translation?: string
                timeline?: string
                transliteration?: string
                proofread?: string
                offset?: number
                duration?: number
            }

            export interface ALRCHeader {
                s: ALRCStyle[]
            }

            export interface ALRCStyle {
                id: string
                p?: ALRCStylePosition
                c?: string
                t?: ALRCStyleAccent
                h?: boolean
            }

            export enum ALRCStylePosition {
                Undefined = 0,
                Left = 1,
                Center = 2,
                Right = 3,
            }

            export enum ALRCStyleAccent {
                Normal = 0,
                Background = 1,
                Whisper = 2,
                Emphasise = 3,
            }

            export interface ALRCLine {
                /**
                 * The unique identifier for the line.
                 */
                id?: string

                /**
                 * The identifier for the parent line.
                 */
                p?: string

                /**
                 * The start time of the line in milliseconds.
                 */
                f?: number

                /**
                 * The end time of the line in milliseconds.
                 */
                t?: number

                /**
                 * The style of the line.
                 */
                s?: string

                /**
                 * A comment related to the line.
                 */
                comment?: string

                /**
                 * The raw text of the line.
                 */
                tx?: string

                /**
                 * The transliteration of the line.
                 */
                lt?: string

                /**
                 * The translation of the line.
                 */
                tr?: string

                /**
                 * A list of words in the line.
                 */
                w?: ALRCWord[]
            }

            /**
             * Represents a word in an ALRCLine.
             */
            export interface ALRCWord {
                /**
                 * The start time of the word in milliseconds.
                 */
                f: number

                /**
                 * The end time of the word in milliseconds.
                 */
                t: number

                /**
                 * The word itself.
                 */
                w: string

                /**
                 * The style of the word, if any.
                 * This property is optional.
                 */
                s?: string

                /**
                 * The transliteration of the word, if any.
                 * This property is optional.
                 */
                l?: string
            }

            export interface ALRCFile {
                /**
                 * The lyrics metadata of the file.
                 */
                li?: ALRCLyricInfo

                /**
                 * Custom song info of the file.
                 */
                si?: any

                /**
                 * The header of the file.
                 */
                h?: ALRCHeader

                /**
                 * List of lines in the file.
                 */
                l: ALRCLine[]
            }
        }
    }

    export namespace Dumping {
        export namespace YRC {
            export interface HeaderContentPart {
                tx: string
                li?: string
                or?: string
            }
            export interface HeaderLine {
                t: number
                c: HeaderContentPart[]
            }

            export interface CreateHeaderParams {
                lyricists: string[]
                musicians: string[]
            }

            export function createHeaderLines(
                data: CreateHeaderParams
            ): HeaderLine[] {
                const headerLines: HeaderLine[] = []

                const lyricistsLine: HeaderContentPart[] = []
                for (let idx = 0; idx < data.lyricists.length; idx++) {
                    const lyricist = data.lyricists[idx]
                    if (idx > 0) lyricistsLine.push({ tx: '/' })
                    lyricistsLine.push({ tx: lyricist })
                }

                const musiciansLine: HeaderContentPart[] = []
                for (let idx = 0; idx < data.musicians.length; idx++) {
                    const musician = data.musicians[idx]
                    if (idx > 0) musiciansLine.push({ tx: '/' })
                    musiciansLine.push({ tx: musician })
                }

                if (lyricistsLine.length > 0)
                    headerLines.push({
                        t: 0,
                        c: [{ tx: '作词: ' }, ...lyricistsLine],
                    })
                if (musiciansLine.length > 0)
                    headerLines.push({
                        t: 0,
                        c: [{ tx: '作曲: ' }, ...musiciansLine],
                    })

                return headerLines
            }
        }

        export namespace LQE {
            export function createLQEPartHeader(data: {
                [key: string]: string
            }) {
                return Object.entries(data)
                    .map(([key, value]) => `${key}@${value}`)
                    .join(', ')
            }
        }

        export function dumpLYS(lines: CoreLyric.LineType[]): string {
            let editorBuffer = ''

            let lineStart: CoreLyric.Timestamp | null = null

            // compile to buffer
            const linesData: { text: string; start: number; end: number }[][] =
                []

            const properties: number[] = []

            let i = 0
            for (const line of lines) {
                const property =
                    (line.voiceAgent?.type ==
                    CoreLyric.VoiceAgentType.BackgroundVocal
                        ? 6
                        : 3) + (line.voiceAgent?.n != 2 ? 1 : 2)
                properties.push(property)

                const lineData: { text: string; start: number; end: number }[] =
                    []

                if (line instanceof CoreLyric.SyllableSyncedLine) {
                    for (const syllable of line.syllables) {
                        lineStart = CoreLyric.Timestamp.min(
                            lineStart,
                            syllable.start
                        )
                        lineData.push({
                            text: syllable.text,
                            start: syllable.start?.milliSeconds || 0,
                            end: syllable.end?.milliSeconds || 0,
                        })
                    }
                } else if (line instanceof CoreLyric.LineSyncedLine) {
                    lineStart = line.start
                    lineData.push({
                        text: line.text,
                        start: line.start?.milliSeconds || 0,
                        end: line.end?.milliSeconds || 0,
                    })
                }

                linesData.push(lineData)

                if (i > 0 && lineStart != null) {
                    const last = linesData[i - 1]
                    if (last instanceof CoreLyric.LineSyncedLine) {
                        last.end = lineStart
                    }
                }

                i += 1
            }

            i = 0
            for (const lineData of linesData) {
                editorBuffer += `[${properties[i]}]`
                for (const syllableData of lineData) {
                    editorBuffer += `${syllableData.text}(${Math.round(
                        syllableData.start
                    )},${Math.round(syllableData.end - syllableData.start)})`
                }
                editorBuffer += '\n'
                i += 1
            }

            return editorBuffer.trim()
        }

        export function dumpLRC(lines: CoreLyric.LineType[]): string {
            let editorBuffer = ''

            for (const line of lines) {
                let lineSyncedLine: CoreLyric.LineSyncedLine
                if (line instanceof CoreLyric.SyllableSyncedLine) {
                    lineSyncedLine = line.toLineSyncedLine()
                } else {
                    lineSyncedLine = line
                }

                const start = lineSyncedLine.start
                if (start) {
                    const minutes = Math.floor(start.milliSeconds / 60000)
                    const seconds = Math.floor(
                        (start.milliSeconds % 60000) / 1000
                    )
                    const milliseconds = start.milliSeconds % 1000

                    editorBuffer += `[${minutes
                        .toString()
                        .padStart(2, '0')}:${seconds
                        .toString()
                        .padStart(2, '0')}.${milliseconds
                        .toString()
                        .padStart(3, '0')}]${lineSyncedLine.text}\n`
                }
            }

            return editorBuffer.trim()
        }

        export function dumpLYL(lines: CoreLyric.LineType[]): string {
            let editorBuffer = ''

            for (const line of lines) {
                let lineSyncedLine: CoreLyric.LineSyncedLine
                if (line instanceof CoreLyric.SyllableSyncedLine) {
                    lineSyncedLine = line.toLineSyncedLine()
                } else {
                    lineSyncedLine = line
                }

                const start = lineSyncedLine.start
                const end = lineSyncedLine.end
                if (start) {
                    editorBuffer += `[${Math.round(
                        start.milliSeconds
                    )},${Math.round(end?.milliSeconds || 0)}]${
                        lineSyncedLine.text
                    }\n`
                }
            }

            return editorBuffer.trim()
        }

        export function dumpQRC(lines: CoreLyric.LineType[]): string {
            let editorBuffer = ''

            for (const line of lines) {
                let lineSyncedLine: CoreLyric.LineSyncedLine
                if (line instanceof CoreLyric.SyllableSyncedLine) {
                    lineSyncedLine = line.toLineSyncedLine()
                } else {
                    lineSyncedLine = line
                }

                const start = lineSyncedLine.start
                const end = lineSyncedLine.end

                const endMilliSeconds = end?.milliSeconds || null

                const durMillis =
                    endMilliSeconds && start
                        ? endMilliSeconds - start.milliSeconds
                        : null

                if (line instanceof CoreLyric.SyllableSyncedLine) {
                    if (start) {
                        editorBuffer += `[${Math.round(
                            start.milliSeconds
                        )},${Math.round(durMillis || 0)}]`

                        for (const syllable of line.syllables) {
                            const sylDurMillis =
                                syllable.end && syllable.start
                                    ? syllable.end.milliSeconds -
                                      syllable.start.milliSeconds
                                    : null
                            editorBuffer += `${syllable.text}(${Math.round(
                                syllable.start?.milliSeconds || 0
                            )},${Math.round(sylDurMillis || 0)})`
                        }

                        editorBuffer += '\n'
                    }
                } else if (line instanceof CoreLyric.LineSyncedLine) {
                    if (start) {
                        editorBuffer += `[${Math.round(
                            start.milliSeconds
                        )},${Math.round(durMillis || 0)}]${
                            lineSyncedLine.text
                        }(${Math.round(start.milliSeconds)},${Math.round(
                            durMillis || 0
                        )})\n`
                    }
                }
            }

            return editorBuffer.trim()
        }

        export function dumpYRC(lines: CoreLyric.LineType[]): string {
            let editorBuffer = ''

            for (const line of lines) {
                let lineSyncedLine: CoreLyric.LineSyncedLine
                if (line instanceof CoreLyric.SyllableSyncedLine) {
                    lineSyncedLine = line.toLineSyncedLine()
                } else {
                    lineSyncedLine = line
                }

                const start = lineSyncedLine.start
                const end = lineSyncedLine.end

                const endMilliSeconds = end?.milliSeconds || null

                const durMillis =
                    endMilliSeconds && start
                        ? endMilliSeconds - start.milliSeconds
                        : null

                if (line instanceof CoreLyric.SyllableSyncedLine) {
                    if (start) {
                        editorBuffer += `[${Math.round(
                            start.milliSeconds
                        )},${Math.round(durMillis || 0)}]`

                        for (const syllable of line.syllables) {
                            const sylDurMillis =
                                syllable.end && syllable.start
                                    ? syllable.end.milliSeconds -
                                      syllable.start.milliSeconds
                                    : null
                            editorBuffer += `(${Math.round(
                                syllable.start?.milliSeconds || 0
                            )},${Math.round(sylDurMillis || 0)},0)${
                                syllable.text
                            }`
                        }

                        editorBuffer += '\n'
                    }
                } else if (line instanceof CoreLyric.LineSyncedLine) {
                    if (start) {
                        editorBuffer += `[${Math.round(
                            start.milliSeconds
                        )},${Math.round(durMillis || 0)}](${Math.round(
                            start.milliSeconds
                        )},${Math.round(durMillis || 0)},0)${
                            lineSyncedLine.text
                        }\n`
                    }
                }
            }

            return editorBuffer.trim()
        }

        export function dumpALRC(lines: CoreLyric.LineType[]): string {
            const alrcData: LyricIO.Abstraction.ALRC.ALRCFile = {
                li: {},
                si: null,
                h: {
                    s: [],
                },
                l: [],
            }

            for (const line of lines) {
                if (line instanceof CoreLyric.SyllableSyncedLine) {
                    const alrcLine: LyricIO.Abstraction.ALRC.ALRCLine = {
                        w: line.syllables.map((syllable) => ({
                            f: syllable.start?.milliSeconds || 0,
                            t: syllable.end?.milliSeconds || 0,
                            w: syllable.text,
                        })),
                        f: CoreLyric.Timestamp.min(
                            ...line.syllables.map((syllable) => syllable.start)
                        ).milliSeconds,
                        t: CoreLyric.Timestamp.max(
                            ...line.syllables.map((syllable) => syllable.end)
                        ).milliSeconds,
                    }
                    alrcData.l.push(alrcLine)
                } else if (line instanceof CoreLyric.LineSyncedLine) {
                    const alrcLine: LyricIO.Abstraction.ALRC.ALRCLine = {
                        tx: line.text,
                        f: line.start?.milliSeconds || 0,
                        t: line.end?.milliSeconds || 0,
                    }
                    alrcData.l.push(alrcLine)
                }
            }

            return JSON.stringify(alrcData)
        }

        export function dumpSRT(lines: CoreLyric.LineType[]): string {
            let editorBuffer = ''
            let index = 1

            for (const line of lines) {
                let lineSyncedLine: CoreLyric.LineSyncedLine
                if (line instanceof CoreLyric.SyllableSyncedLine) {
                    lineSyncedLine = line.toLineSyncedLine()
                } else {
                    lineSyncedLine = line
                }

                const start = lineSyncedLine.start
                const end = lineSyncedLine.end

                if (start && end) {
                    const startTime = new Date(start.milliSeconds)
                    const endTime = new Date(end.milliSeconds)

                    const startStr = `${startTime
                        .getUTCHours()
                        .toString()
                        .padStart(2, '0')}:${startTime
                        .getUTCMinutes()
                        .toString()
                        .padStart(2, '0')}:${startTime
                        .getUTCSeconds()
                        .toString()
                        .padStart(2, '0')},${(start.milliSeconds % 1000)
                        .toString()
                        .padStart(3, '0')}`
                    const endStr = `${endTime
                        .getUTCHours()
                        .toString()
                        .padStart(2, '0')}:${endTime
                        .getUTCMinutes()
                        .toString()
                        .padStart(2, '0')}:${endTime
                        .getUTCSeconds()
                        .toString()
                        .padStart(2, '0')},${(end.milliSeconds % 1000)
                        .toString()
                        .padStart(3, '0')}`

                    let text = lineSyncedLine.text.trim()
                    if (
                        lineSyncedLine.voiceAgent &&
                        lineSyncedLine.voiceAgent.type ==
                            CoreLyric.VoiceAgentType.BackgroundVocal
                    ) {
                        text = `(${text})`
                    }

                    editorBuffer += `${index}\n${startStr} --> ${endStr}\n${text}\n\n`
                    index++
                }
            }

            return editorBuffer.trim()
        }

        export function dumpLQE(lines: CoreLyric.LineType[]): string {
            let result = ''

            const transLy = CoreLyric.Utils.extractLineAnnotations(
                lines,
                CoreLyric.LineAnnotationRole.Translation
            )
            const pronLy = CoreLyric.Utils.extractLineAnnotations(
                lines,
                CoreLyric.LineAnnotationRole.Prononciation
            )

            // original lyrics
            result += `[lyrics: ${LyricIO.Dumping.LQE.createLQEPartHeader({
                format: 'Lyricify Syllable',
                language: 'en-US',
            })}]\n`
            result += dumpLYS(lines).trimEnd()
            result += '\n\n'

            // translation
            if (transLy.length > 0) {
                result += `\n[translation: ${LyricIO.Dumping.LQE.createLQEPartHeader(
                    {
                        format: 'LRC',
                        language: 'zh-CN',
                    }
                )}]\n`
                result += dumpLRC(transLy).trimEnd()
                result += '\n\n'
            }

            // pronunciation
            if (pronLy.length > 0) {
                result += `\n[pronunciation: ${LyricIO.Dumping.LQE.createLQEPartHeader(
                    {
                        format: 'LRC',
                        language: 'romaji',
                    }
                )}]\n`
                result += dumpLRC(pronLy).trimEnd()
                result += '\n\n'
            }

            return result.trim()
        }

        export function dumpSPL(lines: CoreLyric.LineType[]): string {
            function timeMark(ms: number): string {
                const minutes = Math.floor(ms / 60000)
                const seconds = Math.floor((ms % 60000) / 1000)
                const milliseconds = ms % 1000

                return `[${minutes.toString().padStart(2, '0')}:${seconds
                    .toString()
                    .padStart(2, '0')}.${milliseconds
                    .toString()
                    .padStart(3, '0')}]`
            }

            let editorBuffer = ''

            for (const line of lines) {
                let lineSyncedLine: CoreLyric.LineSyncedLine
                if (line instanceof CoreLyric.SyllableSyncedLine) {
                    lineSyncedLine = line.toLineSyncedLine()
                } else {
                    lineSyncedLine = line
                }

                const start = lineSyncedLine.start
                const end = lineSyncedLine.end

                if (line instanceof CoreLyric.SyllableSyncedLine) {
                    if (start && end) {
                        let lastMarkedTime: number | null = null

                        for (const syllable of line.syllables) {
                            if (
                                syllable.start?.milliSeconds != lastMarkedTime
                            ) {
                                editorBuffer += timeMark(
                                    syllable.start?.milliSeconds || 0
                                )
                            }
                            editorBuffer += syllable.text
                            editorBuffer += timeMark(
                                syllable.end?.milliSeconds || 0
                            )
                            lastMarkedTime = syllable.end?.milliSeconds || 0
                        }

                        editorBuffer += '\n'
                    }
                } else if (line instanceof CoreLyric.LineSyncedLine) {
                    if (start && end) {
                        // editorBuffer += `${timeMark(start.milliSeconds || 0)}${lineSyncedLine.text}${timeMark(end?.milliSeconds || 0)}\n`
                        editorBuffer += timeMark(start.milliSeconds || 0)
                        editorBuffer += lineSyncedLine.text
                        editorBuffer += timeMark(end?.milliSeconds || 0)
                        editorBuffer += '\n'
                    }
                }

                for (const annotation of line.annotations) {
                    if (
                        annotation.role ==
                        CoreLyric.LineAnnotationRole.Translation
                    ) {
                        editorBuffer += annotation.line.text
                        editorBuffer += '\n'
                        break
                    }
                }
            }

            return editorBuffer.trim()
        }

        function selectDumpWorker(
            type: LyricFormat.Type
        ): ((lines: CoreLyric.LineType[]) => string) | null {
            switch (type) {
                case 'lys':
                    return dumpLYS
                case 'lyl':
                    return dumpLYL
                case 'lrc':
                    return dumpLRC
                case 'qrc':
                    return dumpQRC
                case 'alrc':
                    return dumpALRC
                case 'srt':
                    return dumpSRT
                case 'yrc':
                    return dumpYRC
                case 'spl':
                    return dumpSPL
                case 'lqe':
                    return dumpLQE

                case 'ttml':
                    return null // Unsupported
                case 'ttml_amll':
                    return null // Unsupported
                case 'apple_syllable':
                    return null // Unsupported
                case 'krc':
                    return null // Unsupported

                // Unsupported
                default: {
                    console.error(`Unsupported format: ${type}`)
                    return null
                }
            }
        }

        export function dump(
            type: LyricFormat.Type,
            lines: CoreLyric.LineType[]
        ): string {
            const worker = selectDumpWorker(type)
            if (!worker) {
                return '[ERROR] Unsupported'
            }
            let preprocessedLines: CoreLyric.LineType[]
            switch (type) {
                case 'lys':
                case 'lqe':
                case 'yrc':
                case 'qrc':
                case 'krc':
                    preprocessedLines =
                        CoreLyric.Utils.preprocessLinesForLyricify(lines)
                    break

                case 'lyl':
                case 'lrc':
                case 'alrc':
                case 'ttml':
                case 'ttml_amll':
                case 'apple_syllable':
                case 'srt':
                case 'spl':
                    preprocessedLines = lines
                    break

                default:
                    throw new Error('should not happen')
            }
            return worker(preprocessedLines)
        }

        export function supportDump(type: LyricFormat.Type): boolean {
            return selectDumpWorker(type) != null
        }
    }
}

export namespace LyricFormat {
    export const TYPES = {
        lys: {
            displayName: 'Lyricify Syllable',
            extensions: ['.lys'],
        },
        lyl: {
            displayName: 'Lyricify Lines',
            extensions: ['.lyl'],
        },
        lqe: {
            displayName: 'Lyricify Quick Export',
            extensions: ['.lqe'],
        },
        lrc: {
            displayName: 'LRC',
            extensions: ['.lrc'],
        },
        alrc: {
            displayName: 'ALRC',
            extensions: ['.alrc'],
        },
        ttml: {
            displayName: 'TTML (Original)',
            extensions: ['.ttml'],
        },
        ttml_amll: {
            displayName: 'TTML (AMLL Standards)',
            extensions: ['.ttml'],
        },
        apple_syllable: {
            displayName: 'Apple Syllable',
            extensions: ['.json', '.as', '.asyl'],
        },
        yrc: {
            displayName: 'YRC',
            extensions: ['.yrc'],
        },
        qrc: {
            displayName: 'QRC (Lyricify Standards)',
            extensions: ['.qrc'],
        },
        krc: {
            displayName: 'KRC',
            extensions: ['.krc'],
        },
        srt: {
            displayName: 'SRT',
            extensions: ['.srt'],
        },
        spl: {
            displayName: 'Salt Player Lyrics',
            extensions: ['.lrc'],
        },
    }

    export type Type = keyof typeof TYPES
    export const allTypes: Type[] = Object.keys(TYPES) as Type[]

    export function getLyricFormatDisplayName(formatType: Type): string {
        return TYPES[formatType].displayName
    }

    export function getLyricFormatFileExtensions(formatType: Type): string[] {
        return TYPES[formatType].extensions
    }

    export async function requestReadLyricsFile(
        description: string,
        languageExtensions: string[]
    ): Promise<string | null> {
        const fileTypes = languageExtensions.map((ext) => `${ext}`)
        // @ts-ignore
        const fileHandles = await window.showOpenFilePicker({
            types: [
                {
                    description,
                    accept: { 'text/lyricsSpecific': [...fileTypes] },
                },
            ],
        })

        if (fileHandles.length > 0) {
            const fileHandle = fileHandles[0] // Access the first file handle
            const file = await fileHandle.getFile()
            const contents = await file.text()
            return contents
        }

        return null
    }

    export async function requestWriteLyricsFile(
        description: string,
        languageExtensions: string[],
        content: string,
        options?: { fileName?: string }
    ): Promise<boolean> {
        const fileTypes = languageExtensions.map((ext) => `${ext}`)
        // @ts-ignore
        const fileHandle = await window.showSaveFilePicker({
            types: [
                {
                    description,
                    accept: { 'text/lyricsSpecific': [...fileTypes] },
                },
            ],
            suggestedName: options?.fileName || 'lyrics',
        })

        if (fileHandle) {
            const writable = await fileHandle.createWritable()
            await writable.write(content)
            await writable.close()

            return true
        }
        return false
    }
}
