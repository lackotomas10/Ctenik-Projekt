const klíčPřihlášenéhoUživatele = 'ctenikPrihlasenýUživatel'
const klíčÚčtů = 'ctenikÚčty'
const klíčStaréhoÚčtu = 'ctenikÚčet'
const klíčStarýchZáznamů = 'ctenikZáznamy'
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

const přihlášenéJméno = sessionStorage.getItem(klíčPřihlášenéhoUživatele) ||
    localStorage.getItem(klíčPřihlášenéhoUživatele) ||
    ''
const načtenéÚčty = NačístJSON(klíčÚčtů, {})
const účty = načtenéÚčty && typeof načtenéÚčty === 'object' && !Array.isArray(načtenéÚčty)
    ? načtenéÚčty
    : {}
const klíčJména = přihlášenéJméno ? NormalizovatJméno(přihlášenéJméno) : ''
const účet = klíčJména ? účty[klíčJména] : null
const starýÚčet = NačístJSON(klíčStaréhoÚčtu, null)
const platnýStarýÚčet = starýÚčet?.jméno &&
    starýÚčet?.heslo &&
    NormalizovatJméno(starýÚčet.jméno) === klíčJména
    ? starýÚčet
    : null

if (přihlášenéJméno && (účet?.jméno || platnýStarýÚčet)) {
    const jméno = účet?.jméno || platnýStarýÚčet.jméno
    document.querySelectorAll('.JménoUživatele').forEach(prvek => {
        prvek.textContent = jméno
    })
} else {
    sessionStorage.removeItem(klíčPřihlášenéhoUživatele)
    localStorage.removeItem(klíčPřihlášenéhoUživatele)
}

let aktivníÚčet = účet?.jméno ? účet : platnýStarýÚčet
const formulářZměnyHesla = document.getElementById('ZměnaHeslaForm')
const formulářOdstraněníÚčtu = document.getElementById('OdstraněníÚčtuForm')

formulářZměnyHesla.addEventListener('submit', ZměnitHeslo)
formulářOdstraněníÚčtu.addEventListener('submit', OdstranitÚčet)
document.getElementById('SmazatPosledniZaznam').addEventListener('click', SmazatPosledniZaznam)
document.getElementById('SoutezTlacitko').addEventListener('click', PřepnoutSoutěž)
document.getElementById('AktualizovatData').addEventListener('click', AktualizovatData)
document.getElementById('SmazatVsechnyZaznamy').addEventListener('click', SmazatVsechnyZaznamy)
AktualizovatTextSoutěže()

function KlíčZáznamůUživatele(){
    return `${předponaZáznamů}${klíčJména}`
}

function NačístZáznamy(){
    const klíč = KlíčZáznamůUživatele()
    const uloženéZáznamy = localStorage.getItem(klíč)
    if (uloženéZáznamy) {
        const záznamy = JSON.parse(uloženéZáznamy)
        if (!záznamy || typeof záznamy !== 'object' || Array.isArray(záznamy)) {
            throw new Error('Záznamy mají neplatný formát.')
        }
        return { klíč, záznamy }
    }

    if (platnýStarýÚčet) {
        const staréZáznamy = localStorage.getItem(klíčStarýchZáznamů)
        if (staréZáznamy) {
            const záznamy = JSON.parse(staréZáznamy)
            if (!záznamy || typeof záznamy !== 'object' || Array.isArray(záznamy)) {
                throw new Error('Staré záznamy mají neplatný formát.')
            }
            return { klíč: klíčStarýchZáznamů, záznamy }
        }
    }

    return { klíč, záznamy: {} }
}

function ZobrazitRychlouZprávu(text){
    document.getElementById('RychleZmenyZprava').textContent = text
}

function SmazatPosledniZaznam(){
    if (!aktivníÚčet) {
        ZobrazitRychlouZprávu('Pro úpravu záznamů se nejprve přihlaste.')
        return
    }

    try {
        const { klíč, záznamy } = NačístZáznamy()
        const datum = Object.keys(záznamy).sort().pop()
        if (!datum) {
            ZobrazitRychlouZprávu('Nemáte žádné záznamy ke smazání.')
            return
        }

        delete záznamy[datum]
        if (Object.keys(záznamy).length) {
            localStorage.setItem(klíč, JSON.stringify(záznamy))
        } else {
            localStorage.removeItem(klíč)
        }
        ZobrazitRychlouZprávu(`Záznam ze dne ${datum} byl smazán.`)
    } catch {
        ZobrazitRychlouZprávu('Záznam se nepodařilo smazat.')
    }
}

function SmazatVsechnyZaznamy(){
    if (!aktivníÚčet) {
        ZobrazitRychlouZprávu('Pro úpravu záznamů se nejprve přihlaste.')
        return
    }
    if (!window.confirm('Opravdu chcete smazat všechny své záznamy? Tuto akci nelze vrátit.')) return

    try {
        localStorage.removeItem(KlíčZáznamůUživatele())
        if (platnýStarýÚčet) localStorage.removeItem(klíčStarýchZáznamů)
        ZobrazitRychlouZprávu('Všechny vaše záznamy byly smazány.')
    } catch {
        ZobrazitRychlouZprávu('Záznamy se nepodařilo smazat.')
    }
}

function AktualizovatTextSoutěže(){
    document.getElementById('SoutezTlacitko').textContent =
        aktivníÚčet?.soutěžící === false ? 'Vrátit se do soutěže' : 'Odejít ze soutěže'
}

function PřepnoutSoutěž(){
    if (!aktivníÚčet) {
        ZobrazitRychlouZprávu('Pro změnu účasti v soutěži se nejprve přihlaste.')
        return
    }

    try {
        const aktualizovanýÚčet = {
            ...aktivníÚčet,
            soutěžící: aktivníÚčet.soutěžící === false
        }
        const aktualizovanéÚčty = { ...účty, [klíčJména]: aktualizovanýÚčet }
        localStorage.setItem(klíčÚčtů, JSON.stringify(aktualizovanéÚčty))
        if (platnýStarýÚčet) {
            localStorage.setItem(klíčStaréhoÚčtu, JSON.stringify(aktualizovanýÚčet))
            Object.assign(platnýStarýÚčet, aktualizovanýÚčet)
        }
        Object.assign(účty, aktualizovanéÚčty)
        aktivníÚčet = aktualizovanýÚčet
        AktualizovatTextSoutěže()
        ZobrazitRychlouZprávu(
            aktivníÚčet.soutěžící ? 'Znovu jste se připojili do soutěže.' : 'Ze soutěže jste odešli.'
        )
    } catch {
        ZobrazitRychlouZprávu('Účast v soutěži se nepodařilo změnit.')
    }
}

function AktualizovatData(){
    window.location.href = 'Ctenik.html'
}

function ZměnitHeslo(event){
    event.preventDefault()
    const zpráva = document.getElementById('ZměnaHeslaZpráva')
    const aktuálníHeslo = document.getElementById('AktuálníHeslo').value
    const novéHeslo = document.getElementById('NovéHeslo').value
    const novéHesloZnovu = document.getElementById('NovéHesloZnovu').value

    if (!aktivníÚčet || !přihlášenéJméno) {
        zpráva.textContent = 'Pro změnu hesla se nejprve přihlaste.'
        return
    }
    if (aktuálníHeslo !== aktivníÚčet.heslo) {
        zpráva.textContent = 'Zadané heslo není správné.'
        return
    }
    if (novéHeslo !== novéHesloZnovu) {
        zpráva.textContent = 'Nová hesla se musí shodovat.'
        return
    }

    const aktualizovanýÚčet = { ...aktivníÚčet, heslo: novéHeslo }
    let původníDataÚčtů

    try {
        původníDataÚčtů = localStorage.getItem(klíčÚčtů)
        localStorage.setItem(klíčÚčtů, JSON.stringify({
            ...účty,
            [klíčJména]: aktualizovanýÚčet
        }))
        if (platnýStarýÚčet) {
            localStorage.setItem(klíčStaréhoÚčtu, JSON.stringify(aktualizovanýÚčet))
        }
        účty[klíčJména] = aktualizovanýÚčet
        aktivníÚčet = aktualizovanýÚčet
        if (platnýStarýÚčet) Object.assign(platnýStarýÚčet, aktualizovanýÚčet)
        formulářZměnyHesla.reset()
        zpráva.textContent = 'Heslo bylo změněno.'
    } catch {
        if (původníDataÚčtů === undefined) {
            zpráva.textContent = 'Data účtu nelze načíst. Heslo nebylo změněno.'
            return
        }
        try {
            if (původníDataÚčtů === null) {
                localStorage.removeItem(klíčÚčtů)
            } else {
                localStorage.setItem(klíčÚčtů, původníDataÚčtů)
            }
            zpráva.textContent = 'Heslo se nepodařilo uložit. Zkuste to prosím znovu.'
        } catch {
            zpráva.textContent = 'Uložení hesla selhalo a původní data účtu se nepodařilo obnovit.'
        }
    }
}

function OdstranitÚčet(event){
    event.preventDefault()
    const zpráva = document.getElementById('OdstraněníÚčtuZpráva')
    const heslo = document.getElementById('HesloProOdstranění').value
    const hesloZnovu = document.getElementById('HesloProOdstraněníZnovu').value

    if (!aktivníÚčet || !přihlášenéJméno) {
        zpráva.textContent = 'Pro odstranění účtu se nejprve přihlaste.'
        return
    }
    if (heslo !== aktivníÚčet.heslo) {
        zpráva.textContent = 'Zadané heslo není správné.'
        return
    }
    if (heslo !== hesloZnovu) {
        zpráva.textContent = 'Zadaná hesla se musí shodovat.'
        return
    }
    if (!window.confirm('Opravdu chcete účet odstranit? Smazání všech dat nelze vrátit.')) {
        return
    }

    try {
        const klíčZáznamůUživatele = `${předponaZáznamů}${klíčJména}`
        localStorage.removeItem(klíčZáznamůUživatele)

        if (platnýStarýÚčet) {
            localStorage.removeItem(klíčStarýchZáznamů)
            localStorage.removeItem(klíčStaréhoÚčtu)
        }

        const aktualizovanéÚčty = { ...účty }
        delete aktualizovanéÚčty[klíčJména]
        localStorage.setItem(klíčÚčtů, JSON.stringify(aktualizovanéÚčty))
        sessionStorage.removeItem(klíčPřihlášenéhoUživatele)
        localStorage.removeItem(klíčPřihlášenéhoUživatele)
        window.alert('Účet a všechna jeho data byla odstraněna.')
        window.location.href = 'Ctenik.html'
    } catch {
        zpráva.textContent = 'Účet nebo všechna data se nepodařilo odstranit. Zkuste to prosím znovu.'
    }
}
