const dnes = new Date();
const yyyy = dnes.getFullYear();
const mm = String(dnes.getMonth() + 1).padStart(2, '0');
const dd = String(dnes.getDate()).padStart(2, '0');

document.getElementById('Datum').value = `${yyyy}-${mm}-${dd}`;

let ZáznDatum = `${yyyy}-${mm}-${dd}`
let Minuty = 0
let Dočtení = 0
let Přihlášení = Boolean(localStorage.getItem('ctenikPrihlasenýUživatel'))

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
    ZáznDatum = document.getElementById("Datum").value //čtení zadaných hodnot funguje, přidat databázi a práci s hodnotami
    Minuty = document.getElementById("MinČtení").value // jako funkce která aktualizuje stat. a přehled
    Dočtení = document.getElementById("Dočtení").checked
    Aktualizace()
}

function Přihlásit(){
    if (Přihlášení) {
        localStorage.removeItem('ctenikPrihlasenýUživatel')
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

function PřihlášeníOdeslat(event){
    event.preventDefault()
    const jméno = document.getElementById('PřihlašovacíJméno').value.trim()
    const heslo = document.getElementById('PřihlašovacíHeslo').value
    const účet = JSON.parse(localStorage.getItem('ctenikÚčet') || 'null')
    const chyba = document.getElementById('PřihlášeníChyba')

    if (!účet || účet.jméno !== jméno || účet.heslo !== heslo) {
        chyba.innerText = 'Jméno nebo heslo není správně.'
        return
    }

    Přihlášení = true
    if (document.getElementById('ZapamatovatUživatele').checked) {
        localStorage.setItem('ctenikPrihlasenýUživatel', jméno)
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
    if (localStorage.getItem('ctenikÚčet')) {
        chyba.innerText = 'Účet už existuje. Přihlaste se.'
        return
    }

    localStorage.setItem('ctenikÚčet', JSON.stringify({ jméno, heslo }))
    document.getElementById('PřihlašovacíJméno').value = jméno
    document.getElementById('PřihlašovacíHeslo').value = ''
    document.getElementById('RegistraceForm').reset()
    ZobrazitPřihlášení()
}

function Aktualizace(){
    if (Přihlášení == false){
        document.getElementById("AlarmPřihlášení").innerText = "Nejste přihlášni, většina funkcí nebude aktivní"
        document.getElementById("AlarmPřihlášení").style.color = "red"
        document.getElementById("AlarmPřihlášení").style.backgroundColor = "rgb(255, 151, 151)"
        document.getElementById("AlarmPřihlášení").style.borderRadius = "5px"
    } else {
        document.getElementById("AlarmPřihlášení").innerText = ""
        document.getElementById("Minuty").innerText = "Minuty čtení: " + Minuty
        document.getElementById("AlarmPřihlášení").style.backgroundColor = "transparent"
    }
}

