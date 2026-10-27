const MOVEMENT=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);
export class NavigationKeys {
 readonly held=new Set<string>();
 private modifier=false;
 press(code:string,shift=false){if(!MOVEMENT.has(code)&&code!=='ShiftLeft'&&code!=='ShiftRight')return false;this.held.add(code);if(MOVEMENT.has(code))this.modifier=shift;return true;}
 release(code:string){this.held.delete(code);if(code==='ShiftLeft'||code==='ShiftRight')this.modifier=false;}
 clear(){this.held.clear();this.modifier=false;}
 get moving(){for(const code of MOVEMENT)if(this.held.has(code))return true;return false;}
 get multiplier(){return this.modifier||this.held.has('ShiftLeft')||this.held.has('ShiftRight')?2.5:1;}
}
