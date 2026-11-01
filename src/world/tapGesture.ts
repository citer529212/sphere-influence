type Point={pointerId:number;clientX:number;clientY:number;pointerType?:string};
export class TapGesture{
 private pointers=new Map<number,{x:number;y:number;moved:boolean;threshold:number}>();
 private multiple=false;
 begin(p:Point){if(!this.pointers.size)this.multiple=false;this.pointers.set(p.pointerId,{x:p.clientX,y:p.clientY,moved:false,threshold:p.pointerType==='touch'?12:6});if(this.pointers.size>1)this.multiple=true;}
 move(p:Point){const start=this.pointers.get(p.pointerId);if(start&&Math.hypot(p.clientX-start.x,p.clientY-start.y)>=start.threshold)start.moved=true;}
 end(p:Point){this.move(p);const start=this.pointers.get(p.pointerId),tap=!!start&&!start.moved&&!this.multiple&&this.pointers.size===1;this.pointers.delete(p.pointerId);if(!this.pointers.size)this.multiple=false;return tap;}
 cancel(p:Pick<Point,'pointerId'>){this.pointers.delete(p.pointerId);if(!this.pointers.size)this.multiple=false;}
 clear(){this.pointers.clear();this.multiple=false;}
 get active(){return this.pointers.size>0;}
}
