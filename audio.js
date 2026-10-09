/* Cinematic original score, synthesised locally. No borrowed melodies or samples.
   Optional licensed/original recordings can be registered using setAsset(). */
(function(root){'use strict';
const SCORES={
 title:{bpm:78,bass:43.65,pulse:.035,pad:.028,brightness:1700,chords:[[0,7,14,19],[3,10,17,22],[5,12,19,24],[0,7,12,17]],pattern:[0,7,14,19,14,7,12,19]},
 early:{bpm:66,bass:49,pulse:.035,pad:.019,brightness:650,chords:[[0,7,14],[0,5,12],[3,10,17],[0,7,12]],pattern:[0,7,0,10]},
 middle:{bpm:80,bass:46.25,pulse:.045,pad:.024,brightness:850,chords:[[0,7,13],[0,6,12],[2,7,14],[0,7,12]],pattern:[0,7,1,7,0,10,1,6]},
 late:{bpm:96,bass:41.2,pulse:.06,pad:.027,brightness:1050,chords:[[0,1,7,12],[0,6,13],[0,7,14],[1,7,13]],pattern:[0,1,7,0,6,1,7,12]},
 final:{bpm:112,bass:36.71,pulse:.067,pad:.029,brightness:1350,chords:[[0,1,7,13],[0,6,12,19],[1,7,13,20],[0,7,14,19]],pattern:[0,1,7,13,0,6,1,7]},
 tension:{bpm:120,bass:32.7,pulse:.075,pad:.024,brightness:600,chords:[[0,1,12]],pattern:[0,1,0,1]},
 finalTension:{bpm:140,bass:30.87,pulse:.085,pad:.029,brightness:850,chords:[[0,1,6,12]],pattern:[0,1,6,1]}
};
const ASSETS={title:null,early:null,middle:null,late:null,final:null,tension:null,finalTension:null,startApplause:null,correctApplause:null,wrongMurmur:null,highCheer:null,clearApplause:null,correct:null,correctEarly:null,correctMiddle:null,correctLate:null,guarantee:null,wrong:null,clear:null};
class StudioAudio {
 constructor(){this.context=null;this.master=null;this.volume=.35;this.muted=false;this.scene='title';this.loop=null;this.nodes=new Set();this.step=0;this.enabled=false;this.assets={...ASSETS};this.buffers=new Map();this.pending=new Map();this.generation=0;this.assetErrors=new Set();this.pauseEpoch=0;this.phoneDucking=false;this.bgmGain=null;}
 static successDuration(level){return level===15?4800:level===5||level===10?3400:level>=11?3600:level>=6?2900:2200;}
 static sceneFor(phase,index=0,busy=false){if(busy)return 'silent';if(phase==='idle')return 'title';if(phase==='locked')return index===14?'finalTension':'tension';if(phase!=='question')return 'silent';return index===14?'final':index>=10?'late':index>=5?'middle':'early';}
 async unlock(){const epoch=this.pauseEpoch;try{const C=root.AudioContext||root.webkitAudioContext;if(!C)return false;if(!this.context){this.context=new C();this.master=this.context.createGain();this.bgmGain=this.context.createGain();this.bgmGain.gain.value=this.phoneDucking?.13:1;this.bgmGain.connect(this.master);const c=this.context;this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-14;this.compressor.knee.value=18;this.compressor.ratio.value=5;this.compressor.attack.value=.012;this.compressor.release.value=.22;this.master.connect(this.compressor);this.compressor.connect(c.destination);this.room=c.createConvolver();const ir=c.createBuffer(2,Math.floor(c.sampleRate*1.65),c.sampleRate);for(let ch=0;ch<2;ch++){const data=ir.getChannelData(ch);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3)*.33;}this.room.buffer=ir;this.wet=c.createGain();this.wet.gain.value=.19;this.room.connect(this.wet);this.wet.connect(this.master);this.updateGain();}await this.context.resume();if(epoch!==this.pauseEpoch)return false;this.enabled=this.context.state==='running';if(this.enabled)this.startLoop();return this.enabled;}catch{this.enabled=false;return false;}}
 updateGain(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.context.currentTime,.04);}
 setPhoneDucking(active){this.phoneDucking=!!active;if(this.bgmGain)this.bgmGain.gain.setTargetAtTime(active?.13:1,this.context.currentTime,.12);}
 phoneCue(kind){if(kind==='hangup'){this.tone(660,.1,0,'sine',.025,'phone');this.tone(440,.16,.12,'sine',.025,'phone');}if(kind==='ring'){[0,.3,.6].forEach(t=>{this.tone(440,.22,t,'sine',.04,'phone');this.tone(660,.22,t,'sine',.02,'phone');});}if(kind==='warning')this.tone(880,.08,0,'sine',.03,'phone');}
 setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));this.updateGain();}
 setMuted(value){this.muted=!!value;this.updateGain();}
 track(source,gain,bus,extras=[]){const entry={o:source,g:gain,bus,extras};this.nodes.add(entry);source.onended=()=>{source.disconnect();gain.disconnect();extras.forEach(n=>n.disconnect());this.nodes.delete(entry);};return entry;}
 tone(freq,duration=.3,offset=0,type='sine',level=.08,bus='effect',endFreq,cutoff=2200,attack=.018,detune=0){if(!this.enabled||this.context?.state!=='running')return;const c=this.context,t=c.currentTime+Math.max(0,offset),o=c.createOscillator(),g=c.createGain(),filter=c.createBiquadFilter();o.type=type;o.frequency.setValueAtTime(freq,t);o.detune.value=detune;filter.type='lowpass';filter.frequency.value=cutoff;filter.Q.value=.55;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,level),t+Math.min(attack,duration*.4));g.gain.exponentialRampToValueAtTime(.0001,t+duration);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,t+duration);o.connect(filter);filter.connect(g);g.connect(bus==='bgm'?this.bgmGain:this.master);if(type!=='sine')g.connect(this.room);this.track(o,g,bus,[filter]);o.start(t);o.stop(t+duration+.025);}
 noise(duration=.12,offset=0,level=.045,bus='effect',cutoff=1200,pan=0){if(!this.enabled||this.context?.state!=='running')return;const c=this.context,t=c.currentTime+offset,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=.55*last+.45*(Math.random()*2-1);data[i]=last;}const src=c.createBufferSource(),g=c.createGain(),filter=c.createBiquadFilter(),p=c.createStereoPanner?.();src.buffer=buffer;filter.type='highpass';filter.frequency.value=cutoff;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+duration);src.connect(filter);filter.connect(g);if(p){p.pan.value=pan;g.connect(p);p.connect(bus==='bgm'?this.bgmGain:this.master);}else g.connect(bus==='bgm'?this.bgmGain:this.master);g.connect(this.room);this.track(src,g,bus,[filter,...(p?[p]:[])]);src.start(t);src.stop(t+duration+.02);}
 strings(notes,base,duration,offset,level,cutoff,bus='bgm'){for(const n of notes){const hz=base*Math.pow(2,n/12);this.tone(hz,duration,offset,'sawtooth',level/notes.length,bus,undefined,cutoff,.65,-6);this.tone(hz,duration,offset,'sawtooth',level/notes.length,bus,undefined,cutoff,.8,6);}}
 stopBus(bus){for(const entry of [...this.nodes])if(!bus||entry.bus===bus){try{entry.o.stop();}catch{}entry.o.disconnect();entry.g.disconnect();entry.extras.forEach(n=>n.disconnect());this.nodes.delete(entry);}}
 sceneTo(scene){if(scene==='normal')scene='early';if(scene==='high')scene='late';if(this.scene===scene){this.startLoop();return;}this.scene=scene;this.generation++;this.step=0;clearInterval(this.loop);this.loop=null;this.stopBus('bgm');this.startLoop();}
 startLoop(){if(this.loop||!this.enabled||this.context?.state!=='running'||!SCORES[this.scene])return;const score=SCORES[this.scene],beat=60/score.bpm,token=this.generation;this.nextBeat=this.context.currentTime+.04;
 if(this.assets[this.scene]){this.loop=setInterval(()=>{},1000);this.sample(this.scene,'bgm',true,token).then(ok=>{if(!ok&&token===this.generation){clearInterval(this.loop);this.loop=null;this.beginScore(score,beat);}});return;}this.beginScore(score,beat);}
 beginScore(score,beat){if(this.loop)return;const schedule=()=>{if(this.context.state!=='running')return;if(this.nextBeat<this.context.currentTime-.2)this.nextBeat=this.context.currentTime+.03;let scheduled=0;while(this.nextBeat<this.context.currentTime+.18&&scheduled++<4){const offset=Math.max(.005,this.nextBeat-this.context.currentTime),s=this.step++,chord=score.chords[Math.floor(s/8)%score.chords.length];if(s%8===0){this.strings(chord,score.bass*4,beat*8.5,offset,score.pad,score.brightness);this.tone(score.bass,beat*7,offset,'sine',.035,'bgm');}
 // A double low pulse suggests a heartbeat; higher tiers add syncopation.
 this.tone(score.bass*1.8,.14,offset,'sine',score.pulse,'bgm',score.bass);this.tone(score.bass*1.65,.12,offset+beat*.23,'sine',score.pulse*.56,'bgm',score.bass);if(s%2===0)this.tone(score.bass*4*Math.pow(2,score.pattern[(s/2)%score.pattern.length]/12),beat*1.4,offset,'triangle',.013,'bgm',undefined,950,.04);if(score.bpm>=80&&s%2===1)this.noise(.075,offset+beat*.5,.011,'bgm',2100);if(this.scene==='title'&&s%4===0)this.tone(score.bass*8*Math.pow(2,chord[1]/12),1.8,offset,'sine',.025,'bgm');this.nextBeat+=beat;}};schedule();this.loop=setInterval(schedule,50);}
 async setAsset(key,url){if(!(key in this.assets))throw Error('Unknown audio slot');this.assets[key]=url||null;this.buffers.delete(key);this.pending.delete(key);if(this.scene===key){const old=this.scene;this.scene='silent';this.sceneTo(old);}}
 async sample(key,bus='effect',loop=false,token=this.generation){if(!this.assets[key]||!this.enabled)return false;try{const assetUrl=this.assets[key];let buffer=this.buffers.get(key);if(!buffer){let pending=this.pending.get(key);if(!pending){pending=root.fetch(assetUrl).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).then(bytes=>this.context.decodeAudioData(bytes));this.pending.set(key,pending);}buffer=await pending;if(this.assets[key]!==assetUrl)return true;this.buffers.set(key,buffer);this.pending.delete(key);}if(token!==this.generation||this.context.state!=='running')return true;const src=this.context.createBufferSource(),gain=this.context.createGain();src.buffer=buffer;src.loop=loop;gain.gain.value=bus==='bgm'?.42:.6;src.connect(gain);gain.connect(bus==='bgm'?this.bgmGain:this.master);this.track(src,gain,bus);src.start();return true;}catch{this.pending.delete(key);this.assetErrors.add(key);return false;}}
 applause(size=1){const count=Math.round(22*size);for(let i=0;i<count;i++)this.noise(.06+Math.random()*.065,Math.random()*1.4*size,.055/Math.sqrt(size),'crowd',700+Math.random()*1700,Math.random()*1.8-.9);}
 crowd(event){const keys={start:'startApplause',correct:'correctApplause',wrong:'wrongMurmur',high:'highCheer',clear:'clearApplause'},key=keys[event];if(!key)return;this.stopBus('crowd');if(this.assets[key]){const token=this.generation;this.sample(key,'crowd',false,token).then(ok=>{if(!ok&&token===this.generation&&event!=='wrong')this.applause(event==='clear'?2.2:event==='high'?1.8:1);});}else if(event!=='wrong')this.applause(event==='clear'?2.2:event==='high'?1.8:1);
 // No electronic imitation of human cheering/murmuring. Those slots remain
 // silent without recordings; the visible audience still reacts.
 }
 success(level){
  this.resetEffects();const key=level===15?'clear':level===5||level===10?'guarantee':level>=11?'correctLate':level>=6?'correctMiddle':'correctEarly';const token=this.generation;
  if(this.assets[key]||this.assets.correct){this.sample(this.assets[key]?key:'correct','effect',false,token).then(ok=>{if(!ok&&token===this.generation)this.successScore(level);});}else this.successScore(level);
 }
 successScore(level){
  // One orchestration per result. Peak gain is bounded; no additive prize/clear cue.
  const tier=level===15?3:level>=11?2:level>=6?1:0,milestone=level===5||level===10;
  const base=146.83,spacing=[.13,.16,.18,.22][tier];
  const melody=tier===3?[0,7,12,16,14,19,24,28]:tier===2?[0,7,12,14,19,24]:tier===1?[0,7,12,16,19]:[7,12,16,24];
  const length=tier===3?3.8:tier===2?2.7:tier===1?2.1:1.5;
  this.tone(base/2,length,0,'sine',.085,'effect',undefined,800,.035);
  this.noise(.28,0,.045,'effect',600);
  this.strings([0,7,12,16],base,length,.04,.095,1800+tier*450,'effect');
  melody.forEach((n,i)=>{this.tone(base*Math.pow(2,n/12),.7,i*spacing,'triangle',.053,'effect',undefined,2600,.025);this.tone(base*2*Math.pow(2,n/12),.45,i*spacing,'sine',.015,'effect');});
  if(tier>=1){this.tone(base/2,1.25,.65,'sine',.07);this.strings([5,12,17,21],base,1.4,.7,.065,2400,'effect');}
  if(milestone){[12,19,24].forEach((n,i)=>this.tone(base*Math.pow(2,n/12),.85,1.65+i*.17,'triangle',.045));this.strings([0,7,12,16],base,1.25,1.7,.07,2600,'effect');}
  if(tier===3){this.strings([0,7,12,16,19],base,2,2.1,.11,2900,'effect');this.noise(.65,2.1,.035,'effect',1800);}
 }
 effect(event){if(event==='wrong')this.resetEffects();if(['correct','wrong','clear'].includes(event)&&this.assets[event]){const token=this.generation;this.sample(event,'effect',false,token).then(ok=>{if(!ok&&token===this.generation)this.synthEffect(event);});return;}this.synthEffect(event);}
 synthEffect(event){if(event==='select'){this.tone(510,.16,0,'triangle',.075,'effect',920,1800);this.noise(.045,0,.025,'effect',2500);}if(event==='lock'){this.stopBus('effect');this.tone(87.31,1.25,0,'sine',.15,'effect',32.7);this.noise(.65,0,.04,'effect',240);}
 // Tension is a dedicated score rather than a repeated alert beep.
 if(event==='countdown')return;
 if(event==='correct')this.success(1);
 if(event==='wrong'){this.tone(65.41,2.1,0,'sine',.15,'effect',24.5);this.strings([0,1,6],65.41,1.8,0,.075,550,'effect');this.noise(.9,0,.035,'effect',150);}
 if(event==='prize'){[783.99,1046.5,1567.98].forEach((f,i)=>this.tone(f,.5,i*.13,'sine',.045));}
 if(event==='clear'){const line=[0,7,12,16,14,19,24,19,28];line.forEach((n,i)=>this.tone(261.63*Math.pow(2,n/12),.9,i*.24,'triangle',.075,'effect',undefined,2600,.07));this.strings([0,7,12,16,19],130.81,3.5,.5,.17,2600,'effect');this.tone(65.41,3.5,0,'sine',.1);}
 if(event==='vote')this.noise(.35,0,.03,'effect',1700);
 }
 resetEffects(){this.generation++;this.stopBus('effect');this.stopBus('crowd');}
 reset(){this.generation++;clearInterval(this.loop);this.loop=null;this.stopBus();}
 pause(){this.pauseEpoch++;this.enabled=false;this.generation++;clearInterval(this.loop);this.loop=null;this.stopBus();if(this.context)this.context.suspend().catch(()=>{});}
}
StudioAudio.SCORES=SCORES;StudioAudio.ASSET_SLOTS=ASSETS;root.StudioAudio=StudioAudio;if(typeof module!=='undefined')module.exports=StudioAudio;
})(typeof window!=='undefined'?window:globalThis);
