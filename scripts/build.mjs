import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const outputDirectory = resolve('dist')
const supabaseUrl = process.env.SUPABASE_URL
const supabasePublicKey = process.env.SUPABASE_PUBLIC_KEY

if (!supabaseUrl || !supabasePublicKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_PUBLIC_KEY in the Netlify environment.')
}

let parsedSupabaseUrl
try {
    parsedSupabaseUrl = new URL(supabaseUrl)
} catch {
    throw new Error('SUPABASE_URL must be a valid HTTPS URL.')
}
if (parsedSupabaseUrl.protocol !== 'https:') {
    throw new Error('SUPABASE_URL must use HTTPS.')
}

rmSync(outputDirectory, { recursive: true, force: true })
mkdirSync(outputDirectory, { recursive: true })

for (const file of [
    'Ctenik.html',
    'Nastavení.html',
    'Soutěž.html',
    'Zásadysokromi.html',
    'nastaveni.js',
    'script.js',
    'soutez.js',
    'style.css'
]) {
    cpSync(file, resolve(outputDirectory, file))
}

cpSync('img', resolve(outputDirectory, 'img'), { recursive: true })
cpSync('Ctenik.html', resolve(outputDirectory, 'index.html'))
writeFileSync(
    resolve(outputDirectory, 'supabase-config.js'),
    `window.CTENIK_SUPABASE_CONFIG = ${JSON.stringify({
        url: parsedSupabaseUrl.origin,
        publicKey: supabasePublicKey
    })};\n`
)

const homePage = readFileSync(resolve(outputDirectory, 'index.html'), 'utf8')
if (!homePage.includes('supabase-config.js')) {
    throw new Error('The homepage does not load supabase-config.js.')
}

console.log('Netlify static site built in dist/.')
