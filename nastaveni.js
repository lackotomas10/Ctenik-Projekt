const klíčPřihlášenéhoUživatele = 'ctenikPrihlasenýUživatel'
const klíčÚčtů = 'ctenikÚčty'
const klíčStaréhoÚčtu = 'ctenikÚčet'

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
const účty = načtenéÚčty && typeof načtenéÚčty === 'object' ? načtenéÚčty : {}
const účet = přihlášenéJméno ? účty[NormalizovatJméno(přihlášenéJméno)] : null
const starýÚčet = NačístJSON(klíčStaréhoÚčtu, null)
const platnýStarýÚčet = starýÚčet?.jméno &&
    starýÚčet?.heslo &&
    NormalizovatJméno(starýÚčet.jméno) === NormalizovatJméno(přihlášenéJméno)
    ? starýÚčet
    : null

if (přihlášenéJméno && (účet?.jméno || platnýStarýÚčet)) {
    document.getElementById('JménoUživatele').textContent = účet?.jméno || platnýStarýÚčet.jméno
} else {
    sessionStorage.removeItem(klíčPřihlášenéhoUživatele)
    localStorage.removeItem(klíčPřihlášenéhoUživatele)
}
