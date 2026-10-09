/* PHONE Ver.5: entirely local rules, persona selection and cancellable call clock.
   No AI/network adapter. The question bank remains authoritative. */
(function(root){'use strict';
const PROFILES=[
 {id:'takuya',name:'TAKUYA',gender:'male',style:'明るい直感派',expert:['スポーツ','生活','文化','IT基礎'],weak:['数学','データベース'],bias:.01,caution:false,delay:1100,rate:1.12,pitch:1.02,color:'#e8ac64',greeting:'もしもし、問題は？',ack:'よし、聞こえた！',lead:'直感では',ask:'問題の大事な言葉をもう少し教えて！'},
 {id:'daichi',name:'DAICHI',gender:'male',style:'落ち着いた論理派',expert:['数学','科学','ネットワーク','プログラミング','データベース'],weak:['芸術','文学'],bias:.04,caution:false,delay:2600,rate:.95,pitch:.95,color:'#73bde1',greeting:'はい、問題を聞かせて。',ack:'条件を整理してみるね。',lead:'条件から考えると',ask:'何を求める問題なのか、具体的な言葉を聞かせて。'},
 {id:'ryo',name:'RYO',gender:'male',style:'勢いのある自信家',expert:['歴史','地理','AWS','クラウド'],weak:['品質管理','文学'],bias:-.04,caution:false,delay:1300,rate:1.08,pitch:.98,color:'#c99de7',greeting:'聞こえるよ！ 何の問題？',ack:'なるほど、挑戦してみる！',lead:'僕は',ask:'問題の内容がまだつかめない。肝心な部分を教えて！'},
 {id:'haruto',name:'HARUTO',gender:'male',style:'慎重で正直',expert:['自然','OS','セキュリティ','システム開発'],weak:['スポーツ','芸術'],bias:.02,caution:true,delay:3500,rate:.9,pitch:1,color:'#89cdb8',greeting:'もしもし、内容を教えて。',ack:'少し考える時間をもらうね。',lead:'確かとは言えないけど',ask:'まだ判断できないな。問題の対象か選択肢を教えて。'},
 {id:'mika',name:'MIKA',gender:'female',style:'明るくテンポよく',expert:['文化','スポーツ','生活','Web'],weak:['分散システム','数学'],bias:0,caution:false,delay:1200,rate:1.12,pitch:1.03,color:'#ee9ab9',greeting:'もしもし！ 問題教えて！',ack:'うん、聞こえたよ！',lead:'私は',ask:'もう少し具体的に聞かせて。何についての問題？'},
 {id:'yui',name:'YUI',gender:'female',style:'穏やかで丁寧',expert:['文学','自然','品質管理','プロジェクト管理'],weak:['AWS','ネットワーク'],bias:.03,caution:true,delay:3100,rate:.93,pitch:1.01,color:'#aeb1ef',greeting:'はい、どんな問題ですか？',ack:'内容を整理して考えますね。',lead:'私が考えた候補は',ask:'問題の内容をまだ特定できません。大事な言葉を教えてください。'},
 {id:'ayaka',name:'AYAKA',gender:'female',style:'知識豊富で落ち着いた相談役',expert:['歴史','芸術','生成AI','LLM','RAG','AIエージェント','Azure'],weak:['スポーツ','生活'],bias:.06,caution:false,delay:2400,rate:.96,pitch:1,color:'#d7bf7f',greeting:'聞こえます。問題をどうぞ。',ack:'聞き取れました。知識を確かめますね。',lead:'この内容なら',ask:'まだ問題の要点が分かりません。何を問われているか教えてください。'},
 {id:'nanami',name:'NANAMI',gender:'female',style:'親しみやすく少し迷いがち',expert:['地理','文化','ITマネジメント','開発'],weak:['数学','セキュリティ'],bias:-.02,caution:true,delay:2900,rate:1.02,pitch:1.02,color:'#88c6de',greeting:'もしもし！ 何の問題かな？',ack:'うーん、思い出してみるね。',lead:'迷うけど、候補にするなら',ask:'ごめん、まだ内容がつかめない。問題をもう少し聞かせて。'}
];
function selectProfile(lastId,random=Math.random){const pool=PROFILES.filter(p=>p.id!==lastId);return pool[Math.floor(random()*pool.length)];}
const normalize=s=>String(s).normalize('NFKC').toLowerCase().replace(/(?:もしもし|こんにちは|こんばんは|よろしく|問題を伝える|問題を伝え|問題です|問題は|でしょうか|でしょう|何ですか|どれですか|次のうち|次の中で|一般に|基本的に|代表的な)/g,'').replace(/[\s\p{P}\p{S}]/gu,'');
const grams=s=>new Set(Array.from({length:Math.max(0,s.length-1)},(_,i)=>s.slice(i,i+2)));
function evidence(question,spoken){const target=normalize(question.text),input=normalize(spoken);const tokens=grams(target);let hits=0;for(const g of tokens)if(input.includes(g))hits++;const ratio=tokens.size?hits/tokens.size:0;
 const options=question.options.filter(o=>{const t=normalize(o.text);if(t.length<2)return false;return input.includes(t);}).length;
 // Several content bigrams tolerate punctuation and partial recognition errors.
 // Generic greetings/requests never count as question evidence.
 return {enough:(hits>=Math.min(4,tokens.size)&&ratio>=.42)||(hits>=3&&ratio>=.22&&options>=1)||options>=2,ratio,hits,options};}
class Conversation {
 constructor(question,profile,hidden=[],random=Math.random){this.question=question;this.profile=profile;this.hidden=hidden.slice();this.random=random;this.spoken='';this.candidate=null;this.answered=false;this.pending=false;this.closed=false;this.uncertain=false;const expert=profile.expert.includes(question.category),weak=profile.weak.includes(question.category);this.affinity=expert?'expert':weak?'weak':'neutral';this.accuracy=Math.max(.25,Math.min(.96,.91-question.difficulty*.028+profile.bias+(expert?.14:weak?-.17:0)));}
 opening(){return this.profile.greeting;}
 receive(input){if(this.closed)return null;const text=String(input).trim().slice(0,1200);if(!text)return {kind:'ask',text:'文字かマイクで問題を伝えてください。'};
  if(this.answered)return {kind:'reply',text:this.followup(text)};
  if(this.pending)return {kind:'reply',text:`${this.profile.ack} まだ考えているところです。`};
  this.spoken=(this.spoken+' '+text).slice(-2400);if(!evidence(this.question,this.spoken).enough){return {kind:'ask',text:/^(もしもし|こんにちは|こんばんは|よろしく|聞こえ).*/.test(text)&&!evidence(this.question,text).enough?'聞こえています。問題の内容を伝えてね。':this.profile.ask};}
  const available=this.question.options.filter(o=>!this.hidden.includes(o.id)),wrong=available.filter(o=>o.id!==this.question.answer);
  this.candidate=this.random()<this.accuracy?this.question.answer:wrong[Math.floor(this.random()*wrong.length)].id;
  this.uncertain=this.affinity==='weak'||this.accuracy<.65||this.profile.caution;
  this.pending=true;this.declines=this.profile.caution&&this.affinity==='weak'&&this.random()<.22;
  return {kind:'thinking',text:this.profile.ack,delay:this.profile.delay+this.random()*1600+(this.affinity==='weak'?1800:0)};
 }
 complete(){if(this.closed||!this.pending)return null;this.pending=false;this.answered=true;
  if(this.declines){this.candidate=null;return 'ごめん、この分野は分からない。根拠のない答えは勧められないです。';}
  const option=this.question.options.find(o=>o.id===this.candidate);const confidence=this.uncertain?'自信は控えめ。最後はあなたの判断で。':this.profile.id==='ryo'?'これを推す！ ただ、思い違いもあり得るよ。':'この候補を考えたよ。正解の保証はできないけどね。';
  return `${this.profile.lead} ${option.id}「${option.text}」。${confidence}`;
 }
 followup(text){if(/ありがとう|助かった/.test(text))return '応援しているよ。最後はあなたの判断を信じて！';if(!this.candidate)return 'この問題の答えは分からないです。自分の判断を大切にしてね。';const o=this.question.options.find(o=>o.id===this.candidate);
  if(/理由|なぜ|解説|根拠/.test(text))return this.candidate===this.question.answer?`${this.question.explanation} この知識を参考に ${o.id}「${o.text}」を選びました。`:`${o.id}「${o.text}」を候補にしたけれど、確かな根拠を説明できません。勘違いの可能性があります。`;
  if(/自信|確信|本当|確率/.test(text))return `${this.uncertain?'かなり迷っているよ。':'思い違いはあり得るよ。'}候補は ${o.id}「${o.text}」だけど、保証はできません。`;
  if(/もう一度|候補|どれ|答え/.test(text))return `${this.profile.lead} ${o.id}「${o.text}」。限られた時間での助言として考えてね。`;
  return 'その発言にはルールベースの会話では対応できません。候補の理由や自信についてなら話せます。';
 }
 close(){this.closed=true;this.pending=false;}
}
class Call {
 constructor(conversation,{now=()=>Date.now(),setTimer=(fn,ms)=>root.setTimeout(fn,ms),clearTimer=id=>root.clearTimeout(id),onEvent=()=>{}}={}){this.conversation=conversation;this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.onEvent=onEvent;this.phase='new';this.timers=new Set();this.deadline=null;this.lastWarning=null;}
 schedule(fn,delay){let id;id=this.setTimer(()=>{this.timers.delete(id);fn();},delay);this.timers.add(id);return id;}
 start(){if(this.phase!=='new')return false;this.phase='ringing';this.onEvent('ringing');this.schedule(()=>{if(this.phase!=='ringing')return;this.phase='connected';this.deadline=this.now()+30000;this.onEvent('connected',this.conversation.opening());this.poll();},1800);return true;}
 get remaining(){return this.deadline==null?30:Math.max(0,Math.ceil((this.deadline-this.now())/1000));}
 check(){if(this.phase!=='connected')return false;if(this.now()>=this.deadline){this.close('timeout');return false;}return true;}
 poll(){if(!this.check())return;this.onEvent('tick',this.remaining);if(this.remaining<=5&&this.remaining!==this.lastWarning){this.lastWarning=this.remaining;this.onEvent('warning',this.remaining);}this.schedule(()=>this.poll(),100);}
 submit(input){if(!this.check())return false;const result=this.conversation.receive(input);if(!result)return false;this.onEvent('player',String(input).trim().slice(0,1200));if(result.kind==='thinking'){this.onEvent('thinking',result.text);this.schedule(()=>{if(!this.check())return;const reply=this.conversation.complete();if(reply)this.onEvent('reply',reply);},result.delay);}else this.onEvent('reply',result.text);return true;}
 close(reason='manual'){if(this.phase==='closed')return false;this.phase='closed';for(const id of this.timers)this.clearTimer(id);this.timers.clear();this.conversation.close();this.onEvent('ended',reason);return true;}
}
const api={PROFILES,selectProfile,normalize,evidence,Conversation,Call};root.QuizPhone=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
