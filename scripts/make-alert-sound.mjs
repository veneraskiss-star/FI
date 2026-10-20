// A quiet, rounded tap: smooth attack, falling sine partials, no sharp click or bell.
import {writeFileSync} from 'node:fs';
const rate=44100,duration=.32,count=Math.round(rate*duration),data=Buffer.alloc(count*2);
for(let i=0;i<count;i++){
 const t=i/rate;
 const attack=1-Math.exp(-Math.pow(t/.014,2));
 const release=Math.pow(Math.max(0,1-t/duration),3)*Math.exp(-t/ .115);
 // Integrate a gentle exponential pitch fall, keeping all partials phase continuous.
 const phase=2*Math.PI*(430*t+120*.045*(1-Math.exp(-t/.045)));
 const warm=Math.sin(phase)+.12*Math.sin(phase*1.5)*Math.exp(-t/.055)+.035*Math.sin(phase*2)*Math.exp(-t/.025);
 const sample=.052*attack*release*warm;
 data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,sample))*32767),i*2);
}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+data.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(data.length,40);
writeFileSync('assets/project-hub-mail.wav',Buffer.concat([header,data]));
