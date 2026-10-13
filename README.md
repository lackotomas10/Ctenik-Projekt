Toto je projekt WEBových stránek.
cíl: vytvořit platformu pro čtení
přiučit se něco nové ohledně git hubu, js, html a css

## Supabase – první nastavení databáze

Databáze projektu je PostgreSQL v Supabase. Základní tabulky, ochranu pomocí
Row Level Security (RLS) a vytvoření profilu po registraci připravuje
[`supabase/schema.sql`](./supabase/schema.sql).

1. Jednorázové tabulky a RLS připravuje `supabase/schema.sql` (pokud už tabulky
   existují, tento soubor znovu nespouštěj).
2. Otevři **SQL Editor → New query** a spusť `supabase/leaderboard.sql`. Tento
   bezpečně opakovatelný skript zajistí také trigger, který vytváří profily při
   registraci, a doplní profily případných již existujících Auth uživatelů.
3. V **Table Editor** ověř tabulky `profiles` a `reading_entries` a že u obou svítí RLS.
4. Funkce pro tabulku ligy vrací
   pouze pozici, zobrazované jméno a souhrn minut/řady účastníků; e-mail ani
   jednotlivé záznamy nevystavuje.

Po registraci přes Supabase Auth se automaticky vytvoří profil. Přezdívku je
potřeba při registraci poslat jako `display_name` v uživatelských metadatech.
Hesla z původního `localStorage` se do databáze nepřenášejí. Nikdy nevkládej
`service_role` klíč do klientského JavaScriptu ani do Git repozitáře.

### Konfigurace připojení webu

Lokální soubor `supabase-config.js` obsahuje URL projektu a veřejný
publishable/anon klíč. Je záměrně uveden v `.gitignore`; skutečné hodnoty
neukládej do sdíleného repozitáře.

V Supabase najdi **Project Settings → API** (v některých verzích dashboardu
**API Keys**). Zkopíruj **Project URL** a **Publishable key** (nebo legacy
`anon` public key) do odpovídajících hodnot v lokálním souboru. Klíč
`service_role`/secret key není určen do prohlížeče a nikdy se tam nevkládá.

### E-mailové přihlášení

Na domovské stránce se registrace a přihlášení ověřují přes Supabase Auth.
Registrace ukládá přezdívku jako `display_name`; ověřovací e-mail se posílá
na aktuální adresu stránky. V Supabase **Authentication → URL Configuration**
musí být tato adresa povolená v **Redirect URLs** a **Site URL**. Při lokálním
vývoji používej lokální HTTP server (ne `file://`) a přidej jeho přesnou adresu,
například `http://localhost:5500/Ctenik.html`, do Redirect URLs.

Denní záznamy, nastavení účasti v soutěži a žebříček používají Supabase.
Při prvním přihlášení nabídne aplikace import starých záznamů z localStorage
jen pokud pro aktuální profil nenajde záznamy v databázi; místní kopie zůstává
zachována. Hesla a staré účty se nepřenášejí. Změna hesla používá Supabase Auth.
Účet lze smazat v nastavení: serverová Edge Function ověří přihlášenou relaci
a odstraní Auth účet. Vazby v databázi mají `on delete cascade`, takže se
s účtem smaže i profil a jeho záznamy. Před použitím funkce ji nasaď do stejného
Supabase projektu:

```powershell
supabase login
supabase link --project-ref <project-ref>
supabase functions deploy delete-account
```

Edge Function používá `SUPABASE_URL` a `SUPABASE_SERVICE_ROLE_KEY` dostupné
v prostředí Supabase. Service role klíč nikdy nevkládej do webu, konfiguračního
souboru projektu ani do Git repozitáře. Po nasazení v nastavení zadej e-mail
přihlášeného účtu pro potvrzení; smazání účtu i dat je nevratné.
