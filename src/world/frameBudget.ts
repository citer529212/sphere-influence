// Keep a deadline rather than rounding every interval to the screen refresh rate.
// Render-clock time pauses offscreen; throttling does not slow turn animations.
export class FrameBudget {
 private last:number|null=null;
 private next=0;
 constructor(readonly fps:number){}
 reset(){this.last=null;this.next=0;}
 take(now:number):number|null{
  const interval=1000/this.fps;
  if(this.last===null){this.last=now;this.next=now+interval;return 0;}
  if(now+Math.min(1,30/this.fps)<this.next)return null;
  const elapsed=now-this.last;this.last=now;this.next+=interval;
  if(this.next<=now)this.next=now+interval;
  return Math.min(.1,Math.max(0,elapsed/1000));
 }
}
