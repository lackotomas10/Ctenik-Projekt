const dnes = new Date();
const yyyy = dnes.getFullYear();
const mm = String(dnes.getMonth() + 1).padStart(2, '0');
const dd = String(dnes.getDate()).padStart(2, '0');

const dnešníDatum = `${yyyy}-${mm}-${dd}`
const klíčZáznamů = 'ctenikZáznamy'
const klíčÚčtů = 'ctenikÚčty'
document.getElementById('Datum').value = dnešníDatum;

const Účty = NačístÚčty()
let PřihlášenýUživatel = sessionStorage.getItem('ctenikPrihlasenýUživatel') || localStorage.getItem('ctenikPrihlasenýUživatel') || ''
let Přihlášení = Boolean(PřihlášenýUživatel && Účty[NormalizovatJméno(PřihlášenýUživatel)])
if (!Přihlášení) {
    PřihlášenýUživatel = ''
    sessionStorage.removeItem('ctenikPrihlasenýUživatel')
    localStorage.removeItem('ctenikPrihlasenýUživatel')
}

Aktualizace()

document.getElementById('PřihlášeníOkno').addEventListener('click', (event) => {
    if (event.target.id === 'PřihlášeníOkno') ZavřítPřihlášení()
})

function Záznam(){
    if (Přihlášení == false){
        alert("Nejprve se přihlašte.")
        Aktualizace()
        return
    }
    const datum = document.getElementById('Datum').value
    const minuty = Number(document.getElementById('MinČtení').value)
    if (!datum || !Number.isFinite(minuty) || minuty < 0) {
        alert('Zadejte platné datum a počet minut (alespoň 0).')
        return
    }

    const záznamy = NačístZáznamy()
    const záznam = záznamy[datum] || { minuty: 0, knihy: 0 }
    záznam.minuty += minuty
    záznam.knihy += Number(document.getElementById('Dočtení').checked)
    záznamy[datum] = záznam
    localStorage.setItem(KlíčZáznamůUživatele(), JSON.stringify(záznamy))
    document.getElementById('Dočtení').checked = false
    Aktualizace()
}

function NormalizovatJméno(jméno){
    return jméno.trim().toLocaleLowerCase('cs-CZ')
}

function NačístÚčty(){
    try {
        const účty = JSON.parse(localStorage.getItem(klíčÚčtů) || '{}') || {}
        const starýÚčet = JSON.parse(localStorage.getItem('ctenikÚčet') || 'null')
        if (starýÚčet?.jméno && starýÚčet?.heslo) {
            const klíč = NormalizovatJméno(starýÚčet.jméno)
            if (!účty[klíč]) {
                účty[klíč] = starýÚčet
                localStorage.setItem(klíčÚčtů, JSON.stringify(účty))
            }
        }
        return účty
    } catch {
        return {}
    }
}

function KlíčZáznamůUživatele(){
    return `${klíčZáznamů}:${NormalizovatJméno(PřihlášenýUživatel)}`
}

function NačístZáznamy(){
    if (!Přihlášení || !PřihlášenýUživatel) return {}
    try {
        const uloženéZáznamy = localStorage.getItem(KlíčZáznamůUživatele())
        if (uloženéZáznamy) return JSON.parse(uloženéZáznamy) || {}

        const starýÚčet = JSON.parse(localStorage.getItem('ctenikÚčet') || 'null')
        const staréZáznamy = localStorage.getItem(klíčZáznamů)
        if (starýÚčet && NormalizovatJméno(starýÚčet.jméno) === NormalizovatJméno(PřihlášenýUživatel) && staréZáznamy) {
            localStorage.setItem(KlíčZáznamůUživatele(), staréZáznamy)
            return JSON.parse(staréZáznamy) || {}
        }
        return {}
    } catch {
        return {}
    }
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
        sessionStorage.removeItem('ctenikPrihlasenýUživatel')
        localStorage.removeItem('ctenikPrihlasenýUživatel')
        PřihlášenýUživatel = ''
        Přihlášení = false
        Aktualizace()
        return
    }
    document.getElementById('PřihlášeníOkno').hidden = false

    document.getElementById('PřihlašovacíJméno').focus()
}

function ZavřítPřihlášení(){
    document.getElementById('PřihlášeníOkno').hidden = true
}

function ZobrazitRegistraci(){
    document.getElementById('PřihlášeníForm').hidden = true
    document.getElementById('RegistraceForm').hidden = false
    document.getElementById('RegistraceChyba').innerText = ''
    document.getElementById('RegistračníJméno').focus()
}

function ZobrazitPřihlášení(){
    document.getElementById('RegistraceForm').hidden = true
    document.getElementById('PřihlášeníForm').hidden = false
    document.getElementById('PřihlášeníChyba').innerText = ''
    document.getElementById('PřihlašovacíJméno').focus()
}

function PřihlášeníOdeslat(event){
    event.preventDefault()
    const jméno = document.getElementById('PřihlašovacíJméno').value.trim()
    const heslo = document.getElementById('PřihlašovacíHeslo').value
    const účet = Účty[NormalizovatJméno(jméno)]
    const chyba = document.getElementById('PřihlášeníChyba')

    if (!účet || účet.heslo !== heslo) {
        chyba.innerText = 'Jméno nebo heslo není správně.'
        return
    }

    PřihlášenýUživatel = účet.jméno
    Přihlášení = true
    sessionStorage.setItem('ctenikPrihlasenýUživatel', PřihlášenýUživatel)
    if (document.getElementById('ZapamatovatUživatele').checked) {
        localStorage.setItem('ctenikPrihlasenýUživatel', PřihlášenýUživatel)
    } else {
        localStorage.removeItem('ctenikPrihlasenýUživatel')
    }
    chyba.innerText = ''
    ZavřítPřihlášení()
    Aktualizace()
}

function RegistraceOdeslat(event){
    event.preventDefault()
    const jméno = document.getElementById('RegistračníJméno').value.trim()
    const heslo = document.getElementById('RegistračníHeslo').value
    const hesloZnovu = document.getElementById('RegistračníHesloZnovu').value
    const chyba = document.getElementById('RegistraceChyba')

    if (heslo !== hesloZnovu) {
        chyba.innerText = 'Hesla se musí shodovat.'
        return
    }
    const klíčJména = NormalizovatJméno(jméno)
    if (Účty[klíčJména]) {
        chyba.innerText = 'Účet už existuje. Přihlaste se.'
        return
    }

    Účty[klíčJména] = { jméno, heslo }
    localStorage.setItem(klíčÚčtů, JSON.stringify(Účty))
    document.getElementById('PřihlašovacíJméno').value = jméno
    document.getElementById('PřihlašovacíHeslo').value = ''
    document.getElementById('RegistraceForm').reset()
    ZobrazitPřihlášení()
}

function Aktualizace(){
    document.getElementById('PřihlášeníVýzva').hidden = Přihlášení
    document.getElementById('Přehled').hidden = !Přihlášení
    document.getElementById('Statistiky').hidden = false
    document.getElementById('StatistikyOmezení').hidden = Přihlášení
    document.getElementById('NastaveníOdkaz').hidden = !Přihlášení
    if (!Přihlášení) {
        document.getElementById('AlarmPřihlášení').innerText = 'Nejste přihlášni, většina funkcí nebude aktivní'
        document.getElementById('AlarmPřihlášení').style.color = 'red'
        document.getElementById('AlarmPřihlášení').style.backgroundColor = 'rgb(255, 151, 151)'
        document.getElementById('AlarmPřihlášení').style.borderRadius = '5px'
        ZobrazitUkázkovéStatistiky()
        return
    }

    const záznamy = NačístZáznamy()
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
    const aktuálníÚčty = NačístÚčty()
    const záznamyUživatelů = Object.values(aktuálníÚčty)
        .filter(účet =>
            typeof účet?.jméno === 'string' &&
            účet.jméno.trim() &&
            účet.soutěžící !== false
        )
        .map(účet => {
            let záznamy = {}
            try {
                const uloženéZáznamy = localStorage.getItem(`${klíčZáznamů}:${NormalizovatJméno(účet.jméno)}`)
                const načtenéZáznamy = JSON.parse(uloženéZáznamy || '{}')
                if (načtenéZáznamy && typeof načtenéZáznamy === 'object' && !Array.isArray(načtenéZáznamy)) {
                    záznamy = načtenéZáznamy
                }
            } catch {
                záznamy = {}
            }

            const minuty = Object.values(záznamy).reduce((celkem, záznam) => {
                const hodnota = Number(záznam?.minuty)
                return celkem + (Number.isFinite(hodnota) && hodnota > 0 ? hodnota : 0)
            }, 0)
            const knihy = Object.values(záznamy).reduce((celkem, záznam) => {
                const hodnota = Number(záznam?.knihy)
                return celkem + (Number.isFinite(hodnota) && hodnota > 0 ? hodnota : 0)
            }, 0)
            const dnes = new Date()
            const datumDnes = `${dnes.getFullYear()}-${String(dnes.getMonth() + 1).padStart(2, '0')}-${String(dnes.getDate()).padStart(2, '0')}`
            const minutyZaPosledníchSedmDní = Array.from({ length: 7 }, (_, index) =>
                DatumPosunout(datumDnes, index - 6)
            ).reduce((celkem, datum) => {
                const hodnota = Number(záznamy[datum]?.minuty)
                return celkem + (Number.isFinite(hodnota) && hodnota > 0 ? hodnota : 0)
            }, 0)
            let datumŘady = (Number(záznamy[datumDnes]?.minuty) || 0) > 0
                ? datumDnes
                : DatumPosunout(datumDnes, -1)
            let dnyVŘadě = 0

            while ((Number(záznamy[datumŘady]?.minuty) || 0) > 0) {
                dnyVŘadě++
                datumŘady = DatumPosunout(datumŘady, -1)
            }

            return {
                jméno: účet.jméno,
                minuty,
                dnyVŘadě,
                knihy,
                průměrZaPosledníchSedmDní: minutyZaPosledníchSedmDní / 7
            }
        })
        .sort((první, druhý) =>
            druhý.minuty - první.minuty ||
            druhý.dnyVŘadě - první.dnyVŘadě ||
            druhý.knihy - první.knihy ||
            druhý.průměrZaPosledníchSedmDní - první.průměrZaPosledníchSedmDní ||
            první.jméno.localeCompare(druhý.jméno, 'cs-CZ')
        )

    const pozice = záznamyUživatelů.findIndex(účet =>
        NormalizovatJméno(účet.jméno) === NormalizovatJméno(PřihlášenýUživatel)
    )
    document.getElementById('PoziceVLizeHodnota').innerText = pozice < 0
        ? 'Nejste zařazeni do ligy. Účast můžete zapnout v nastavení.'
        : `${pozice + 1}. místo z ${záznamyUživatelů.length}`
}

window.addEventListener('storage', event => {
    if (event.key === klíčÚčtů || event.key?.startsWith(`${klíčZáznamů}:`)) {
        if (Přihlášení) AktualizovatPoziciVLize()
    }
})

window.addEventListener('resize', () => {
    if (Přihlášení) VykreslitGraf(NačístZáznamy())
})
