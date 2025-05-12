import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import fs from 'fs'

// read your userscript header from a separate file (easier to maintain)
const header = fs.readFileSync('userscript.header.js', 'utf8')

let isUserScriptHeader = false

export default {
    input: 'src/index.ts',  // main TS file
    plugins: [
        resolve(),  // so Rollup can find node_modules if you ever need them
        typescript({  // compile TS → JS
            tsconfig: './tsconfig.json'
        }),
        terser({
            format: {
                // userscript headers
                comments: (node, comment) => {
                    if (comment.value.startsWith(' ==UserScript==')) {
                        isUserScriptHeader = true
                        return true
                    }
                    if (comment.value.startsWith(' ==/UserScript==')) {
                        isUserScriptHeader = false
                        return true
                    }

                    // check if it's between the two header marks
                    if (isUserScriptHeader && comment.value.startsWith(" @")) {
                        return true
                    }

                    return false
                }
            }
        })  // minify
    ],
    output: {
        file: 'dist/att-greener.user.js',
        format: 'iife',             // bundle as a self-invoking function
        banner: header,             // prepend the userscript metadata
        sourcemap: false,

    }
}