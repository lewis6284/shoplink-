import{f as d}from"./vendor-react-CC5-EtuG.js";let X={data:""},Y=e=>{if(typeof window=="object"){let t=(e?e.querySelector("#_goober"):window._goober)||Object.assign(document.createElement("style"),{innerHTML:" ",id:"_goober"});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||X},Q=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,G=/\/\*[^]*?\*\/|  +/g,D=/\n+/g,_=(e,t)=>{let a="",r="",i="";for(let c in e){let o=e[c];c[0]=="@"?c[1]=="i"?a=c+" "+o+";":r+=c[1]=="f"?_(o,c):c+"{"+_(o,c[1]=="k"?"":t)+"}":typeof o=="object"?r+=_(o,t?t.replace(/([^,])+/g,n=>c.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,l=>/&/.test(l)?l.replace(/&/g,n):n?n+" "+l:l)):c):o!=null&&(c=c[1]=="-"?c:c.replace(/[A-Z]/g,"-$&").toLowerCase(),i+=_.p?_.p(c,o):c+":"+o+";")}return a+(t&&i?t+"{"+i+"}":i)+r},x={},I=e=>{if(typeof e=="object"){let t="";for(let a in e)t+=a+I(e[a]);return t}return e},J=(e,t,a,r,i)=>{let c=I(e),o=x[c]||(x[c]=(l=>{let h=0,p=11;for(;h<l.length;)p=101*p+l.charCodeAt(h++)>>>0;return"go"+p})(c));if(!x[o]){let l=c!==e?e:(h=>{let p,y,u=[{}];for(;p=Q.exec(h.replace(G,""));)p[4]?u.shift():p[3]?(y=p[3].replace(D," ").trim(),u.unshift(u[0][y]=u[0][y]||{})):u[0][p[1]]=p[2].replace(D," ").trim();return u[0]})(e);x[o]=_(i?{["@keyframes "+o]:l}:l,a?"":"."+o)}let n=a&&x.g;return a&&(x.g=x[o]),((l,h,p,y)=>{y?h.data=h.data.replace(y,l):h.data.indexOf(l)===-1&&(h.data=p?l+h.data:h.data+l)})(x[o],t,r,n),o},ee=(e,t,a)=>e.reduce((r,i,c)=>{let o=t[c];if(o&&o.call){let n=o(a),l=n&&n.props&&n.props.className||/^go/.test(n)&&n;o=l?"."+l:n&&typeof n=="object"?n.props?"":_(n,""):n===!1?"":n}return r+i+(o??"")},"");function j(e){let t=this||{},a=e.call?e(t.p):e;return J(a.unshift?a.raw?ee(a,[].slice.call(arguments,1),t.p):a.reduce((r,i)=>Object.assign(r,i&&i.call?i(t.p):i),{}):a,Y(t.target),t.g,t.o,t.k)}let T,q,V;j.bind({g:1});let g=j.bind({k:1});function te(e,t,a,r){_.p=t,T=e,q=a,V=r}function b(e,t){let a=this||{};return function(){let r=arguments;function i(c,o){let n=Object.assign({},c),l=n.className||i.className;a.p=Object.assign({theme:q&&q()},n),a.o=/go\d/.test(l),n.className=j.apply(a,r)+(l?" "+l:"");let h=e;return e[0]&&(h=n.as||e,delete n.as),V&&h[0]&&V(n),T(h,n)}return i}}var ae=e=>typeof e=="function",A=(e,t)=>ae(e)?e(t):e,oe=(()=>{let e=0;return()=>(++e).toString()})(),R=(()=>{let e;return()=>{if(e===void 0&&typeof window<"u"){let t=matchMedia("(prefers-reduced-motion: reduce)");e=!t||t.matches}return e}})(),se=20,P="default",U=(e,t)=>{let{toastLimit:a}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,a)};case 1:return{...e,toasts:e.toasts.map(o=>o.id===t.toast.id?{...o,...t.toast}:o)};case 2:let{toast:r}=t;return U(e,{type:e.toasts.find(o=>o.id===r.id)?1:0,toast:r});case 3:let{toastId:i}=t;return{...e,toasts:e.toasts.map(o=>o.id===i||i===void 0?{...o,dismissed:!0,visible:!1}:o)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(o=>o.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let c=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(o=>({...o,pauseDuration:o.pauseDuration+c}))}}},z=[],W={toasts:[],pausedAt:void 0,settings:{toastLimit:se}},v={},B=(e,t=P)=>{v[t]=U(v[t]||W,e),z.forEach(([a,r])=>{a===t&&r(v[t])})},F=e=>Object.keys(v).forEach(t=>B(e,t)),re=e=>Object.keys(v).find(t=>v[t].toasts.some(a=>a.id===e)),E=(e=P)=>t=>{B(t,e)},ce={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},ie=(e={},t=P)=>{let[a,r]=d.useState(v[t]||W),i=d.useRef(v[t]);d.useEffect(()=>(i.current!==v[t]&&r(v[t]),z.push([t,r]),()=>{let o=z.findIndex(([n])=>n===t);o>-1&&z.splice(o,1)}),[t]);let c=a.toasts.map(o=>{var n,l,h;return{...e,...e[o.type],...o,removeDelay:o.removeDelay||((n=e[o.type])==null?void 0:n.removeDelay)||e?.removeDelay,duration:o.duration||((l=e[o.type])==null?void 0:l.duration)||e?.duration||ce[o.type],style:{...e.style,...(h=e[o.type])==null?void 0:h.style,...o.style}}});return{...a,toasts:c}},ne=(e,t="blank",a)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...a,id:a?.id||oe()}),$=e=>(t,a)=>{let r=ne(t,e,a);return E(r.toasterId||re(r.id))({type:2,toast:r}),r.id},k=(e,t)=>$("blank")(e,t);k.error=$("error");k.success=$("success");k.loading=$("loading");k.custom=$("custom");k.dismiss=(e,t)=>{let a={type:3,toastId:e};t?E(t)(a):F(a)};k.dismissAll=e=>k.dismiss(void 0,e);k.remove=(e,t)=>{let a={type:4,toastId:e};t?E(t)(a):F(a)};k.removeAll=e=>k.remove(void 0,e);k.promise=(e,t,a)=>{let r=k.loading(t.loading,{...a,...a?.loading});return typeof e=="function"&&(e=e()),e.then(i=>{let c=t.success?A(t.success,i):void 0;return c?k.success(c,{id:r,...a,...a?.success}):k.dismiss(r),i}).catch(i=>{let c=t.error?A(t.error,i):void 0;c?k.error(c,{id:r,...a,...a?.error}):k.dismiss(r)}),e};var de=1e3,le=(e,t="default")=>{let{toasts:a,pausedAt:r}=ie(e,t),i=d.useRef(new Map).current,c=d.useCallback((y,u=de)=>{if(i.has(y))return;let m=setTimeout(()=>{i.delete(y),o({type:4,toastId:y})},u);i.set(y,m)},[]);d.useEffect(()=>{if(r)return;let y=Date.now(),u=a.map(m=>{if(m.duration===1/0)return;let M=(m.duration||0)+m.pauseDuration-(y-m.createdAt);if(M<0){m.visible&&k.dismiss(m.id);return}return setTimeout(()=>k.dismiss(m.id,t),M)});return()=>{u.forEach(m=>m&&clearTimeout(m))}},[a,r,t]);let o=d.useCallback(E(t),[t]),n=d.useCallback(()=>{o({type:5,time:Date.now()})},[o]),l=d.useCallback((y,u)=>{o({type:1,toast:{id:y,height:u}})},[o]),h=d.useCallback(()=>{r&&o({type:6,time:Date.now()})},[r,o]),p=d.useCallback((y,u)=>{let{reverseOrder:m=!1,gutter:M=8,defaultPosition:N}=u||{},w=a.filter(f=>(f.position||N)===(y.position||N)&&f.height),K=w.findIndex(f=>f.id===y.id),S=w.filter((f,H)=>H<K&&f.visible).length;return w.filter(f=>f.visible).slice(...m?[S+1]:[0,S]).reduce((f,H)=>f+(H.height||0)+M,0)},[a]);return d.useEffect(()=>{a.forEach(y=>{if(y.dismissed)c(y.id,y.removeDelay);else{let u=i.get(y.id);u&&(clearTimeout(u),i.delete(y.id))}})},[a,c]),{toasts:a,handlers:{updateHeight:l,startPause:n,endPause:h,calculateOffset:p}}},he=g`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,ye=g`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,pe=g`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,ue=b("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${he} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${ye} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${pe} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,ke=g`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,me=b("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${ke} 1s linear infinite;
`,fe=g`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,ve=g`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,ge=b("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${fe} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${ve} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,xe=b("div")`
  position: absolute;
`,_e=b("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,be=g`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Me=b("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${be} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,we=({toast:e})=>{let{icon:t,type:a,iconTheme:r}=e;return t!==void 0?typeof t=="string"?d.createElement(Me,null,t):t:a==="blank"?null:d.createElement(_e,null,d.createElement(me,{...r}),a!=="loading"&&d.createElement(xe,null,a==="error"?d.createElement(ue,{...r}):d.createElement(ge,{...r})))},$e=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,Ne=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,Ce="0%{opacity:0;} 100%{opacity:1;}",ze="0%{opacity:1;} 100%{opacity:0;}",Ae=b("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,je=b("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,Ee=(e,t)=>{let a=e.includes("top")?1:-1,[r,i]=R()?[Ce,ze]:[$e(a),Ne(a)];return{animation:t?`${g(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${g(i)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},He=d.memo(({toast:e,position:t,style:a,children:r})=>{let i=e.height?Ee(e.position||t||"top-center",e.visible):{opacity:0},c=d.createElement(we,{toast:e}),o=d.createElement(je,{...e.ariaProps},A(e.message,e));return d.createElement(Ae,{className:e.className,style:{...i,...a,...e.style}},typeof r=="function"?r({icon:c,message:o}):d.createElement(d.Fragment,null,c,o))});te(d.createElement);var Le=({id:e,className:t,style:a,onHeightUpdate:r,children:i})=>{let c=d.useCallback(o=>{if(o){let n=()=>{let l=o.getBoundingClientRect().height;r(e,l)};n(),new MutationObserver(n).observe(o,{subtree:!0,childList:!0,characterData:!0})}},[e,r]);return d.createElement("div",{ref:c,className:t,style:a},i)},qe=(e,t)=>{let a=e.includes("top"),r=a?{top:0}:{bottom:0},i=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:R()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(a?1:-1)}px)`,...r,...i}},Ve=j`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,C=16,Jt=({reverseOrder:e,position:t="top-center",toastOptions:a,gutter:r,children:i,toasterId:c,containerStyle:o,containerClassName:n})=>{let{toasts:l,handlers:h}=le(a,c);return d.createElement("div",{"data-rht-toaster":c||"",style:{position:"fixed",zIndex:9999,top:C,left:C,right:C,bottom:C,pointerEvents:"none",...o},className:n,onMouseEnter:h.startPause,onMouseLeave:h.endPause},l.map(p=>{let y=p.position||t,u=h.calculateOffset(p,{reverseOrder:e,gutter:r,defaultPosition:t}),m=qe(y,u);return d.createElement(Le,{id:p.id,key:p.id,onHeightUpdate:h.updateHeight,className:p.visible?Ve:"",style:m},p.type==="custom"?A(p.message,p):i?i(p):d.createElement(He,{toast:p,position:y}))}))},ea=k;const Z=(...e)=>e.filter((t,a,r)=>!!t&&t.trim()!==""&&r.indexOf(t)===a).join(" ").trim();const Pe=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();const Se=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(t,a,r)=>r?r.toUpperCase():a.toLowerCase());const O=e=>{const t=Se(e);return t.charAt(0).toUpperCase()+t.slice(1)};var L={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};const De=e=>{for(const t in e)if(t.startsWith("aria-")||t==="role"||t==="title")return!0;return!1},Oe=d.createContext({}),Ie=()=>d.useContext(Oe),Te=d.forwardRef(({color:e,size:t,strokeWidth:a,absoluteStrokeWidth:r,className:i="",children:c,iconNode:o,...n},l)=>{const{size:h=24,strokeWidth:p=2,absoluteStrokeWidth:y=!1,color:u="currentColor",className:m=""}=Ie()??{},M=r??y?Number(a??p)*24/Number(t??h):a??p;return d.createElement("svg",{ref:l,...L,width:t??h??L.width,height:t??h??L.height,stroke:e??u,strokeWidth:M,className:Z("lucide",m,i),...!c&&!De(n)&&{"aria-hidden":"true"},...n},[...o.map(([N,w])=>d.createElement(N,w)),...Array.isArray(c)?c:[c]])});const s=(e,t)=>{const a=d.forwardRef(({className:r,...i},c)=>d.createElement(Te,{ref:c,iconNode:t,className:Z(`lucide-${Pe(O(e))}`,`lucide-${e}`,r),...i}));return a.displayName=O(e),a};const Re=[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]],ta=s("activity",Re);const Ue=[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]],aa=s("arrow-left-right",Ue);const We=[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]],oa=s("arrow-left",We);const Be=[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]],sa=s("arrow-up-right",Be);const Fe=[["path",{d:"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",key:"1yiouv"}],["circle",{cx:"12",cy:"8",r:"6",key:"1vp47v"}]],ra=s("award",Fe);const Ze=[["path",{d:"M3 5v14",key:"1nt18q"}],["path",{d:"M8 5v14",key:"1ybrkv"}],["path",{d:"M12 5v14",key:"s699le"}],["path",{d:"M17 5v14",key:"ycjyhj"}],["path",{d:"M21 5v14",key:"nzette"}]],ca=s("barcode",Ze);const Ke=[["path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",key:"jecpp"}],["rect",{width:"20",height:"14",x:"2",y:"6",rx:"2",key:"i6l2r4"}]],ia=s("briefcase",Ke);const Xe=[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]],na=s("calendar",Xe);const Ye=[["path",{d:"M5 21v-6",key:"1hz6c0"}],["path",{d:"M12 21V3",key:"1lcnhd"}],["path",{d:"M19 21V9",key:"unv183"}]],da=s("chart-no-axes-column",Ye);const Qe=[["path",{d:"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z",key:"pzmjnu"}],["path",{d:"M21.21 15.89A10 10 0 1 1 8 2.83",key:"k2fpak"}]],la=s("chart-pie",Qe);const Ge=[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]],ha=s("check",Ge);const Je=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],ya=s("chevron-right",Je);const et=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]],pa=s("circle-alert",et);const tt=[["path",{d:"M21.801 10A10 10 0 1 1 17 3.335",key:"yps3ct"}],["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}]],ua=s("circle-check-big",tt);const at=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],ka=s("circle-check",at);const ot=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M8 12h8",key:"1wcyev"}],["path",{d:"M12 8v8",key:"napkw2"}]],ma=s("circle-plus",ot);const st=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]],fa=s("circle-x",st);const rt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 6v6l4 2",key:"mmk7yg"}]],va=s("clock",rt);const ct=[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]],ga=s("credit-card",ct);const it=[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]],xa=s("database",it);const nt=[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]],_a=s("dollar-sign",nt);const dt=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],ba=s("download",dt);const lt=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Ma=s("eye",lt);const ht=[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]],wa=s("file-text",ht);const yt=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]],$a=s("image",yt);const pt=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]],Na=s("info",pt);const ut=[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]],Ca=s("layers",ut);const kt=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]],za=s("layout-dashboard",kt);const mt=[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]],Aa=s("loader-circle",mt);const ft=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],ja=s("lock",ft);const vt=[["path",{d:"m16 17 5-5-5-5",key:"1bji2h"}],["path",{d:"M21 12H9",key:"dn1m92"}],["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}]],Ea=s("log-out",vt);const gt=[["path",{d:"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7",key:"132q7q"}],["rect",{x:"2",y:"4",width:"20",height:"16",rx:"2",key:"izxlao"}]],Ha=s("mail",gt);const xt=[["path",{d:"M4 5h16",key:"1tepv9"}],["path",{d:"M4 12h16",key:"1lakjw"}],["path",{d:"M4 19h16",key:"1djgab"}]],La=s("menu",xt);const _t=[["path",{d:"M5 12h14",key:"1ays0h"}]],qa=s("minus",_t);const bt=[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]],Va=s("moon",bt);const Mt=[["path",{d:"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z",key:"1a0edw"}],["path",{d:"M12 22V12",key:"d0xqtd"}],["polyline",{points:"3.29 7 12 12 20.71 7",key:"ousv84"}],["path",{d:"m7.5 4.27 9 5.15",key:"1c824w"}]],Pa=s("package",Mt);const wt=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"m16 15-3-3 3-3",key:"14y99z"}]],Sa=s("panel-left-close",wt);const $t=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M9 3v18",key:"fh3hqa"}],["path",{d:"m14 9 3 3-3 3",key:"8010ee"}]],Da=s("panel-left-open",$t);const Nt=[["path",{d:"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",key:"1a8usu"}]],Oa=s("pen",Nt);const Ct=[["path",{d:"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384",key:"9njp5v"}]],Ia=s("phone",Ct);const zt=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],Ta=s("plus",zt);const At=[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]],Ra=s("printer",At);const jt=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],Ua=s("refresh-cw",jt);const Et=[["path",{d:"M12 3v18",key:"108xh3"}],["path",{d:"m19 8 3 8a5 5 0 0 1-6 0zV7",key:"zcdpyk"}],["path",{d:"M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1",key:"1yorad"}],["path",{d:"m5 8 3 8a5 5 0 0 1-6 0zV7",key:"eua70x"}],["path",{d:"M7 21h10",key:"1b0cd5"}]],Wa=s("scale",Et);const Ht=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],Ba=s("search",Ht);const Lt=[["path",{d:"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",key:"1i5ecw"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Fa=s("settings",Lt);const qt=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]],Za=s("shield-alert",qt);const Vt=[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]],Ka=s("shield",Vt);const Pt=[["path",{d:"M16 10a4 4 0 0 1-8 0",key:"1ltviw"}],["path",{d:"M3.103 6.034h17.794",key:"awc11p"}],["path",{d:"M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z",key:"o988cm"}]],Xa=s("shopping-bag",Pt);const St=[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]],Ya=s("shopping-cart",St);const Dt=[["path",{d:"M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5",key:"slp6dd"}],["path",{d:"M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244",key:"o0xfot"}],["path",{d:"M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05",key:"wn3emo"}]],Qa=s("store",Dt);const Ot=[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]],Ga=s("sun",Ot);const It=[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]],Ja=s("tag",It);const Tt=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],e1=s("trash-2",Tt);const Rt=[["path",{d:"M16 7h6v6",key:"box55l"}],["path",{d:"m22 7-8.5 8.5-5-5L2 17",key:"1t1m79"}]],t1=s("trending-up",Rt);const Ut=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],a1=s("triangle-alert",Ut);const Wt=[["path",{d:"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2",key:"wrbu53"}],["path",{d:"M15 18H9",key:"1lyqi6"}],["path",{d:"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14",key:"lysw3i"}],["circle",{cx:"17",cy:"18",r:"2",key:"332jqn"}],["circle",{cx:"7",cy:"18",r:"2",key:"19iecd"}]],o1=s("truck",Wt);const Bt=[["path",{d:"m16 11 2 2 4-4",key:"9rsbq5"}],["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],s1=s("user-check",Bt);const Ft=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]],r1=s("user-minus",Ft);const Zt=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["line",{x1:"19",x2:"19",y1:"8",y2:"14",key:"1bvyxn"}],["line",{x1:"22",x2:"16",y1:"11",y2:"11",key:"1shjgl"}]],c1=s("user-plus",Zt);const Kt=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],i1=s("user",Kt);const Xt=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],n1=s("users",Xt);const Yt=[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]],d1=s("wallet",Yt);const Qt=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],l1=s("x",Qt);export{Ja as $,ta as A,ca as B,na as C,xa as D,Ma as E,Jt as F,Va as G,Sa as H,$a as I,Da as J,Oa as K,Ca as L,Ha as M,Ia as N,Ta as O,Pa as P,Ra as Q,Ua as R,Wa as S,Ba as T,Fa as U,Ka as V,Za as W,Xa as X,Ya as Y,Qa as Z,Ga as _,oa as a,e1 as a0,t1 as a1,a1 as a2,o1 as a3,i1 as a4,s1 as a5,r1 as a6,c1 as a7,n1 as a8,d1 as a9,l1 as aa,ea as ab,aa as b,sa as c,ra as d,ia as e,da as f,la as g,ha as h,ya as i,pa as j,ka as k,ua as l,ma as m,fa as n,va as o,ga as p,_a as q,ba as r,wa as s,Na as t,za as u,Aa as v,ja as w,Ea as x,La as y,qa as z};
