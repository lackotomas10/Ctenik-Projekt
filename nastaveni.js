const config = window.CTENIK_SUPABASE_CONFIG
const client = window.supabase?.createClient && config?.url && config?.publicKey
    ? window.supabase.createClient(config.url, config.publicKey)
    : null

let authUser = null
let profile = null

const rychláZpráva = document.getElementById('RychleZmenyZprava')
const změnaHeslaZpráva = document.getElementById('ZměnaHeslaZpráva')
const smazáníÚčtuZpráva = document.getElementById('SmazáníÚčtuZpráva')
const změnaJménaZpráva = document.getElementById('ZměnaJménaZpráva')
const smazatÚčetTlačítko = document.getElementById('SmazatÚčet')
const změnitJménoTlačítko = document.getElementById('ZměnitJméno')

function ZobrazitRychlouZprávu(text){
    rychláZpráva.textContent = text
}

function ZobrazitChybu(chyba, kontext){
    console.error(kontext, chyba)
    ZobrazitRychlouZprávu('Operaci se nepodařilo dokončit. Zkuste to znovu.')
}

async function NačístÚčet(){
    if (!client) {
        ZobrazitRychlouZprávu('Připojení k Supabase není nakonfigurováno.')
        return
    }

    const { data: { session }, error: chybaRelace } = await client.auth.getSession()
    if (chybaRelace) {
        ZobrazitChybu(chybaRelace, 'Relaci Supabase se nepodařilo načíst.')
        return
    }
    if (!session?.user) {
        ZobrazitRychlouZprávu('Pro správu účtu se nejprve přihlaste.')
        document.querySelectorAll('.nastaveniFormul button').forEach(tlačítko => {
            tlačítko.disabled = true
        })
        smazáníÚčtuZpráva.textContent = 'Pro smazání účtu se nejprve přihlaste.'
        return
    }

    authUser = session.user
    const { data, error } = await client
        .from('profiles')
        .select('display_name, competition_enabled')
        .eq('id', authUser.id)
        .single()
    if (error) {
        ZobrazitChybu(error, 'Profil uživatele se nepodařilo načíst.')
        return
    }

    profile = data
    document.querySelectorAll('.JménoUživatele').forEach(prvek => {
        prvek.textContent = profile.display_name
    })
    smazatÚčetTlačítko.disabled = false
    změnitJménoTlačítko.disabled = false
    AktualizovatTextSoutěže()
}

document.getElementById('SmazatPosledniZaznam').addEventListener('click', SmazatPosledniZaznam)
document.getElementById('SoutezTlacitko').addEventListener('click', PřepnoutSoutěž)
document.getElementById('AktualizovatData').addEventListener('click', () => {
    window.location.href = 'Ctenik.html'
})
document.getElementById('SmazatVsechnyZaznamy').addEventListener('click', SmazatVsechnyZaznamy)
document.getElementById('ZměnaHeslaForm').addEventListener('submit', ZměnitHeslo)
document.getElementById('SmazáníÚčtuForm').addEventListener('submit', SmazatÚčet)
document.getElementById('ZměnaJménaForm').addEventListener('submit', ZměnitJméno)

NačístÚčet().catch(chyba => ZobrazitChybu(chyba, 'Nastavení uživatele se nepodařilo načíst.'))

async function SmazatPosledniZaznam(){
    if (!authUser) {
        ZobrazitRychlouZprávu('Pro úpravu záznamů se nejprve přihlaste.')
        return
    }

    const { data, error: chybaNačtení } = await client
        .from('reading_entries')
        .select('entry_date')
        .eq('user_id', authUser.id)
        .order('entry_date', { ascending: false })
        .limit(1)
        .maybeSingle()
    if (chybaNačtení) {
        ZobrazitChybu(chybaNačtení, 'Poslední záznam se nepodařilo najít.')
        return
    }
    if (!data) {
        ZobrazitRychlouZprávu('Nemáte žádné záznamy ke smazání.')
        return
    }

    const { error } = await client
        .from('reading_entries')
        .delete()
        .eq('user_id', authUser.id)
        .eq('entry_date', data.entry_date)
    if (error) {
        ZobrazitChybu(error, 'Poslední záznam se nepodařilo smazat.')
        return
    }
    ZobrazitRychlouZprávu(`Záznam ze dne ${data.entry_date} byl smazán.`)
}

async function SmazatVsechnyZaznamy(){
    if (!authUser) {
        ZobrazitRychlouZprávu('Pro úpravu záznamů se nejprve přihlaste.')
        return
    }
    if (!window.confirm('Opravdu chcete smazat všechny své záznamy? Tuto akci nelze vrátit.')) return

    const { error } = await client
        .from('reading_entries')
        .delete()
        .eq('user_id', authUser.id)
    if (error) {
        ZobrazitChybu(error, 'Záznamy se nepodařilo smazat.')
        return
    }
    ZobrazitRychlouZprávu('Všechny vaše záznamy byly smazány.')
}

function AktualizovatTextSoutěže(){
    if (profile) {
        document.getElementById('SoutezTlacitko').textContent =
            profile.competition_enabled ? 'Odejít ze soutěže' : 'Vrátit se do soutěže'
    }
}

async function PřepnoutSoutěž(){
    if (!authUser || !profile) {
        ZobrazitRychlouZprávu('Pro změnu účasti v soutěži se nejprve přihlaste.')
        return
    }

    const účast = !profile.competition_enabled
    const { data, error } = await client
        .from('profiles')
        .update({ competition_enabled: účast })
        .eq('id', authUser.id)
        .select('display_name, competition_enabled')
        .single()
    if (error) {
        ZobrazitChybu(error, 'Účast v soutěži se nepodařilo změnit.')
        return
    }
    profile = data
    AktualizovatTextSoutěže()
    ZobrazitRychlouZprávu(účast ? 'Znovu jste se připojili do soutěže.' : 'Ze soutěže jste odešli.')
}

async function ZměnitHeslo(event){
    event.preventDefault()
    if (!client || !authUser) {
        změnaHeslaZpráva.textContent = 'Pro změnu hesla se nejprve přihlaste.'
        return
    }

    const novéHeslo = document.getElementById('NovéHeslo').value
    const novéHesloZnovu = document.getElementById('NovéHesloZnovu').value
    if (novéHeslo !== novéHesloZnovu) {
        změnaHeslaZpráva.textContent = 'Nová hesla se musí shodovat.'
        return
    }

    const { error } = await client.auth.updateUser({ password: novéHeslo })
    if (error) {
        console.error('Heslo Supabase se nepodařilo změnit.', error)
        změnaHeslaZpráva.textContent = 'Heslo se nepodařilo změnit. Zkuste to znovu.'
        return
    }
    document.getElementById('ZměnaHeslaForm').reset()
    změnaHeslaZpráva.textContent = 'Heslo bylo změněno.'
}

async function ZměnitJméno(event){
    event.preventDefault()
    if (!client || !authUser?.email || !profile) {
        změnaJménaZpráva.textContent = 'Pro změnu jména se nejprve přihlaste.'
        return
    }

    const novéJméno = document.getElementById('NovéJméno').value.trim()
    const email = document.getElementById('PotvrzovacíEmailJména').value.trim()
    const heslo = document.getElementById('PotvrzovacíHesloJména').value
    if (!novéJméno || novéJméno.length > 40) {
        změnaJménaZpráva.textContent = 'Zadejte jméno o délce 1 až 40 znaků.'
        return
    }
    if (email.toLocaleLowerCase('en-US') !== authUser.email.toLocaleLowerCase('en-US')) {
        změnaJménaZpráva.textContent = 'Zadaný e-mail neodpovídá přihlášenému účtu.'
        return
    }

    změnitJménoTlačítko.disabled = true
    změnaJménaZpráva.textContent = 'Ověřuji účet…'
    try {
        const { data: ověření, error: chybaOvěření } = await client.auth.signInWithPassword({
            email,
            password: heslo
        })
        if (chybaOvěření || ověření.user?.id !== authUser.id) {
            if (chybaOvěření) console.error('Účet se nepodařilo ověřit pro změnu jména.', chybaOvěření)
            změnaJménaZpráva.textContent = 'E-mail nebo heslo není správné.'
            return
        }

        const { data, error } = await client
            .from('profiles')
            .update({ display_name: novéJméno })
            .eq('id', authUser.id)
            .select('display_name, competition_enabled')
            .single()
        if (error) {
            console.error('Jméno profilu se nepodařilo uložit.', error)
            změnaJménaZpráva.textContent = 'Jméno se nepodařilo uložit. Zkuste to znovu.'
            return
        }

        profile = data
        document.querySelectorAll('.JménoUživatele').forEach(prvek => {
            prvek.textContent = profile.display_name
        })
        document.getElementById('ZměnaJménaForm').reset()
        změnaJménaZpráva.textContent = 'Jméno bylo změněno.'
    } catch (chyba) {
        console.error('Jméno profilu se nepodařilo změnit.', chyba)
        změnaJménaZpráva.textContent = 'Změnu jména se nepodařilo dokončit. Zkuste to znovu.'
    } finally {
        změnitJménoTlačítko.disabled = false
    }
}

async function SmazatÚčet(event){
    event.preventDefault()
    if (!client || !authUser?.email) {
        smazáníÚčtuZpráva.textContent = 'Přihlášený účet se nepodařilo ověřit.'
        return
    }

    const potvrzovacíEmail = document.getElementById('PotvrzovacíEmail').value.trim()
    if (potvrzovacíEmail.toLocaleLowerCase('en-US') !== authUser.email.toLocaleLowerCase('en-US')) {
        smazáníÚčtuZpráva.textContent = 'Zadaný e-mail neodpovídá přihlášenému účtu.'
        return
    }
    if (!window.confirm(
        'Opravdu chcete trvale smazat účet a všechny své záznamy čtení? Tuto akci nelze vrátit.'
    )) return

    smazatÚčetTlačítko.disabled = true
    smazáníÚčtuZpráva.textContent = 'Mažu účet a jeho data…'
    try {
        const { error } = await client.functions.invoke('delete-account', { method: 'POST' })
        if (error) throw error
    } catch (chyba) {
        console.error('Účet se nepodařilo smazat.', chyba)
        smazáníÚčtuZpráva.textContent =
            'Účet se nepodařilo smazat. Zkontrolujte nasazení serverové funkce a zkuste to znovu.'
        smazatÚčetTlačítko.disabled = false
        return
    }

    try {
        localStorage.removeItem(`ctenikZáznamy:${authUser.id}`)
        localStorage.removeItem(`ctenikZáznamy:${profile.display_name.trim().toLocaleLowerCase('cs-CZ')}`)
    } catch (chybaÚložiště) {
        console.error('Místní kopii záznamů se nepodařilo odstranit.', chybaÚložiště)
    }

    try {
        const { error } = await client.auth.signOut({ scope: 'local' })
        if (error) console.error('Místní relaci se nepodařilo ukončit po smazání účtu.', error)
    } catch (chybaOdhlášení) {
        console.error('Místní relaci se nepodařilo ukončit po smazání účtu.', chybaOdhlášení)
    }
    window.location.replace('Ctenik.html')
}
