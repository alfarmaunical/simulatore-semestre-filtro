/**
 * Simulatore Semestre Filtro · ALFARMA
 * Riceve i risultati delle simulazioni e li scrive in questo Foglio Google.
 *
 * Fogli creati in automatico:
 *  - Risultati : una riga per ogni simulazione consegnata
 *  - Errori    : una riga per ogni argomento sbagliato o lasciato in bianco
 *  - Riepilogo : classifiche per materia, simulazioni al giorno, argomenti più sbagliati
 *
 * Pubblicazione: Distribuisci → Nuovo deployment → tipo "App web"
 *   Esegui come: Me · Chi ha accesso: Chiunque
 */

// ID del Foglio Google (la parte tra /d/ e /edit nell'indirizzo). Vuoto = foglio a cui è collegato lo script.
const ID_FOGLIO = '1pOO1oP7dk3PJB8HEGa25GV0t4-7_VLN7j546-RulAmI';
function foglio() { return ID_FOGLIO ? SpreadsheetApp.openById(ID_FOGLIO) : SpreadsheetApp.getActiveSpreadsheet(); }

const MATERIE = { chem: 'Chimica', fis: 'Fisica', bio: 'Biologia' };
const INTESTAZIONE = ['Data', 'Codice', 'Nome', 'Materia', 'Tipo', 'Punteggio', 'Esatte', 'Errate', 'Omesse', 'Minuti', 'Argomenti da rivedere', 'ID prova'];

/* ---------- riceve un risultato dal sito ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (!valido(d)) return testo('scartato');

    // la stessa prova inviata due volte viene registrata una sola volta
    const cache = CacheService.getScriptCache();
    if (cache.get('id_' + d.id)) return testo('doppione');

    const ss = foglio();
    prepara(ss);
    const data = new Date(Number(d.date) || Date.now());
    const materia = MATERIE[d.s];
    const argomenti = (d.weak || []).slice(0, 20).map(pulisci);

    ss.getSheetByName('Risultati').appendRow([
      data, d.code, pulisci(d.name), materia, d.hard ? 'Difficile' : 'Standard',
      Number(d.score), d.correct, d.wrong, d.omitted, Math.round(Number(d.dur) / 60000),
      argomenti.join(' · '), pulisci(d.id)
    ]);
    if (argomenti.length) {
      const err = ss.getSheetByName('Errori');
      err.getRange(err.getLastRow() + 1, 1, argomenti.length, 4)
         .setValues(argomenti.map(a => [data, d.code, materia, a]));
    }
    cache.put('id_' + d.id, '1', 21600);
    cache.remove('classifica');
    return testo('ok');
  } catch (err) {
    return testo('errore');
  } finally {
    lock.releaseLock();
  }
}

/* ---------- restituisce la classifica generale (solo codici, mai i nomi) ---------- */
function doGet(e) {
  const cache = CacheService.getScriptCache();
  let json = cache.get('classifica');
  if (!json) {
    const ss = foglio();
    prepara(ss);
    const righe = ss.getSheetByName('Risultati').getDataRange().getValues().slice(1);
    const inv = { Chimica: 'chem', Fisica: 'fis', Biologia: 'bio' };
    const out = { chem: {}, fis: {}, bio: {} };
    righe.forEach(r => {
      const s = inv[r[3]], code = r[1], p = Number(r[5]);
      if (!s || !code || isNaN(p)) return;
      const x = out[s][code] = out[s][code] || { code, best: -99, sum: 0, n: 0, pass: 0, last: 0 };
      x.best = Math.max(x.best, p); x.sum += p; x.n++; if (p >= 18) x.pass++;
      x.last = Math.max(x.last, new Date(r[0]).getTime() || 0);
    });
    const res = { t: Date.now() };
    Object.keys(out).forEach(s => {
      res[s] = Object.values(out[s])
        .sort((a, b) => b.best - a.best || b.sum / b.n - a.sum / a.n || a.last - b.last)
        .slice(0, 200)
        .map(x => ({ code: x.code, best: x.best, avg: Math.round(x.sum / x.n * 100) / 100, n: x.n, pass: x.pass }));
    });
    json = JSON.stringify(res);
    cache.put('classifica', json, 60);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- controlli sui dati in arrivo ---------- */
function valido(d) {
  if (!d || !MATERIE[d.s]) return false;
  if (!/^AF-[A-Z0-9]{4}$/.test(String(d.code))) return false;
  if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 40) return false;
  const sc = Number(d.score);
  if (isNaN(sc) || sc < -3.1 || sc > 31) return false;
  const n = [d.correct, d.wrong, d.omitted].map(Number);
  if (n.some(v => !Number.isInteger(v) || v < 0 || v > 31) || n[0] + n[1] + n[2] !== 31) return false;
  if (Math.abs(n[0] - n[1] * 0.1 - sc) > 0.01) return false;
  return typeof d.id === 'string' && d.id.length <= 40;
}

// evita che un testo venga interpretato come formula dal foglio
function pulisci(v) {
  const s = String(v == null ? '' : v).slice(0, 120);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function testo(t) { return ContentService.createTextOutput(t); }

/* ---------- crea i fogli e le formule la prima volta ---------- */
function prepara(ss) {
  let r = ss.getSheetByName('Risultati');
  if (!r) {
    r = ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0 ? ss.getSheets()[0].setName('Risultati') : ss.insertSheet('Risultati');
    r.appendRow(INTESTAZIONE);
    r.setFrozenRows(1);
    r.getRange(1, 1, 1, INTESTAZIONE.length).setFontWeight('bold').setBackground('#0d2f52').setFontColor('#ffffff');
    r.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm');
    r.setColumnWidth(11, 420);
  }
  let e = ss.getSheetByName('Errori');
  if (!e) {
    e = ss.insertSheet('Errori');
    e.appendRow(['Data', 'Codice', 'Materia', 'Argomento']);
    e.setFrozenRows(1);
    e.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#0d2f52').setFontColor('#ffffff');
    e.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm');
  }
  if (!ss.getSheetByName('Riepilogo')) {
    const p = ss.insertSheet('Riepilogo', 0);
    const titolo = (cella, t) => p.getRange(cella).setValue(t).setFontWeight('bold').setFontSize(12).setFontColor('#0d2f52');
    let col = 1;
    ['Chimica', 'Fisica', 'Biologia'].forEach(m => {
      titolo(p.getRange(1, col).getA1Notation(), 'Classifica ' + m);
      p.getRange(2, col).setFormula(
        `=IFERROR(QUERY(Risultati!B:F,"select B, C, max(F), avg(F), count(F) where D = '${m}' group by B, C order by max(F) desc label B 'Codice', C 'Nome', max(F) 'Migliore', avg(F) 'Media', count(F) 'Prove'",1),"Ancora nessuna prova")`);
      col += 6;
    });
    titolo('S1', 'Simulazioni al giorno');
    p.getRange('S2').setFormula(`=IFERROR(QUERY(Risultati!A:D,"select toDate(A), count(A) where A is not null group by toDate(A) order by toDate(A) desc label toDate(A) 'Giorno', count(A) 'Prove'",1),"—")`);
    titolo('V1', 'Argomenti più sbagliati');
    p.getRange('V2').setFormula(`=IFERROR(QUERY(Errori!C:D,"select C, D, count(D) where D is not null group by C, D order by count(D) desc limit 40 label C 'Materia', D 'Argomento', count(D) 'Volte'",1),"—")`);
    p.setFrozenRows(2);
  }
}

/* ---------- da eseguire una volta dall'editor: crea i fogli e chiede le autorizzazioni ---------- */
function inizializza() { prepara(foglio()); }
