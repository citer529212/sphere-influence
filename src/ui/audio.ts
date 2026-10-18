export type Cue='select'|'media'|'attract'|'protect'|'capture'|'turn'|'win'|'loss';
const notes:Record<Cue,number[]>={select:[440],media:[262,392,523],attract:[392,494],protect:[349,440,523],capture:[523,659,784],turn:[220,294,330],win:[392,523,659,784,1047],loss:[392,330,262]};
export class GameAudio {
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private enabled=true;
  setEnabled(enabled:boolean):void {this.enabled=enabled;if(this.master&&this.context)this.master.gain.setTargetAtTime(enabled?.45:0,this.context.currentTime,.02);}
  async play(cue:Cue):Promise<void> {
    if(!this.enabled)return;
    try{
      this.context??=new AudioContext();
      if(!this.master){this.master=this.context.createGain();this.master.gain.value=.45;this.master.connect(this.context.destination);}
      await this.context.resume();if(!this.enabled)return;
      const start=this.context.currentTime;
      notes[cue].forEach((frequency,index)=>{
        const oscillator=this.context!.createOscillator(),gain=this.context!.createGain();
        const t=start+index*.105;oscillator.type=cue==='turn'?'sine':'triangle';oscillator.frequency.value=frequency;
        gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.11,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.24);
        oscillator.connect(gain);gain.connect(this.master!);oscillator.start(t);oscillator.stop(t+.27);
        oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      });
    }catch{/* Sound must never block a move or a saved game. */}
  }
  dispose():void {void this.context?.close().catch(()=>undefined);this.context=null;this.master=null;}
}
