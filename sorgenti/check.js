// Controlla la banca domande prima della pubblicazione. Se trova errori, la pubblicazione si ferma.
const fs=require('fs'),path=require('path');process.chdir(__dirname);global.BANK=[];
for(const f of fs.readdirSync('data').filter(f=>f.endsWith('.js')).sort()){
  try{eval(fs.readFileSync(path.join('data',f),'utf8'));}catch(e){console.log(`ERRORE in data/${f}: ${e.message} (controlla virgole, parentesi e virgolette)`);process.exit(1);}
}
const ids=new Set();let errs=0;const cnt={};const err=(id,m)=>{console.log(`ERRORE nella domanda ${id}: ${m}`);errs++;};
for(const q of BANK){
  if(!q||!q.id){err("?","manca l'id");continue;}
  if(ids.has(q.id))err(q.id,"id usato due volte");ids.add(q.id);
  if(!["bio","chem","fis"].includes(q.s))err(q.id,"materia (s) deve essere bio, chem o fis");
  if(!q.q||!q.e||!q.u)err(q.id,"mancano testo (q), spiegazione (e) o unità (u)");
  if(q.c){if(!Array.isArray(q.c)||!q.c.length)err(q.id,"c deve essere un elenco di risposte accettate");
          if(q.q&&!q.q.includes("……"))console.log(`attenzione ${q.id}: nel testo manca lo spazio vuoto "……"`);}
  else{if(!q.o||q.o.length!==5)err(q.id,"servono esattamente 5 opzioni");
       else if(new Set(q.o).size!==5)err(q.id,"due opzioni sono uguali");}
  const k=q.s+(q.c?" completamento":" multipla");cnt[k]=(cnt[k]||0)+1;
}
console.log(cnt);console.log(errs?`${errs} errori: correggili prima di pubblicare.`:`Tutto ok: ${BANK.length} domande.`);
process.exit(errs?1:0);
