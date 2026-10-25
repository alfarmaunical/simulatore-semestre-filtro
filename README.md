# Simulatore Semestre Filtro · ALFARMA

Simulatore gratuito delle prove del semestre filtro (Chimica e Propedeutica Biochimica, Fisica, Biologia), a cura dell'associazione studentesca **ALFARMA** — Instagram [@alfarmaunical](https://www.instagram.com/alfarmaunical/), sede al Polifunzionale dell'UNICAL, di fronte al Poli Bistrot.

Il sito si pubblica da solo: ogni volta che qualcuno salva una modifica su GitHub, le domande vengono controllate e, se è tutto in ordine, il sito si aggiorna in un paio di minuti.

---

## Prima pubblicazione (una volta sola)

1. **Crea un account** su [github.com](https://github.com) (gratis).
2. **Crea il repository**: in alto a destra **+ → New repository**.
   - Nome: per esempio `simulatore` (il sito sarà `https://TUONOME.github.io/simulatore/`)
   - Spunta **Public** (GitHub Pages gratis richiede il repository pubblico)
   - Clicca **Create repository**.
3. **Carica i file**: nella pagina del repository clicca **uploading an existing file**, trascina **tutto il contenuto** della cartella estratta dallo zip (`index.html`, `README.md` e la cartella `sorgenti`) e clicca **Commit changes**.
4. **Aggiungi il file di pubblicazione automatica.** La cartella `.github` è nascosta e spesso non viene trascinata, quindi crealo a mano:
   - **Add file → Create new file**
   - come nome scrivi esattamente `.github/workflows/pubblica.yml`
   - incolla il contenuto del file `pubblica.yml` che trovi nello zip (dentro `.github/workflows/`, oppure la copia `pubblica.yml.txt` nella cartella principale)
   - **Commit changes**.
5. **Attiva il sito**: **Settings → Pages →** alla voce *Source* scegli **GitHub Actions**.
6. Vai nella scheda **Actions**: apri l'ultima esecuzione e premi **Re-run all jobs** se non è partita da sola. Quando diventa verde, il sito è online all'indirizzo mostrato in *Settings → Pages*.

## Aggiungere una persona che gestisce il sito con te

**Settings → Collaborators → Add people** → scrivi il suo nome utente GitHub o la sua email. Dopo che accetta l'invito può modificare tutto e ogni sua modifica pubblica il sito. Puoi toglierlo in qualsiasi momento dalla stessa pagina.

---

## Come si modificano le domande

Tutto si fa dal sito di GitHub, senza installare niente: apri il file, clicca la **matita** (Edit), modifica e premi **Commit changes**.

Le domande sono nei file dentro `sorgenti/data/` (`bio…` = Biologia, `chem…` = Chimica, `fis…` = Fisica). Ogni domanda è una riga.

**Risposta multipla** — la prima opzione è **sempre** quella corretta (il sito le mescola da solo):

```js
{id:"BX001",s:"bio",u:3,q:"Testo della domanda?",o:["corretta","sbagliata 1","sbagliata 2","sbagliata 3","sbagliata 4"],e:"Spiegazione mostrata dopo la risposta."},
```

**Completamento** — nel testo serve lo spazio vuoto `……`; in `c` metti tutte le risposte da accettare:

```js
{id:"BXF001",s:"bio",u:4,q:"L'insieme dei caratteri osservabili si chiama ……",c:["fenotipo"],e:"Spiegazione."},
```

Per una risposta numerica aggiungi `n` (il valore) e, se serve, `tol` (tolleranza relativa, 0.05 = 5%):

```js
{id:"FXF001",s:"fis",u:2,q:"Un corpo che parte da fermo con a = 2 m/s² dopo 3 s ha velocità …… m/s",c:["6"],n:6,e:"v = a·t = 6 m/s."},
```

| Campo | Significato |
|---|---|
| `id` | codice unico, mai ripetuto (usa un prefisso tuo, es. `BX001`) |
| `s` | materia: `bio`, `chem` o `fis` |
| `u` | numero dell'unità del syllabus (Biologia 1-7, Chimica 1-8, Fisica 1-7) |
| `q` | testo della domanda |
| `o` | 5 opzioni, la prima giusta (solo risposta multipla) |
| `c` | risposte accettate (solo completamento) |
| `e` | spiegazione |
| `d:1` | facoltativo: domanda difficile, usata nella simulazione difficile |

**Aggiungere un sinonimo** a una domanda a completamento: cerca il suo `id` nel file e aggiungi il termine dentro `c`, per esempio `c:["satura","saturata"]`.

**Attenzione a virgole e virgolette**: ogni domanda finisce con `},` e i testi stanno tra `"…"`. Se dentro un testo serve una virgoletta doppia usa `«…»`.

## Se qualcosa va storto

Prima di pubblicare, il sito controlla tutte le domande. Se c'è un errore (una virgola mancante, 4 opzioni invece di 5, un `id` ripetuto) **la pubblicazione si ferma e il sito resta com'era**: nessuno studente vede una pagina rotta.

Per capire cosa correggere: scheda **Actions** → l'esecuzione con la **X rossa** → passaggio *Controlla le domande*. Il messaggio dice il file o il codice della domanda da sistemare. Correggi e salva: ripartirà da solo.

Per tornare a una versione precedente di un file: apri il file → **History** → scegli la versione → copia il contenuto e incollalo.

---

## Ricevere i risultati in un Foglio Google

Ogni simulazione d'esame consegnata (solo dagli studenti che danno il consenso) arriva come riga in un Foglio Google dell'associazione. Lo stesso foglio alimenta la **graduatoria generale** del sito, dove compaiono solo i codici.

1. Su [sheets.google.com](https://sheets.google.com), con l'account dell'associazione, crea un **foglio vuoto** e chiamalo per esempio *Risultati simulatore*.
2. Nel foglio: **Estensioni → Apps Script**. Si apre un editor con un file `Codice.gs`: cancella quello che c'è e incolla tutto il contenuto di `google-script/Codice.gs`. Premi l'icona del dischetto per salvare.
3. In alto a destra: **Esegui il deployment → Nuovo deployment**. Clicca l'ingranaggio accanto a *Seleziona tipo* e scegli **App web**.
   - *Esegui come*: **Me**
   - *Chi ha accesso*: **Chiunque**
   - **Esegui il deployment** → Google chiede di autorizzare l'accesso al foglio: scegli il tuo account → *Avanzate* → *Vai a … (non sicuro)* → **Consenti**. L'avviso compare perché lo script è tuo e non è verificato da Google: è normale.
4. Copia l'**URL dell'app web** (finisce con `/exec`).
5. Su GitHub apri `sorgenti/config.js`, clicca la matita e incolla l'indirizzo tra le virgolette:
   `const SHEET_URL="https://script.google.com/macros/s/……/exec";` → **Commit changes**.

Dopo un paio di minuti il sito si aggiorna: prima della prima simulazione compare la casella del consenso, e nel menu in fondo l'*Informativa privacy*. I fogli **Risultati**, **Errori** e **Riepilogo** vengono creati da soli al primo risultato ricevuto.

- **Risultati**: una riga per simulazione (data, codice, nome, materia, punteggio, esatte/errate/omesse, minuti, argomenti da rivedere).
- **Errori**: una riga per ogni argomento sbagliato, per capire su cosa organizzare i ripassi.
- **Riepilogo**: classifica di ogni materia con i nomi, simulazioni al giorno, argomenti più sbagliati da tutti.

Se modifichi lo script, per applicare le modifiche: **Esegui il deployment → Gestisci deployment → matita → Versione: Nuova versione → Esegui il deployment** (l'indirizzo resta lo stesso).

**Informativa privacy.** Il testo è in `sorgenti/app.html` (cerca `const PRIVACY`): controlla in particolare la data entro cui cancellare i dati (31 marzo 2027) e chi ha accesso al foglio. Condividi il foglio solo con chi gestisce l'associazione.

## Altri file (per chi vuole curiosare nel codice)

- `sorgenti/app.html` — l'applicazione (HTML e JavaScript, senza librerie esterne)
- `sorgenti/style.css` — la grafica
- `sorgenti/topics.js` — gli argomenti del *Piano di ripasso*: parole chiave, cosa rivedere, metodo di studio
- `sorgenti/build.py` — unisce tutto in `index.html`
- `sorgenti/check.js` — i controlli sulle domande
- `sorgenti/config.js` — l'indirizzo del Foglio Google che riceve i risultati
- `google-script/Codice.gs` — lo script da incollare nel Foglio Google
- `pubblica.yml.txt` — copia del file di pubblicazione automatica (serve solo per il passaggio 4; dopo puoi cancellarla)

Per provarlo sul computer: `node sorgenti/check.js` e poi `python3 sorgenti/build.py`, quindi apri `index.html` nel browser.

## Privacy

Il sito non chiede registrazioni. I progressi restano nel browser dello studente; nome, codice e risultati delle simulazioni d'esame arrivano al Foglio Google dell'associazione solo se lo studente spunta la casella del consenso. GitHub, che ospita il sito, registra gli indirizzi IP dei visitatori per motivi tecnici e di sicurezza, e i caratteri tipografici vengono caricati da Google Fonts.
