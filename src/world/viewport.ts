// Allow a tall phone viewport to fit the full atlas instead of hitting the old zoom cap.
export function overviewPose(width:number,height:number){
 const fit=Math.max(1,1.65/(width/Math.max(1,height)));
 return {x:3*fit,y:57*fit,z:47*fit,maxDistance:Math.max(220,78*fit)};
}
