function DatumVPraze(datum = new Date()){
    const části = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Prague',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(datum).map(část => [část.type, část.value]))
    return `${části.year}-${části.month}-${části.day}`
}

const dnešníDatum = DatumVPraze()
const klíčZáznamů = 'ctenikZáznamy'
document.getElementById('Datum').value = dnešníDatum
document.getElementById('Datum').max = dnešníDatum

const supabaseConfig = window.CTENIK_SUPABASE_CONFIG
const supabaseClient = window.supabase?.createClient && supabaseConfig?.url && supabaseConfig?.publicKey
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.publicKey)
    : null
let PřihlášenýUživatel = ''
let PřihlášenýAuthUživatel = null
let ÚčastníVSoutěži = false
let ZáznamyČtení = {}
let Přihlášení = false
let ProbíháPřihlášení = false
let ProbíháUkládání = false
let PožadavekPoziceVLize = 0

if (!supabaseClient) {
    document.getElementById('AlarmPřihlášení').innerText =
        'Přihlášení není nakonfigurováno. Zkontrolujte Supabase konfiguraci.'
    Aktualizace()
} else {
    supabaseClient.auth.onAuthStateChange((událost, relace) => {
        if (událost === 'SIGNED_OUT') {
            PožadavekPoziceVLize++
            PřihlášenýUživatel = ''
            PřihlášenýAuthUživatel = null
            ÚčastníVSoutěži = false
            ZáznamyČtení = {}
            Přihlášení = false
            Aktualizace()
        } else if (relace?.user && ['SIGNED_IN', 'INITIAL_SESSION', 'USER_UPDATED'].includes(událost)) {
            Promise.resolve()
                .then(() => NastavitPřihlášenéhoUživatele(relace.user))
                .catch(chyba => {
                    console.error('Profil přihlášeného uživatele se nepodařilo načíst.', chyba)
                    ZobrazitChybuPřihlášení('Profil se nepodařilo načíst. Obnovte stránku.')
                })
        }
    })
    supabaseClient.auth.getSession().then(({ data, error }) => {
        if (error) {
            ZobrazitChybuPřihlášení(error.message)
            return
        }
        return data.session?.user
            ? NastavitPřihlášenéhoUživatele(data.session.user)
            : Aktualizace()
    }).catch(chyba => {
        console.error('Stav přihlášení se nepodařilo načíst.', chyba)
        ZobrazitChybuPřihlášení('Stav přihlášení se nepodařilo načíst. Obnovte stránku.')
    })
}

document.getElementById('PřihlášeníOkno').addEventListener('click', (event) => {
    if (event.target.id === 'PřihlášeníOkno') ZavřítPřihlášení()
})
document.getElementById('RegistraceOkno').addEventListener('click', (event) => {
    if (event.target.id === 'RegistraceOkno') ZavřítPřihlášení()
})

async function Záznam(){
    if (ProbíháUkládání) return
    const datum = document.getElementById('Datum').value
    const minuty = Number(document.getElementById('MinČtení').value)
    if (!datum || datum > dnešníDatum || !Number.isInteger(minuty) || minuty < 0 || minuty > 1440) {
        alert('Zadejte dnešní nebo dřívější datum a celý počet minut (alespoň 0, maximálně 1440).')
        return
    }

    if (!PřihlášenýAuthUživatel) return
    const předchozíZáznam = ZáznamyČtení[datum] || { minuty: 0, knihy: 0 }
    if (předchozíZáznam.minuty + minuty > 1440) {
        alert('Celkový počet minut za jeden den nemůže překročit 1440.')
        return
    }
    const záznam = {
        user_id: PřihlášenýAuthUživatel.id,
        entry_date: datum,
        minutes: předchozíZáznam.minuty + minuty,
        books: předchozíZáznam.knihy + Number(document.getElementById('Dočtení').checked)
    }
    ProbíháUkládání = true
    try {
        const { error } = await supabaseClient
            .from('reading_entries')
            .upsert(záznam, { onConflict: 'user_id,entry_date' })
        if (error) throw error
        ZáznamyČtení[datum] = { minuty: záznam.minutes, knihy: záznam.books }
        document.getElementById('Dočtení').checked = false
        Aktualizace()
    } catch (chyba) {
        console.error('Záznam čtení se nepodařilo uložit do Supabase.', chyba)
        alert('Záznam se nepodařilo uložit. Zkontrolujte připojení a zkuste to znovu.')
    } finally {
        ProbíháUkládání = false
    }
}

async function NačístZáznamy(){
    if (!PřihlášenýAuthUživatel) return
    const { data, error } = await supabaseClient
        .from('reading_entries')
        .select('entry_date, minutes, books')
        .eq('user_id', PřihlášenýAuthUživatel.id)
    if (error) throw error
    ZáznamyČtení = Object.fromEntries(data.map(záznam => [
        záznam.entry_date,
        { minuty: záznam.minutes, knihy: záznam.books }
    ]))
    await PřenéstStaréZáznamyPokudJsouPrázdné()
}

async function PřenéstStaréZáznamyPokudJsouPrázdné(){
    if (Object.keys(ZáznamyČtení).length) return
    const klíčJména = PřihlášenýUživatel.trim().toLocaleLowerCase('cs-CZ')
    const staréZáznamyPodleData = new Map()
    for (const klíč of [
        `${klíčZáznamů}:${PřihlášenýAuthUživatel.id}`,
        `${klíčZáznamů}:${klíčJména}`
    ]) {
        let staréZáznamy
        try {
            staréZáznamy = JSON.parse(localStorage.getItem(klíč) || 'null')
        } catch (chyba) {
            console.error(`Staré záznamy v ${klíč} mají neplatný JSON.`, chyba)
            continue
        }
        if (!staréZáznamy || typeof staréZáznamy !== 'object' || Array.isArray(staréZáznamy)) continue
        for (const [datum, záznam] of Object.entries(staréZáznamy)) {
            const parsovanéDatum = /^\d{4}-\d{2}-\d{2}$/.test(datum)
                ? new Date(`${datum}T00:00:00Z`)
                : null
            const validníDatum = parsovanéDatum &&
                !Number.isNaN(parsovanéDatum.getTime()) &&
                parsovanéDatum.toISOString().slice(0, 10) === datum
            const knihy = záznam?.knihy == null ? 0 : Number(záznam.knihy)
            const minuty = Number(záznam?.minuty)
            if (!validníDatum || !Number.isInteger(minuty) || minuty < 0 || minuty > 1440 ||
                !Number.isInteger(knihy) || knihy < 0) continue
            const předchozí = staréZáznamyPodleData.get(datum)
            staréZáznamyPodleData.set(datum, {
                user_id: PřihlášenýAuthUživatel.id,
                entry_date: datum,
                minutes: Math.max(předchozí?.minutes || 0, minuty),
                books: Math.max(předchozí?.books || 0, knihy)
            })
        }
    }
    const záznamy = [...staréZáznamyPodleData.values()]
    if (!záznamy.length || !window.confirm(
        `Našel jsem ${záznamy.length} starých místních záznamů pro jméno „${PřihlášenýUživatel}“. ` +
        'Importovat je do vašeho nového účtu? Místní kopie zůstane zachována.'
    )) return

    const { error } = await supabaseClient
        .from('reading_entries')
        .upsert(záznamy, { onConflict: 'user_id,entry_date', ignoreDuplicates: true })
    if (error) throw error
    ZáznamyČtení = Object.fromEntries(záznamy.map(záznam => [
        záznam.entry_date,
        { minuty: záznam.minutes, knihy: záznam.books }
    ]))
}

function DatumPosunout(datum, početDní){
    const den = new Date(`${datum}T00:00:00Z`)
    den.setUTCDate(den.getUTCDate() + početDní)
    return den.toISOString().slice(0, 10)
}

function VykreslitGraf(záznamy){
    const graf = document.getElementById('Graf')
    const rozměry = graf.getBoundingClientRect()
    const měřítko = window.devicePixelRatio || 1
    const šířka = rozměry.width
    const výška = rozměry.height
    graf.width = Math.round(šířka * měřítko)
    graf.height = Math.round(výška * měřítko)

    const kontext = graf.getContext('2d')
    kontext.scale(měřítko, měřítko)
    kontext.clearRect(0, 0, šířka, výška)

    const okraj = { nahoře: 12, vpravo: 12, dole: 32, vlevo: 42 }
    const šířkaGrafu = šířka - okraj.vlevo - okraj.vpravo
    const výškaGrafu = výška - okraj.nahoře - okraj.dole
    const dny = Array.from({ length: 7 }, (_, index) => {
        const datum = DatumPosunout(dnešníDatum, index - 6)
        return { datum, minuty: záznamy[datum]?.minuty || 0 }
    })
    const maximum = Math.max(30, ...dny.map(den => den.minuty))
    const krok = maximum <= 60 ? 15 : Math.ceil(maximum / 4 / 15) * 15
    const vršekOsy = Math.ceil(maximum / krok) * krok
    const početSloupců = vršekOsy / krok

    kontext.font = '12px Arial'
    kontext.textAlign = 'right'
    kontext.textBaseline = 'middle'
    kontext.strokeStyle = 'rgba(4, 0, 82, 0.18)'
    kontext.fillStyle = 'rgb(4, 0, 82)'
    for (let index = 0; index <= početSloupců; index++) {
        const y = okraj.nahoře + výškaGrafu - (index / početSloupců) * výškaGrafu
        kontext.beginPath()
        kontext.moveTo(okraj.vlevo, y)
        kontext.lineTo(šířka - okraj.vpravo, y)
        kontext.stroke()
        kontext.fillText(String(index * krok), okraj.vlevo - 7, y)
    }

    const šířkaSloupce = šířkaGrafu / dny.length
    dny.forEach((den, index) => {
        const šířkaSloupceGrafu = Math.min(28, šířkaSloupce * 0.65)
        const výškaSloupce = (den.minuty / vršekOsy) * výškaGrafu
        const x = okraj.vlevo + index * šířkaSloupce + (šířkaSloupce - šířkaSloupceGrafu) / 2
        const y = okraj.nahoře + výškaGrafu - výškaSloupce
        kontext.fillStyle = den.datum === dnešníDatum ? 'rgb(255, 154, 2)' : "rgb(255, 154, 2)"
        kontext.fillRect(x, y, šířkaSloupceGrafu, Math.max(výškaSloupce, 1))
        kontext.fillStyle = 'rgb(4, 0, 82)'
        kontext.textAlign = 'center'
        kontext.textBaseline = 'top'
        kontext.fillText(new Intl.DateTimeFormat('cs-CZ', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${den.datum}T00:00:00Z`)), x + šířkaSloupceGrafu / 2, výška + 6)
    })
}

function AktualizovatŘadu(záznamy){
    const dnesČte = (záznamy[dnešníDatum]?.minuty || 0) > 0
    const včera = DatumPosunout(dnešníDatum, -1)
    let datum = dnesČte ? dnešníDatum : včera
    let početDní = 0

    while ((záznamy[datum]?.minuty || 0) > 0) {
        početDní++
        datum = DatumPosunout(datum, -1)
    }
    document.getElementById('řada').innerText = `Dny v řadě: ${početDní}`
    if (početDní === 0) {
        document.getElementById("řadaAkt").innerText = početDní+" dnů"
    }
    else if (početDní === 1) {
    document.getElementById("řadaAkt").innerText = početDní+" den"
    }
    else if (početDní > 1 && početDní < 5) {
    document.getElementById("řadaAkt").innerText = početDní+" dny"
    }    
    else if (početDní > 4) {
    document.getElementById("řadaAkt").innerText = početDní+" dnů"
    }    
}

function Přihlásit(){
    if (Přihlášení) {
        if (ProbíháPřihlášení || !supabaseClient) return
        ProbíháPřihlášení = true
        supabaseClient.auth.signOut().then(({ error }) => {
            if (error) {
                ZobrazitChybuPřihlášení('Odhlášení se nepodařilo. Zkuste to znovu.')
                console.error('Odhlášení ze Supabase se nepodařilo.', error)
            }
        }).finally(() => {
            ProbíháPřihlášení = false
        })
        return
    }
    ZobrazitPřihlášení()
}

function ZavřítPřihlášení(){
    document.getElementById('PřihlášeníOkno').hidden = true
    document.getElementById('RegistraceOkno').hidden = true
}

function ZobrazitRegistraci(){
    document.getElementById('PřihlášeníOkno').hidden = true
    document.getElementById('RegistraceOkno').hidden = false
    document.getElementById('RegistraceChyba').innerText = ''
    document.getElementById('RegistračníJméno').focus()
}

function ZobrazitPřihlášení(){
    document.getElementById('RegistraceOkno').hidden = true
    document.getElementById('PřihlášeníOkno').hidden = false
    document.getElementById('PřihlášeníChyba').innerText = ''
    document.getElementById('PřihlašovacíEmail').focus()
}

async function PřihlášeníOdeslat(event){
    event.preventDefault()
    if (ProbíháPřihlášení) return
    const email = document.getElementById('PřihlašovacíEmail').value.trim()
    const heslo = document.getElementById('PřihlašovacíHeslo').value
    const chyba = document.getElementById('PřihlášeníChyba')
    if (!supabaseClient) {
        chyba.innerText = 'Přihlášení není nakonfigurováno. Zkontrolujte připojení k Supabase.'
        return
    }
    ProbíháPřihlášení = true
    chyba.innerText = ''
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password: heslo })
        if (error) chyba.innerText = 'Přihlášení se nepodařilo. Zkontrolujte e-mail a heslo.'
    } catch (chybaPřihlášení) {
        console.error('Přihlášení přes Supabase se nepodařilo.', chybaPřihlášení)
        chyba.innerText = 'Nepodařilo se spojit se službou přihlášení. Zkuste to znovu.'
    } finally {
        ProbíháPřihlášení = false
    }
}

async function RegistraceOdeslat(event){
    event.preventDefault()
    if (ProbíháPřihlášení) return
    const jméno = document.getElementById('RegistračníJméno').value.trim()
    const email = document.getElementById('RegistračníEmail').value.trim()
    const heslo = document.getElementById('RegistračníHeslo').value
    const hesloZnovu = document.getElementById('RegistračníHesloZnovu').value
    const chyba = document.getElementById('RegistraceChyba')

    if (!supabaseClient) {
        chyba.innerText = 'Registrace není nakonfigurována. Zkontrolujte připojení k Supabase.'
        return
    }
    if (heslo !== hesloZnovu) {
        chyba.innerText = 'Hesla se musí shodovat.'
        return
    }
    if (!jméno || jméno.length > 40) {
        chyba.innerText = 'Zadejte jméno o délce 1 až 40 znaků.'
        return
    }

    ProbíháPřihlášení = true
    chyba.innerText = ''
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password: heslo,
            options: {
                data: { display_name: jméno },
                emailRedirectTo: window.location.href.split('?')[0]
            }
        })
        if (error) {
            chyba.innerText = 'Registrace se nepodařila. Ověřte e-mail a podmínky hesla.'
            console.error('Registrace přes Supabase se nepodařila.', error)
            return
        }
        if (!data.session) {
            chyba.innerText = 'Účet byl vytvořen. Potvrďte registraci odkazem v e-mailu a potom se přihlaste.'
            return
        }
        document.getElementById('RegistraceForm').reset()
        ZavřítPřihlášení()
    } catch (chybaRegistrace) {
        console.error('Registraci přes Supabase se nepodařilo dokončit.', chybaRegistrace)
        chyba.innerText = 'Nepodařilo se spojit se službou registrace. Zkuste to znovu.'
    } finally {
        ProbíháPřihlášení = false
    }
}

async function NastavitPřihlášenéhoUživatele(uživatel){
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('display_name, competition_enabled')
        .eq('id', uživatel.id)
        .single()
    if (error) {
        console.error('Profil přihlášeného uživatele se nepodařilo načíst.', error)
        ZobrazitChybuPřihlášení('Přihlášení proběhlo, ale profil se nepodařilo načíst.')
        return
    }
    PřihlášenýAuthUživatel = uživatel
    PřihlášenýUživatel = data.display_name
    ÚčastníVSoutěži = data.competition_enabled
    Přihlášení = true
    try {
        localStorage.removeItem('ctenikÚčty')
        localStorage.removeItem('ctenikÚčet')
    } catch (chybaÚložiště) {
        console.error('Staré lokální přihlašovací údaje se nepodařilo odstranit.', chybaÚložiště)
    }
    try {
        await NačístZáznamy()
    } catch (chybaZáznamů) {
        Přihlášení = false
        console.error('Záznamy čtení se nepodařilo načíst.', chybaZáznamů)
        ZobrazitChybuPřihlášení('Záznamy se nepodařilo načíst z databáze. Obnovte stránku.')
        Aktualizace()
        return
    }
    ZavřítPřihlášení()
    Aktualizace()
}

function ZobrazitChybuPřihlášení(zpráva){
    const chyba = document.getElementById('PřihlášeníChyba')
    if (chyba) chyba.innerText = zpráva
}

function Aktualizace(){
    document.getElementById('PřihlášeníVýzva').hidden = Přihlášení
    document.getElementById('Přehled').hidden = !Přihlášení
    document.getElementById('Statistiky').hidden = false
    document.getElementById('StatistikyOmezení').hidden = Přihlášení
    document.getElementById('NastaveníOdkaz').hidden = !Přihlášení
    if (!Přihlášení) {
        document.getElementById("ZáznTlačítko").classList.add("ZakázanéTlačítko")
        document.getElementById("ZáznTlačítko").onclick = null
        document.getElementById('AlarmPřihlášení').innerText = 'Nejste přihlášni, většina funkcí nebude aktivní'
        document.getElementById('AlarmPřihlášení').style.color = 'red'
        document.getElementById('AlarmPřihlášení').style.backgroundColor = 'rgb(255, 151, 151)'
        document.getElementById('AlarmPřihlášení').style.borderRadius = '5px'
        document.getElementById('AlarmPřihlášení').style.margin = '5px'
        ZobrazitUkázkovéStatistiky()
        return
    }
    if(Přihlášení)

    {
        document.getElementById("ZáznTlačítko").classList.remove("ZakázanéTlačítko")
        document.getElementById("ZáznTlačítko").onclick = function() { Záznam() }
    }
    const záznamy = ZáznamyČtení
    const dny = Object.values(záznamy)
    const minutyCelkem = dny.reduce((součet, záznam) => součet + (Number(záznam.minuty) || 0), 0)
    const knihyCelkem = dny.reduce((součet, záznam) => součet + (Number(záznam.knihy) || 0), 0)
    const minutyZaPosledníchSedmDní = Array.from({ length: 7 }, (_, index) =>
        DatumPosunout(dnešníDatum, index - 6)
    ).reduce((součet, datum) => součet + (Number(záznamy[datum]?.minuty) || 0), 0)
    const minutyZaDen = minutyZaPosledníchSedmDní / 7

    document.getElementById('AlarmPřihlášení').innerText = ''
    document.getElementById('AlarmPřihlášení').style.backgroundColor = 'transparent'
    document.getElementById('JménoUživatele').innerText = PřihlášenýUživatel
    document.getElementById('Minuty').innerText = 'Minuty čtení: ' + minutyCelkem
    document.getElementById('MinutyZaDen').innerText = 'Minuty za den: ' + minutyZaDen.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })
    document.getElementById('PočKnih').innerText = 'Přečtené knihy: ' + knihyCelkem
    AktualizovatŘadu(záznamy)
    AktualizovatPoziciVLize()
    VykreslitGraf(záznamy)
}

function ZobrazitUkázkovéStatistiky(){
    const ukázkovéMinuty = [20, 35, 15, 45, 30, 60, 40]
    const ukázkovéZáznamy = Object.fromEntries(
        ukázkovéMinuty.map((minuty, index) => [
            DatumPosunout(dnešníDatum, index - 6),
            { minuty }
        ])
    )
    const minutyCelkem = ukázkovéMinuty.reduce((součet, minuty) => součet + minuty, 0)
    const minutyZaDen = minutyCelkem / ukázkovéMinuty.length

    document.getElementById('Minuty').innerText = `Minuty čtení: ${minutyCelkem}`
    document.getElementById('MinutyZaDen').innerText =
        `Průměr minut čtení za den: ${minutyZaDen.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })}`
    VykreslitGraf(ukázkovéZáznamy)
}

function AktualizovatPoziciVLize(){
    const výstup = document.getElementById('PoziceVLizeHodnota')
    if (!Přihlášení || !PřihlášenýAuthUživatel) return
    if (!ÚčastníVSoutěži) {
        PožadavekPoziceVLize++
        výstup.innerText = 'Momentálně nejsi zapojený do soutěže.'
        return
    }

    const požadavek = ++PožadavekPoziceVLize
    výstup.innerText = 'Načítám tvoje pořadí v lize…'
    supabaseClient.rpc('get_leaderboard').then(({ data, error }) => {
        if (požadavek !== PožadavekPoziceVLize) return
        if (error) {
            console.error('Pozici v žebříčku se nepodařilo načíst ze Supabase.', error)
            výstup.innerText = 'Pozici v lize se nepodařilo načíst. Zkus obnovit stránku.'
            return
        }

        const celkemMinut = Object.values(ZáznamyČtení)
            .reduce((součet, záznam) => součet + (Number(záznam.minuty) || 0), 0)
        const řada = SpočítatŘaduVPraze()
        const shody = data.filter(soutěžící =>
            soutěžící.display_name === PřihlášenýUživatel &&
            Number(soutěžící.total_minutes) === celkemMinut &&
            Number(soutěžící.current_streak) === řada
        )
        if (shody.length === 1) {
            výstup.innerText = `${shody[0].rank_position}. místo`
        } else if (shody.length > 1) {
            výstup.innerText = 'Tvoje pořadí nelze určit, protože stejné jméno používá více soutěžících.'
        } else {
            výstup.innerText = 'V žebříčku se zatím nezobrazuješ. Zkus obnovit stránku.'
        }
    }).catch(chyba => {
        if (požadavek !== PožadavekPoziceVLize) return
        console.error('Pozici v žebříčku se nepodařilo načíst ze Supabase.', chyba)
        výstup.innerText = 'Pozici v lize se nepodařilo načíst. Zkus obnovit stránku.'
    })
}

function SpočítatŘaduVPraze(){
    const dnesVPraze = DatumVPraze()
    let datum = (ZáznamyČtení[dnesVPraze]?.minuty || 0) > 0
        ? dnesVPraze
        : DatumPosunout(dnesVPraze, -1)
    let početDní = 0

    while (datum >= DatumPosunout(dnesVPraze, -3660) &&
        (ZáznamyČtení[datum]?.minuty || 0) > 0) {
        početDní++
        datum = DatumPosunout(datum, -1)
    }
    return početDní
}

window.addEventListener('storage', event => {
    if (event.key?.startsWith(`${klíčZáznamů}:`)) {
        if (Přihlášení) AktualizovatPoziciVLize()
    }
})

window.addEventListener('resize', () => {
    if (Přihlášení) VykreslitGraf(ZáznamyČtení)
})
