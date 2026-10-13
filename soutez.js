const config = window.CTENIK_SUPABASE_CONFIG
const client = window.supabase?.createClient && config?.url && config?.publicKey
    ? window.supabase.createClient(config.url, config.publicKey)
    : null

const výsledky = document.getElementById('VýsledkySoutěže')

function ZobrazitStav(text){
    výsledky.replaceChildren()
    const řádek = document.createElement('tr')
    řádek.className = 'Řádek'
    const buňka = document.createElement('td')
    buňka.className = 'Buňka'
    buňka.colSpan = 4
    buňka.textContent = text
    řádek.append(buňka)
    výsledky.append(řádek)
}

async function AktualizovatNastaveníOdkaz(){
    if (!client) return
    const { data: { session }, error } = await client.auth.getSession()
    if (error) {
        console.error('Stav přihlášení se nepodařilo načíst.', error)
        return
    }
    document.getElementById('NastaveníOdkaz').hidden = !session
}

async function VykreslitSoutěž(){
    if (!client) {
        ZobrazitStav('Tabulka soutěže není nakonfigurována.')
        return
    }
    ZobrazitStav('Načítám výsledky soutěže…')
    const { data, error } = await client.rpc('get_leaderboard')
    if (error) {
        console.error('Žebříček se nepodařilo načíst ze Supabase.', error)
        ZobrazitStav('Výsledky se nepodařilo načíst. Zkuste stránku obnovit.')
        return
    }
    if (!data.length) {
        ZobrazitStav('Zatím nejsou v soutěži žádní účastníci.')
        return
    }

    výsledky.replaceChildren()
    data.forEach(soutěžící => {
        const řádek = document.createElement('tr')
        řádek.className = 'Řádek'
        for (const hodnota of [
            `${soutěžící.rank_position}.`,
            soutěžící.display_name,
            Number(soutěžící.total_minutes).toLocaleString('cs-CZ'),
            String(soutěžící.current_streak)
        ]) {
            const buňka = document.createElement('td')
            buňka.className = 'Buňka'
            buňka.textContent = hodnota
            řádek.append(buňka)
        }
        výsledky.append(řádek)
    })
}

async function DoNastavení(){
    if (!client) {
        window.alert('Připojení k Supabase není nakonfigurováno.')
        return
    }
    const { data: { session }, error } = await client.auth.getSession()
    if (error) {
        console.error('Stav přihlášení se nepodařilo načíst.', error)
        window.alert('Stav přihlášení se nepodařilo ověřit. Zkuste to znovu.')
        return
    }
    if (session) window.location.href = 'Nastavení.html#SoutezTlacitko'
    else window.alert('Nejprve se přihlaste.')
}

VykreslitSoutěž()
AktualizovatNastaveníOdkaz()
client?.auth.onAuthStateChange(() => {
    AktualizovatNastaveníOdkaz().catch(chyba => {
        console.error('Odkaz na nastavení se nepodařilo aktualizovat.', chyba)
    })
})
