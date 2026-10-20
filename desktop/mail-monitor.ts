import type {MailStatus} from '../shared/mail.ts';
export class MailMonitor{
 private timer?:ReturnType<typeof setInterval>;private first?:ReturnType<typeof setTimeout>;private running?:Promise<MailStatus>;private stopped=false;private pokeTimer?:ReturnType<typeof setTimeout>;
 constructor(private account:{status():MailStatus;isBusy():boolean;sync():Promise<MailStatus>},private interval=60000){}
 refresh(){if(this.running)return this.running;if(this.stopped)return Promise.resolve(this.account.status());this.running=this.account.sync().finally(()=>{this.running=undefined;});return this.running;}
 poke(){if(this.stopped)return;clearTimeout(this.pokeTimer);this.pokeTimer=setTimeout(()=>void this.tick(),400);}
 start(){this.first=setTimeout(()=>void this.tick(),1500);this.timer=setInterval(()=>void this.tick(),this.interval);this.timer.unref?.();}
 async tick(){if(this.stopped)return;if(this.account.isBusy()){this.poke();return;}await this.refresh();}
 stop(){this.stopped=true;clearTimeout(this.first);clearInterval(this.timer);clearTimeout(this.pokeTimer);}
}
