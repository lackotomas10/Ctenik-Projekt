const dnes = new Date();
const yyyy = dnes.getFullYear();
const mm = String(dnes.getMonth() + 1).padStart(2, '0'); 
const dd = String(dnes.getDate()).padStart(2, '0');

document.getElementById('Datum').value = `${yyyy}-${mm}-${dd}`; 

let ZáznDatum = `${yyyy}-${mm}-${dd}`
let Minuty = 0
let Dočtení

function Záznam(){
    ZáznDatum = document.getElementById("Datum").value //čtení zadaných hodnot funguje, přidat databázi a práci s hodnotami
    Minuty = document.getElementById("MinČtení").value // jako funkce která aktualizuje stat. a přehled
    Dočtení = document.getElementById("Dočtení").value



}