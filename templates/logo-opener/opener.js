import * as THREE from 'three';


/* Four editable physical ribbon loops. No bitmap rings, full-logo copies,
 * animation callbacks, requestAnimationFrame clocks, or endpoint swaps. */
function create({duration=320/30}={}){
const W=3840,H=2160,DURATION=duration,CANONICAL_DURATION=320/30;
const canvas=document.getElementById('ribbons');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(1);renderer.setSize(W,H,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.88;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(32,W/H,.015,80);
// Analytic broad studio lights keep native4K SwiftShader capture practical.
// Normals, view vector and world-space position are evaluated on the actual mesh.
const studio={position:new THREE.Vector3(-4,7,8),strength:1.8};
const background=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
 depthTest:false,depthWrite:false,uniforms:{uTime:{value:0},uLight:{value:0}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.999,1.);}`,
 fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uLight;
 float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec2 p=vUv;vec3 ink=vec3(.075,.145,.20);vec3 warm=vec3(.961,.949,.925);
 float a=exp(-6.*dot(p-vec2(.12+.05*sin(uTime*.5),.65),p-vec2(.12+.05*sin(uTime*.5),.65)));
 float b=exp(-8.*dot(p-vec2(.8,.2),p-vec2(.8,.2)));float c=exp(-10.*dot(p-vec2(.9,.95),p-vec2(.9,.95)));
 vec3 dark=ink+a*vec3(.12,.34,.30)+b*vec3(.36,.12,.24)+c*vec3(.38,.25,.07);
 vec3 light=warm+a*vec3(-.045,.003,.005)+b*vec3(.005,-.017,-.003);
 vec3 wash=mix(vec3(.30,.68,.73),vec3(.83,.42,.52),smoothstep(.05,1.1,p.x+.20*sin(p.y*3.)));wash+=c*vec3(.17,.13,-.08);
 vec3 colored=mix(wash,dark,smoothstep(.25,2.5,uTime));vec3 col=mix(colored,light,uLight);col+=(grain(gl_FragCoord.xy)-.5)/350.;gl_FragColor=vec4(col,1.);}`
}));background.frustumCulled=false;background.renderOrder=-10;scene.add(background);

const assembly=new THREE.Group();scene.add(assembly);
const palette=['#F16E61','#FFA35B','#FFE157','#C9DC56','#6DC393','#67CEE6','#6D89BD','#8B70AC','#F16E61'].map(v=>new THREE.Color(v));
function colorAt(u){u=((u%1)+1)%1;const n=u*(palette.length-1),i=Math.floor(n);return palette[i].clone().lerp(palette[i+1],n-i);}
// Final outlines were measured visually against the original supplied mark.
// Unequal ellipses/rotations retain its imperfect nested orbital silhouette.
const specs=[
 {rx:2.72,ry:3.26,cx:.10,cy:0,rz:-.22,phase:.03,depth:.15,twist:.48},
 {rx:2.89,ry:2.77,cx:-.13,cy:.04,rz:.29,phase:.04,depth:.19,twist:-.36},
 {rx:2.45,ry:3.12,cx:.02,cy:-.06,rz:.39,phase:.12,depth:.20,twist:.42},
 {rx:2.44,ry:2.55,cx:-.02,cy:.04,rz:-.48,phase:-.055,depth:.13,twist:-.46}
];
const N=512,M=16;
function makeRibbon(spec,index){
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array((N+1)*(M+1)*3),colors=new Float32Array(positions.length),indices=[];
 for(let i=0;i<=N;i++)for(let j=0;j<=M;j++){
  const k=(i*(M+1)+j)*3,c=colorAt(i/N+spec.phase);colors[k]=c.r;colors[k+1]=c.g;colors[k+2]=c.b;
  if(i<N&&j<M){const a=i*(M+1)+j,b=a+M+1;indices.push(a,b,a+1,b,b+1,a+1);}
 }
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(indices);
 const material=new THREE.ShaderMaterial({vertexColors:true,side:THREE.DoubleSide,
 uniforms:{uKey:{value:studio.position},uGloss:{value:42},uKeyStrength:{value:1}},
 vertexShader:`varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;
 void main(){vColor=color;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}`,
 fragmentShader:`varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;uniform vec3 uKey;uniform float uGloss;uniform float uKeyStrength;
 void main(){vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;vec3 V=normalize(cameraPosition-vWorld);vec3 L=normalize(uKey-vWorld);vec3 R=normalize(vec3(5.,-2.,4.)-vWorld);
 float diffuse=max(dot(N,L),0.);float rim=max(dot(N,R),0.);float spec=pow(max(dot(N,normalize(L+V)),0.),uGloss);float fine=pow(max(dot(N,normalize(R+V)),0.),100.);
 float fresnel=pow(1.-abs(dot(N,V)),3.);vec3 lit=vColor*(.55+.56*diffuse+.18*rim)+vec3(1.,.97,.91)*spec*.32*uKeyStrength+vec3(.80,.94,1.)*(fine*.21+fresnel*.07);
 gl_FragColor=vec4(lit,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;assembly.add(mesh);
 return {spec,index,mesh,geometry,positions};
}
const ribbons=specs.map(makeRibbon);
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const smoother=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*x*(x*(x*6-15)+10);};
const mix=(a,b,t)=>a+(b-a)*t;
function shape(r,t){
 const {spec:s,index:i,positions:p,geometry:g,mesh}=r;
 const settle=smoother(3.0+i*.10,8.0+i*.07,t),macro=1-smooth(.15,2.5,t);
 const width=mix(.145,.43,macro),twist=(1-settle)*s.twist*1.7;
 for(let a=0;a<=N;a++){
  const theta=a/N*Math.PI*2,cs=Math.cos(theta),sn=Math.sin(theta);
  const dz=(1-settle)*s.depth*Math.sin(theta*2+i*1.7)+0.0;
  const normal=new THREE.Vector3(cs/s.rx,sn/s.ry,0).normalize();
  const phi=twist*Math.sin(theta*2+t*1.4+i)+(.045*(1-settle))*Math.sin(theta*3);
  for(let b=0;b<=M;b++){
   const beta=b/M*Math.PI*2;
   // A rounded rectangular section: broad satin face with a fine beveled edge.
   const u=Math.sign(Math.cos(beta))*Math.pow(Math.abs(Math.cos(beta)),.35)*width;
   const v=Math.sign(Math.sin(beta))*Math.pow(Math.abs(Math.sin(beta)),.65)*.042;
   const radial=u*Math.cos(phi)-v*Math.sin(phi),z=u*Math.sin(phi)+v*Math.cos(phi);
   const k=(a*(M+1)+b)*3;p[k]=s.rx*cs+normal.x*radial;p[k+1]=s.ry*sn+normal.y*radial;p[k+2]=dz+z;
  }
 }
 g.attributes.position.needsUpdate=true;g.computeVertexNormals();
 // Both periodic seams share identical averaged normals: no lighting seam at
 // theta=0/2pi or at the beveled cross-section wrap.
 const normals=g.attributes.normal.array;
 const weld=(a,b)=>{const x=normals[a]+normals[b],y=normals[a+1]+normals[b+1],z=normals[a+2]+normals[b+2],len=Math.hypot(x,y,z)||1;for(const k of [a,b]){normals[k]=x/len;normals[k+1]=y/len;normals[k+2]=z/len;}};
 for(let b=0;b<=M;b++)weld(b*3,(N*(M+1)+b)*3);
 for(let a=0;a<=N;a++)weld(a*(M+1)*3,(a*(M+1)+M)*3);
 g.attributes.normal.needsUpdate=true;
 const free=1-settle;
 // Each ribbon completes its own purposeful full tumble and in-plane turn.
 // End angles are integer revolutions, so the original endpoint geometry stays
 // exact while no late reverse spin is needed to find the final orientation.
 const phase=smoother(.12+i*.10,6.5+i*.32,t);
 const startX=[-.12,.72,-.6,.42],startY=[.18,-.48,.75,-.7],startZ=[-.35,.6,-.65,.38];
 const turns=[1,-1,1,-1],yaw=[.65,-.75,.55,-.65];
 mesh.rotation.set(mix(startX[i],turns[i]*Math.PI*2,phase),startY[i]*(1-phase)+yaw[i]*Math.sin(phase*Math.PI*2),s.rz+mix(startZ[i],turns[i]*Math.PI*2,phase));
 const orbital=phase*Math.PI*2;
 mesh.position.set(s.cx+Math.sin(i*2.7+orbital)*.55*free,s.cy+Math.cos(i*1.7+orbital)*.42*free,Math.sin(i*1.9)*.6*free);
 mesh.material.uniforms.uGloss.value=mix(42,26,settle);
 r.width=width;r.settle=settle;
}
// Preserve smooth, unbroken surfaces. Separate tilted loops in camera depth
// wherever their projected ribbon areas overlap. Smooth support avoids depth
// snaps as crossings enter/leave the neighborhood; the ordered stack remains
// continuous as all orientations settle. This is actual mesh depth, not a mask.
function separateDepth(){
 const previous=[];
 for(const r of ribbons){
  const points=[];
  for(let i=0;i<128;i++){const a=i/128*Math.PI*2;const p=new THREE.Vector3(r.spec.rx*Math.cos(a),r.spec.ry*Math.sin(a),(1-r.settle)*r.spec.depth*Math.sin(a*2+r.index*1.7));p.applyEuler(r.mesh.rotation).add(r.mesh.position);points.push(p);}
  let shift=0;
  for(const front of previous)for(const p of points)for(const q of front.points){
   const distance=Math.hypot(p.x-q.x,p.y-q.y),reach=r.width+front.width+.10;
   if(distance>=reach+.30)continue;
   const support=1-smooth(reach,reach+.30,distance);
   const required=(p.z-q.z+.12+r.width*.5*(1-r.settle))*support;
   shift=Math.max(shift,required);
  }
  r.mesh.position.z-=shift;for(const p of points)p.z-=shift;
  previous.push({points,width:r.width});
 }
}
const name=document.querySelector('.name'),wordmark=document.getElementById('wordmark'),signature=document.getElementById('signature');
let lastRenderedTime=NaN;
function renderAt(rawTime){
 const t=Math.min(rawTime*CANONICAL_DURATION/DURATION,9.1);
 if(t===lastRenderedTime){if(window.__openerState)window.__openerState.time=rawTime;return;}
 lastRenderedTime=t;
 const pull=smoother(.12,4.1,t),home=smoother(6.15,8.6,t),light=smooth(2.4,4.2,t);
 ribbons.forEach(r=>shape(r,t));separateDepth();
 const side=smoother(2.45,4.35,t)*(1-home);
 assembly.position.set(-2.73*side,.26*home,0);
 assembly.rotation.set(.0,0,mix(-.08,0,pull));
 camera.position.set(mix(2.48,0,pull)+1.2*Math.sin(Math.PI*pull),mix(.25,0,pull)+.4*Math.sin(Math.PI*pull),mix(.58,mix(13.4,15.3,home),pull));
 const bank=-.20*(1-pull)+.24*Math.sin(Math.PI*pull);
 camera.up.set(Math.sin(bank),Math.cos(bank),0);
 camera.lookAt(mix(2.47,0,pull),mix(.22,0,pull),0);
 background.material.uniforms.uTime.value=t;background.material.uniforms.uLight.value=light;
 studio.position.x=-4+Math.sin(t*.55)*2;
 ribbons.forEach(r=>r.mesh.material.uniforms.uKeyStrength.value=mix(1,.75,home));
 const titleIn=smooth(3.4,4.25,t),titleOut=smooth(6.15,6.85,t);
 name.style.opacity=titleIn*(1-titleOut);
 name.style.transform=`translateX(${(1-titleIn)*70-titleOut*25}px)`;
 name.querySelector('.rule').style.transform=`scaleX(${smooth(3.9,4.7,t)})`;
 wordmark.style.opacity=smooth(7.8,8.55,t);
 wordmark.style.transform=`translateY(${(1-smooth(7.8,8.75,t))*15}px)`;
 signature.style.opacity=smooth(8.0,8.8,t);
 renderer.render(scene,camera);
 window.__openerState={time:rawTime,canonicalTime:t,canvas:[canvas.width,canvas.height],pull,home,light,rings:ribbons.map(r=>({position:r.mesh.position.toArray(),rotation:r.mesh.rotation.toArray(),vertices:r.geometry.attributes.position.count})),nameOpacity:+name.style.opacity,wordmarkOpacity:+wordmark.style.opacity};
}
// Accessors execute during seek(..., true); onUpdate callbacks do not.
const cursor={};let current=NaN;Object.defineProperty(cursor,'time',{get(){return current;},set(v){if(v===current)return;current=v;renderAt(v);}});
const timeline=gsap.timeline({paused:true});timeline.fromTo(cursor,{time:0},{time:DURATION,duration:DURATION,ease:'none',immediateRender:true});
window.__timelines=window.__timelines||{};window.__timelines['bwib-opener-v4']=timeline;
renderAt(0);return {timeline,renderAt,duration:DURATION,renderer,scene,camera,ribbons,geometryRecreated:true};
}
window.BWIBV4={create};
