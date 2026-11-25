import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { PRODUCTS } from "./products.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* IMPORTANT: Replace the placeholder with your WhatsApp Business number.
   Use country code + number only, without +, spaces or dashes. Example format: 91XXXXXXXXXX */
const STORE_CONFIG = {
  whatsappNumber: "918308801911",
  supabaseUrl: "https://tuqsdtgjzvnblyquqhli.supabase.co",
  supabaseAnonKey: "sb_publishable_1Ge-LatRA1oTMKgKXsi9NQ_xzFGTJCs",
  storeName: "ROYALRELICS",
  deliveryArea: "Kolhapur",
  currency: "INR"
};

const $ = (id) => document.getElementById(id);
const productGrid = $("productGrid");
let activeProduct = null;
let currentFilter = "ALL";
let renderer, scene, camera, clock, initialized = false;
let viewerOpen = false, mode = "free", tourIndex = 0, tourPlaying = false;
let tourTimer = 0, tourElapsed = 0, guidedFrom = null, guidedTo = null;
let yaw = 0, pitch = 0, pointerDown = false, lastPointer = {x:0,y:0}, pointerStart = {x:0,y:0};
const keys = {}, touch = {forward:false,back:false,left:false,right:false};
const exhibits = [], raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
const isMobile = matchMedia("(pointer: coarse)").matches || innerWidth < 700;
const tourSpeed = () => Number($("tourSpeed").value || 1);

function moneyText(p){ return p.price; }
function whatsappUrl(message){
  if(!/^\d{10,15}$/.test(STORE_CONFIG.whatsappNumber)){
    alert("WhatsApp number अजून सेट केलेला नाही. app.js मध्ये STORE_CONFIG.whatsappNumber मध्ये तुमचा WhatsApp Business नंबर country code सह टाका.");
    return null;
  }
  return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
function sendWhatsApp(message){
  const url = whatsappUrl(message);
  if(url) window.open(url,"_blank","noopener");
}
function productMessage(p){
  return `Hello ${STORE_CONFIG.storeName}, I am interested in this product:\n\n${p.name}\nProduct Code: ${p.id}\nCategory: ${p.category}\nDisplayed Price: ${p.price}\n\nPlease confirm availability, final price, delivery to ${STORE_CONFIG.deliveryArea}, and payment instructions.`;
}

function renderProducts(){
  const term = $("productSearch").value.trim().toLowerCase();
  const list = PRODUCTS.filter(p => (currentFilter==="ALL" || p.category===currentFilter) &&
    (p.name+" "+p.id+" "+p.colour+" "+p.design).toLowerCase().includes(term));
  productGrid.innerHTML = list.map(p=>`
    <article class="product-card" tabindex="0" data-id="${p.id}">
      <div class="product-image"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>
      <div class="product-meta"><span class="cat">${p.category} / ${p.id}</span><h3>${p.name}</h3>
      <p>${p.colour} · ${p.design}</p><div class="product-bottom"><b>${moneyText(p)}</b><span>VIEW DETAILS ↗</span></div></div>
    </article>`).join("");
  productGrid.querySelectorAll(".product-card").forEach(card=>{
    const open=()=>showProduct(PRODUCTS.find(p=>p.id===card.dataset.id));
    card.addEventListener("click",open);
    card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});
  });
  $("allCount").textContent=PRODUCTS.length;
}
function showProduct(p){
  if(!p)return; activeProduct=p;
  $("dialogImage").src=p.image; $("dialogImage").alt=p.name;
  $("dialogCategory").textContent=p.category;
  $("dialogName").textContent=p.name; $("dialogCode").textContent=p.id;
  $("dialogPrice").textContent=p.price; $("dialogDescription").textContent=p.description;
  $("dialogColour").textContent=p.colour; $("dialogDesign").textContent=p.design;
  $("dialogFinish").textContent=p.finish; $("dialogLens").textContent=p.lens;
  $("productDialog").classList.add("open"); $("productDialog").setAttribute("aria-hidden","false");
}
function closeDialog(id){$(id).classList.remove("open");$(id).setAttribute("aria-hidden","true");}
$("orderProduct").addEventListener("click",()=>{if(activeProduct)sendWhatsApp(productMessage(activeProduct));});
$("generalWhatsApp").addEventListener("click",e=>{e.preventDefault();sendWhatsApp(`Hello ${STORE_CONFIG.storeName}, I would like to know more about your eyewear collection and ordering process.`);});
$("footerWhatsApp").addEventListener("click",e=>{e.preventDefault();sendWhatsApp(`Hello ${STORE_CONFIG.storeName}, I have a question about your collection.`);});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeDialog(b.dataset.close)));
document.querySelectorAll(".overlay").forEach(o=>o.addEventListener("click",e=>{if(e.target===o)closeDialog(o.id);}));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){document.querySelectorAll(".overlay.open").forEach(o=>closeDialog(o.id));}});
document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");currentFilter=b.dataset.filter;renderProducts();
}));
$("productSearch").addEventListener("input",renderProducts);

// Supabase email/password authentication. Add your project URL and publishable/anon key above.
let supabase = null;
let authMode = "login";
function setAuthMode(mode){
  authMode=mode;
  const signup=mode==="signup";
  $("showLogin").classList.toggle("active",!signup);
  $("showSignup").classList.toggle("active",signup);
  $("nameField").hidden=!signup;
  $("authTitle").textContent=signup?"Create your account.":"Welcome back.";
  $("authIntro").textContent=signup?"Join ROYALRELICS to create your customer account.":"Sign in to your ROYALRELICS account.";
  $("authSubmit").textContent=signup?"CREATE ACCOUNT":"LOGIN";
  $("authPassword").autocomplete=signup?"new-password":"current-password";
  $("authMessage").textContent="";$("authMessage").classList.remove("error");
}
function openAuth(){
  $("authDialog").classList.add("open");$("authDialog").setAttribute("aria-hidden","false");
  if(!supabase){$("authMessage").textContent="Setup required: add your Supabase Project URL and publishable/anon key in app.js first.";$("authMessage").classList.add("error");}
}
function updateAuthUI(user){
  const login=$("accountButton"),logout=$("signOutButton");
  if(user){login.textContent=(user.user_metadata?.full_name||user.email||"MY ACCOUNT").toUpperCase();login.title=user.email||"Signed in";logout.hidden=false;}
  else{login.textContent="LOGIN / SIGN UP";login.title="Customer account";logout.hidden=true;}
}
try{
  if (
  STORE_CONFIG.supabaseUrl.startsWith("https://") &&
  (
    STORE_CONFIG.supabaseAnonKey.startsWith("sb_publishable_") ||
    STORE_CONFIG.supabaseAnonKey.startsWith("eyJ")
  )
) {
  supabase = createClient(
    STORE_CONFIG.supabaseUrl,
    STORE_CONFIG.supabaseAnonKey
  );

  const { data: { session } } = await supabase.auth.getSession();
  updateAuthUI(session?.user || null);

  supabase.auth.onAuthStateChange((_event, session) =>
    updateAuthUI(session?.user || null)
  );
}{
    supabase=createClient(STORE_CONFIG.supabaseUrl,STORE_CONFIG.supabaseAnonKey);
    const {data:{session}}=await supabase.auth.getSession();updateAuthUI(session?.user||null);
    supabase.auth.onAuthStateChange((_event,session)=>updateAuthUI(session?.user||null));
  }
}catch(err){console.error("Supabase initialization error:",err);}
$("accountButton").addEventListener("click",()=>{setAuthMode("login");openAuth();});
$("signOutButton").addEventListener("click",async()=>{
  if(!supabase){openAuth();return;}
  const {error}=await supabase.auth.signOut();
  if(error)alert(error.message);else alert("You have been signed out.");
});
$("showLogin").addEventListener("click",()=>setAuthMode("login"));
$("showSignup").addEventListener("click",()=>setAuthMode("signup"));
$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!supabase){openAuth();return;}
  const email=$("authEmail").value.trim();const password=$("authPassword").value;
  const message=$("authMessage");message.classList.remove("error");message.textContent="Please wait…";
  try{
    if(authMode==="signup"){
      const fullName=$("authName").value.trim();
      if(!fullName){message.textContent="Please enter your name.";message.classList.add("error");return;}
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName}}});
      if(error)throw error;
      message.textContent=data.session?"Account created successfully. You are now signed in.":"Account created. Check your email for the confirmation link, then log in.";
      if(data.session)setTimeout(()=>closeDialog("authDialog"),1200);
    }else{
      const {data,error}=await supabase.auth.signInWithPassword({email,password});
      if(error)throw error;
      updateAuthUI(data.user);message.textContent="Login successful. Welcome to ROYALRELICS.";
      setTimeout(()=>closeDialog("authDialog"),900);
    }
  }catch(err){message.textContent=err.message||"Authentication failed. Please try again.";message.classList.add("error");}
});

const policies = {
 terms: ["Terms & Conditions",`
 <p>These terms are a starter policy for the ROYALRELICS website. Review and update them to match your actual business operations before publishing.</p>
 <h3>Product information</h3><p>Product photographs are for display and may show slight colour differences due to screens and lighting. Frame measurements, material, lens type, stock and final price must be confirmed with ROYALRELICS before an order is accepted.</p>
 <h3>Orders</h3><p>A WhatsApp enquiry is not a confirmed order. An order is accepted only after ROYALRELICS confirms product availability, final price, delivery details and payment instructions in writing.</p>
 <h3>Pricing and payment</h3><p>Displayed prices are indicative until confirmed. Payment is coordinated manually through WhatsApp. ROYALRELICS will share the accepted payment method and amount directly. Never share your UPI PIN, OTP, card PIN or banking password with anyone.</p>
 <h3>Delivery</h3><p>Delivery is currently intended for Kolhapur only, subject to serviceability and confirmation. Delivery charges and estimated timelines are shared before payment/order confirmation.</p>
 <h3>Contact</h3><p>For questions about these terms, contact ROYALRELICS through the WhatsApp link on this website.</p>`],
 privacy: ["Privacy Policy",`
 <p>This starter policy explains the information that may be used to respond to an order enquiry. Please update it to reflect the actual tools and records your business uses.</p>
 <h3>Information you provide</h3><p>When you contact us on WhatsApp, you may share your name, phone number, selected product, delivery area and delivery details. Please share only information needed to process your enquiry or order.</p>
 <h3>How information is used</h3><p>Information is used to answer enquiries, confirm product availability, coordinate payment and delivery, and provide order support. This website does not ask for card numbers, UPI PINs, passwords or OTPs.</p>
 <h3>Third-party services</h3><p>WhatsApp is a third-party messaging service. When you choose to open WhatsApp, its own terms and privacy policy apply. This website does not process payments or store payment credentials.</p>
 <h3>Data retention and requests</h3><p>Order-related messages may remain in WhatsApp and business records for customer support and accounting. To request correction or deletion of information held by ROYALRELICS, contact us through WhatsApp, subject to records we must retain by law.</p>
 <h3>Updates</h3><p>This policy should be reviewed whenever the business adds analytics, advertising, online payments, customer accounts or other data collection.</p>`],
 cancellation: ["Order Cancellation & Returns",`
 <p>Please read this policy before placing an order. The final policy must be checked against your supplier terms and applicable consumer law before launch.</p>
 <h3>Before order confirmation</h3><p>You may withdraw a WhatsApp enquiry at any time before ROYALRELICS confirms the order.</p>
 <h3>After order confirmation</h3><p>Contact us on WhatsApp as soon as possible with your order reference. Cancellation requests are reviewed based on whether the item has been procured, packed or dispatched. We will confirm whether cancellation is possible and any applicable refund timeline before proceeding.</p>
 <h3>Damaged, incorrect or defective items</h3><p>If an item arrives damaged, defective or different from what was confirmed, contact us promptly with clear photographs and the order details so we can review and resolve the issue under applicable law.</p>
 <h3>Change of mind</h3><p>Do not assume that change-of-mind returns are accepted. Confirm the applicable return/exchange terms in writing before payment.</p>
 <h3>Refunds</h3><p>Where a refund is approved, the amount and method/timeline will be communicated directly. Never share a UPI PIN or OTP to receive a refund.</p>`],
 shipping: ["Shipping & Delivery",`
 <p>Current intended service area: Kolhapur. Please confirm availability for your location on WhatsApp before payment.</p>
 <h3>Delivery charges</h3><p>Any delivery or courier charge will be communicated before order acceptance.</p>
 <h3>Delivery estimates</h3><p>Delivery estimates depend on stock, procurement and courier availability. A delivery estimate is shared when the order is confirmed; it is not a guaranteed date unless expressly confirmed.</p>
 <h3>Address and availability</h3><p>Please provide an accurate delivery address and reachable phone number in WhatsApp after the order is confirmed. If a delivery attempt fails, we will contact you to coordinate the next step.</p>`]
};
document.querySelectorAll(".footer-links a").forEach(a=>{
  const key=a.getAttribute("href").slice(1);
  if(policies[key])a.addEventListener("click",e=>{e.preventDefault();$("policyTitle").textContent=policies[key][0];$("policyBody").innerHTML=policies[key][1];$("policyDialog").classList.add("open");$("policyDialog").setAttribute("aria-hidden","false");});
});

$("mobileMenu").addEventListener("click",()=>{$("mainNav").classList.toggle("open");});
$("mainNav").querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>$("mainNav").classList.remove("open")));

/* 3D museum */
function box(w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;scene.add(m);return m;}
function makeFrame(p,x,y,z,rot){
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;
 const gold=new THREE.MeshStandardMaterial({color:0xb69a5b,metalness:.65,roughness:.3});
 const backing=new THREE.MeshStandardMaterial({color:0xfaf9f5,roughness:.8});
 const frame=new THREE.Mesh(new THREE.BoxGeometry(2.15,1.55,.14),gold);g.add(frame);
 const inset=new THREE.Mesh(new THREE.BoxGeometry(1.98,1.38,.04),backing);inset.position.z=.09;g.add(inset);
 const tex=new THREE.TextureLoader().load(p.image, t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;});
 const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.02,side:THREE.DoubleSide,depthWrite:false});
 const img=new THREE.Mesh(new THREE.PlaneGeometry(1.86,1.05),mat);img.position.set(0,.02,.125);img.renderOrder=2;g.add(img);
 const plaque=new THREE.Mesh(new THREE.PlaneGeometry(1.95,.25),new THREE.MeshBasicMaterial({map:labelTexture(p.name+"  /  "+p.price)}));
 plaque.position.set(0,-.92,.14);g.add(plaque);
 g.userData.product=p;scene.add(g);exhibits.push(g);return g;
}
function labelTexture(text){
 const c=document.createElement("canvas");c.width=1024;c.height=128;const x=c.getContext("2d");
 x.fillStyle="#f7f5ee";x.fillRect(0,0,1024,128);x.fillStyle="#25231e";x.font="bold 34px Arial";x.textAlign="center";x.fillText(text.toUpperCase(),512,78);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function buildScene(){
 scene=new THREE.Scene();scene.background=new THREE.Color("#efeee9");scene.fog=new THREE.Fog("#efeee9",24,48);
 camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.1,100);camera.position.set(0,1.65,9.6);camera.rotation.order="YXZ";
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 $("threeHost").appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xffffff,0xd7d0c0,1.8));
 const key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(-4,9,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
 const warm=new THREE.PointLight(0xffedc9,90,22);warm.position.set(0,4.3,-5);scene.add(warm);
 const wall=new THREE.MeshStandardMaterial({color:"#faf9f5",roughness:.92}),side=new THREE.MeshStandardMaterial({color:"#f0eee7",roughness:.92}),ceiling=new THREE.MeshStandardMaterial({color:"#ffffff",roughness:.96}),gold=new THREE.MeshStandardMaterial({color:0xb69a5b,metalness:.55,roughness:.4});
 const floorCanvas=document.createElement("canvas");floorCanvas.width=1024;floorCanvas.height=1024;const cx=floorCanvas.getContext("2d");cx.fillStyle="#e9e6de";cx.fillRect(0,0,1024,1024);cx.strokeStyle="#c9c2b4";cx.lineWidth=3;for(let i=0;i<=4;i++){cx.beginPath();cx.moveTo(i*256,0);cx.lineTo(i*256,1024);cx.stroke();cx.beginPath();cx.moveTo(0,i*256);cx.lineTo(1024,i*256);cx.stroke();}
 const ft=new THREE.CanvasTexture(floorCanvas);ft.wrapS=ft.wrapT=THREE.RepeatWrapping;ft.repeat.set(2,3);ft.colorSpace=THREE.SRGBColorSpace;
 const floor=new THREE.MeshStandardMaterial({map:ft,roughness:.45,metalness:.02});
 box(18,.22,25,0,-.12,0,floor);box(18,.2,25,0,5.2,0,ceiling);box(18,5,.25,0,2.5,-12.5,wall);box(18,5,.25,0,2.5,12.5,wall);box(.25,5,25,-9,2.5,0,side);box(.25,5,25,9,2.5,0,side);
 box(17.8,.13,.12,0,.15,-12.32,gold);box(17.8,.13,.12,0,.15,12.32,gold);box(.12,.13,24,-8.82,.15,0,gold);box(.12,.13,24,8.82,.15,0,gold);
 // Back wall 6, left wall 4, right wall 4 = 14 products, mixed together.
 const back=PRODUCTS.slice(0,6), left=PRODUCTS.slice(6,10), right=PRODUCTS.slice(10,14);
 back.forEach((p,i)=>makeFrame(p,-7.2+i*2.88,2.75,-12.32,0));
 left.forEach((p,i)=>makeFrame(p,-8.82,2.65,7.2-i*4.75,Math.PI/2));
 right.forEach((p,i)=>makeFrame(p,8.82,2.65,-7.2+i*4.75,-Math.PI/2));
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.5,.8),new THREE.MeshBasicMaterial({map:labelTexture("ROYALRELICS  /  THE EYEWEAR MUSEUM")}));
 sign.position.set(0,4.25,-12.34);scene.add(sign);
 clock=new THREE.Clock();initialized=true;
 renderer.domElement.addEventListener("pointerdown",onCanvasDown);
 renderer.domElement.addEventListener("pointermove",onCanvasMove);
 renderer.domElement.addEventListener("pointerup",onCanvasUp);
 renderer.domElement.addEventListener("pointercancel",onCanvasUp);
 animate();
}
function exhibitCamera(index){
 const g=exhibits[index], p=g.position;
 if(Math.abs(g.rotation.y)<.1) return {pos:new THREE.Vector3(p.x,1.65,-8.2),look:new THREE.Vector3(p.x,2.7,-12.2)};
 if(g.position.x<0) return {pos:new THREE.Vector3(-6.4,1.65,p.z),look:new THREE.Vector3(-8.7,2.65,p.z)};
 return {pos:new THREE.Vector3(6.4,1.65,p.z),look:new THREE.Vector3(8.7,2.65,p.z)};
}
function setMode(m){
 mode=m; $("freeMode").classList.toggle("active",m==="free");$("guidedMode").classList.toggle("active",m==="guided");
 $("tourActions").classList.toggle("show",m==="guided");$("viewerStatus").textContent=m==="free"?"FREE EXPLORE":"GUIDED TOUR";
 if(m==="guided"){stopTour();tourIndex=0;goToTourIndex(0,false);$("tourProgress").textContent=`Exhibit 1 of ${exhibits.length} · ${exhibits[0].userData.product.name}`;}
 else {stopTour();camera.position.set(0,1.65,9.6);yaw=0;pitch=0;camera.rotation.set(0,0,0);}
}
function goToTourIndex(i, play = true) {
  tourIndex = (i + exhibits.length) % exhibits.length;

  const t = exhibitCamera(tourIndex);

  guidedFrom = {
    pos: camera.position.clone(),
    quat: camera.quaternion.clone()
  };

  // Use PerspectiveCamera so the viewing direction is correct
  const temp = new THREE.PerspectiveCamera();
  temp.position.copy(t.pos);
  temp.lookAt(t.look);

  guidedTo = {
    pos: t.pos,
    quat: temp.quaternion.clone()
  };

  tourElapsed = 0;

  $("tourProgress").textContent =
    `Exhibit ${tourIndex + 1} of ${exhibits.length} · ${exhibits[tourIndex].userData.product.name}`;

  $("tourProgressBar").style.width =
    `${((tourIndex + 1) / exhibits.length) * 100}%`;

  if (play) {
    tourPlaying = true;
    $("tourPlay").textContent = "PAUSE TOUR ❚❚";
  }
}
function stopTour(){tourPlaying=false;guidedFrom=null;guidedTo=null;$("tourPlay").textContent="START TOUR ▶";}
function advanceTour(delta){goToTourIndex(tourIndex+delta,true);}
function animate(){
 if(!viewerOpen)return;requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.05);
 if(mode==="free"){
  const f=(keys.KeyW||keys.ArrowUp||touch.forward?1:0)-(keys.KeyS||keys.ArrowDown||touch.back?1:0);
  const s=(keys.KeyD||keys.ArrowRight||touch.right?1:0)-(keys.KeyA||keys.ArrowLeft||touch.left?1:0);
  if(f||s){const v=new THREE.Vector3(s,0,-f).normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);camera.position.addScaledVector(v,dt*3);camera.position.x=THREE.MathUtils.clamp(camera.position.x,-8.1,8.1);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-11.2,11.2);}
  camera.rotation.set(pitch,yaw,0,"YXZ");
 } else if(mode==="guided" && guidedTo && guidedFrom){
  tourElapsed+=dt*tourSpeed();const k=Math.min(tourElapsed/2.1,1);camera.position.lerpVectors(guidedFrom.pos,guidedTo.pos,k);camera.quaternion.copy(guidedFrom.quat).slerp(guidedTo.quat,k);
  if(k>=1 && tourPlaying){tourTimer+=dt*tourSpeed();if(tourTimer>3.4){tourTimer=0;advanceTour(1);}}
 }
 renderer.render(scene,camera);
}
function onCanvasDown(e){
 if(mode==="guided")return;
 pointerDown=true;lastPointer={x:e.clientX,y:e.clientY};pointerStart={x:e.clientX,y:e.clientY};
 if(!isMobile && renderer.domElement.requestPointerLock && e.button===0){renderer.domElement.requestPointerLock().catch?.(()=>{});}
}
function onCanvasMove(e){
 if(!pointerDown && document.pointerLockElement!==renderer?.domElement)return;
 const dx=e.movementX || (e.clientX-lastPointer.x),dy=e.movementY || (e.clientY-lastPointer.y);
 if(isMobile || document.pointerLockElement!==renderer?.domElement){yaw-=dx*.004;pitch-=dy*.003;lastPointer={x:e.clientX,y:e.clientY};}
}
function onCanvasUp(e){
 if(!pointerDown)return;pointerDown=false;
 // Tap/click on an exhibit opens its product card. Ignore a drag gesture.
 const dx=Math.abs(e.clientX-pointerStart.x),dy=Math.abs(e.clientY-pointerStart.y);
 if(dx<8&&dy<8){const r=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-r.left)/r.width)*2-1;pointer.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(exhibits,true);if(hits.length){let o=hits[0].object;while(o&&!o.userData.product)o=o.parent;if(o?.userData.product)showProduct(o.userData.product);}}
}
function openViewer(){
 $("viewer").classList.add("open");$("viewer").setAttribute("aria-hidden","false");viewerOpen=true;
 if(!initialized)buildScene();else{renderer.setSize(innerWidth,innerHeight);animate();}
 setMode("free");$("mobileControls").style.display=isMobile?"flex":"none";
}
function closeViewer(){viewerOpen=false;$("viewer").classList.remove("open");$("viewer").setAttribute("aria-hidden","true");stopTour();if(document.pointerLockElement)document.exitPointerLock();}
$("launchMuseum").addEventListener("click",openViewer);$("exitViewer").addEventListener("click",closeViewer);
$("freeMode").addEventListener("click",()=>setMode("free"));
$("guidedMode").addEventListener("click",()=>setMode("guided"));
$("tourPlay").addEventListener("click",()=>{
 if(mode!=="guided")setMode("guided");
 if(tourPlaying)stopTour();else{if(!guidedTo)goToTourIndex(tourIndex,true);else{tourPlaying=true;$("tourPlay").textContent="PAUSE TOUR ❚❚";}}
});
$("tourNext").addEventListener("click",()=>{if(mode!=="guided")setMode("guided");tourTimer=0;advanceTour(1);});
$("tourPrev").addEventListener("click",()=>{if(mode!=="guided")setMode("guided");tourTimer=0;advanceTour(-1);});
document.querySelectorAll("[data-move]").forEach(b=>{
 const k=b.dataset.move,down=e=>{e.preventDefault();touch[k]=true;},up=e=>{e.preventDefault();touch[k]=false;};
 b.addEventListener("pointerdown",down);b.addEventListener("pointerup",up);b.addEventListener("pointerleave",up);b.addEventListener("pointercancel",up);
});
window.addEventListener("keydown",e=>{keys[e.code]=true;if(e.code==="Escape"&&viewerOpen)document.exitPointerLock?.();});
window.addEventListener("keyup",e=>keys[e.code]=false);
document.addEventListener("pointerlockchange",()=>{});
window.addEventListener("resize",()=>{if(renderer&&camera){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}});
renderProducts();
