/**
 * Simulatore Semestre Filtro · ALFARMA
 * Riceve i risultati delle simulazioni e li scrive in questo Foglio Google.
 *
 * Fogli creati in automatico:
 *  - Risultati : una riga per ogni simulazione consegnata
 *  - Errori    : una riga per ogni argomento sbagliato o lasciato in bianco
 *  - Riepilogo : classifiche per materia, simulazioni al giorno, argomenti più sbagliati
 *
 *  - Account   : studenti che hanno fatto "Accedi con Google" e i loro progressi salvati
 *
 * Pubblicazione: Distribuisci → Nuovo deployment → tipo "App web"
 *   Esegui come: Me · Chi ha accesso: Chiunque
 */

// ID del Foglio Google (la parte tra /d/ e /edit nell'indirizzo). Vuoto = foglio a cui è collegato lo script.
const ID_FOGLIO = '1pOO1oP7dk3PJB8HEGa25GV0t4-7_VLN7j546-RulAmI';
function foglio() { return ID_FOGLIO ? SpreadsheetApp.openById(ID_FOGLIO) : SpreadsheetApp.getActiveSpreadsheet(); }

// ID client OAuth del progetto Google Cloud "Simulatore ALFARMA" (pulsante "Accedi con Google")
const CLIENT_ID = '218517328475-5ehnot3ma64rnp3a5ppiiermnjo3e1p5.apps.googleusercontent.com';

const MATERIE = { chem: 'Chimica', fis: 'Fisica', bio: 'Biologia' };
const INTESTAZIONE = ['Data', 'Codice', 'Nome', 'Materia', 'Tipo', 'Punteggio', 'Esatte', 'Errate', 'Omesse', 'Minuti', 'Argomenti da rivedere', 'ID prova'];

/* ---------- riceve un risultato dal sito ---------- */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d && d.act) return json(account(d));   // accesso con Google e progressi salvati
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

/* =====================================================================
 * ACCOUNT: "Accedi con Google" e progressi salvati
 * ===================================================================== */
const COL = { sub: 1, email: 2, nome: 3, creato: 4, accesso: 5, token: 6, aggiornato: 7, dati: 8 };
const PEZZO = 45000;      // una cella contiene al massimo 50 000 caratteri
const MAX_PEZZI = 20;

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function account(d) {
  try {
    if (d.act === 'login') return login(d);
    const sh = fogliAccount();
    const riga = rigaDaToken(sh, d.tok);
    if (!riga) return { err: 'auth' };
    if (d.act === 'load') return { ok: 1, p: leggiDati(sh, riga) };
    if (d.act === 'save') {
      if (!d.p || typeof d.p !== 'object') return { err: 'dati' };
      const unito = unisci(d.p, leggiDati(sh, riga) || {});
      scriviDati(sh, riga, unito);
      return { ok: 1, p: unito };
    }
    if (d.act === 'delete') { sh.deleteRow(riga); return { ok: 1 }; }
    return { err: 'azione' };
  } catch (err) {
    return { err: 'server' };
  }
}

function fogliAccount() {
  const ss = foglio();
  let sh = ss.getSheetByName('Account');
  if (!sh) {
    sh = ss.insertSheet('Account');
    const t = ['ID Google', 'Email', 'Nome', 'Creato', 'Ultimo accesso', 'Sessioni', 'Progressi aggiornati', 'Progressi (dati)'];
    sh.appendRow(t);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, t.length).setFontWeight('bold').setBackground('#0d2f52').setFontColor('#ffffff');
    sh.getRange('D:E').setNumberFormat('dd/mm/yyyy hh:mm');
    sh.getRange('G:G').setNumberFormat('dd/mm/yyyy hh:mm');
    sh.hideColumns(COL.token);
  }
  return sh;
}

// verifica il token di Google, crea o ritrova l'account e apre una sessione per questo dispositivo
function login(d) {
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(d.idt || '')), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return { err: 'token' };
  const t = JSON.parse(r.getContentText());
  if (t.aud !== CLIENT_ID) return { err: 'token' };
  if (t.iss !== 'accounts.google.com' && t.iss !== 'https://accounts.google.com') return { err: 'token' };
  if (Number(t.exp) * 1000 < Date.now()) return { err: 'token' };
  if (String(t.email_verified) !== 'true') return { err: 'email' };

  const sh = fogliAccount();
  const ora = new Date();
  const f = sh.getRange('A:A').createTextFinder(String(t.sub)).matchEntireCell(true).findNext();
  let riga = f ? f.getRow() : 0;
  if (!riga) {
    sh.appendRow(["'" + t.sub, pulisci(t.email), pulisci(t.name || ''), ora, ora, '', '', '']);
    riga = sh.getLastRow();
  }
  const tok = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const sess = String(sh.getRange(riga, COL.token).getValue() || '').split(',').filter(Boolean);
  sess.push(hash(tok));
  sh.getRange(riga, COL.email, 1, 1).setValue(pulisci(t.email));
  sh.getRange(riga, COL.accesso).setValue(ora);
  sh.getRange(riga, COL.token).setValue(sess.slice(-10).join(','));   // al massimo 10 dispositivi collegati
  return { ok: 1, tok: tok, email: t.email, name: t.name || '', pic: t.picture || '', p: leggiDati(sh, riga) };
}

function hash(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s).map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function rigaDaToken(sh, tok) {
  if (!tok || String(tok).length < 40) return 0;
  const h = hash(String(tok));
  const f = sh.getRange('F:F').createTextFinder(h).findNext();
  return f ? f.getRow() : 0;
}

function leggiDati(sh, riga) {
  // ogni pezzo è salvato con un "~" davanti, così il foglio non lo scambia per formula o numero
  const v = sh.getRange(riga, COL.dati, 1, MAX_PEZZI).getValues()[0].map(x => String(x).replace(/^~/, '')).join('');
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}

function scriviDati(sh, riga, p) {
  const s = JSON.stringify(p);
  const pezzi = [];
  for (let i = 0; i < s.length; i += PEZZO) pezzi.push('~' + s.slice(i, i + PEZZO));
  if (pezzi.length > MAX_PEZZI) throw new Error('troppi dati');
  while (pezzi.length < MAX_PEZZI) pezzi.push('');
  sh.getRange(riga, COL.dati, 1, MAX_PEZZI).setNumberFormat('@').setValues([pezzi]);
  sh.getRange(riga, COL.aggiornato).setValue(new Date());
}

// unisce i progressi di due dispositivi: prove senza doppioni, per ogni domanda le statistiche più complete
function unisci(a, b) {
  const out = { attempts: [], qs: {}, v: 1 };
  const visti = {};
  (a.attempts || []).concat(b.attempts || []).forEach(x => { if (x && x.id && !visti[x.id]) { visti[x.id] = 1; out.attempts.push(x); } });
  out.attempts.sort((x, y) => x.date - y.date);
  out.attempts = out.attempts.slice(-300);
  out.pr = Object.assign({}, b.pr || {}, a.pr || {});
  const qa = a.qs || {}, qb = b.qs || {};
  Object.keys(qa).concat(Object.keys(qb)).forEach(k => {
    const x = qa[k] || [0, 0, 0, 0], y = qb[k] || [0, 0, 0, 0];
    out.qs[k] = x[0] >= y[0] ? x : y;
  });
  return out;
}
