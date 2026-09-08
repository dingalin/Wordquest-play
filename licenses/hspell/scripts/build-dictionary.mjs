import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const normal=w=>w.normalize('NFC').replace(/[\u0591-\u05C7]/g,'').replace(/[ךםןףץ]/g,c=>({ך:'כ',ם:'מ',ן:'נ',ף:'פ',ץ:'צ'}[c]));
const dic=fs.readFileSync(path.join(root,'vendor/hspell/index.dic'),'utf8');
const aff=fs.readFileSync(path.join(root,'vendor/hspell/index.aff'),'utf8');
const forms=new Map();
for(const line of dic.split(/\r?\n/).slice(1)){
 const [raw,flags='']=line.split('/');
 if(!/^[א-ת]{2,25}$/.test(raw))continue;
 const word=normal(raw);const mask=[...flags].reduce((m,f)=>m|(1<<(f.charCodeAt(0)-97)),0);
 forms.set(word,(forms.get(word)||0)|mask);
}
const rules=[];
for(const line of aff.split(/\r?\n/)){
 if(!line.startsWith('PFX ')||/^PFX \S+ [YN] /.test(line))continue;
 const [,flag,strip,add,condition]=line.split(/\s+/);
 if(strip!=='0')throw new Error('Unexpected Hspell stripping rule');
 if(!/^[א-ת]+$/.test(add))continue; // Punctuation is not present on the letter board.
 rules.push([normal(add),1<<(flag.charCodeAt(0)-97),condition]);
}
const words=[...forms.keys()].sort();
const packed=words.map(w=>w+'\t'+forms.get(w)).join('\n');
const hash=createHash('sha256').update(dic).digest('hex');
const out=`// Generated from Hspell 1.4. Copyright 2000–2017 Nadav Har'El and Dan Kenigsberg.\n// AGPL-3.0; see ../vendor/hspell/LICENSE and COPYING. Rebuild: node scripts/build-dictionary.mjs\nexport const SOURCE_COUNT=${Number(dic.split(/\r?\n/)[0])};\nexport const SOURCE_SHA256=${JSON.stringify(hash)};\nexport const PACKED=${JSON.stringify(packed)};\nexport const PREFIX_RULES=${JSON.stringify(rules)};\n`;
fs.writeFileSync(path.join(root,'src/dictionary-data.mjs'),out);
console.log(JSON.stringify({sourceForms:Number(dic.split(/\r?\n/)[0]),playableForms:words.length,prefixRules:rules.length,bytes:Buffer.byteLength(out),sha256:hash}));
