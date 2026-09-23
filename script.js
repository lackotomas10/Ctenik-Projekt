const dnes = new Date();
const yyyy = dnes.getFullYear();
const mm = String(dnes.getMonth() + 1).padStart(2, '0'); 
const dd = String(dnes.getDate()).padStart(2, '0');

document.getElementById('Datum').value = `${yyyy}-${mm}-${dd}`; 

let ZáznDatum = `${yyyy}-${mm}-${dd}`
let Minuty = 0
let Dočtení = 0
let Přihlášení = false

Aktualizace()

function Záznam(){
    ZáznDatum = document.getElementById("Datum").value //čtení zadaných hodnot funguje, přidat databázi a práci s hodnotami
    Minuty = document.getElementById("MinČtení").value // jako funkce která aktualizuje stat. a přehled
    Dočtení = document.getElementById("Dočtení").value

}

function Přihlásit(){} //Dodělat později

function Aktualizace(){
    if (Přihlášení == false){
        document.getElementById("AlarmPřihlášení").innerText = "Nejste přihlášni, většina funkcí nebude aktivní"
        document.getElementById("AlarmPřihlášení").style.color = "red"
        document.getElementById("AlarmPřihlášení").style.backgroundColor = "rgb(255, 151, 151)"
        document.getElementById("AlarmPřihlášení").style.borderRadius = "5px"

    }
}

