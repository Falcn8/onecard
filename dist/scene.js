import * as THREE from './vendor/three.module.js';

export function createPokerScene(host) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8,8,5,-5,.1,80);
  camera.position.set(0,-7,20); camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xf4f7e8,0x1d241b,1.8));
  const key = new THREE.DirectionalLight(0xf3f6dc,2);
  key.position.set(-5,8,12); key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:40});
  key.shadow.bias = -.001; key.shadow.normalBias = .03; scene.add(key);
  const fill = new THREE.DirectionalLight(0xc7dcad,.8);fill.position.set(8,-3,10);scene.add(fill);
  const textureCache = new Map();
  function texture(canvas) { const t = new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t; }
  function rounded(w,h,r) {
    const s=new THREE.Shape();const x=-w/2,y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
  }
  function slab(w,h,r,depth,color) {
    const geometry=new THREE.ExtrudeGeometry(rounded(w,h,r),{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.07,bevelThickness:.07,curveSegments:36});
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.78,metalness:.06}));mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
  }
  const table=new THREE.Group();scene.add(table);
  const base=slab(13.8,7.4,2.5,.32,0x101410);base.position.z=-.45;table.add(base);
  const rail=slab(13.45,7.05,2.35,.14,0x171d18);rail.position.z=-.08;table.add(rail);
  const felt=slab(12.6,6.2,1.95,.04,0x192d23);felt.position.z=.14;table.add(felt);
  // Fine deterministic woven texture: no downloaded artwork or generated bitmap assets.
  const cloth=document.createElement('canvas');cloth.width=cloth.height=128;
  const clothCtx=cloth.getContext('2d');clothCtx.fillStyle='#adb7a3';clothCtx.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=2)for(let x=0;x<128;x+=2){clothCtx.fillStyle=(x+y)%4===0?'#a0aa96':'#b8c0af';clothCtx.fillRect(x,y,1,1);}
  const clothMap=texture(cloth);clothMap.wrapS=clothMap.wrapT=THREE.RepeatWrapping;clothMap.repeat.set(30,20);felt.material.bumpMap=clothMap;felt.material.bumpScale=.025;
  function spade(ctx,x,y,size,color='#20291e') {
    ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-.53);ctx.bezierCurveTo(-.14,-.3,-.53,-.1,-.45,.2);ctx.bezierCurveTo(-.38,.48,-.1,.39,-.05,.23);ctx.bezierCurveTo(-.06,.4,-.12,.48,-.21,.55);ctx.lineTo(.21,.55);ctx.bezierCurveTo(.12,.48,.06,.4,.05,.23);ctx.bezierCurveTo(.1,.39,.38,.48,.45,.2);ctx.bezierCurveTo(.53,-.1,.14,-.3,0,-.53);ctx.fill();ctx.restore();
  }
  function cardTexture(rank,back=false) {
    const cacheKey=back?'back':rank;
    if(textureCache.has(cacheKey))return textureCache.get(cacheKey);
    const c=document.createElement('canvas');c.width=512;c.height=768;const ctx=c.getContext('2d');
    ctx.fillStyle=back?'#e9e5d5':'#faf7ec';ctx.beginPath();ctx.roundRect(0,0,512,768,24);ctx.fill();
    if(back){
      ctx.fillStyle='#26352b';ctx.beginPath();ctx.roundRect(18,18,476,732,14);ctx.fill();ctx.save();ctx.beginPath();ctx.roundRect(26,26,460,716,8);ctx.clip();
      ctx.strokeStyle='#73856155';ctx.lineWidth=2;for(let i=-768;i<768;i+=24){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+768,768);ctx.stroke();ctx.beginPath();ctx.moveTo(i+768,0);ctx.lineTo(i,768);ctx.stroke();}ctx.restore();
      ctx.strokeStyle='#b1c495';ctx.lineWidth=3;ctx.strokeRect(40,40,432,688);ctx.save();ctx.translate(256,370);ctx.rotate(Math.PI/4);ctx.strokeRect(-105,-105,210,210);ctx.strokeRect(-87,-87,174,174);ctx.restore();ctx.fillStyle='#26352b';ctx.fillRect(205,300,102,140);spade(ctx,256,370,100,'#d7f897');ctx.fillStyle='#cad7b7';ctx.font='600 32px Manrope';ctx.textAlign='center';ctx.fillText('ONE CARD',256,670);
    }else{
      const gold='#b69b62',ink='#23382b';
      ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(14,14,484,740,14);ctx.stroke();
      ctx.strokeStyle='#b69b6270';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(25,25,462,718,8);ctx.stroke();
      for(const flip of [false,true]){
        ctx.save();if(flip){ctx.translate(512,768);ctx.rotate(Math.PI);}
        ctx.fillStyle=ink;ctx.font='600 92px Manrope';ctx.textAlign='center';ctx.fillText(rank,65,116);spade(ctx,65,158,40,ink);
        ctx.strokeStyle=gold;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(126,58);ctx.lineTo(192,58);ctx.bezierCurveTo(214,58,222,78,246,78);ctx.lineTo(266,78);ctx.bezierCurveTo(290,78,298,58,320,58);ctx.lineTo(386,58);ctx.stroke();
        spade(ctx,256,58,14,gold);ctx.restore();
      }
      if(Number(rank)){
        const patterns={
          '2':[[256,230],[256,538]],
          '3':[[256,212],[256,384],[256,556]],
          '4':[[174,228],[338,228],[174,540],[338,540]],
          '5':[[174,228],[338,228],[256,384],[174,540],[338,540]],
          '6':[[174,220],[338,220],[174,384],[338,384],[174,548],[338,548]],
          '7':[[174,220],[338,220],[256,302],[174,384],[338,384],[174,548],[338,548]],
          '8':[[174,220],[338,220],[256,302],[174,384],[338,384],[256,466],[174,548],[338,548]],
          '9':[[174,208],[338,208],[174,322],[338,322],[256,384],[174,446],[338,446],[174,560],[338,560]],
          '10':[[174,208],[338,208],[256,265],[174,322],[338,322],[174,446],[338,446],[256,503],[174,560],[338,560]]
        };
        const positions=patterns[rank];const size=Number(rank)<4?94:Number(rank)<9?66:58;
        positions.forEach(([x,y])=>{ctx.save();if(y>384){ctx.translate(x,y);ctx.rotate(Math.PI);spade(ctx,0,0,size,ink);}else spade(ctx,x,y,size,ink);ctx.restore();});
        // Distinct, delicate corner ornaments frame each traditional pip arrangement.
        for(const side of [-1,1]){ctx.save();ctx.translate(256,384);ctx.scale(side,1);ctx.strokeStyle='#b69b6280';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(140,-146);ctx.bezierCurveTo(176,-96,176,96,140,146);ctx.stroke();for(const y of [-168,168]){ctx.save();ctx.translate(144,y);ctx.rotate(Math.PI/4);ctx.strokeRect(-6,-6,12,12);ctx.restore();}ctx.restore();}
      }else if(rank==='A'){
        ctx.save();ctx.translate(256,368);ctx.strokeStyle=gold;ctx.lineWidth=3;
        for(const side of [-1,1]){ctx.save();ctx.scale(side,1);ctx.beginPath();ctx.moveTo(12,166);ctx.bezierCurveTo(210,108,176,-80,58,-144);ctx.bezierCurveTo(110,-66,155,20,64,102);ctx.stroke();for(let i=0;i<7;i++){ctx.save();ctx.translate(112+Math.sin(i*.5)*30,-86+i*34);ctx.rotate(i*.12);ctx.beginPath();ctx.ellipse(0,0,9,24,.6,0,Math.PI*2);ctx.stroke();ctx.restore();}ctx.restore();}
        spade(ctx,0,0,250,ink);spade(ctx,0,-5,206,gold);spade(ctx,0,-7,184,ink);ctx.restore();
        ctx.font='600 28px Manrope';ctx.textAlign='center';ctx.fillStyle=ink;ctx.fillText('ACE OF SPADES',256,604);
      }else{
        ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.strokeRect(132,190,248,388);ctx.strokeStyle='#b69b6266';ctx.strokeRect(142,200,228,368);
        function royal(inverted){
          ctx.save();ctx.translate(256,inverted?476:292);if(inverted)ctx.rotate(Math.PI);
          // An individually drawn jack, queen, or king, mirrored like a traditional court card.
          ctx.fillStyle=ink;ctx.strokeStyle=gold;ctx.lineWidth=3;
          ctx.beginPath();ctx.moveTo(-88,92);ctx.lineTo(-56,40);ctx.lineTo(56,40);ctx.lineTo(88,92);ctx.closePath();ctx.fill();ctx.stroke();
          for(let k=-60;k<=60;k+=24){ctx.beginPath();ctx.moveTo(k,60);ctx.lineTo(k+24,90);ctx.stroke();}
          ctx.fillStyle=rank==='Q'?'#b69b62':ink;ctx.beginPath();ctx.ellipse(0,-7,64,74,0,0,Math.PI*2);ctx.fill();ctx.stroke();
          ctx.fillStyle='#ede3c5';ctx.beginPath();ctx.ellipse(0,0,40,54,0,0,Math.PI*2);ctx.fill();ctx.stroke();
          ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-25,-12);ctx.lineTo(-11,-12);ctx.moveTo(11,-12);ctx.lineTo(25,-12);ctx.moveTo(1,-7);ctx.lineTo(-4,10);ctx.lineTo(8,10);ctx.moveTo(-12,24);ctx.quadraticCurveTo(0,30,12,24);ctx.stroke();
          ctx.fillStyle=ink;ctx.strokeStyle=gold;
          if(rank==='J'){
            ctx.beginPath();ctx.moveTo(-64,-51);ctx.lineTo(-44,-91);ctx.quadraticCurveTo(20,-112,65,-64);ctx.lineTo(66,-47);ctx.closePath();ctx.fill();ctx.stroke();
            ctx.beginPath();ctx.moveTo(17,-74);ctx.bezierCurveTo(70,-160,104,-93,17,-74);ctx.stroke();
          }else{
            ctx.beginPath();ctx.moveTo(-62,-58);ctx.lineTo(-70,-98);ctx.lineTo(-34,-80);ctx.lineTo(0,-115);ctx.lineTo(34,-80);ctx.lineTo(70,-98);ctx.lineTo(62,-58);ctx.closePath();ctx.fill();ctx.stroke();
            for(const x of [-36,0,36]){ctx.fillStyle=gold;ctx.beginPath();ctx.arc(x,-70,5,0,Math.PI*2);ctx.fill();}
          }
          if(rank==='K'){ctx.fillStyle=ink;ctx.beginPath();ctx.moveTo(-36,17);ctx.quadraticCurveTo(0,106,36,17);ctx.quadraticCurveTo(0,42,-36,17);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(71,-30);ctx.lineTo(71,82);ctx.moveTo(55,42);ctx.lineTo(87,42);ctx.stroke();}
          if(rank==='Q'){for(const x of [-53,53]){ctx.fillStyle=gold;ctx.beginPath();ctx.arc(x,16,7,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.moveTo(-44,44);ctx.quadraticCurveTo(0,82,44,44);ctx.stroke();}
          ctx.restore();
        }
        royal(false);royal(true);ctx.fillStyle='#faf7ec';ctx.beginPath();ctx.arc(256,384,26,0,Math.PI*2);ctx.fill();spade(ctx,256,384,34,ink);
      }
    }
    const t=texture(c);textureCache.set(cacheKey,t);return t;
  }
  const cards=[];
  const edgeMaterial=new THREE.MeshStandardMaterial({color:0xe2e5d7,roughness:.65});
  const backTexture=cardTexture(null,true);
  for(let i=0;i<2;i++){
    const front=new THREE.MeshBasicMaterial({map:cardTexture('A'),toneMapped:false});
    const back=new THREE.MeshBasicMaterial({map:backTexture,toneMapped:false});
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(2.55,3.65,.055),[edgeMaterial,edgeMaterial,edgeMaterial,edgeMaterial,front,back]);
    mesh.castShadow=true;mesh.receiveShadow=false;
    const group=new THREE.Group();group.add(mesh);group.rotation.y=Math.PI;scene.add(group);
    cards.push({group,mesh,front,target:Math.PI,rank:null,hover:false,homeX:0,homeY:0,dealAt:-1000});
  }
  function readout(width=3.2) {
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const ctx=canvas.getContext('2d');
    const map=texture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,transparent:true,depthTest:false,toneMapped:false}));sprite.scale.set(width,width/4,1);sprite.renderOrder=10;scene.add(sprite);
    return {sprite,set(text,color='#eef2df',size=64){ctx.clearRect(0,0,768,192);ctx.font=`600 ${size}px Manrope`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,96);map.needsUpdate=true;}};
  }
  const labels=[readout(3.6),readout(3.6)],stakes=[readout(3.2),readout(3.2)];
  const potLabel=readout(3),potValue=readout(3.2),credit=readout(4.8),chipCaptions=[readout(3.4),readout(3.4)];
  credit.sprite.visible=false;
  potLabel.set('POT','#c9d3be',80);potValue.set('$0', '#f3f5e9',120);
  const chips=new THREE.Group();scene.add(chips);
  const chipParts=[];
  const chipGeo=new THREE.CylinderGeometry(.48,.48,.16,64);
  const chipMaterials=[new THREE.MeshStandardMaterial({color:0xd7f897,roughness:.48,metalness:.1}),new THREE.MeshStandardMaterial({color:0xa8adb4,roughness:.48,metalness:.1})];
  for(let i=0;i<4;i++){
    const owner=i<2?0:1,layer=i%2;
    const g=new THREE.Group();const disk=new THREE.Mesh(chipGeo,chipMaterials[owner]);disk.rotation.x=Math.PI/2;disk.castShadow=true;g.add(disk);
    for(let k=0;k<8;k++){const notch=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.016),new THREE.MeshStandardMaterial({color:owner?0x41464e:0x324428,roughness:.8}));const a=k*Math.PI/4;notch.position.set(Math.sin(a)*.39,Math.cos(a)*.39,.09);notch.rotation.z=-a;g.add(notch);}
    const faceCanvas=document.createElement('canvas');faceCanvas.width=faceCanvas.height=128;const ctx=faceCanvas.getContext('2d');ctx.clearRect(0,0,128,128);ctx.font='600 80px Manrope';ctx.fillStyle='#2b3a24';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('1',64,68);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(.42,.42),new THREE.MeshBasicMaterial({map:texture(faceCanvas),transparent:true,toneMapped:false}));face.position.z=.095;g.add(face);g.position.set((owner?1:-1)*(.95+layer*.20),layer*.10,.08+layer*.17);chips.add(g);chipParts.push(g);
  }
  let state={phase:'idle',player:null,opponent:null,pot:0,money:0,hand:0,playerStake:0,opponentStake:0};
  let portrait=false,disposed=false,frame,oldTime=performance.now(),resultAt=-10000,resultBaseY=-1.85;
  function layout() {
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h,false);const aspect=w/h;portrait=aspect<1.3;
    const viewHeight=Math.max(portrait?8.8:8.6,(portrait?9.3:16)/aspect);const viewWidth=viewHeight*aspect;
    camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();
    const tall = portrait && aspect < .85;
    table.scale.set(portrait?.62:1,tall?Math.min(1.65,viewHeight/7.4*.88):portrait?1.14:1,1);
    cards.forEach((card,i)=>{card.homeX=(i?1:-1)*(portrait?2.1:3.7);card.homeY=portrait?-.35:.25;card.group.scale.setScalar(tall?.94:portrait?.74:1);card.group.position.set(card.homeX,card.homeY,.72);labels[i].sprite.position.set(card.homeX,tall?-2.65:portrait?-2.35:-2.25,.8);stakes[i].sprite.position.set(card.homeX,tall?-3.25:portrait?-2.95:-2.85,.8);});
    potLabel.sprite.position.set(0,tall?4.1:portrait?3.3:2.15,1);potValue.sprite.position.set(0,tall?3.4:portrait?2.65:1.4,1);chips.position.set(0,tall?2.1:portrait?1.5:-.15,.25);
    chipCaptions.forEach((label,i)=>label.sprite.position.set((i?1:-1)*1.3,tall?2.9:portrait?2.12:.65,1));
    resultBaseY=tall?-4.1:portrait?-3.7:-1.85;credit.sprite.position.set(0,resultBaseY,1);
    chips.scale.setScalar(portrait?1.05:1.2);
  }
  function sync(next) {
    const isNew=next.hand!==state.hand || next.phase==='idle'&&state.phase!=='idle';
    const completed=next.phase==='complete'&&(state.phase!=='complete'||next.hand!==state.hand);
    state=next;
    cards.forEach((card,i)=>{
      const rank=i?next.opponent:next.player;
      if(isNew){card.group.rotation.y=Math.PI;card.dealAt=performance.now();}
      if(rank!==null&&rank!==card.rank){card.rank=rank;card.front.map=cardTexture(rank);card.front.needsUpdate=true;}
      card.target=rank===null?Math.PI:0;
    });
    labels[0].set('YOU','#e8f4d5',80);labels[1].set('COMPUTER','#d6d9df',80);
    stakes[0].set(next.playerStake?`$${next.playerStake} in`:'Your seat','#c0c9b7',72);stakes[1].set(next.opponentStake?`$${next.opponentStake} in`:'Ready','#c0c3ca',72);
    potValue.set(`$${next.pot}`,'#f3f5e9',120);
    chipCaptions[0].set(`${next.playerStake} ${next.playerStake===1?'chip':'chips'}`,'#d7f897',84);
    chipCaptions[1].set(`${next.opponentStake} ${next.opponentStake===1?'chip':'chips'}`,'#d1d5dc',84);
    chipCaptions.forEach(c=>c.sprite.visible=next.phase!=='idle');
    chipParts.forEach((chip,i)=>chip.visible=i<2?i<next.playerStake:i-2<next.opponentStake);
    if(completed){resultAt=performance.now();credit.set(`${next.delta>0?'+':'−'}$${Math.abs(next.delta)}`,next.delta<0?'#f4a799':'#d7f897',136);credit.sprite.visible=true;}
    else if(next.phase!=='complete'){credit.sprite.visible=false;resultAt=-10000;}
  }
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function hover(event) {const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(cards.map(c=>c.mesh));cards.forEach(c=>c.hover=hits.some(h=>h.object===c.mesh));}
  renderer.domElement.addEventListener('pointermove',hover);
  renderer.domElement.addEventListener('pointerleave',()=>cards.forEach(c=>c.hover=false));
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();host.parentElement.classList.remove('webgl-ready');const error=document.querySelector('#scene-error');error.hidden=false;error.textContent='The 3D view paused. The table controls still work.';});
  function animate(now) {
    if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min((now-oldTime)/1000,.1);oldTime=now;if(document.hidden)return;
    cards.forEach((c,i)=>{
      const easing=reduced.matches?1:1-Math.exp(-dt*9);
      c.group.rotation.y+=(c.target-c.group.rotation.y)*easing;
      c.group.rotation.z+=((i?-.075:.075)+(c.hover?.025:0)-c.group.rotation.z)*easing;
      c.group.rotation.x+=((c.hover?.045:0)-c.group.rotation.x)*easing;
      const age=(now-c.dealAt)/1000;
      c.group.position.x=c.homeX+(reduced.matches?0:Math.exp(-Math.max(age,0)*9)*(i?1:-1)*1.3);
      c.group.position.y=c.homeY+(c.hover?.12:0);
      c.group.position.z=.38+Math.abs(Math.sin(c.group.rotation.y))*1.45+(c.hover?.1:0);
    });
    const resultAge=(now-resultAt)/1000;
    if(credit.sprite.visible){
      if(resultAge>=2.3)credit.sprite.visible=false;
      else if(reduced.matches){credit.sprite.material.opacity=1;credit.sprite.position.y=resultBaseY;}
      else{
        const enter=Math.min(1,resultAge/.3),leave=Math.max(0,Math.min(1,(resultAge-1.85)/.45));
        const easedEnter=1-Math.pow(1-enter,3),easedLeave=leave*leave;
        credit.sprite.material.opacity=easedEnter*(1-easedLeave);
        credit.sprite.position.y=resultBaseY-.4*(1-easedEnter)-.4*easedLeave;
      }
    }
    renderer.render(scene,camera);
  }
  const observer=new ResizeObserver(layout);observer.observe(host);layout();sync(state);animate(performance.now());host.parentElement.classList.add('webgl-ready');
  return {sync,dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();scene.traverse(obj=>{obj.geometry?.dispose();if(obj.material)for(const m of Array.isArray(obj.material)?obj.material:[obj.material])m.dispose();});textureCache.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();}};
}
