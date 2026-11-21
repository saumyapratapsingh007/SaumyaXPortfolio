'use strict';
const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches;

const videoVisibility = new Map();
const detail = $('#detail-video');
function playSafely(v) { v.muted = true; if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src; const p = v.play(); if (p) p.catch(() => { v.dataset.blocked = 'true'; }); }
function syncVideo(v) { if (!paused && !document.hidden && videoVisibility.get(v) && !v.closest('[hidden]') && !$('#film-dialog').open) playSafely(v); else v.pause(); }
const observer = new IntersectionObserver(entries => entries.forEach(e => { videoVisibility.set(e.target,e.isIntersecting); syncVideo(e.target); }), {rootMargin:'100px',threshold:0.01});
function setMotion(value) { paused=value;document.body.classList.toggle('motion-paused',paused);$('#motion').setAttribute('aria-pressed',String(paused));$('#motion').setAttribute('aria-label',paused?'Resume motion':'Pause motion');$('#motion').textContent=paused?'▶':'Ⅱ'; videoVisibility.forEach((_,v)=>syncVideo(v));if(paused)detail.pause(); }
$('#motion').addEventListener('click',()=>setMotion(!paused));reduced.addEventListener('change',e=>setMotion(e.matches));setMotion(paused);
document.addEventListener('visibilitychange',()=>{videoVisibility.forEach((_,v)=>syncVideo(v));if(document.hidden)detail.pause();});
for (const card of document.querySelectorAll('.film-card')) {
  const video = card.querySelector('video');
  const title = card.querySelector('h3').textContent;
  const original = card.dataset.original;
  video.addEventListener('error', () => {
    const label = document.createElement('span');
    label.className = 'media-error';
    label.textContent = 'Open original on Drive';
    card.querySelector('button').append(label);
  }, {once:true});
  card.querySelector('button').addEventListener('click', () => {
    if (video.error) {
      window.open(original, '_blank', 'noopener,noreferrer');
      return;
    }
    openFilm({title, original, category: card.closest('[data-genre]').dataset.genre,
      src: video.dataset.src, poster: video.getAttribute('poster') || ''});
  });
  observer.observe(video);
}
const filters = document.querySelectorAll('[data-filter]');
for (const button of filters) {
  button.addEventListener('click', () => {
    for (const item of filters) {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    }
    for (const section of document.querySelectorAll('[data-genre]')) {
      section.hidden = button.dataset.filter !== 'all' && button.dataset.filter !== section.dataset.genre;
    }
    videoVisibility.forEach((_, video) => syncVideo(video));
  });
}
function openFilm(f){$('#film-title').textContent=f.title;$('#film-category').textContent=f.category;$('#original-link').href=f.original;detail.src=f.src;if(f.poster)detail.poster=f.poster;else detail.removeAttribute('poster');detail.muted=true;$('#film-dialog').showModal();document.body.style.overflow='hidden';videoVisibility.forEach((_,v)=>v.pause());if(!paused)playSafely(detail);}
document.querySelectorAll('dialog').forEach(dialog=>{dialog.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});dialog.addEventListener('close',()=>{document.body.style.overflow='';detail.pause();videoVisibility.forEach((_,v)=>syncVideo(v));});});
$('#resume-open').addEventListener('click',()=>{$('#resume-dialog').showModal();document.body.style.overflow='hidden';});
$('#copy-email').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('Soumyasingh2922@gmail.com');$('#copy-status').textContent='Email copied';}catch{$('#copy-status').textContent='Soumyasingh2922@gmail.com';}});
$('#year').textContent=new Date().getFullYear();

// A self-contained WebGL sculpture: ray-marched, reflective, subtly rippled torus.
function initLens(){
 const canvas=$('#lens');const gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power'});if(!gl){canvas.hidden=true;return;}
 const vertex='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
 const fragment=`precision highp float;
 uniform vec2 resolution;uniform vec2 pointer;uniform float time;
 mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
 vec3 transform(vec3 p){p.xz=rot(-0.35+(pointer.x-.5)*.55+sin(time*.16)*.12)*p.xz;p.yz=rot(.78+(pointer.y-.5)*.5)*p.yz;return p;}
 float map(vec3 p){p=transform(p);float a=atan(p.z,p.x);float ripple=sin(a*30.+time*.6)*.009;vec2 q=vec2(length(p.xz)-1.06,p.y);return length(q)-(.27+ripple);}
 vec3 norm(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
 void main(){
 vec2 uv=gl_FragCoord.xy/resolution;float aspect=resolution.x/resolution.y;vec2 center=vec2(.76,.54);if(aspect<.9)center=vec2(.7,.76);
 vec2 p=(uv-center)*vec2(aspect,1.)*4.8;
 vec3 ro=vec3(0.,0.,4.5);vec3 rd=normalize(vec3(p,-4.));float t=0.;float d=0.;
 for(int i=0;i<68;i++){d=map(ro+rd*t);if(d<.002||t>8.)break;t+=d*.8;}
 vec3 color=vec3(.078,.078,.065);float halo=exp(-length(p)*1.1);color+=vec3(.08,.035,.012)*halo;
 if(t<8.&&d<.005){vec3 pos=ro+rd*t;vec3 n=norm(pos);vec3 ref=reflect(rd,n);float fres=pow(1.-max(dot(n,-rd),0.),2.4);
 float light=max(dot(n,normalize(vec3(-2.,3.,4.))),0.);float rim=pow(max(dot(ref,normalize(vec3(-1.,1.,3.))),0.),26.);
 float stripe=pow(.5+.5*sin(ref.y*16.+ref.x*3.),8.);
 color=vec3(.095,.065,.042)+vec3(.52,.26,.10)*light*.6+vec3(.95,.76,.5)*stripe*.5+vec3(1.,.44,.19)*fres*.7+vec3(1.,.94,.75)*rim;
 vec3 local=transform(pos);float fine=.88+.12*sin(atan(local.z,local.x)*170.);color*=fine;
 }
 float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);color+=(grain-.5)*.025;if(t>=8. || d>=.005) discard; gl_FragColor=vec4(color,1.);
 }`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 try{const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('WebGL link failed');gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 const res=gl.getUniformLocation(program,'resolution'),point=gl.getUniformLocation(program,'pointer'),clock=gl.getUniformLocation(program,'time');let target=[.5,.5],mouse=[.5,.5],elapsed=0,last=0,visible=true,dirty=true,lost=false;
 const resize=()=>{const r=canvas.getBoundingClientRect();const scale=Math.min(devicePixelRatio||1,1.25);canvas.width=Math.round(r.width*scale);canvas.height=Math.round(r.height*scale);gl.viewport(0,0,canvas.width,canvas.height);dirty=true;};new ResizeObserver(resize).observe(canvas);resize();
 $('#home').addEventListener('pointermove',e=>{if(paused)return;const r=canvas.getBoundingClientRect();target=[(e.clientX-r.left)/r.width,1-(e.clientY-r.top)/r.height];$('#coordinates').textContent='X '+target[0].toFixed(2)+' · Y '+target[1].toFixed(2);dirty=true;});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(canvas);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;canvas.style.opacity='0';});canvas.addEventListener('webglcontextrestored',()=>{canvas.style.opacity='';initLens();});
 function frame(now){if(lost)return;requestAnimationFrame(frame);const delta=Math.min((now-last)/1000,.05);last=now;if(document.hidden||!visible)return;if(paused&&!dirty)return;if(!paused)elapsed+=delta;mouse[0]+=(target[0]-mouse[0])*.045;mouse[1]+=(target[1]-mouse[1])*.045;gl.uniform2f(res,canvas.width,canvas.height);gl.uniform2f(point,mouse[0],mouse[1]);gl.uniform1f(clock,elapsed);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);dirty=false;}
 requestAnimationFrame(frame);canvas.dataset.renderer='webgl';
 }catch(e){console.warn('Lens fallback:',e.message);canvas.hidden=true;}
}
initLens();
