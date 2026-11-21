(() => {
  const canvas = document.querySelector('#liquid');
  const name = document.querySelector('.hero-name');
  const pointer = {x: .65, y: .35};
  const smooth = {...pointer};
  const waves = new Float32Array(12);
  let nextWave = 0, time = 0, frame = 0, previous = 0;
  const still = () => document.body.classList.contains('motion-paused');
  const aim = event => {
    if (!still()) {
      const rect = name.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < innerHeight) {
        name.style.setProperty('--light-x', (event.clientX - rect.left) + 'px');
        name.style.setProperty('--light-y', (event.clientY - rect.top) + 'px');
        name.style.setProperty('--ray-angle', (10 + 22 * event.clientX / innerWidth) + 'deg');
      }
    }
    pointer.x = event.clientX / innerWidth;
    pointer.y = 1 - event.clientY / innerHeight;
  };
  window.addEventListener('pointermove', aim, {passive:true});
  window.addEventListener('pointerdown', aim, {passive:true});
  window.addEventListener('click', event => {
    if (still() || !event.detail) return;
    aim(event);
    const index = (nextWave++ % 4) * 3;
    waves.set([pointer.x, pointer.y, time + .001], index);
  }, true);
  const gl = canvas.getContext('webgl', {alpha:false, antialias:false, depth:false});
  function useFallback() {
    document.body.classList.add('liquid-fallback');
    window.addEventListener('pointermove', event => {
      if (still()) return;
      const x = event.clientX / innerWidth * 100;
      document.body.style.setProperty('--sway', x + '%');
    }, {passive:true});
    window.addEventListener('click', event => {
      if (still() || !event.detail) return;
      const ring = document.createElement('i');
      ring.className = 'fallback-wave';
      ring.setAttribute('aria-hidden','true');
      ring.style.left = event.clientX + 'px';
      ring.style.top = event.clientY + 'px';
      document.body.append(ring);
      ring.addEventListener('animationend', () => ring.remove(), {once:true});
    }, true);
  }
  if (!gl) {useFallback();return;}
  const vertex = 'attribute vec2 a; void main(){gl_Position=vec4(a,0.,1.);}';
  const fragment = `precision mediump float;
  uniform vec2 resolution, cursor;
  uniform float clock;
  uniform vec3 waves[4];
  float relief(vec2 p){
    float s=clock*.12;
    p+=.19*sin(p.yx*2.8+vec2(s,-s));
    p+=.13*sin(p.yx*4.2+vec2(-s,s*.7));
    return .28*sin(p.x*3.1+p.y*1.9+s)+.16*cos(p.y*4.6-p.x*2.2-s);
  }
  void main(){
    vec2 uv=gl_FragCoord.xy/resolution;
    vec2 ratio=vec2(resolution.x/resolution.y,1.);
    vec2 pos=uv*ratio;
    vec2 delta=(uv-cursor)*ratio;
    vec2 p=pos+.17*delta*exp(-2.*dot(delta,delta))+.12*cursor;
    float h=relief(p);
    vec2 slope=vec2(relief(p+vec2(.009,0.))-h,relief(p+vec2(0.,.009))-h)/.009;
    for(int i=0;i<4;i++){
      float age=clock-waves[i].z;
      vec2 d=(uv-waves[i].xy)*ratio;
      float r=length(d), ring=r-age*.68;
      if(waves[i].z>0. && age>=0. && age<3.)
        slope+=d/(r+.001)*cos(ring*45.)*exp(-abs(ring)*12.-age*.95)*1.9;
    }
    vec3 n=normalize(vec3(-slope,.85));
    vec3 reflected=reflect(vec3(0.,0.,-1.),n);
    float band=pow(max(0.,1.-abs(reflected.y+.28*reflected.x-.22)),9.);
    float edge=pow(max(0.,1.-abs(reflected.x-reflected.y*.55+.62)),20.);
    vec3 color=vec3(.018,.022,.028)+vec3(.145,.166,.181)*band+vec3(.097,.069,.048)*edge;
    gl_FragColor=vec4(color,1.);
  }`;
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader,source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) return null;
    return shader;
  }
  function start(){
    const v=compile(gl.VERTEX_SHADER,vertex), f=compile(gl.FRAGMENT_SHADER,fragment);
    if (!v || !f) {useFallback();return;}
    const program=gl.createProgram();
    gl.attachShader(program,v); gl.attachShader(program,f); gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) {useFallback();return;}
    gl.useProgram(program);
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(program,'a');
    gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    const loc=name=>gl.getUniformLocation(program,name);
    const res=loc('resolution'), cur=loc('cursor'), clk=loc('clock'), wave=loc('waves[0]');
    function render(now){
      frame=0;
      if(document.hidden || gl.isContextLost()) return;
      const scale=Math.min(1,1100/Math.max(innerWidth,innerHeight));
      const w=Math.max(1,Math.round(innerWidth*scale)), h=Math.max(1,Math.round(innerHeight*scale));
      if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
      if(!still()){
        time+=Math.min((now-(previous||now))/1000,.05);
        smooth.x+=(pointer.x-smooth.x)*.085; smooth.y+=(pointer.y-smooth.y)*.085;
      }
      previous=now;
      gl.uniform2f(res,w,h); gl.uniform2f(cur,smooth.x,smooth.y); gl.uniform1f(clk,time);
      gl.uniform3fv(wave,waves); gl.drawArrays(gl.TRIANGLES,0,3);
      if(!still()) wake();
    }
    function wake(){if(!frame && !document.hidden) frame=requestAnimationFrame(render);}
    const changes=new MutationObserver(wake);
    changes.observe(document.body,{attributes:true,attributeFilter:['class']});
    window.addEventListener('resize',wake);document.addEventListener('visibilitychange',wake);
    canvas.addEventListener('webglcontextlost',event=>{
      event.preventDefault();cancelAnimationFrame(frame);frame=0;changes.disconnect();
      window.removeEventListener('resize',wake);document.removeEventListener('visibilitychange',wake);
    },{once:true});
    wake();
  }
  canvas.addEventListener('webglcontextrestored',start);start();
})();
