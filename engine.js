(function(root){
'use strict';
const PRIZES=[1000,2000,3000,5000,10000,20000,30000,50000,100000,200000,500000,1000000,2000000,5000000,10000000];
const shuffle=(items,random)=>{const result=items.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};
class Game {
 constructor(bank,random=Math.random,store=null){this.bank=bank.filter(q=>q.review?.status!=='pending');this.random=random;this.store=store;this.phase='idle';}
 start(mode){if(!['general','it'].includes(mode))throw Error('不明なモード');this.mode=mode;this.questions=[];this.categoryCounts={};this.index=0;this.correct=0;this.selected=null;this.hidden=[];this.won=null;this.used={fifty:false,phone:false,audience:false};this.phase='question';this.payout=0;this.draw();return this;}
 draw(){const level=this.index+1,pool=this.bank.filter(q=>q.mode===this.mode&&q.difficulty===level&&!this.questions.some(p=>p.id===q.id));if(!pool.length)throw Error('問題不足');const validIds=pool.map(q=>q.id);let seen=this.store?.history(this.mode,level,validIds)||[];let candidates=pool.filter(q=>!seen.includes(q.id));if(!candidates.length)candidates=pool;
 // Category balancing is a preference within unseen questions, never a reason to repeat one.
 const min=Math.min(...candidates.map(q=>this.categoryCounts[q.category]||0));candidates=candidates.filter(q=>(this.categoryCounts[q.category]||0)===min);const source=candidates[Math.floor(this.random()*candidates.length)],options=shuffle(source.options,this.random);const answerIndex=options.findIndex(o=>o.id===source.answer);const question={...source,options:options.map((o,i)=>({id:'ABCD'[i],text:o.text})),answer:'ABCD'[answerIndex]};this.questions.push(question);this.categoryCounts[source.category]=(this.categoryCounts[source.category]||0)+1;this.store?.markSeen(this.mode,level,source.id,validIds);}
 get question(){return this.questions[this.index];} get current(){return this.correct?PRIZES[this.correct-1]:0;} get guarantee(){return this.correct>=10?PRIZES[9]:this.correct>=5?PRIZES[4]:0;}
 select(id){if(this.phase!=='question'||this.hidden.includes(id)||!this.question.options.some(o=>o.id===id))return false;this.selected=id;return true;}
 lock(){if(this.phase!=='question'||!this.selected)return false;this.phase='locked';return true;}
 resolve(){if(this.phase!=='locked')return false;this.won=this.selected===this.question.answer;if(this.won){this.correct++;this.payout=this.current;this.phase=this.correct===15?'cleared':'revealed';}else{this.payout=this.guarantee;this.phase='lost';}return true;}
 next(){if(this.phase!=='revealed')return false;this.index++;this.selected=null;this.hidden=[];this.won=null;this.phase='question';this.draw();return true;}
 walk(){if(this.phase!=='question')return false;this.payout=this.current;this.phase='walked';return true;}
 lifeline(type){if(this.phase!=='question'||!Object.hasOwn(this.used,type)||this.used[type])return null;this.used[type]=true;const q=this.question;const available=q.options.filter(o=>!this.hidden.includes(o.id));const pick=a=>a[Math.floor(this.random()*a.length)];if(type==='fifty'){this.hidden=shuffle(available.filter(o=>o.id!==q.answer),this.random).slice(0,2).map(o=>o.id);if(this.hidden.includes(this.selected))this.selected=null;return this.hidden;}
 const accuracy=Math.max(.4,.94-q.difficulty*.035);const candidate=this.random()<accuracy?q.answer:pick(available.filter(o=>o.id!==q.answer)).id;
 if(type==='phone')return {id:candidate,comment:q.difficulty<6?'この候補が有力だと思う。でも思い違いもあるよ。':q.difficulty<11?'記憶をたどると、この選択肢かな。確信はないけど。':'難しいね…。私ならこれを選ぶけど、最後はあなたの判断で。'};
 // Less concentrated votes on harder questions. Largest-remainder rounding totals 100.
 const lead=Math.max(10,42-q.difficulty*1.7);const weights=available.map(o=>({id:o.id,w:8+this.random()*24+(o.id===candidate?lead:0)}));const total=weights.reduce((s,o)=>s+o.w,0);const votes=weights.map(o=>{const exact=o.w/total*100;return {id:o.id,value:Math.floor(exact),fraction:exact%1};});let rest=100-votes.reduce((s,o)=>s+o.value,0);for(const v of [...votes].sort((a,b)=>b.fraction-a.fraction)){if(rest-->0)v.value++;}return votes.map(({id,value})=>({id,value}));
 }
}
root.QuizEngine={Game,PRIZES,shuffle};if(typeof module!=='undefined')module.exports=root.QuizEngine;
})(typeof window!=='undefined'?window:globalThis);
