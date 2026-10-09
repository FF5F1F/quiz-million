/* Versioned storage boundaries. Persisted JSON is untrusted input. */
(function(root){'use strict';
class QuizStore {
 constructor(storage){this.storage=storage;this.memory=new Map();this.failedWrites=new Set();this.available=!!storage;}
 read(key){if(this.failedWrites.has(key))return this.memory.get(key);try{const raw=this.storage?.getItem(key);if(raw!=null){const value=JSON.parse(raw);this.memory.set(key,value);return value;}}catch{this.available=false;}return this.memory.get(key);}
 write(key,value){this.memory.set(key,value);try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem(key,JSON.stringify(value));this.failedWrites.delete(key);}catch{this.available=false;this.failedWrites.add(key);}}
 record(mode){const r=this.read('quiz-million-'+mode);return {prize:Number.isInteger(r?.prize)&&r.prize>=0&&r.prize<=10000000?r.prize:0,correct:Number.isInteger(r?.correct)&&r.correct>=0&&r.correct<=15?r.correct:0};}
 saveRecord(mode,prize,correct){const old=this.record(mode);this.write('quiz-million-'+mode,{prize:Math.max(old.prize,prize),correct:Math.max(old.correct,correct)});}
 history(mode,difficulty,validIds){const raw=this.read(`quiz-million-history-v1-${mode}-${difficulty}`);return Array.isArray(raw)?[...new Set(raw.filter(id=>typeof id==='string'&&validIds.includes(id)))]:[];}
 markSeen(mode,difficulty,id,validIds){let ids=this.history(mode,difficulty,validIds);if(ids.length>=validIds.length)ids=[];if(!ids.includes(id))ids.push(id);this.write(`quiz-million-history-v1-${mode}-${difficulty}`,ids);}
}
root.QuizStore=QuizStore;if(typeof module!=='undefined')module.exports=QuizStore;
})(typeof window!=='undefined'?window:globalThis);
