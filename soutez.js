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

function VykreslitSoutěž(){
    const účty = NačístJSON(klíčÚčtů, {})
    const soutěžící = Object.values(účty && typeof účty === 'object' ? účty : {})
        .filter(účet => typeof účet?.jméno === 'string' && účet.jméno.trim())
        .map(účet => ({ jméno: účet.jméno, minuty: NačístMinuty(účet.jméno) }))
        .sort((první, druhý) => druhý.minuty - první.minuty || první.jméno.localeCompare(druhý.jméno, 'cs-CZ'))

    const výsledky = document.getElementById('VýsledkySoutěže')
    výsledky.replaceChildren()

    if (soutěžící.length === 0) {
        const řádek = document.createElement('tr')
        řádek.className = 'Řádek'
        const buňka = document.createElement('td')
        buňka.className = 'Buňka'
        buňka.colSpan = 3
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
            soutěžící.minuty.toLocaleString('cs-CZ')
        ]) {
            const buňka = document.createElement('td')
            buňka.className = 'Buňka'
            buňka.textContent = hodnota
            řádek.append(buňka)
        }

        výsledky.append(řádek)
    })
}

VykreslitSoutěž()
window.addEventListener('storage', event => {
    if (event.key === klíčÚčtů || event.key === klíčStaréhoÚčtu || event.key?.startsWith(předponaZáznamů)) {
        VykreslitSoutěž()
    }
})