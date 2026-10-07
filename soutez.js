const klíčÚčtů = 'ctenikÚčty'
const klíčStaréhoÚčtu = 'ctenikÚčet'
const předponaZáznamů = 'ctenikZáznamy:'

function NormalizovatJméno(jméno){
    return jméno.trim().toLocaleLowerCase('cs-CZ')
}

function NačístJSON(klíč, výchozíHodnota){
    try {
        return JSON.parse(localStorage.getItem(klíč) || JSON.stringify(výchozíHodnota))
    } catch {
        return výchozíHodnota
    }
}

function NačístMinuty(jméno){
    const záznamy = NačístJSON(`${předponaZáznamů}${NormalizovatJméno(jméno)}`, {})
    if (!záznamy || typeof záznamy !== 'object') return 0

    return Object.values(záznamy).reduce((celkem, záznam) => {
        const minuty = Number(záznam?.minuty)
        return celkem + (Number.isFinite(minuty) && minuty > 0 ? minuty : 0)
    }, 0)
}

function DatumPosunout(datum, početDní){
    const den = new Date(`${datum}T00:00:00Z`)
    den.setUTCDate(den.getUTCDate() + početDní)
    return den.toISOString().slice(0, 10)
}

function PočetDníVŘadě(záznamy){
    if (!záznamy || typeof záznamy !== 'object') return 0

    const dnes = new Date()
    const yyyy = dnes.getFullYear()
    const mm = String(dnes.getMonth() + 1).padStart(2, '0')
    const dd = String(dnes.getDate()).padStart(2, '0')
    const dnešníDatum = `${yyyy}-${mm}-${dd}`
    const dnesČte = (záznamy[dnešníDatum]?.minuty || 0) > 0
    const včera = DatumPosunout(dnešníDatum, -1)
    let datum = dnesČte ? dnešníDatum : včera
    let početDní = 0

    while ((záznamy[datum]?.minuty || 0) > 0) {
        početDní++
        datum = DatumPosunout(datum, -1)
    }

    return početDní
}

function VykreslitSoutěž(){
    const účty = NačístJSON(klíčÚčtů, {})
    const soutěžící = Object.values(účty && typeof účty === 'object' ? účty : {})
        .filter(účet =>
            typeof účet?.jméno === 'string' &&
            účet.jméno.trim() &&
            účet.soutěžící !== false
        )
        .map(účet => {
            const jméno = účet.jméno
            const záznamy = NačístJSON(`${předponaZáznamů}${NormalizovatJméno(jméno)}`, {})
            return {
                jméno,
                minuty: NačístMinuty(jméno),
                dnyVŘadě: PočetDníVŘadě(záznamy)
            }
        })
        .sort((první, druhý) =>
            druhý.minuty - první.minuty ||
            druhý.dnyVŘadě - první.dnyVŘadě ||
            první.jméno.localeCompare(druhý.jméno, 'cs-CZ')
        )

    const výsledky = document.getElementById('VýsledkySoutěže')
    výsledky.replaceChildren()

    if (soutěžící.length === 0) {
        const řádek = document.createElement('tr')
        řádek.className = 'Řádek'
        const buňka = document.createElement('td')
        buňka.className = 'Buňka'
        buňka.colSpan = 4
        buňka.textContent = 'Zatím nejsou registrovaní žádní uživatelé.'
        řádek.append(buňka)
        výsledky.append(řádek)
        return
    }

    soutěžící.forEach((soutěžící, index) => {
        const řádek = document.createElement('tr')
        řádek.className = 'Řádek'

        for (const hodnota of [
            `${index + 1}.`,
            soutěžící.jméno,
            soutěžící.minuty.toLocaleString('cs-CZ'),
            String(soutěžící.dnyVŘadě)
        ]) {
            const buňka = document.createElement('td')
            buňka.className = 'Buňka'
            buňka.textContent = hodnota
            řádek.append(buňka)
        }

        výsledky.append(řádek)
    })
}

function AktualizovatNastaveníOdkaz(){
    const jméno = sessionStorage.getItem('ctenikPrihlasenýUživatel') || localStorage.getItem('ctenikPrihlasenýUživatel') || ''
    const účty = NačístJSON(klíčÚčtů, {})
    const starýÚčet = NačístJSON(klíčStaréhoÚčtu, null)
    const účet = účty && typeof účty === 'object' ? účty[NormalizovatJméno(jméno)] : null
    const přihlášeno = Boolean(
        jméno &&
        (účet || (
            starýÚčet?.jméno &&
            starýÚčet?.heslo &&
            NormalizovatJméno(starýÚčet.jméno) === NormalizovatJméno(jméno)
        ))
    )
    document.getElementById('NastaveníOdkaz').hidden = !přihlášeno
}

AktualizovatNastaveníOdkaz()
VykreslitSoutěž()
window.addEventListener('storage', event => {
    if (event.key === klíčÚčtů || event.key === klíčStaréhoÚčtu || event.key === 'ctenikPrihlasenýUživatel') {
        AktualizovatNastaveníOdkaz()
    }
    if (event.key === klíčÚčtů || event.key === klíčStaréhoÚčtu || event.key?.startsWith(předponaZáznamů)) {
        VykreslitSoutěž()
    }
})