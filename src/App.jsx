/*
  SPNDR — Smart Personal Expense Tracker
  All bugs fixed:
  ✅ Home shows ONLY current month expenses
  ✅ Category limits are PER-MONTH (March limits don't appear in April)
  ✅ Budget page shows full month report (expenses + category usage + chart)
  ✅ OCR scanner improved with better patterns
  ✅ Charts fixed — no duplicate months, correct date calculation
  ✅ Desktop responsive — fills laptop screen
  ✅ All data saved per-month correctly
  ✅ AI Buddy API key explained
*/

import React,{useState,useRef,useCallback,useEffect,Component}from"react";
import{createClient}from"@supabase/supabase-js";
import{BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,LineChart,Line,
  ResponsiveContainer,PieChart,Pie,Cell,Legend}from"recharts";

/* ── SUPABASE ──────────────────────────────────────────────────────── */
const supabase=createClient("https://zoydiohcruujgnstjmud.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpveWRpb2hjcnV1amduc3RqbXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjA0NjMsImV4cCI6MjA4OTc5NjQ2M30.8SA5zAdNYkzSIdwhfS58l0TMF2H5U-b9GxfGSWxhRVo");
const sGet=async k=>{try{const{data}=await supabase.from("spndr_store").select("value").eq("key",k).single();return data?{value:data.value}:null;}catch{return null;}};
const sSet=async(k,v)=>{try{await supabase.from("spndr_store").upsert({key:k,value:v},{onConflict:"key"});}catch(e){throw new Error(e.message);}};

/* ── HELPERS ───────────────────────────────────────────────────────── */
const hashPw=s=>{let h=5381;for(let c of s)h=(h*33)^c.charCodeAt(0);return(h>>>0).toString(36);};
const fmt=n=>`₹${Number(n).toLocaleString("en-IN")}`;
const todayStr=()=>new Date().toISOString().split("T")[0];
const monthKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const monthLabel=key=>{const[y,m]=key.split("-");return new Date(+y,+m-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"});};
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const prevMonthKey=()=>{const n=new Date();return monthKey(new Date(n.getFullYear(),n.getMonth()-1,1));};
/* filter expenses for a given monthKey string */
const expForMonth=(exps,key)=>{if(!key)return[];const[y,m]=key.split("-");return(exps||[]).filter(e=>{const d=new Date(e.date);return d.getFullYear()===+y&&d.getMonth()+1===+m;});};
const translateToEnglish=async t=>{try{const r=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(t)}`);const d=await r.json();return d[0].map(s=>s[0]).join(" ").trim();}catch{return t;}};

/* ── THEMES ────────────────────────────────────────────────────────── */
const DARK={bg:"#0b0f1a",card:"rgba(255,255,255,.055)",header:"rgba(11,15,26,.93)",nav:"rgba(11,15,26,.97)",input:"rgba(255,255,255,.07)",inputBdr:"rgba(212,168,83,.4)",text:"#eef0f6",sub:"#9ba3b8",muted:"#4b5468",a1:"#d4a853",a3:"#2dd4bf",a4:"#f87171",upi:"#818cf8",cash:"#2dd4bf",grad:"linear-gradient(135deg,#d4a853,#2dd4bf)",gradSoft:"linear-gradient(135deg,rgba(212,168,83,.18),rgba(45,212,191,.12))",border:"rgba(212,168,83,.2)",bdrSub:"rgba(255,255,255,.08)",glow:"rgba(212,168,83,.25)",divider:"rgba(255,255,255,.07)",gridLine:"rgba(255,255,255,.06)",isDark:true};
const LIGHT={bg:"#f7f6f2",card:"rgba(255,255,255,.94)",header:"rgba(247,246,242,.96)",nav:"rgba(247,246,242,.98)",input:"rgba(0,0,0,.045)",inputBdr:"rgba(139,101,30,.4)",text:"#0f1626",sub:"#3d4a61",muted:"#8a94a6",a1:"#b8860b",a3:"#0d9488",a4:"#dc2626",upi:"#4f46e5",cash:"#0d9488",grad:"linear-gradient(135deg,#b8860b,#0d9488)",gradSoft:"linear-gradient(135deg,rgba(184,134,11,.11),rgba(13,148,136,.08))",border:"rgba(184,134,11,.2)",bdrSub:"rgba(0,0,0,.09)",glow:"rgba(184,134,11,.2)",divider:"rgba(0,0,0,.08)",gridLine:"rgba(0,0,0,.07)",isDark:false};
const getMC=(pct,T)=>pct<=0?"#9ba3b8":pct<50?"#22c55e":pct<85?T.a1:pct<100?"#f59e0b":"#ef4444";
const getME=pct=>pct<=0?"💰":pct<50?"🎉":pct<85?"💰":pct<100?"⚠️":"🔴";
const getML=pct=>pct<=0?"No Budget":pct<50?"Great Saving!":pct<85?"On Track":pct<100?"Careful!":"Over Budget!";

/* ── CONSTANTS ─────────────────────────────────────────────────────── */
const DEF_CATS=[
  {id:"food",name:"Food",emoji:"🍽",color:"#f97316",isDefault:true},
  {id:"transport",name:"Transport",emoji:"🚇",color:"#0ea5e9",isDefault:true},
  {id:"shopping",name:"Shopping",emoji:"🛒",color:"#8b5cf6",isDefault:true},
  {id:"entertainment",name:"Entertainment",emoji:"🎬",color:"#ec4899",isDefault:true},
  {id:"health",name:"Health",emoji:"🏥",color:"#10b981",isDefault:true},
  {id:"bills",name:"Bills",emoji:"📋",color:"#f59e0b",isDefault:true},
  {id:"education",name:"Education",emoji:"🎓",color:"#3b82f6",isDefault:true},
  {id:"other",name:"Other",emoji:"📌",color:"#6b7280",isDefault:true},
];
const CAT_COLORS=["#f97316","#0ea5e9","#8b5cf6","#ec4899","#10b981","#f59e0b","#3b82f6","#6b7280","#ef4444","#14b8a6","#a855f7","#f43f5e","#22c55e","#eab308","#06b6d4","#84cc16"];
const CAT_EMOJIS=["🍕","🚗","👗","🎵","💊","💡","📖","🏠","✈️","🎯","💰","🎁","🐕","🌱","☕","🎭","🏋️","💻","📱","🎮","🍷","🧴","🎪","🏦"];
const JAR_EMOJIS=["🏖","🏍","🎄","💍","🏠","✈️","🎓","💻","📱","🎮","🐶","🌴","🎁","💎","🚗","⛺"];
const JAR_COLORS=["#f97316","#0ea5e9","#8b5cf6","#ec4899","#10b981","#f59e0b","#3b82f6","#ef4444","#14b8a6","#a855f7","#22c55e","#06b6d4"];
const LANGS=[{label:"English",value:"en-US"},{label:"Hindi",value:"hi-IN"},{label:"Gujarati",value:"gu-IN"},{label:"Tamil",value:"ta-IN"},{label:"Telugu",value:"te-IN"},{label:"Marathi",value:"mr-IN"},{label:"Bengali",value:"bn-IN"},{label:"Punjabi",value:"pa-IN"},{label:"Kannada",value:"kn-IN"},{label:"Malayalam",value:"ml-IN"}];
const PRESETS=[2000,3000,5000,8000,10000,15000,20000,25000,30000,50000];
const CAT_KW={Food:["food","eat","lunch","dinner","breakfast","restaurant","cafe","coffee","snack","grocery","khana","nashta","chai","sabji","roti","dal","rice","milk","pizza","burger","biryani","jaman","bhojan"],Transport:["transport","travel","auto","cab","taxi","uber","ola","bus","train","metro","petrol","diesel","fuel","rickshaw","bike","ticket","fare","car","scooter","flight","toll","parking"],Shopping:["shopping","clothes","shirt","pant","dress","shoes","amazon","flipkart","buy","purchase","market","bazaar","mall","online","kapda","saree","watch","bag","mobile","laptop"],Entertainment:["movie","cinema","show","concert","game","gaming","netflix","hotstar","youtube","ott","fun","play","party","birthday","celebration","spotify","music","cricket","football"],Health:["health","medicine","doctor","hospital","clinic","pharmacy","medical","tablet","gym","fitness","checkup","dava","dawai","blood","xray","scan","yoga","vitamin"],Bills:["bill","electricity","wifi","internet","mobile","recharge","phone","water","gas","rent","light","bijli","paani","dth","cable","insurance","emi","loan","tax"],Education:["education","school","college","tuition","course","book","fees","class","study","exam","coaching","notes","pen","paper","library"]};
const reqNotif=async()=>{if(!("Notification"in window))return false;if(Notification.permission==="granted")return true;if(Notification.permission!=="denied"){const p=await Notification.requestPermission();return p==="granted";}return false;};
const sendNotif=(t,b)=>{if("Notification"in window&&Notification.permission==="granted")new Notification(t,{body:b,icon:"/icon-192.png"});};

/* ── STYLE HELPERS ─────────────────────────────────────────────────── */
const mkCard=(T,e={})=>({background:T.card,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:`1px solid ${T.bdrSub}`,borderRadius:16,padding:18,boxShadow:T.isDark?"0 4px 24px rgba(0,0,0,.35)":"0 2px 16px rgba(0,0,0,.07),0 1px 0 rgba(255,255,255,.9) inset",...e});
const mkBtn=(e={})=>({border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,borderRadius:12,transition:"all .2s",...e});

/* ── ERROR BOUNDARY ────────────────────────────────────────────────── */
class ErrorBoundary extends Component{
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,i){console.error("SPNDR Error:",e,i);}
  render(){
    if(this.state.err)return(
      <div style={{minHeight:"100vh",background:"#0b0f1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"DM Sans,sans-serif",padding:24,color:"#eef0f6",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
        <div style={{fontSize:22,fontWeight:700,color:"#d4a853",marginBottom:12}}>Something went wrong</div>
        <div style={{fontSize:13,color:"#9ba3b8",marginBottom:8,maxWidth:380,lineHeight:1.7}}>{this.state.err?.message||"Unexpected error"}</div>
        <div style={{fontSize:12,color:"#4b5468",marginBottom:28,maxWidth:380}}>Check your Supabase URL and key in App.jsx line 7.</div>
        <button onClick={()=>window.location.reload()} style={{padding:"12px 32px",borderRadius:99,background:"linear-gradient(135deg,#d4a853,#2dd4bf)",color:"#0b0f1a",fontWeight:700,border:"none",cursor:"pointer",fontSize:15}}>Reload App</button>
      </div>
    );
    return this.props.children;
  }
}

/* ── CSS ───────────────────────────────────────────────────────────── */
const buildCss=T=>`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{width:100%;min-height:100%;background:${T.bg};}
input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
input[type=number]{-moz-appearance:textfield;}
input[type=date]::-webkit-calendar-picker-indicator{filter:${T.isDark?"invert(.5)":"opacity(.5)"};cursor:pointer;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:${T.a1}55;border-radius:99px;}
button:active{transform:scale(.96)!important;}
select option{background:${T.isDark?"#111827":"#fff"};}
input:-webkit-autofill{-webkit-box-shadow:0 0 0 100px ${T.bg} inset!important;-webkit-text-fill-color:${T.text}!important;}
textarea{resize:none;font-family:'DM Sans',sans-serif;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes toast{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes alertIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes celebrate{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes wrappedIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
@keyframes chatBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes jarFill{from{height:0}to{height:100%}}
.recharts-wrapper{width:100%!important;}
`;

/* ══════════════════════════════════════════════════════════════════════
   SHARED SMALL COMPONENTS
══════════════════════════════════════════════════════════════════════ */
function ToastEl({T,toast}){
  const bg=toast.type==="err"?T.a4:toast.type==="warn"?"#f59e0b":T.a1;
  return<div style={{position:"fixed",top:76,left:"50%",zIndex:9999,padding:"12px 20px",borderRadius:12,fontWeight:600,fontSize:14,fontFamily:"'DM Sans',sans-serif",background:bg,color:toast.type==="warn"?"#1a1000":"#fff",animation:"toast .25s ease",boxShadow:`0 6px 28px ${bg}55`,transform:"translateX(-50%)",whiteSpace:"nowrap",maxWidth:"90vw",overflow:"hidden",textOverflow:"ellipsis"}}>{toast.msg}</div>;
}
function ChartTip({active,payload,label,T}){
  if(!active||!payload?.length)return null;
  return<div style={{background:T.isDark?"rgba(10,14,25,.97)":"rgba(255,255,255,.98)",border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",fontFamily:"'DM Sans',sans-serif"}}>
    <div style={{color:T.muted,fontSize:11,marginBottom:5}}>{label}</div>
    {payload.map(p=><div key={p.name} style={{color:p.color,fontWeight:600,fontSize:13,marginBottom:2}}>{p.name}: {fmt(p.value)}</div>)}
  </div>;
}

/* ══════════════════════════════════════════════════════════════════════
   HOME VIEW — CURRENT MONTH ONLY
   BUG FIX: Only shows thisMonth expenses, NOT all expenses
══════════════════════════════════════════════════════════════════════ */
function HomeView({T,expenses,thisMonth,total,upiAmt,cashAmt,rawPct,barPct,isOver,curTarget,catData,overspendAlert,setOverspendAlert,undoEntry,undoDelete,exportMode,setExportMode,exportCSV,setTab,deleteEntry,getCatById,recurringTemplates,setShowWrapped,setShowChat,isDesk}){
  const C=e=>mkCard(T,e);const B=e=>mkBtn(e);
  const now=new Date();
  const mc=getMC(curTarget>0?rawPct:0,T);
  const isDanger=curTarget>0&&rawPct>=100;
  const isSaving=curTarget>0&&rawPct<50&&total>0;

  return(
    <div style={{padding:isDesk?"0 28px 60px":"0 16px 120px"}}>
      {/* Mood banner */}
      {curTarget>0&&total>0&&(
        <div style={{marginBottom:12,padding:"10px 16px",borderRadius:14,background:isDanger?`${T.a4}15`:isSaving?"rgba(34,197,94,.1)":"transparent",border:`1px solid ${isDanger?T.a4:isSaving?"#22c55e":"transparent"}`,display:"flex",alignItems:"center",justifyContent:"space-between",animation:isSaving?"celebrate 2.5s ease-in-out infinite":"none",transition:"all .5s"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>{getME(rawPct)}</span>
            <div>
              <div style={{fontWeight:700,color:mc,fontSize:14}}>{getML(rawPct)}</div>
              <div style={{fontSize:12,color:T.muted}}>{rawPct.toFixed(0)}% of budget used</div>
            </div>
          </div>
          {isSaving&&<span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:99,background:"rgba(34,197,94,.15)",color:"#22c55e"}}>🏆 SAVER</span>}
          {isDanger&&<span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:99,background:`${T.a4}18`,color:T.a4}}>EXCEEDED</span>}
        </div>
      )}

      {/* Overspend alert */}
      {overspendAlert&&(
        <div style={{marginBottom:12,animation:"alertIn .3s ease"}}>
          <div style={{background:overspendAlert.type==="over"?`${T.a4}15`:"rgba(245,158,11,.12)",border:`2px solid ${overspendAlert.type==="over"?T.a4:"#f59e0b"}`,borderRadius:16,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:overspendAlert.type==="over"?T.a4:"#f59e0b",fontSize:15,marginBottom:4}}>{overspendAlert.title}</div>
              <div style={{fontSize:13,color:T.sub,lineHeight:1.5}}>{overspendAlert.msg}</div>
            </div>
            <button onClick={()=>setOverspendAlert(null)} style={{...B({width:28,height:28,borderRadius:8,background:T.isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.08)",color:T.muted,fontSize:14})}}>✕</button>
          </div>
        </div>
      )}

      {/* Hero card */}
      <div style={{...C({background:isDanger?`${T.a4}10`:isSaving?"rgba(34,197,94,.07)":T.gradSoft,borderColor:isDanger?T.a4:isSaving?"#22c55e30":T.border,marginBottom:12,padding:"22px",position:"relative",overflow:"hidden",transition:"all .5s"})}}>
        <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:`radial-gradient(circle,${mc}18,transparent)`,transition:"background .5s",pointerEvents:"none"}}/>
        <div style={{fontSize:12,color:T.sub,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
          <span>{now.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</span>
          <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:`${T.a1}18`,color:T.a1,fontWeight:700}}>CURRENT MONTH</span>
        </div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isDesk?52:40,fontWeight:700,letterSpacing:-1,lineHeight:1.1,color:mc,transition:"color .5s"}}>{fmt(total)}</div>
        <div style={{fontSize:12,color:T.muted,marginTop:4}}>{thisMonth.length} transaction{thisMonth.length!==1?"s":""} this month</div>
        {curTarget>0?(
          <div style={{marginTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,color:T.muted}}>Budget: {fmt(curTarget)}</span>
              <span style={{fontSize:12,fontWeight:700,color:mc,transition:"color .5s"}}>{rawPct.toFixed(1)}%</span>
            </div>
            <div style={{height:8,borderRadius:99,background:T.isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.07)",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${barPct}%`,borderRadius:99,transition:"width .7s ease,background .5s",background:mc,boxShadow:`0 0 10px ${mc}44`}}/>
            </div>
            {isOver&&<div style={{marginTop:8,fontSize:13,color:T.a4,fontWeight:600}}>Over by {fmt(total-curTarget)}</div>}
          </div>
        ):(
          <div style={{marginTop:12,fontSize:12,color:T.muted}}>No budget — <span onClick={()=>setTab("budget")} style={{color:T.a1,cursor:"pointer",textDecoration:"underline"}}>set one in Budget tab</span></div>
        )}
      </div>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
        {[
          {l:"UPI",v:upiAmt,c:T.upi,ico:"💳"},
          {l:"Cash",v:cashAmt,c:T.cash,ico:"💵"},
          {l:curTarget>0?(isOver?"Over":"Left"):"Spent",v:curTarget>0?Math.abs(curTarget-total):total,c:mc,ico:getME(curTarget>0?rawPct:0),p:isOver&&curTarget>0?"+":""}
        ].map(s=>(
          <div key={s.l} style={{...C({padding:"13px 8px",textAlign:"center"})}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:5}}>{s.ico} {s.l}</div>
            <div style={{fontWeight:700,fontSize:12,color:s.c,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.2,wordBreak:"break-all",transition:"color .5s"}}>{s.p}{fmt(s.v)}</div>
          </div>
        ))}
      </div>

      {/* Quick action buttons */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
        <button onClick={()=>setShowWrapped(true)} style={{...B({padding:"12px",borderRadius:14,border:`1.5px solid ${T.border}`,background:T.gradSoft,color:T.a1,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7})}}><span>🎁</span> Monthly Wrapped</button>
        <button onClick={()=>setShowChat(true)} style={{...B({padding:"12px",borderRadius:14,border:`1.5px solid ${T.a3}30`,background:`${T.a3}08`,color:T.a3,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:7})}}><span>🤖</span> AI Buddy</button>
      </div>

      {/* Category strip */}
      {catData.filter(c=>c.spent>0).length>0&&(
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6,marginBottom:14,scrollbarWidth:"none"}}>
          {catData.filter(c=>c.spent>0).map(c=>(
            <div key={c.id} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"9px 12px",borderRadius:14,background:`${c.color}12`,border:`1px solid ${c.color}28`}}>
              <span style={{fontSize:17}}>{c.emoji}</span>
              <span style={{fontSize:10,color:c.color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.spent)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recurring strip */}
      {(recurringTemplates||[]).filter(r=>r.active).length>0&&(
        <div style={{...C({marginBottom:14,borderColor:T.border,background:T.gradSoft})}}>
          <div style={{fontWeight:700,color:T.a1,marginBottom:10,fontSize:14}}>🔁 Recurring This Month</div>
          {(recurringTemplates||[]).filter(r=>r.active).map(r=>(
            <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13,color:T.sub,marginBottom:6}}>
              <span>{r.emoji||"🔁"} {r.name}</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontWeight:600,color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(r.amount||0)}</span>
                <span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:r.type==="UPI"?`${T.upi}18`:`${T.cash}14`,color:r.type==="UPI"?T.upi:T.cash}}>{r.type}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transactions header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <span style={{fontWeight:700,fontSize:16,color:T.text,fontFamily:"'DM Serif Display',serif"}}>Transactions</span>
          <span style={{fontSize:11,color:T.muted,marginLeft:8}}>This month only</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {undoEntry&&<button onClick={undoDelete} style={{...B({fontSize:12,padding:"5px 12px",borderRadius:99,border:`1.5px solid ${T.a3}`,background:`${T.a3}15`,color:T.a3})}}>↩ Undo</button>}
          <button onClick={()=>setExportMode(p=>!p)} style={{...B({fontSize:12,padding:"5px 12px",borderRadius:99,border:`1.5px solid ${T.border}`,background:`${T.a1}12`,color:T.a1})}}>⬇ Export</button>
        </div>
      </div>

      {exportMode&&(
        <div style={{...C({marginBottom:14})}}>
          <div style={{fontWeight:700,color:T.text,marginBottom:10,fontSize:14}}>Export as CSV</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
            {["week","month","year"].map(v=><button key={v} onClick={()=>exportCSV(v)} style={{...B({padding:"11px 4px",border:`1.5px solid ${T.border}`,background:`${T.a1}10`,color:T.a1,fontSize:12,textAlign:"center",borderRadius:12})}}>{v==="week"?"This Week":v==="month"?"This Month":"This Year"}</button>)}
          </div>
          <button onClick={()=>setExportMode(false)} style={{...B({width:"100%",padding:"9px",border:`1px solid ${T.bdrSub}`,background:"transparent",color:T.muted,fontSize:13})}}>Cancel</button>
        </div>
      )}

      {/* BUG FIX: Show ONLY thisMonth (current month) transactions, NOT all expenses */}
      {thisMonth.length===0&&(
        <div style={{...C({textAlign:"center",padding:"40px 20px"})}}>
          <div style={{fontSize:40,marginBottom:12}}>💸</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:T.text,marginBottom:8}}>No expenses this month</div>
          <div style={{fontSize:13,color:T.muted}}>Tap + to add your first expense for {now.toLocaleDateString("en-IN",{month:"long"})}</div>
        </div>
      )}
      {thisMonth.map(e=>{
        const cat=getCatById(e.category)||DEF_CATS[7];
        const d=new Date(e.date);
        return(
          <div key={e.id} style={{...C({marginBottom:8,display:"flex",alignItems:"center",gap:12,padding:"12px 14px"})}}>
            <div style={{width:42,height:42,borderRadius:12,flexShrink:0,background:`${cat.color}15`,border:`1px solid ${cat.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{cat.emoji}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:14,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.description||cat.name}</div>
              <div style={{fontSize:11,color:T.muted,display:"flex",gap:6,marginTop:3}}>
                <span>{cat.name}</span><span>·</span>
                <span>{d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
                {e.recurring&&<span style={{color:T.a3}}>🔁</span>}
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0,display:"flex",alignItems:"center",gap:8}}>
              <div>
                <div style={{fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:T.text}}>−{fmt(e.amount||0)}</div>
                <span style={{display:"inline-block",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:99,marginTop:4,background:e.type==="UPI"?`${T.upi}16`:`${T.cash}14`,color:e.type==="UPI"?T.upi:T.cash}}>{e.type}</span>
              </div>
              <button onClick={()=>deleteEntry(e.id)} style={{width:28,height:28,borderRadius:8,border:`1px solid ${T.a4}30`,background:`${T.a4}08`,color:T.a4,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ADD VIEW — with improved OCR
══════════════════════════════════════════════════════════════════════ */
function AddView({T,form,setForm,addExpense,allCats,getCatById,showCatMgr,setShowCatMgr,customCats,addCustomCat,delCustomCat,newCatName,setNewCatName,newCatEmoji,setNewCatEmoji,newCatColor,setNewCatColor,voiceLang,setVoiceLang,voiceText,transText,listening,vLoad,startVoice,stopVoice,showVHelp,setShowVHelp,recurringTemplates,setRecurringTemplates,showToast,persist,user,expenses,catLimitsAll,monthlyTargets,isDark,pinVal,customCatsRaw,jars,isDesk}){
  const C=e=>mkCard(T,e);const B=e=>mkBtn(e);
  const [ocrLoading,setOcrLoading]=useState(false);
  const [ocrMsg,setOcrMsg]=useState("");
  const [ocrMode,setOcrMode]=useState("receipt");
  const [makeRecur,setMakeRecur]=useState(false);
  const [recurDay,setRecurDay]=useState(new Date().getDate());
  const fileRef=useRef(null);

  /* ── IMPROVED OCR — Better regex for Indian bills ── */
  const scanImage=async(file,mode)=>{
    if(!file)return;
    setOcrLoading(true);setOcrMsg("Loading OCR engine…");
    try{
      if(!window.Tesseract){
        setOcrMsg("Downloading OCR library (first time only)…");
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
          s.onload=res;s.onerror=rej;document.head.appendChild(s);
        });
      }
      setOcrMsg("Reading image…");
      const worker=await window.Tesseract.createWorker("eng",1,{
        logger:x=>{
          if(x.status==="recognizing text")
            setOcrMsg(`Scanning: ${Math.round(x.progress*100)}%`);
        }
      });
      const{data:{text}}=await worker.recognize(file);
      await worker.terminate();

      // Normalize text — remove newlines, extra spaces
      const raw=text.replace(/\r?\n/g," ").replace(/\s+/g," ").trim();

      let foundAmt="",foundMerchant="";

      if(mode==="upi"){
        /* UPI Screenshot patterns — GPay, PhonePe, Paytm, BHIM */
        const upiPats=[
          /(?:you paid|you sent|paid|sent|debited|payment of)\s*[₹Rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i,
          /[₹]\s*([\d,]+(?:\.\d{1,2})?)/,
          /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
          /\b([\d,]{3,}(?:\.\d{2})?)\b/,
        ];
        for(const p of upiPats){
          const mx=raw.match(p);
          if(mx&&mx[1]){foundAmt=mx[1].replace(/,/g,"");break;}
        }
        /* Merchant name */
        const mPats=[
          /(?:to|paid to|sent to)\s+([A-Za-z][A-Za-z0-9 &'\-]{2,28}?)(?:\s+on|\s+at|\s*[|@₹])/i,
          /([A-Z][A-Za-z0-9 ]{3,22})\s+(?:received|accepted|confirmed)/i,
        ];
        for(const p of mPats){
          const mx=raw.match(p);
          if(mx&&mx[1]&&mx[1].trim().length>2){foundMerchant=mx[1].trim();break;}
        }
        setForm(p=>({...p,amount:foundAmt||p.amount,type:"UPI",description:foundMerchant||p.description}));
      }else{
        /* Receipt scan — multiple fallback patterns in priority order */
        const receiptPats=[
          /(?:grand\s+total|net\s+total|total\s+amount|bill\s+total)\s*[:\-₹Rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i,
          /total\s*[:\-]?\s*[₹Rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i,
          /(?:net|amount)\s*(?:payable|paid|due)\s*[:\-₹Rs.]*\s*([\d,]+(?:\.\d{1,2})?)/i,
          /[₹]\s*([\d,]+(?:\.\d{1,2})?)/,
          /(?:Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i,
          /\b([\d,]{3,}(?:\.\d{2})?)\b/,
        ];
        for(const p of receiptPats){
          const mx=raw.match(p);
          if(mx&&mx[1]){foundAmt=mx[1].replace(/,/g,"");break;}
        }
        setForm(p=>({...p,amount:foundAmt||p.amount}));
      }

      if(foundAmt){
        setOcrMsg(`✅ Found ₹${foundAmt}${foundMerchant?` · ${foundMerchant}`:""}`);
        showToast(`Scanned ₹${foundAmt}${foundMerchant?` from ${foundMerchant}`:""}! 📷`);
      }else{
        setOcrMsg("⚠️ No amount found — try a clearer, brighter photo");
        showToast("Could not read amount — try again with better lighting","warn");
      }
    }catch(e){
      setOcrMsg("Scan failed — "+e.message);
      showToast("OCR failed: "+e.message,"err");
    }
    setOcrLoading(false);
  };

  const saveRecurring=async()=>{
    if(!form.amount||parseFloat(form.amount)<=0){showToast("Enter an amount first.","warn");return;}
    const cat=getCatById(form.category)||DEF_CATS[7];
    const t={id:Date.now(),name:form.description||cat.name,amount:parseFloat(form.amount),category:form.category,type:form.type,dayOfMonth:recurDay,emoji:cat.emoji||"🔁",active:true};
    const upd=[...(recurringTemplates||[]),t];
    setRecurringTemplates(upd);
    if(user)await persist(user.username,expenses,catLimitsAll,monthlyTargets,isDark,pinVal,customCatsRaw,upd,jars||[]);
    setMakeRecur(false);
    showToast(`🔁 Recurring "${t.name}" saved!`);
  };

  return(
    <div style={{padding:isDesk?"0 28px 60px":"0 16px 120px"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>New Expense</div>

      {/* Amount input */}
      <div style={{...C({marginBottom:12,padding:"20px"})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,fontWeight:600}}>AMOUNT (₹)</div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>{setOcrMode("upi");fileRef.current?.click();}} disabled={ocrLoading} style={{...B({fontSize:10,padding:"5px 10px",borderRadius:8,border:`1px solid ${T.upi}40`,background:`${T.upi}10`,color:T.upi,display:"flex",alignItems:"center",gap:4})}}>📱 UPI</button>
            <button onClick={()=>{setOcrMode("receipt");fileRef.current?.click();}} disabled={ocrLoading} style={{...B({fontSize:10,padding:"5px 10px",borderRadius:8,border:`1px solid ${T.a3}40`,background:`${T.a3}10`,color:T.a3,display:"flex",alignItems:"center",gap:4})}}>📷 Bill</button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{if(e.target.files[0])scanImage(e.target.files[0],ocrMode);e.target.value="";}}/>
          </div>
        </div>
        <input value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} type="number" placeholder="0" autoFocus style={{width:"100%",background:"none",border:"none",outline:"none",fontSize:isDesk?56:48,fontWeight:800,letterSpacing:-2,color:T.a1,fontFamily:"'JetBrains Mono',monospace",boxSizing:"border-box"}}/>
        {ocrLoading&&(
          <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:12,height:12,borderRadius:"50%",border:`2px solid ${T.a3}`,borderTopColor:"transparent",animation:"spin .7s linear infinite",flexShrink:0}}/>
            <span style={{fontSize:12,color:T.a3}}>{ocrMsg}</span>
          </div>
        )}
        {!ocrLoading&&ocrMsg&&<div style={{marginTop:8,fontSize:12,color:ocrMsg.startsWith("✅")?T.a3:ocrMsg.startsWith("⚠️")?T.a4:T.muted}}>{ocrMsg}</div>}
      </div>

      {/* Payment method */}
      <div style={{...C({marginBottom:12})}}>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:10,fontWeight:600}}>PAYMENT METHOD</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{t:"UPI",l:"UPI / Digital",c:T.upi,ico:"💳"},{t:"Cash",l:"Cash",c:T.cash,ico:"💵"}].map(({t,l,c,ico})=>(
            <button key={t} onClick={()=>setForm(p=>({...p,type:t}))} style={{...B({padding:"14px",borderRadius:13,textAlign:"left",border:`1.5px solid ${form.type===t?c:T.bdrSub}`,background:form.type===t?`${c}12`:"transparent",boxShadow:form.type===t?`0 2px 12px ${c}28`:"none"})}}>
              <div style={{fontSize:20,marginBottom:6}}>{ico}</div>
              <div style={{fontWeight:600,color:form.type===t?c:T.muted,fontSize:14}}>{l}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Category grid */}
      <div style={{...C({marginBottom:12})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,fontWeight:600}}>CATEGORY</div>
          <button onClick={()=>setShowCatMgr(true)} style={{...B({fontSize:11,padding:"4px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:`${T.a1}10`,color:T.a1})}}>+ Manage</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isDesk?"repeat(6,1fr)":"repeat(4,1fr)",gap:8}}>
          {(allCats||[]).map(c=>(
            <button key={c.id} onClick={()=>setForm(p=>({...p,category:c.id}))} style={{...B({padding:"11px 4px",borderRadius:13,border:`1.5px solid ${form.category===c.id?c.color:T.bdrSub}`,background:form.category===c.id?`${c.color}14`:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:5})}}>
              <span style={{fontSize:18}}>{c.emoji}</span>
              <span style={{fontSize:9,fontWeight:600,color:form.category===c.id?c.color:T.muted,textAlign:"center",lineHeight:1.2}}>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description + Date */}
      <div style={{...C({marginBottom:12})}}>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:8,fontWeight:600}}>DESCRIPTION</div>
        <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Brief description" style={{width:"100%",background:"none",border:"none",outline:"none",borderBottom:`1.5px solid ${T.bdrSub}`,paddingBottom:9,color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box",marginBottom:18}}/>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:8,fontWeight:600}}>DATE</div>
        <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{background:"none",border:"none",outline:"none",borderBottom:`1.5px solid ${T.bdrSub}`,paddingBottom:6,color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",colorScheme:T.isDark?"dark":"light"}}/>
      </div>

      {/* Recurring toggle */}
      <div style={{...C({marginBottom:12})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:700,color:T.text,fontSize:15}}>🔁 Make Recurring</div>
            <div style={{fontSize:12,color:T.muted,marginTop:2}}>Auto-add this expense every month</div>
          </div>
          <button onClick={()=>setMakeRecur(p=>!p)} style={{...B({padding:"7px 14px",borderRadius:99,border:`1.5px solid ${makeRecur?T.a3:T.bdrSub}`,background:makeRecur?`${T.a3}15`:"transparent",color:makeRecur?T.a3:T.muted,fontSize:13})}}>{makeRecur?"ON ✓":"OFF"}</button>
        </div>
        {makeRecur&&(
          <div style={{marginTop:14,animation:"fadeIn .2s ease"}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:8,fontWeight:600}}>REPEAT ON DAY OF MONTH</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
              {[1,5,10,15,20,25,28].map(d=>(
                <button key={d} onClick={()=>setRecurDay(d)} style={{...B({padding:"7px 12px",borderRadius:99,border:`1.5px solid ${recurDay===d?T.a3:T.bdrSub}`,background:recurDay===d?`${T.a3}15`:"transparent",color:recurDay===d?T.a3:T.muted,fontSize:12})}}>
                  {d}{d===1?"st":d===2?"nd":d===3?"rd":"th"}
                </button>
              ))}
            </div>
            <button onClick={saveRecurring} style={{...B({width:"100%",padding:"12px",borderRadius:12,background:`${T.a3}15`,border:`1.5px solid ${T.a3}`,color:T.a3,fontSize:14})}}>🔁 Save as Recurring Template</button>
          </div>
        )}
      </div>

      {/* Voice input */}
      <div style={{...C({marginBottom:16})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <div style={{fontWeight:700,color:T.text,fontSize:15}}>🎤 Voice Input</div>
            <div style={{fontSize:12,color:T.muted,marginTop:2}}>Speak in any Indian language</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setShowVHelp(p=>!p)} style={{...B({fontSize:11,padding:"5px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:`${T.a1}12`,color:T.a1})}}>{showVHelp?"Hide":"How?"}</button>
            <select value={voiceLang} onChange={e=>setVoiceLang(e.target.value)} style={{background:T.input,border:`1px solid ${T.border}`,borderRadius:9,color:T.text,padding:"6px 10px",fontSize:12,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",outline:"none"}}>
              {LANGS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>
        {showVHelp&&(
          <div style={{marginBottom:14,padding:"14px",borderRadius:12,background:T.isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.04)",border:`1px solid ${T.bdrSub}`,animation:"fadeIn .2s"}}>
            {[{l:"English",ex:"Two hundred food cash"},{l:"Hindi",ex:"Do sau khana cash"},{l:"Gujarati",ex:"Be sau jaman nakad"},{l:"Marathi",ex:"Don she jevan cash"}].map(v=>(
              <div key={v.l} style={{display:"flex",gap:10,marginBottom:7}}>
                <span style={{fontSize:10,fontWeight:700,color:T.a1,minWidth:60,paddingTop:2}}>{v.l}</span>
                <span style={{fontSize:12,color:T.sub,fontStyle:"italic"}}>"{v.ex}"</span>
              </div>
            ))}
            <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:`${T.a3}10`,border:`1px solid ${T.a3}20`}}>
              <div style={{fontSize:11,color:T.a3}}>💡 Say: Amount → Item/Category → UPI or Cash</div>
            </div>
          </div>
        )}
        <button onClick={listening?stopVoice:startVoice} style={{...B({width:"100%",padding:"13px",borderRadius:12,border:`1.5px solid ${listening?T.a4:T.border}`,background:listening?`${T.a4}10`:`${T.a1}08`,color:listening?T.a4:T.a1,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10})}}>
          <span style={{fontSize:20,animation:listening?"pulse 1s infinite":"none"}}>{listening?"⏹":"🎙"}</span>
          {vLoad?"Translating & parsing…":listening?"Tap to stop — speak now":"Start voice recording"}
        </button>
        {voiceText&&<div style={{marginTop:10,padding:"9px 12px",borderRadius:10,background:T.isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.04)",fontSize:13,color:T.muted,fontStyle:"italic"}}>Heard: "{voiceText}"</div>}
        {transText&&<div style={{marginTop:6,padding:"9px 12px",borderRadius:10,background:`${T.a3}08`,border:`1px solid ${T.a3}20`,fontSize:13,color:T.a3}}>Translated: "{transText}"</div>}
      </div>

      <button onClick={addExpense} style={{...B({width:"100%",padding:16,borderRadius:14,background:T.grad,color:"#fff",fontSize:16,boxShadow:`0 6px 28px ${T.glow}`})}}>Save Expense</button>

      {/* Category Manager Modal */}
      {showCatMgr&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.6)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"16px"}} onClick={e=>{if(e.target===e.currentTarget)setShowCatMgr(false);}}>
          <div style={{...mkCard(T,{width:"min(520px,100%)",padding:"24px",maxHeight:"85vh",overflowY:"auto",borderRadius:20,background:T.isDark?"#13131f":"#fff"})}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:T.text,marginBottom:6}}>Manage Categories</div>
            <div style={{fontSize:13,color:T.muted,marginBottom:20}}>Create custom spending categories</div>
            <div style={{...mkCard(T,{marginBottom:16,padding:"16px",borderColor:T.border})}}>
              <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="Category name" style={{width:"100%",background:T.input,border:`1.5px solid ${T.bdrSub}`,borderRadius:10,padding:"11px 14px",color:T.text,fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",marginBottom:12}}/>
              <div style={{fontSize:11,color:T.muted,marginBottom:8,fontWeight:600}}>EMOJI</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{CAT_EMOJIS.map(e=><button key={e} onClick={()=>setNewCatEmoji(e)} style={{...mkBtn({width:36,height:36,borderRadius:8,border:`1.5px solid ${newCatEmoji===e?T.a1:T.bdrSub}`,background:newCatEmoji===e?`${T.a1}15`:"transparent",fontSize:18})}}>{e}</button>)}</div>
              <div style={{fontSize:11,color:T.muted,marginBottom:8,fontWeight:600}}>COLOR</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>{CAT_COLORS.map(c=><button key={c} onClick={()=>setNewCatColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,border:`3px solid ${newCatColor===c?"#fff":"transparent"}`,cursor:"pointer",outline:newCatColor===c?`2px solid ${c}`:"none"}}/>)}</div>
              <button onClick={addCustomCat} style={{...mkBtn({width:"100%",padding:"13px",borderRadius:12,background:T.grad,color:"#fff",fontSize:14,boxShadow:`0 4px 16px ${T.glow}`})}}>+ Add Category</button>
            </div>
            {(customCats||[]).length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:12,color:T.muted,fontWeight:600,marginBottom:10}}>YOUR CATEGORIES</div>
                {(customCats||[]).map(c=>(
                  <div key={c.id} style={{...mkCard(T,{marginBottom:8,padding:"12px 14px",display:"flex",alignItems:"center",gap:12})}}>
                    <div style={{width:38,height:38,borderRadius:10,background:`${c.color}15`,border:`1px solid ${c.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c.emoji}</div>
                    <div style={{flex:1,fontWeight:600,color:T.text,fontSize:14}}>{c.name}</div>
                    <button onClick={()=>delCustomCat(c.id)} style={{...mkBtn({padding:"6px 12px",borderRadius:8,border:`1px solid ${T.a4}30`,background:`${T.a4}08`,color:T.a4,fontSize:12})}}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={()=>setShowCatMgr(false)} style={{...mkBtn({width:"100%",padding:"13px",border:`1px solid ${T.bdrSub}`,background:"transparent",color:T.text,fontSize:14})}}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CHARTS VIEW — all data from all months, charts fixed
══════════════════════════════════════════════════════════════════════ */
function ChartsView({T,expenses,period,setPeriod,allCats,isDesk}){
  const C=e=>mkCard(T,e);const B=e=>mkBtn(e);
  const now=new Date();
  const CT=({active,payload,label})=><ChartTip active={active} payload={payload} label={label} T={T}/>;

  /* BUG FIX: Use day=1 to prevent month overflow (March 31 - 1 month ≠ March 2) */
  const chartData=(()=>{
    if(period==="day")return Array.from({length:7},(_,i)=>{
      const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(6-i));
      const e=(expenses||[]).filter(x=>{
        const xd=new Date(x.date);
        return xd.getFullYear()===d.getFullYear()&&xd.getMonth()===d.getMonth()&&xd.getDate()===d.getDate();
      });
      return{name:d.toLocaleDateString("en",{weekday:"short"}),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+(x.amount||0),0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+(x.amount||0),0)};
    });
    if(period==="month")return Array.from({length:6},(_,i)=>{
      /* Use day=1 always — prevents month-end overflow */
      const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1);
      const key=monthKey(d);
      const e=expForMonth(expenses,key);
      return{name:d.toLocaleDateString("en",{month:"short",year:"2-digit"}),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+(x.amount||0),0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+(x.amount||0),0)};
    });
    return Array.from({length:3},(_,i)=>{
      const yr=now.getFullYear()-(2-i);
      const e=(expenses||[]).filter(x=>new Date(x.date).getFullYear()===yr);
      return{name:String(yr),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+(x.amount||0),0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+(x.amount||0),0)};
    });
  })();

  /* Current month category breakdown */
  const curKey=monthKey(now);
  const curMonth=expForMonth(expenses,curKey);
  const upiAmt=curMonth.filter(e=>e.type==="UPI").reduce((s,e)=>s+(e.amount||0),0);
  const cashAmt=curMonth.filter(e=>e.type==="Cash").reduce((s,e)=>s+(e.amount||0),0);
  const pieData=(allCats||[]).map(c=>({...c,value:curMonth.filter(e=>e.category===c.id).reduce((s,e)=>s+(e.amount||0),0)})).filter(c=>c.value>0);
  const pieTotal=pieData.reduce((s,p)=>s+p.value,0);

  return(
    <div style={{padding:isDesk?"0 28px 60px":"0 16px 120px",width:"100%"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>Analytics</div>

      {/* Period toggle */}
      <div style={{...C({marginBottom:14,display:"flex",padding:5,gap:4})}}>
        {[{v:"day",l:"7 Days"},{v:"month",l:"6 Months"},{v:"year",l:"3 Years"}].map(({v,l})=>(
          <button key={v} onClick={()=>setPeriod(v)} style={{...B({flex:1,padding:"10px 4px",borderRadius:11,background:period===v?T.grad:"transparent",color:period===v?"#fff":T.muted,fontSize:12,boxShadow:period===v?`0 2px 10px ${T.glow}`:"none"})}}>{l}</button>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{...C({marginBottom:14,padding:"18px 10px 12px 6px"})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingLeft:10}}>
          <span style={{fontWeight:600,color:T.text,fontSize:15,fontFamily:"'DM Serif Display',serif"}}>UPI vs Cash</span>
          <div style={{display:"flex",gap:12}}>
            {[{l:"UPI",c:T.upi},{l:"Cash",c:T.cash}].map(x=>(
              <div key={x.l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.muted}}>
                <div style={{width:10,height:4,borderRadius:2,background:x.c}}/>{x.l}
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={isDesk?260:210}>
          <BarChart data={chartData} margin={{top:4,right:6,left:-12,bottom:0}} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} vertical={false}/>
            <XAxis dataKey="name" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>999?(v/1000).toFixed(1)+"k":v} width={38}/>
            <Tooltip content={<CT/>} cursor={{fill:T.isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.04)"}}/>
            <Bar dataKey="UPI" fill={T.upi} radius={[6,6,0,0]} isAnimationActive={false}/>
            <Bar dataKey="Cash" fill={T.cash} radius={[6,6,0,0]} isAnimationActive={false}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line chart */}
      <div style={{...C({marginBottom:14,padding:"18px 10px 12px 6px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,paddingLeft:10,fontFamily:"'DM Serif Display',serif"}}>Spending Trend</div>
        <ResponsiveContainer width="100%" height={isDesk?230:190}>
          <LineChart data={chartData} margin={{top:4,right:6,left:-12,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} vertical={false}/>
            <XAxis dataKey="name" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>999?(v/1000).toFixed(1)+"k":v} width={38}/>
            <Tooltip content={<CT/>}/>
            <Line type="monotone" dataKey="UPI" stroke={T.upi} strokeWidth={2.5} dot={{fill:T.upi,r:4,strokeWidth:0}} activeDot={{r:7,strokeWidth:0}} isAnimationActive={false}/>
            <Line type="monotone" dataKey="Cash" stroke={T.cash} strokeWidth={2.5} dot={{fill:T.cash,r:4,strokeWidth:0}} activeDot={{r:7,strokeWidth:0}} isAnimationActive={false}/>
            <Legend wrapperStyle={{fontSize:12,color:T.muted,paddingTop:8}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Donut chart — current month */}
      <div style={{...C({marginBottom:14,padding:"18px 16px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>Category Breakdown</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:14}}>{monthLabel(curKey)} · Current Month</div>
        {pieData.length>0?(
          <>
            <ResponsiveContainer width="100%" height={isDesk?220:190}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={isDesk?65:52} outerRadius={isDesk?95:82} dataKey="value" paddingAngle={3} isAnimationActive={false}>
                  {pieData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie>
                <Tooltip formatter={v=>[fmt(v),"Amount"]} contentStyle={{background:T.isDark?"rgba(10,14,25,.97)":"rgba(255,255,255,.98)",border:`1px solid ${T.border}`,borderRadius:12}}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
              {pieData.map(d=>(
                <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/>
                    <span style={{fontSize:13,color:T.muted}}>{d.emoji} {d.name}</span>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <div style={{width:70,height:4,borderRadius:99,background:T.isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.07)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pieTotal>0?(d.value/pieTotal)*100:0}%`,background:d.color,borderRadius:99}}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:"'JetBrains Mono',monospace",minWidth:68,textAlign:"right"}}>{fmt(d.value)}</span>
                    <span style={{fontSize:11,color:T.muted,minWidth:28,textAlign:"right"}}>{pieTotal>0?((d.value/pieTotal)*100).toFixed(0):0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ):(
          <div style={{textAlign:"center",padding:"36px 0",color:T.muted,fontSize:14}}>
            <div style={{fontSize:32,marginBottom:12}}>📊</div>
            No expenses this month yet!
          </div>
        )}
      </div>

      {/* UPI vs Cash summary */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[{l:"UPI Total",cnt:curMonth.filter(e=>e.type==="UPI").length,amt:upiAmt,c:T.upi},{l:"Cash Total",cnt:curMonth.filter(e=>e.type==="Cash").length,amt:cashAmt,c:T.cash}].map(s=>(
          <div key={s.l} style={{...C({textAlign:"center",padding:"16px 10px"})}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:6}}>{s.l}</div>
            <div style={{fontWeight:700,fontSize:17,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(s.amt)}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:4}}>{s.cnt} transactions</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   BUDGET VIEW — Per-month category limits + full month history
   BUG FIX: catLimitsAll is { "2026-03":{food:5000}, "2026-04":{food:8000} }
   Each month has its OWN independent limits. Old months retain their data.
   Defined OUTSIDE App() to prevent cursor/focus loss bugs.
══════════════════════════════════════════════════════════════════════ */
function BudgetView({T,expenses,allCats,monthlyTargets,saveMonthTarget,catLimitsAll,saveCatLimitsAll,showToast,recurringTemplates,setRecurringTemplates,persist,user,isDark,pinVal,customCats,jars,setJars,isDesk}){
  const C=e=>mkCard(T,e);const B=e=>mkBtn(e);
  const now=new Date();const curKey=monthKey(now);
  const years=Array.from({length:11},(_,i)=>2020+i);

  /* Local state — safe because BudgetView is defined at module level */
  const [selMonth,setSelMonth]=useState(curKey);
  const [inputAmt,setInputAmt]=useState(()=>{const v=monthlyTargets[curKey];return v>0?String(v):"";});
  const [pickerYear,setPickerYear]=useState(now.getFullYear());
  /* Per-month category limits — local edit state */
  const [localLimits,setLocalLimits]=useState(()=>({...(catLimitsAll[curKey]||{})}));

  /* Sync limits when user switches month */
  useEffect(()=>{
    setLocalLimits({...(catLimitsAll[selMonth]||{})});
  },[selMonth,catLimitsAll]);

  /* Derived for selected month */
  const selTarget=monthlyTargets[selMonth]||0;
  const selExp=expForMonth(expenses,selMonth);
  const selTotal=selExp.reduce((s,e)=>s+(e.amount||0),0);
  const selRawPct=selTarget>0?(selTotal/selTarget)*100:0;
  const selBarPct=Math.min(selRawPct,100);
  const selOver=selTarget>0&&selTotal>selTarget;
  /* Category data for selected month */
  const selCatData=(allCats||[]).map(c=>({
    ...c,
    spent:selExp.filter(e=>e.category===c.id).reduce((s,e)=>s+(e.amount||0),0),
    limit:parseFloat(localLimits[c.id])||0,
  }));
  const overCats=selCatData.filter(c=>c.spent>c.limit&&c.limit>0);

  const onMonthSelect=k=>{
    setSelMonth(k);
    const v=monthlyTargets[k]||0;
    setInputAmt(v>0?String(v):"");
  };
  const onYearSelect=y=>{
    setPickerYear(y);
    const m=selMonth.split("-")[1];
    const nk=`${y}-${m}`;
    setSelMonth(nk);
    const v=monthlyTargets[nk]||0;
    setInputAmt(v>0?String(v):"");
  };
  const onBudgetSave=async()=>{
    const v=parseFloat(inputAmt);
    if(!inputAmt||!inputAmt.trim()){showToast("Enter an amount first.","warn");return;}
    if(isNaN(v)||v<=0){showToast("Enter a valid amount > 0","warn");return;}
    await saveMonthTarget(selMonth,v);
    showToast(`✅ ${fmt(v)} set for ${monthLabel(selMonth)}`);
  };
  const onCatLimitSave=async(catId)=>{
    const v=parseFloat(localLimits[catId])||0;
    /* BUG FIX: Save limit under the selected month key, not globally */
    const monthLimits={...(catLimitsAll[selMonth]||{}),[catId]:v};
    const updAll={...catLimitsAll,[selMonth]:monthLimits};
    await saveCatLimitsAll(updAll);
    showToast("Limit saved for "+monthLabel(selMonth));
  };

  return(
    <div style={{padding:isDesk?"0 28px 60px":"0 16px 120px"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:6}}>Budget Control</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:20}}>Each month has its own independent budget and category limits</div>

      {/* Over-limit alert */}
      {overCats.length>0&&(
        <div style={{...C({marginBottom:14,borderColor:`${T.a4}30`,background:`${T.a4}07`,padding:"16px"})}}>
          <div style={{fontWeight:600,color:T.a4,marginBottom:10,fontSize:14}}>⚠ Over limit in {overCats.length} categor{overCats.length===1?"y":"ies"} — {monthLabel(selMonth)}</div>
          {overCats.map(c=>(
            <div key={c.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:T.sub,marginBottom:6,paddingLeft:8,borderLeft:`2px solid ${T.a4}40`}}>
              <div style={{display:"flex",gap:7}}><span>{c.emoji}</span><span>{c.name}</span></div>
              <span style={{color:T.a4,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>+{fmt(c.spent-c.limit)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Monthly budget setter */}
      <div style={{...C({marginBottom:16,background:T.gradSoft,borderColor:T.border})}}>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:14,fontWeight:600}}>SET MONTHLY BUDGET</div>

        {/* Year scroller */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:T.muted,marginBottom:8,fontWeight:500}}>Year</div>
          <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
            {years.map(y=>(
              <button key={y} onClick={()=>onYearSelect(y)} style={{...B({flexShrink:0,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${pickerYear===y?T.a1:T.bdrSub}`,background:pickerYear===y?`${T.a1}18`:"transparent",color:pickerYear===y?T.a1:T.muted,fontSize:12,fontWeight:pickerYear===y?700:400})}}>
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Month grid */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:T.muted,marginBottom:8,fontWeight:500}}>Month — tap to view that month's data</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {MONTHS.map((mo,i)=>{
              const k=`${pickerYear}-${String(i+1).padStart(2,"0")}`;
              const hasBudget=(monthlyTargets[k]||0)>0;
              const hasLimits=Object.values(catLimitsAll[k]||{}).some(v=>v>0);
              const isCur=k===curKey;const isSel=k===selMonth;
              const mTotal=expForMonth(expenses,k).reduce((s,e)=>s+(e.amount||0),0);
              const mOver=hasBudget&&mTotal>(monthlyTargets[k]||0);
              return(
                <button key={k} onClick={()=>onMonthSelect(k)} style={{...B({padding:"9px 4px",borderRadius:11,border:`1.5px solid ${isSel?T.a1:mOver?T.a4+"55":hasBudget?T.a3+"55":T.bdrSub}`,background:isSel?`${T.a1}18`:mOver?`${T.a4}07`:hasBudget?`${T.a3}08`:"transparent",color:isSel?T.a1:mOver?T.a4:isCur?T.a3:T.muted,fontSize:11,textAlign:"center",fontWeight:isSel?700:isCur?600:400,position:"relative"})}}>
                  {mo.slice(0,3)}
                  {isCur&&<span style={{position:"absolute",top:2,right:2,width:5,height:5,borderRadius:"50%",background:T.a3}}/>}
                  {hasBudget&&!isSel&&<span style={{display:"block",fontSize:8,color:mOver?T.a4:T.a3,marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>{mOver?"OVER":fmt(monthlyTargets[k]).replace("₹","")}</span>}
                  {hasLimits&&!hasBudget&&!isSel&&<span style={{display:"block",fontSize:7,color:T.muted,marginTop:2}}>limits</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected month display */}
        <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,color:T.sub}}>Selected: <strong style={{color:T.text}}>{monthLabel(selMonth)}</strong></span>
          {selMonth===curKey&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:99,background:`${T.a3}18`,color:T.a3,fontWeight:700}}>CURRENT</span>}
        </div>

        {selTarget>0&&(
          <div style={{marginBottom:14,padding:"10px 14px",borderRadius:12,background:T.isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.04)",border:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:11,color:T.muted,marginBottom:3}}>Budget for {monthLabel(selMonth)}</div>
              <div style={{fontSize:20,fontWeight:700,color:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(selTarget)}</div>
            </div>
            <span style={{fontSize:11,padding:"4px 10px",borderRadius:99,background:`${T.a1}15`,color:T.a1,fontWeight:600}}>ACTIVE</span>
          </div>
        )}

        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.sub,flexShrink:0}}>₹</span>
          <input
            type="number"
            value={inputAmt}
            placeholder="Enter budget amount…"
            onChange={e=>setInputAmt(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&onBudgetSave()}
            style={{flex:1,background:"none",border:"none",outline:"none",borderBottom:`2px solid ${T.a1}`,paddingBottom:6,fontSize:34,fontWeight:700,color:T.a1,letterSpacing:-1,fontFamily:"'JetBrains Mono',monospace"}}
          />
        </div>

        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {PRESETS.map(v=>(
            <button key={v} onClick={()=>setInputAmt(String(v))} style={{...B({padding:"7px 12px",borderRadius:99,border:`1.5px solid ${inputAmt===String(v)?T.a1:T.bdrSub}`,background:inputAmt===String(v)?`${T.a1}18`:"transparent",color:inputAmt===String(v)?T.a1:T.muted,fontSize:12})}}>
              {fmt(v)}
            </button>
          ))}
        </div>

        <button onClick={onBudgetSave} style={{...B({width:"100%",padding:"16px",borderRadius:14,background:T.grad,color:"#fff",fontSize:16,boxShadow:`0 6px 24px ${T.glow}`})}}>
          ✓ Set Budget for {monthLabel(selMonth)}
        </button>
        {selTarget>0&&(
          <button onClick={async()=>{await saveMonthTarget(selMonth,0);setInputAmt("");showToast("Budget cleared.");}} style={{...B({width:"100%",padding:"10px",marginTop:10,border:`1px solid ${T.a4}30`,background:"transparent",color:T.a4,fontSize:13})}}>
            Clear {monthLabel(selMonth)} budget
          </button>
        )}
      </div>

      {/* Selected month full report — expenses + progress + category chart */}
      <div style={{...C({marginBottom:16})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:16,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>
          {monthLabel(selMonth)} — Full Report
        </div>
        <div style={{fontSize:12,color:T.muted,marginBottom:16}}>
          {selExp.length} transactions · {fmt(selTotal)} spent
          {selTarget>0&&<span> · Budget {fmt(selTarget)}</span>}
        </div>

        {/* Budget progress */}
        {selTarget>0&&(
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:13,color:T.muted}}>Spent: <strong style={{color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(selTotal)}</strong></span>
              <span style={{fontSize:13,color:T.muted}}>Budget: <strong style={{color:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(selTarget)}</strong></span>
            </div>
            <div style={{height:12,borderRadius:99,background:T.isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.07)",overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:`${selBarPct}%`,borderRadius:99,background:selOver?T.a4:T.grad,transition:"width .7s ease"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:600,color:selOver?T.a4:T.a1}}>{selRawPct.toFixed(1)}% used</span>
              <span style={{fontSize:13,color:selOver?T.a4:T.muted,fontWeight:selOver?700:400}}>{selOver?`🔴 Over by ${fmt(selTotal-selTarget)}`:`${fmt(selTarget-selTotal)} remaining`}</span>
            </div>
          </div>
        )}

        {/* Category spending bars for this month */}
        {selCatData.filter(c=>c.spent>0||c.limit>0).map(cat=>{
          const cp=cat.limit>0?Math.min((cat.spent/cat.limit)*100,100):0;
          const co=cat.limit>0&&cat.spent>cat.limit;
          return(
            <div key={cat.id} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>{cat.emoji}</span>
                  <span style={{fontSize:13,fontWeight:600,color:T.text}}>{cat.name}</span>
                  {co&&<span style={{fontSize:10,padding:"1px 6px",borderRadius:99,background:`${T.a4}15`,color:T.a4,fontWeight:600}}>OVER</span>}
                </div>
                <div style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:T.muted,textAlign:"right"}}>
                  <span style={{color:T.text,fontWeight:600}}>{fmt(cat.spent)}</span>
                  {cat.limit>0&&<span style={{color:T.muted}}> / {fmt(cat.limit)}</span>}
                </div>
              </div>
              {cat.limit>0&&(
                <>
                  <div style={{height:6,borderRadius:99,background:T.isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${cp}%`,borderRadius:99,background:co?T.a4:cat.color,transition:"width .5s"}}/>
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginTop:3,textAlign:"right"}}>{cp.toFixed(0)}%</div>
                </>
              )}
              {cat.limit===0&&cat.spent>0&&(
                <div style={{height:3,borderRadius:99,background:`${cat.color}20`,overflow:"hidden"}}>
                  <div style={{height:"100%",width:"100%",borderRadius:99,background:cat.color,opacity:.5}}/>
                </div>
              )}
            </div>
          );
        })}
        {selCatData.filter(c=>c.spent>0||c.limit>0).length===0&&(
          <div style={{textAlign:"center",padding:"20px 0",color:T.muted,fontSize:13}}>
            No data recorded for {monthLabel(selMonth)}
          </div>
        )}
      </div>

      {/* BUG FIX: Category limits — per selected month */}
      <div style={{...C({marginBottom:16,borderColor:T.border})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>
          Category Limits — {monthLabel(selMonth)}
        </div>
        <div style={{fontSize:12,color:T.muted,marginBottom:16,lineHeight:1.7,padding:"10px 12px",borderRadius:10,background:`${T.a1}08`,border:`1px solid ${T.border}`}}>
          ⚠️ These limits are <strong style={{color:T.a1}}>ONLY for {monthLabel(selMonth)}</strong>. Different months have different limits — nothing carries over. Tap outside each field to save.
        </div>
        {(allCats||[]).map(cat=>{
          const bv=parseFloat(localLimits[cat.id])||0;
          const spent=selCatData.find(c=>c.id===cat.id)?.spent||0;
          const cp=bv>0?Math.min((spent/bv)*100,100):0;
          const co=bv>0&&spent>bv;
          return(
            <div key={cat.id} style={{...C({marginBottom:10,padding:"14px 16px"})}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:bv>0?10:0}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <span style={{fontSize:18}}>{cat.emoji}</span>
                  <span style={{fontWeight:600,color:T.text,fontSize:14}}>{cat.name}</span>
                  {co&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:`${T.a4}15`,color:T.a4,fontWeight:600}}>OVER</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(spent)} /</span>
                  <input
                    value={localLimits[cat.id]||""}
                    type="number"
                    placeholder="0"
                    onChange={e=>setLocalLimits(p=>({...p,[cat.id]:e.target.value}))}
                    onBlur={()=>onCatLimitSave(cat.id)}
                    onKeyDown={e=>e.key==="Enter"&&onCatLimitSave(cat.id)}
                    style={{width:74,background:"none",border:"none",outline:"none",borderBottom:`1.5px solid ${cat.color}60`,paddingBottom:2,color:cat.color,fontWeight:700,fontSize:13,textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}
                  />
                </div>
              </div>
              {bv>0&&(
                <>
                  <div style={{height:5,borderRadius:99,background:T.isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${cp}%`,borderRadius:99,transition:"width .5s",background:co?T.a4:cat.color}}/>
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginTop:5,textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{cp.toFixed(0)}% utilised</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* All months summary */}
      {Object.keys(monthlyTargets||{}).filter(k=>(monthlyTargets[k]||0)>0).length>0&&(
        <div style={{...C({marginBottom:16})}}>
          <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>All Months Summary</div>
          {Object.entries(monthlyTargets||{}).filter(([,v])=>v>0).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>{
            const mTotal=expForMonth(expenses,k).reduce((s,e)=>s+(e.amount||0),0);
            const mPct=Math.min((mTotal/v)*100,100);const mOver=mTotal>v;
            return(
              <div key={k} style={{marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${T.bdrSub}`,cursor:"pointer"}} onClick={()=>onMonthSelect(k)}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:13,fontWeight:600,color:T.text}}>{monthLabel(k)}</span>
                    {k===curKey&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:99,background:`${T.a1}20`,color:T.a1,fontWeight:700}}>NOW</span>}
                    {k===selMonth&&k!==curKey&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:99,background:`${T.a3}20`,color:T.a3,fontWeight:700}}>VIEWING</span>}
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:mOver?T.a4:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(mTotal)} / {fmt(v)}</span>
                </div>
                <div style={{height:6,borderRadius:99,background:T.isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${mPct}%`,borderRadius:99,background:mOver?T.a4:T.grad}}/>
                </div>
                <div style={{fontSize:11,color:mOver?T.a4:T.muted,marginTop:5,textAlign:"right"}}>{((mTotal/v)*100).toFixed(0)}% used · tap to view</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Savings Jars */}
      <SavingsJars T={T} jars={jars} setJars={setJars} curTarget={monthlyTargets[curKey]||0} curTotal={expForMonth(expenses,curKey).reduce((s,e)=>s+(e.amount||0),0)} expenses={expenses} catLimitsAll={catLimitsAll} monthlyTargets={monthlyTargets} showToast={showToast} persist={persist} user={user} isDark={isDark} pinVal={pinVal} customCats={customCats} recurringTemplates={recurringTemplates}/>

      {/* Recurring templates */}
      {(recurringTemplates||[]).length>0&&(
        <div style={{...C({marginTop:16})}}>
          <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>🔁 Recurring Templates</div>
          {(recurringTemplates||[]).map(r=>(
            <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,padding:"10px 12px",borderRadius:12,background:T.input,border:`1px solid ${T.bdrSub}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:18}}>{r.emoji||"🔁"}</span>
                <div>
                  <div style={{fontWeight:600,color:T.text,fontSize:13}}>{r.name}</div>
                  <div style={{fontSize:11,color:T.muted}}>Every {r.dayOfMonth}{r.dayOfMonth===1?"st":r.dayOfMonth===2?"nd":r.dayOfMonth===3?"rd":"th"} · {r.type}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontWeight:700,color:T.a1,fontFamily:"'JetBrains Mono',monospace",fontSize:13}}>{fmt(r.amount||0)}</span>
                <button onClick={async()=>{const upd=(recurringTemplates||[]).filter(x=>x.id!==r.id);setRecurringTemplates(upd);if(user)await persist(user.username,expenses,catLimitsAll,monthlyTargets,isDark,pinVal,customCats,upd,jars||[]);showToast("Template removed.");}} style={{...B({width:26,height:26,borderRadius:7,border:`1px solid ${T.a4}30`,background:`${T.a4}08`,color:T.a4,fontSize:11})}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SAVINGS JARS
══════════════════════════════════════════════════════════════════════ */
function SavingsJars({T,jars,setJars,curTarget,curTotal,expenses,catLimitsAll,monthlyTargets,showToast,persist,user,isDark,pinVal,customCats,recurringTemplates}){
  const C=e=>mkCard(T,e);const B=e=>mkBtn(e);
  const [showAdd,setShowAdd]=useState(false);
  const [jName,setJName]=useState("");const [jGoal,setJGoal]=useState("");const [jEmoji,setJEmoji]=useState("🏖");const [jColor,setJColor]=useState(JAR_COLORS[0]);
  const [addingTo,setAddingTo]=useState(null);const [addAmt,setAddAmt]=useState("");
  const saved=curTarget>0&&curTotal<curTarget?curTarget-curTotal:0;
  const saveJars=async upd=>{setJars(upd);if(user)await persist(user.username,expenses,catLimitsAll,monthlyTargets,isDark,pinVal,customCats,recurringTemplates||[],upd);};
  const addJar=async()=>{
    if(!jName.trim()){showToast("Enter a jar name.","warn");return;}
    const v=parseFloat(jGoal);if(!v||v<=0){showToast("Enter a goal amount.","warn");return;}
    const nj={id:Date.now(),name:jName.trim(),goal:v,saved:0,emoji:jEmoji,color:jColor};
    await saveJars([...(jars||[]),nj]);
    setJName("");setJGoal("");setJEmoji("🏖");setJColor(JAR_COLORS[0]);setShowAdd(false);
    showToast(`Jar "${nj.name}" created! 🫙`);
  };
  const addToJar=async(id,amt)=>{
    const v=parseFloat(amt);if(!v||v<=0){showToast("Enter a valid amount.","warn");return;}
    await saveJars((jars||[]).map(j=>j.id===id?{...j,saved:(j.saved||0)+v}:j));
    setAddingTo(null);setAddAmt("");showToast(`${fmt(v)} added! 🎉`);
  };
  return(
    <div style={{marginTop:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:T.text}}>🫙 Savings Jars</div><div style={{fontSize:12,color:T.muted,marginTop:2}}>Save toward your goals</div></div>
        <button onClick={()=>setShowAdd(p=>!p)} style={{...B({padding:"7px 14px",borderRadius:99,border:`1.5px solid ${T.a1}`,background:`${T.a1}12`,color:T.a1,fontSize:13})}}>+ New Jar</button>
      </div>
      {saved>0&&(
        <div style={{...C({marginBottom:14,background:"rgba(34,197,94,.08)",borderColor:"rgba(34,197,94,.25)",padding:"14px 16px"})}}>
          <div style={{fontWeight:700,color:"#22c55e",fontSize:14,marginBottom:4}}>🎉 You saved {fmt(saved)} vs budget!</div>
          <div style={{fontSize:12,color:T.muted,marginBottom:10}}>Transfer savings to a jar:</div>
          <div style={{display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
            {(jars||[]).filter(j=>j.saved<j.goal).map(j=>(
              <button key={j.id} onClick={()=>addToJar(j.id,saved)} style={{...B({flexShrink:0,padding:"8px 14px",borderRadius:99,border:`1.5px solid ${j.color}`,background:`${j.color}12`,color:j.color,fontSize:12})}}>
                {j.emoji} {j.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {showAdd&&(
        <div style={{...C({marginBottom:14,borderColor:T.border,animation:"fadeIn .2s"})}}>
          <input value={jName} onChange={e=>setJName(e.target.value)} placeholder="Jar name (e.g. Trip to Goa)" style={{width:"100%",background:T.input,border:`1.5px solid ${T.bdrSub}`,borderRadius:10,padding:"11px 14px",color:T.text,fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",marginBottom:10}}/>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <span style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:T.sub}}>₹</span>
            <input type="number" value={jGoal} onChange={e=>setJGoal(e.target.value)} placeholder="Goal amount" style={{flex:1,background:"none",border:"none",outline:"none",borderBottom:`2px solid ${T.border}`,paddingBottom:4,fontSize:24,fontWeight:700,color:T.a1,fontFamily:"'JetBrains Mono',monospace"}}/>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{JAR_EMOJIS.map(e=><button key={e} onClick={()=>setJEmoji(e)} style={{...B({width:34,height:34,borderRadius:8,border:`1.5px solid ${jEmoji===e?T.a1:T.bdrSub}`,background:jEmoji===e?`${T.a1}15`:"transparent",fontSize:17})}}>{e}</button>)}</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>{JAR_COLORS.map(c=><button key={c} onClick={()=>setJColor(c)} style={{width:26,height:26,borderRadius:"50%",background:c,border:`3px solid ${jColor===c?"#fff":"transparent"}`,cursor:"pointer"}}/>)}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <button onClick={()=>setShowAdd(false)} style={{...B({padding:"11px",border:`1px solid ${T.bdrSub}`,background:"transparent",color:T.muted,fontSize:13})}}>Cancel</button>
            <button onClick={addJar} style={{...B({padding:"11px",background:T.grad,color:"#fff",fontSize:13})}}>Create Jar</button>
          </div>
        </div>
      )}
      {!(jars||[]).length&&!showAdd&&<div style={{...C({textAlign:"center",padding:"24px",marginBottom:12})}}>
        <div style={{fontSize:36,marginBottom:8}}>🫙</div>
        <div style={{fontSize:14,color:T.muted}}>No jars yet — create one to save toward goals!</div>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        {(jars||[]).map(jar=>{
          const pct=jar.goal>0?Math.min((jar.saved||0)/jar.goal*100,100):0;const done=pct>=100;
          return(
            <div key={jar.id} style={{...C({padding:"16px",borderColor:done?"rgba(34,197,94,.3)":T.bdrSub,background:done?"rgba(34,197,94,.07)":T.card,position:"relative"})}}>
              {done&&<div style={{position:"absolute",top:8,right:8}}>✅</div>}
              <div style={{textAlign:"center",marginBottom:12}}>
                <div style={{position:"relative",width:56,height:72,margin:"0 auto 8px"}}>
                  <div style={{position:"absolute",inset:0,borderRadius:"8px 8px 12px 12px",border:`2.5px solid ${jar.color}60`,overflow:"hidden",background:T.isDark?"rgba(255,255,255,.03)":"rgba(0,0,0,.03)"}}>
                    <div style={{position:"absolute",bottom:0,left:0,right:0,height:`${pct}%`,background:`${jar.color}35`,transition:"height 1.2s cubic-bezier(.34,1.56,.64,1)"}}/>
                    {pct>0&&pct<100&&<div style={{position:"absolute",bottom:`${pct}%`,left:0,right:0,height:3,background:`${jar.color}50`}}/>}
                  </div>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{jar.emoji}</div>
                  <div style={{position:"absolute",top:-5,left:"15%",right:"15%",height:7,borderRadius:"4px 4px 0 0",background:`${jar.color}60`}}/>
                </div>
                <div style={{fontWeight:700,fontSize:12,color:T.text}}>{jar.name}</div>
                <div style={{fontSize:11,color:jar.color,fontWeight:600,fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{fmt(jar.saved||0)} / {fmt(jar.goal)}</div>
                <div style={{fontSize:10,color:T.muted,marginTop:2}}>{pct.toFixed(0)}% filled</div>
              </div>
              {!done&&(
                addingTo===jar.id?(
                  <div style={{display:"flex",gap:5}}>
                    <input type="number" value={addAmt} onChange={e=>setAddAmt(e.target.value)} placeholder="Amount" autoFocus style={{flex:1,background:T.input,border:`1px solid ${jar.color}40`,borderRadius:8,padding:"7px 8px",color:T.text,fontSize:12,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
                    <button onClick={()=>addToJar(jar.id,addAmt)} style={{...B({padding:"7px 9px",borderRadius:8,background:jar.color,color:"#fff",fontSize:12})}}>+</button>
                    <button onClick={()=>setAddingTo(null)} style={{...B({padding:"7px 9px",borderRadius:8,background:T.input,color:T.muted,fontSize:12})}}>✕</button>
                  </div>
                ):(
                  <button onClick={()=>setAddingTo(jar.id)} style={{...B({width:"100%",padding:"7px",borderRadius:8,border:`1.5px solid ${jar.color}40`,background:`${jar.color}10`,color:jar.color,fontSize:12})}}>+ Add money</button>
                )
              )}
              {done&&<div style={{textAlign:"center",fontSize:12,color:"#22c55e",fontWeight:700}}>🎉 Goal reached!</div>}
              <button onClick={async()=>saveJars((jars||[]).filter(j=>j.id!==jar.id))} style={{...B({width:"100%",marginTop:8,padding:"5px",borderRadius:8,border:`1px solid ${T.a4}20`,background:"transparent",color:T.muted,fontSize:10})}}>Remove</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   WRAPPED OVERLAY
══════════════════════════════════════════════════════════════════════ */
function WrappedOverlay({T,expenses,monthlyTargets,allCats,onClose}){
  const [page,setPage]=useState(0);
  const now=new Date();
  const prevKey=prevMonthKey();const curKey=monthKey(now);
  const targetKey=expForMonth(expenses,prevKey).length>0?prevKey:curKey;
  const mExp=expForMonth(expenses,targetKey);
  const mTotal=mExp.reduce((s,e)=>s+(e.amount||0),0);
  const budget=monthlyTargets[targetKey]||0;
  const saved=budget>0&&mTotal<budget?budget-mTotal:0;
  const catSpend={};mExp.forEach(e=>{catSpend[e.category]=(catSpend[e.category]||0)+(e.amount||0);});
  const topCatId=Object.entries(catSpend).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const topCat=(allCats||[]).find(c=>c.id===topCatId)||{name:"Other",emoji:"📌"};
  const topAmt=catSpend[topCatId]||0;
  const [y2,m2]=(()=>{const d=new Date(+targetKey.split("-")[0],+targetKey.split("-")[1]-2,1);return[String(d.getFullYear()),String(d.getMonth()+1).padStart(2,"0")];})();
  const prevTotal=expForMonth(expenses,`${y2}-${m2}`).reduce((s,e)=>s+(e.amount||0),0);
  const diff=prevTotal>0?((mTotal-prevTotal)/prevTotal*100):0;
  const daySpend={};mExp.forEach(e=>{const d=new Date(e.date).toLocaleDateString("en-IN",{weekday:"long"});daySpend[d]=(daySpend[d]||0)+(e.amount||0);});
  const topDay=Object.entries(daySpend).sort((a,b)=>b[1]-a[1])[0]?.[0]||"Monday";
  const slides=[
    {emoji:"🎉",text:`${monthLabel(targetKey)} Recap`,sub:`You made ${mExp.length} transactions this month`},
    {emoji:"💸",text:`Total: ${fmt(mTotal)}`,sub:"That's your grand total for the month!"},
    {emoji:topCat.emoji,text:`${topCat.name} was your top spend`,sub:`₹${topAmt.toLocaleString("en-IN")} — ${mTotal>0?((topAmt/mTotal)*100).toFixed(0):0}% of total!`},
    {emoji:diff>0?"📈":"📉",text:diff===0?"Same as last comparison month!":diff>0?`${Math.abs(diff).toFixed(0)}% more than before 😬`:`${Math.abs(diff).toFixed(0)}% less than before 🎉`,sub:prevTotal>0?`Previous: ${fmt(prevTotal)}`:"First comparison!"},
    {emoji:"📅",text:`${topDay}s are your expensive days`,sub:`You spent the most on ${topDay}s this month`},
    {emoji:saved>0?"💰":"🎯",text:saved>0?`Saved ${fmt(saved)} vs budget!`:"Set a budget to track savings!",sub:budget>0?`Budget was ${fmt(budget)}`:"Go to Budget tab to set one"},
  ];
  const shareText=`My SPNDR ${monthLabel(targetKey)} Wrapped 🎉\n💸 Spent: ${fmt(mTotal)}\n🏆 Top: ${topCat.emoji} ${topCat.name} (${fmt(topAmt)})\n${saved>0?`💰 Saved: ${fmt(saved)}`:"🎯 Setting budget next month"}\n\nTrack yours at spndr-dhara978.vercel.app`;
  const doShare=()=>{navigator.clipboard?.writeText(shareText).then(()=>alert("Copied! Paste on WhatsApp or Instagram 🎉")).catch(()=>alert(shareText));};
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.85)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"min(440px,100%)",background:T.isDark?"#0b0f1a":"#fff",borderRadius:24,overflow:"hidden",animation:"wrappedIn .4s ease",border:`1px solid ${T.border}`}}>
        <div style={{background:T.grad,padding:"20px 24px 16px",textAlign:"center",position:"relative"}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:"#fff"}}>Spndr Wrapped</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.8)",marginTop:4}}>{monthLabel(targetKey)}</div>
          <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"rgba(255,255,255,.2)",border:"none",width:30,height:30,borderRadius:"50%",color:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{padding:"32px 28px",textAlign:"center",minHeight:200,animation:"fadeIn .35s ease"}} key={page}>
          <div style={{fontSize:56,marginBottom:16}}>{slides[page]?.emoji}</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:T.text,marginBottom:10,lineHeight:1.4}}>{slides[page]?.text}</div>
          <div style={{fontSize:13,color:T.muted,lineHeight:1.6}}>{slides[page]?.sub}</div>
        </div>
        <div style={{display:"flex",justifyContent:"center",gap:6,padding:"0 24px 12px"}}>
          {slides.map((_,i)=><div key={i} style={{width:i===page?20:6,height:6,borderRadius:99,background:i===page?T.a1:T.bdrSub,transition:"all .3s"}}/>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 24px 24px"}}>
          <button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{...mkBtn({padding:"12px",borderRadius:12,border:`1px solid ${T.bdrSub}`,background:"transparent",color:page===0?T.muted:T.text,fontSize:14})}}>← Prev</button>
          {page<slides.length-1
            ?<button onClick={()=>setPage(p=>p+1)} style={{...mkBtn({padding:"12px",borderRadius:12,background:T.grad,color:"#fff",fontSize:14,boxShadow:`0 4px 16px ${T.glow}`})}}>Next →</button>
            :<button onClick={doShare} style={{...mkBtn({padding:"12px",borderRadius:12,background:T.grad,color:"#fff",fontSize:14,boxShadow:`0 4px 16px ${T.glow}`})}}>📤 Share Card</button>
          }
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   AI CHAT BUDDY
   ─────────────────────────────────────────────────────────────────────
   WHAT IS THE ANTHROPIC API KEY?
   ─────────────────────────────────────────────────────────────────────
   The AI Chat Buddy uses Anthropic's Claude AI model to answer your
   spending questions. Claude is NOT free — it requires an API key.

   How to get it (FREE):
   1. Go to console.anthropic.com
   2. Sign up (free — no credit card needed for free tier)
   3. You get $5 free credit — enough for hundreds of chats
   4. Click "API Keys" → "Create Key"
   5. Copy the key (looks like: sk-ant-api03-xxxxxx)
   6. Paste it in Settings → AI Buddy section

   WHY is it stored only in memory (not saved to database)?
   Because your API key is like a password — if it's saved in our
   database, anyone who sees your data could use your credits. So we
   ask you to enter it each session. It stays only in your browser
   memory and disappears when you close the app.
══════════════════════════════════════════════════════════════════════ */
function ChatBuddy({T,expenses,monthlyTargets,allCats,onClose,anthropicKey,showToast}){
  const [msgs,setMsgs]=useState([{role:"assistant",text:"Hey! 👋 I'm your Spndr AI buddy. Ask me anything about your spending — like 'where am I wasting money?' or 'how did I do this month?'"}]);
  const [inp,setInp]=useState("");const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[msgs,loading]);
  const curKey=monthKey();const thisM=expForMonth(expenses,curKey);
  const total=thisM.reduce((s,e)=>s+(e.amount||0),0);
  const budget=monthlyTargets[curKey]||0;
  const catSpend={};thisM.forEach(e=>{catSpend[e.category]=(catSpend[e.category]||0)+(e.amount||0);});
  const topCats=Object.entries(catSpend).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id,amt])=>{const c=(allCats||[]).find(x=>x.id===id)||{name:id,emoji:"📌"};return`${c.emoji}${c.name}: ${fmt(amt)}`;}).join(", ");
  const ctx=`You are a friendly Indian personal finance assistant called Spndr AI. The user's this month data: Total spent ${fmt(total)}, Budget ${budget>0?fmt(budget):"not set"}, Top categories: ${topCats||"no data yet"}, Total transactions this month: ${thisM.length}. Respond in 2-3 short sentences. Be warm, specific, and use ₹ for rupees. Use 1-2 emojis max. Give actionable advice based on THEIR actual numbers.`;
  const send=async()=>{
    if(!inp.trim())return;
    if(!anthropicKey.trim()){showToast("Add your Anthropic API key in Settings first.","warn");return;}
    const userMsg=inp.trim();setInp("");
    setMsgs(p=>[...p,{role:"user",text:userMsg}]);
    setLoading(true);
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key":anthropicKey,"anthropic-version":"2023-06-01"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:256,system:ctx,messages:[{role:"user",content:userMsg}]})
      });
      if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.error?.message||`HTTP ${res.status}`);}
      const data=await res.json();
      const reply=data.content?.[0]?.text||"I couldn't think of a response — try again!";
      setMsgs(p=>[...p,{role:"assistant",text:reply}]);
    }catch(e){
      setMsgs(p=>[...p,{role:"assistant",text:`Error: ${e.message}. Check your API key in Settings.`}]);
    }
    setLoading(false);
  };
  const quickQ=["Where am I wasting money?","How did I do this month?","Give me a saving tip!","Which category should I cut?"];
  return(
    <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"16px"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"min(520px,100%)",background:T.isDark?"#0d1120":"#fff",borderRadius:"20px 20px 16px 16px",overflow:"hidden",border:`1px solid ${T.border}`,maxHeight:"82vh",display:"flex",flexDirection:"column",animation:"fadeUp .3s ease"}}>
        <div style={{background:T.grad,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:"#fff"}}>🤖 Spndr AI Buddy</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.75)"}}>Powered by Claude · Ask about your spending</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.2)",border:"none",width:28,height:28,borderRadius:"50%",color:"#fff",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
          {msgs.map((msg,i)=>(
            <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",animation:"fadeIn .3s ease"}}>
              <div style={{maxWidth:"82%",padding:"10px 14px",borderRadius:msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:msg.role==="user"?T.grad:T.isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.06)",color:msg.role==="user"?"#fff":T.text,fontSize:14,lineHeight:1.6,boxShadow:msg.role==="user"?`0 4px 16px ${T.glow}`:"none"}}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{display:"flex",justifyContent:"flex-start"}}>
              <div style={{padding:"12px 16px",borderRadius:"16px 16px 16px 4px",background:T.isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.06)",display:"flex",gap:5,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.a1,animation:`chatBounce .8s ease ${i*0.15}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"0 12px 8px",display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",flexShrink:0}}>
          {quickQ.map(q=><button key={q} onClick={()=>setInp(q)} style={{...mkBtn({flexShrink:0,padding:"6px 12px",borderRadius:99,border:`1px solid ${T.border}`,background:`${T.a1}10`,color:T.a1,fontSize:11,whiteSpace:"nowrap"})}}>{q}</button>)}
        </div>
        <div style={{padding:"8px 12px 16px",borderTop:`1px solid ${T.bdrSub}`,display:"flex",gap:8,flexShrink:0}}>
          <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Ask about your spending…" style={{flex:1,background:T.input,border:`1px solid ${T.bdrSub}`,borderRadius:12,padding:"11px 14px",color:T.text,fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
          <button onClick={send} disabled={loading||!inp.trim()} style={{...mkBtn({width:44,height:44,borderRadius:12,background:inp.trim()&&!loading?T.grad:T.input,color:inp.trim()&&!loading?"#fff":T.muted,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:inp.trim()&&!loading?"pointer":"not-allowed"})}}>→</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SETTINGS VIEW
══════════════════════════════════════════════════════════════════════ */
function SettingsView({T,user,expenses,total,isDark,setIsDark,pinVal,setPinVal,locked,setLocked,pinMode,setPinMode,pinInput,setPinInput,pinError,setPinError,pinSetup,setPinSetup,handlePinDigit,handlePinBack,removePin,doSignOut,persist,catLimitsAll,monthlyTargets,customCats,notifEnabled,setNotifEnabled,showToast,recurringTemplates,jars,anthropicKey,setAnthropicKey,isDesk}){
  const C=e=>mkCard(T,e);const B=e=>mkBtn(e);
  const [showKey,setShowKey]=useState(false);
  return(
    <div style={{padding:isDesk?"0 28px 60px":"0 16px 120px"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>Settings</div>

      {/* Profile */}
      <div style={{...C({marginBottom:14,background:T.gradSoft,borderColor:T.border,padding:"20px"})}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:52,height:52,borderRadius:"50%",flexShrink:0,background:T.grad,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#fff",boxShadow:`0 4px 18px ${T.glow}`}}>{(user.username||"?")[0].toUpperCase()}</div>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:T.text}}>{user.username}</div>
            <div style={{fontSize:12,color:T.muted,marginTop:3}}>{(expenses||[]).length} expenses · {(jars||[]).length} jars</div>
          </div>
        </div>
      </div>

      {/* AI Buddy API Key */}
      <div style={{...C({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>🤖 AI Buddy API Key</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:6,lineHeight:1.7}}>
          The AI Chat Buddy uses <strong style={{color:T.a1}}>Anthropic's Claude AI</strong> — it is NOT free.
        </div>
        <div style={{...C({marginBottom:12,padding:"12px",borderColor:T.border,background:`${T.a1}06`})}}>
          <div style={{fontSize:12,color:T.sub,lineHeight:1.7}}>
            <strong style={{color:T.text}}>How to get your key (free $5 credit):</strong><br/>
            1. Go to <strong style={{color:T.a1}}>console.anthropic.com</strong><br/>
            2. Sign up → no credit card needed for free tier<br/>
            3. Click API Keys → Create Key<br/>
            4. Paste it below — looks like: <span style={{fontFamily:"'JetBrains Mono',monospace",color:T.a3,fontSize:11}}>sk-ant-api03-xxx</span>
          </div>
        </div>
        <div style={{fontSize:12,color:T.muted,marginBottom:10,lineHeight:1.6,padding:"8px 12px",borderRadius:9,background:`${T.a4}08`,border:`1px solid ${T.a4}20`}}>
          🔒 Key is stored <strong style={{color:T.text}}>only in memory</strong> (not saved to database) — it disappears when you close the app. This protects your credits.
        </div>
        <div style={{position:"relative"}}>
          <input type={showKey?"text":"password"} value={anthropicKey} onChange={e=>setAnthropicKey(e.target.value)} placeholder="sk-ant-api03-…" style={{width:"100%",background:T.input,border:`1.5px solid ${anthropicKey?T.a3:T.bdrSub}`,borderRadius:12,padding:"11px 44px 11px 14px",color:T.text,fontSize:13,fontFamily:"'JetBrains Mono',monospace",outline:"none"}}/>
          <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>setShowKey(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:16,padding:4}}>{showKey?"🙈":"👁️"}</button>
        </div>
        {anthropicKey&&<div style={{marginTop:8,fontSize:12,color:T.a3,fontWeight:600}}>✅ API key ready — tap AI Buddy on Home screen</div>}
      </div>

      {/* Notifications */}
      <div style={{...C({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>🔔 Notifications</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Budget alerts at 50%, 85%, and 100%.</div>
        <button onClick={async()=>{const ok=await reqNotif();setNotifEnabled(ok);if(ok)showToast("Notifications enabled! 🔔");else showToast("Allow in browser settings.","warn");}} style={{...B({width:"100%",padding:"13px",border:`1.5px solid ${typeof Notification!=="undefined"&&Notification.permission==="granted"?T.a3:T.border}`,background:typeof Notification!=="undefined"&&Notification.permission==="granted"?`${T.a3}12`:`${T.a1}08`,color:typeof Notification!=="undefined"&&Notification.permission==="granted"?T.a3:T.a1,fontSize:14})}}>
          {typeof Notification!=="undefined"&&Notification.permission==="granted"?"✅ Notifications Active":"Enable Budget Notifications →"}
        </button>
      </div>

      {/* Display mode */}
      <div style={{...C({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>Display Mode</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{m:true,l:"Dark",d:"Deep slate + warm gold",ico:"🌙"},{m:false,l:"Light",d:"Ivory + clean bright",ico:"☀️"}].map(({m,l,d,ico})=>(
            <button key={String(m)} onClick={()=>{setIsDark(m);if(user)persist(user.username,expenses,catLimitsAll,monthlyTargets,m,pinVal,customCats,recurringTemplates,jars||[]);}} style={{...B({padding:"16px 12px",borderRadius:14,textAlign:"left",border:`1.5px solid ${isDark===m?T.a1:T.bdrSub}`,background:isDark===m?T.gradSoft:"transparent",boxShadow:isDark===m?`0 4px 18px ${T.glow}`:"none"})}}>
              <div style={{fontSize:22,marginBottom:7}}>{ico}</div>
              <div style={{fontWeight:600,color:isDark===m?T.a1:T.text,fontSize:14}}>{l}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:3}}>{d}</div>
              {isDark===m&&<div style={{fontSize:10,color:T.a1,marginTop:8,fontWeight:700}}>● ACTIVE</div>}
            </button>
          ))}
        </div>
      </div>

      {/* PIN */}
      <div style={{...C({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>🔒 PIN Lock</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:14}}>4-digit PIN to lock the app.</div>
        {!pinSetup&&!pinVal&&<button onClick={()=>{setPinSetup(true);setPinMode("setup");setPinInput("");setPinError("");}} style={{...B({width:"100%",padding:"13px",border:`1.5px solid ${T.border}`,background:`${T.a1}10`,color:T.a1,fontSize:14})}}>Set Up PIN →</button>}
        {!pinSetup&&pinVal&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><button onClick={()=>{setPinSetup(true);setPinMode("setup");setPinInput("");setPinError("");}} style={{...B({padding:"11px",border:`1.5px solid ${T.bdrSub}`,background:T.input,color:T.text,fontSize:13})}}>Change PIN</button><button onClick={removePin} style={{...B({padding:"11px",border:`1.5px solid ${T.a4}30`,background:`${T.a4}08`,color:T.a4,fontSize:13})}}>Remove PIN</button></div>}
        {pinSetup&&(
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:13,color:T.sub,marginBottom:14}}>Enter a new 4-digit PIN</div>
            <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:18}}>
              {[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:pinInput.length>i?T.a1:T.bdrSub,border:`2px solid ${pinInput.length>i?T.a1:T.muted}`,transition:"all .2s"}}/>)}
            </div>
            {pinError&&<div style={{color:T.a4,fontSize:12,marginBottom:10}}>{pinError}</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:240,margin:"0 auto"}}>
              {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
                <button key={i} onClick={()=>d==="⌫"?handlePinBack():d!==""&&handlePinDigit(String(d))} style={{...B({padding:"14px 6px",border:`1.5px solid ${T.bdrSub}`,background:d===""?"transparent":T.card,color:T.text,fontSize:17,fontFamily:"'JetBrains Mono',monospace",cursor:d===""?"default":"pointer"})}}>{d}</button>
              ))}
            </div>
            <button onClick={()=>{setPinSetup(false);setPinMode("none");setPinInput("");}} style={{marginTop:14,background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",textDecoration:"underline",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{...C({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>Account Summary</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            {l:"All-time",v:fmt((expenses||[]).reduce((s,e)=>s+(e.amount||0),0)),s:"total spent"},
            {l:"This Month",v:fmt(total||0),s:"spent"},
            {l:"Entries",v:(expenses||[]).length,s:"recorded"},
            {l:"Jars",v:(jars||[]).length,s:"savings goals"},
          ].map(s=>(
            <div key={s.l} style={{padding:"13px",borderRadius:12,background:T.input,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:10,color:T.muted,marginBottom:5,fontWeight:600,letterSpacing:.5}}>{s.l.toUpperCase()}</div>
              <div style={{fontWeight:700,color:T.a1,fontFamily:"'JetBrains Mono',monospace",fontSize:14}}>{s.v}</div>
              <div style={{fontSize:10,color:T.muted,marginTop:3}}>{s.s}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={doSignOut} style={{...B({width:"100%",padding:"15px",borderRadius:13,border:`1.5px solid ${T.a4}35`,background:`${T.a4}08`,color:T.a4,fontSize:15})}}>Sign Out</button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN APP — state, logic, auth, shell
   DATA SCHEMA (vi7 key):
   {
     expenses: [{id,amount,category,type,date,description,recurring}],
     catLimitsAll: {"2026-03":{food:5000,transport:2000},"2026-04":{food:8000}},
     monthlyTargets: {"2026-03":15000,"2026-04":20000},
     customCats: [{id,name,emoji,color}],
     recurringTemplates: [{id,name,amount,dayOfMonth,type,emoji,active}],
     jars: [{id,name,goal,saved,emoji,color}],
     dark: true,
     pin: "hashedpin"
   }
══════════════════════════════════════════════════════════════════════ */
function AppInner(){
  const [isDark,setIsDark]=useState(true);
  const T=isDark?DARK:LIGHT;

  /* Desktop detection — fill screen on laptop */
  const [isDesk,setIsDesk]=useState(()=>window.innerWidth>=768);
  useEffect(()=>{
    const onResize=()=>setIsDesk(window.innerWidth>=768);
    window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[]);

  /* Auth */
  const [user,setUser]=useState(null);
  const [authMode,setAuthMode]=useState("signin");
  const [aForm,setAForm]=useState({username:"",password:"",confirm:""});
  const [showPw,setShowPw]=useState({password:false,confirm:false});
  const [aErr,setAErr]=useState("");const [aInfo,setAInfo]=useState("");const [aLoading,setALoading]=useState(false);
  /* PIN */
  const [pinVal,setPinVal]=useState("");const [pinInput,setPinInput]=useState("");const [pinMode,setPinMode]=useState("none");
  const [pinError,setPinError]=useState("");const [locked,setLocked]=useState(false);const [pinSetup,setPinSetup]=useState(false);
  /* Data */
  const [tab,setTab]=useState("home");
  const [expenses,setExpenses]=useState([]);
  /* BUG FIX: catLimitsAll stores limits per month {"2026-03":{food:5000}} */
  const [catLimitsAll,setCatLimitsAll]=useState({});
  const [monthlyTargets,setMonthlyTargets]=useState({});
  const [customCats,setCustomCats]=useState([]);
  const [recurringTemplates,setRecurringTemplates]=useState([]);
  const [jars,setJars]=useState([]);
  /* Add form */
  const [form,setForm]=useState({amount:"",category:"food",description:"",type:"UPI",date:todayStr()});
  const [showCatMgr,setShowCatMgr]=useState(false);
  const [newCatName,setNewCatName]=useState("");const [newCatEmoji,setNewCatEmoji]=useState("🏷️");const [newCatColor,setNewCatColor]=useState(CAT_COLORS[0]);
  /* Voice */
  const [voiceLang,setVoiceLang]=useState("en-US");const [voiceText,setVoiceText]=useState("");const [transText,setTransText]=useState("");
  const [listening,setListening]=useState(false);const [vLoad,setVLoad]=useState(false);const [showVHelp,setShowVHelp]=useState(false);
  /* UI */
  const [period,setPeriod]=useState("month");
  const [toast,setToast]=useState(null);const [undoEntry,setUndoEntry]=useState(null);
  const [exportMode,setExportMode]=useState(false);const [overspendAlert,setOverspendAlert]=useState(null);
  const [notifEnabled,setNotifEnabled]=useState(false);
  const [showWrapped,setShowWrapped]=useState(false);const [showChat,setShowChat]=useState(false);
  const [anthropicKey,setAnthropicKey]=useState("");
  const recRef=useRef(null);const undoTimer=useRef(null);const notifSent=useRef({});

  const allCats=[...DEF_CATS,...(customCats||[])];
  const getCatById=id=>allCats.find(c=>c.id===id)||DEF_CATS[7];

  /* Derived — current month only */
  const now=new Date();const curKey=monthKey(now);
  const curTarget=monthlyTargets[curKey]||0;
  const thisMonth=expForMonth(expenses,curKey);
  const total=thisMonth.reduce((s,e)=>s+(e.amount||0),0);
  const upiAmt=thisMonth.filter(e=>e.type==="UPI").reduce((s,e)=>s+(e.amount||0),0);
  const cashAmt=thisMonth.filter(e=>e.type==="Cash").reduce((s,e)=>s+(e.amount||0),0);
  const rawPct=curTarget>0?(total/curTarget)*100:0;
  const barPct=Math.min(rawPct,100);
  const isOver=curTarget>0&&total>curTarget;
  const catData=allCats.map(c=>({...c,spent:thisMonth.filter(e=>e.category===c.id).reduce((s,e)=>s+(e.amount||0),0)}));

  /* Overspend notifications */
  useEffect(()=>{
    if(!curTarget||curTarget<=0)return;
    if(rawPct>=100&&!notifSent.current.over){notifSent.current.over=true;setOverspendAlert({type:"over",title:"🔴 Budget Exceeded!",msg:`Spent ${fmt(total)} — over by ${fmt(total-curTarget)} this month.`});sendNotif("🔴 Budget Exceeded!",`Over by ${fmt(total-curTarget)}.`);}
    else if(rawPct>=85&&!notifSent.current["85"]){notifSent.current["85"]=true;setOverspendAlert({type:"warn",title:"⚠️ 85% Budget Used",msg:`${rawPct.toFixed(0)}% of ${fmt(curTarget)} used. ${fmt(curTarget-total)} left.`});sendNotif("⚠️ Budget Warning",`${rawPct.toFixed(0)}% used.`);}
    else if(rawPct>=50&&!notifSent.current["50"]){notifSent.current["50"]=true;sendNotif("💡 Halfway there","Half your monthly budget used.");}
  },[total,curTarget,rawPct]);

  /* Persist — includes all per-month data */
  const persist=useCallback(async(uname,exps,catLims,mTargets,dark,pin,cCats,rTemplates,jrs)=>{
    try{
      await sSet(`vi7:${uname}`,JSON.stringify({
        expenses:exps||[],
        catLimitsAll:catLims||{},   // per-month category limits
        monthlyTargets:mTargets||{},
        dark,pin:pin||"",
        customCats:cCats||[],
        recurringTemplates:rTemplates||[],
        jars:jrs||[]
      }));
    }catch(e){console.error("persist error:",e);}
  },[]);

  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3200);};

  /* Auth */
  const doSignUp=async()=>{
    const{username,password,confirm}=aForm;const u=username.trim().toLowerCase();
    setAErr("");setAInfo("");
    if(!u){setAErr("Username required.");return;}if(u.length<3){setAErr("Min 3 characters.");return;}
    if(!/^[a-z0-9_]+$/.test(u)){setAErr("Letters, numbers, underscores only.");return;}
    if(!password){setAErr("Password required.");return;}if(password.length<6){setAErr("Min 6 characters.");return;}
    if(password!==confirm){setAErr("Passwords do not match.");return;}
    setALoading(true);
    try{
      setAInfo("Checking availability…");
      const ex=await sGet(`vi7:auth:${u}`);
      if(ex){setAErr("Username taken.");setAInfo("");setALoading(false);return;}
      await sSet(`vi7:auth:${u}`,JSON.stringify({username:u,hash:hashPw(password)}));
      await persist(u,[],{},{},true,"",[],[],[]);
      setExpenses([]);setCatLimitsAll({});setMonthlyTargets({});setCustomCats([]);setRecurringTemplates([]);setJars([]);
      setIsDark(true);setPinVal("");setAInfo("");setUser({username:u});
      showToast(`Welcome, ${u}! 🎉`);
    }catch(e){setAErr("Sign up failed.");setAInfo(e.message);}
    setALoading(false);
  };

  const doSignIn=async()=>{
    const{username,password}=aForm;const u=username.trim().toLowerCase();
    setAErr("");setAInfo("");
    if(!u){setAErr("Enter username.");return;}if(!password){setAErr("Enter password.");return;}
    setALoading(true);
    try{
      setAInfo("Looking up account…");
      /* Try vi7 first, fall back to vi6 for old accounts */
      let ar=await sGet(`vi7:auth:${u}`);
      if(!ar)ar=await sGet(`vi6:auth:${u}`);
      if(!ar){setAErr("Account not found.");setALoading(false);return;}
      let auth;try{auth=JSON.parse(ar.value);}catch{setAErr("Account data corrupted.");setALoading(false);return;}
      if(auth.hash!==hashPw(password)){setAErr("Incorrect password.");setALoading(false);return;}
      setAInfo("Loading your data…");
      let dr=await sGet(`vi7:${u}`);
      if(!dr)dr=await sGet(`vi6:${u}`);
      if(dr){
        try{
          const d=JSON.parse(dr.value);
          setExpenses(d.expenses||[]);
          /* Handle migration: old accounts had flat 'budgets', new has catLimitsAll per month */
          if(d.catLimitsAll){setCatLimitsAll(d.catLimitsAll);}
          else if(d.budgets){
            /* Migrate old flat budgets to current month */
            const migrated={[curKey]:d.budgets};setCatLimitsAll(migrated);
          }else{setCatLimitsAll({});}
          setMonthlyTargets(d.monthlyTargets||{});
          setCustomCats(d.customCats||[]);
          setRecurringTemplates(d.recurringTemplates||[]);
          setJars(d.jars||[]);
          setIsDark(d.dark!==false);
          if(d.pin){setPinVal(d.pin);setLocked(true);setPinMode("lock");}
        }catch{setExpenses([]);setCatLimitsAll({});setMonthlyTargets({});setCustomCats([]);setRecurringTemplates([]);setJars([]);}
      }
      setAInfo("");setUser({username:u});showToast(`Welcome back, ${u}!`);
    }catch(e){setAErr("Sign in failed.");setAInfo(e.message);}
    setALoading(false);
  };

  const doSignOut=()=>{
    setUser(null);setExpenses([]);setTab("home");
    setAForm({username:"",password:"",confirm:""});setAErr("");setAInfo("");
    setShowPw({password:false,confirm:false});setPinVal("");setLocked(false);setPinMode("none");setPinInput("");setPinError("");
    setCatLimitsAll({});setMonthlyTargets({});setCustomCats([]);setRecurringTemplates([]);setJars([]);
    setShowWrapped(false);setShowChat(false);notifSent.current={};
  };

  const toggleMode=async()=>{const n=!isDark;setIsDark(n);if(user)await persist(user.username,expenses,catLimitsAll,monthlyTargets,n,pinVal,customCats,recurringTemplates,jars);};

  /* PIN */
  const handlePinDigit=d=>{
    const np=pinInput+d;setPinInput(np);setPinError("");
    if(np.length===4){
      if(pinMode==="setup"){setPinVal(np);setPinInput("");setPinMode("none");setPinSetup(false);if(user)persist(user.username,expenses,catLimitsAll,monthlyTargets,isDark,np,customCats,recurringTemplates,jars);showToast("PIN set! 🔒");}
      else if(pinMode==="lock"){if(np===pinVal){setLocked(false);setPinInput("");setPinMode("none");}else{setPinError("Wrong PIN.");setPinInput("");}}
    }
  };
  const handlePinBack=()=>{setPinInput(p=>p.slice(0,-1));setPinError("");};
  const removePin=async()=>{setPinVal("");setLocked(false);setPinMode("none");setPinSetup(false);setPinInput("");if(user)await persist(user.username,expenses,catLimitsAll,monthlyTargets,isDark,"",customCats,recurringTemplates,jars);showToast("PIN removed.");};

  /* Custom categories */
  const addCustomCat=async()=>{
    const name=newCatName.trim();if(!name){showToast("Enter a name.","warn");return;}
    if(allCats.find(c=>c.name.toLowerCase()===name.toLowerCase())){showToast("Category already exists.","warn");return;}
    const nc={id:"custom_"+Date.now(),name,emoji:newCatEmoji,color:newCatColor,isDefault:false};
    const upd=[...(customCats||[]),nc];setCustomCats(upd);
    if(user)await persist(user.username,expenses,catLimitsAll,monthlyTargets,isDark,pinVal,upd,recurringTemplates,jars);
    setNewCatName("");setNewCatEmoji("🏷️");setNewCatColor(CAT_COLORS[0]);
    showToast(`"${name}" added!`);
  };
  const delCustomCat=async id=>{
    const upd=(customCats||[]).filter(c=>c.id!==id);setCustomCats(upd);
    if(user)await persist(user.username,expenses,catLimitsAll,monthlyTargets,isDark,pinVal,upd,recurringTemplates,jars);
    showToast("Category removed.");
  };

  /* Budget */
  const saveMonthTarget=async(key,amount)=>{
    const upd={...monthlyTargets,[key]:amount};setMonthlyTargets(upd);notifSent.current={};
    if(user)await persist(user.username,expenses,catLimitsAll,upd,isDark,pinVal,customCats,recurringTemplates,jars);
  };
  /* BUG FIX: Save category limits for a specific month */
  const saveCatLimitsAll=async updAll=>{
    setCatLimitsAll(updAll);
    if(user)await persist(user.username,expenses,updAll,monthlyTargets,isDark,pinVal,customCats,recurringTemplates,jars);
  };

  /* Expenses */
  const addExpense=async()=>{
    const amt=parseFloat(form.amount);if(!amt||amt<=0){showToast("Enter a valid amount.","warn");return;}
    const entry={id:Date.now(),amount:amt,category:form.category,description:form.description||getCatById(form.category).name,type:form.type,date:new Date(form.date).toISOString()};
    const newExp=[entry,...(expenses||[])];setExpenses(newExp);showToast("Expense recorded.");
    if(user)await persist(user.username,newExp,catLimitsAll,monthlyTargets,isDark,pinVal,customCats,recurringTemplates,jars);
    setForm({amount:"",category:"food",description:"",type:"UPI",date:todayStr()});setTab("home");
  };
  const deleteEntry=async id=>{
    const entry=(expenses||[]).find(e=>e.id===id);if(!entry)return;
    const newExp=(expenses||[]).filter(e=>e.id!==id);setExpenses(newExp);
    if(user)await persist(user.username,newExp,catLimitsAll,monthlyTargets,isDark,pinVal,customCats,recurringTemplates,jars);
    if(undoTimer.current)clearTimeout(undoTimer.current);
    setUndoEntry(entry);undoTimer.current=setTimeout(()=>setUndoEntry(null),6000);
    showToast("Deleted. Tap Undo to restore.","warn");
  };
  const undoDelete=async()=>{
    if(!undoEntry)return;if(undoTimer.current)clearTimeout(undoTimer.current);
    const newExp=[undoEntry,...(expenses||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
    setExpenses(newExp);if(user)await persist(user.username,newExp,catLimitsAll,monthlyTargets,isDark,pinVal,customCats,recurringTemplates,jars);
    setUndoEntry(null);showToast("Entry restored!");
  };
  const exportCSV=range=>{
    const n2=new Date();let filtered=[],fn="";
    if(range==="week"){const w=new Date(n2);w.setDate(w.getDate()-7);filtered=(expenses||[]).filter(e=>new Date(e.date)>=w);fn="spndr_week";}
    else if(range==="month"){filtered=thisMonth;fn="spndr_"+n2.toLocaleDateString("en",{month:"short",year:"numeric"}).replace(" ","_");}
    else{filtered=(expenses||[]).filter(e=>new Date(e.date).getFullYear()===n2.getFullYear());fn="spndr_"+n2.getFullYear();}
    if(!filtered.length){showToast("No data for this period.","warn");return;}
    const rows=[["Date","Description","Category","Amount","Payment"],...filtered.map(e=>[new Date(e.date).toLocaleDateString("en-IN"),`"${e.description}"`,getCatById(e.category).name,e.amount,e.type]),["","","TOTAL",filtered.reduce((s,e)=>s+e.amount,0),""]];
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"}));
    a.download=fn+".csv";a.click();setExportMode(false);showToast(`Exported ${filtered.length} entries!`);
  };

  /* Recurring auto-add on login */
  useEffect(()=>{
    if(!user||(recurringTemplates||[]).length===0)return;
    const today=new Date();const todayDay=today.getDate();
    (recurringTemplates||[]).filter(r=>r.active&&r.dayOfMonth===todayDay).forEach(async r=>{
      const alreadyAdded=(expenses||[]).some(e=>e.category===r.category&&e.amount===r.amount&&monthKey(new Date(e.date))===curKey&&e.description===r.name);
      if(!alreadyAdded){
        const entry={id:Date.now()+Math.random(),amount:r.amount,category:r.category,description:r.name,type:r.type,date:new Date().toISOString(),recurring:true};
        const newExp=[entry,...(expenses||[])];setExpenses(newExp);
        await persist(user.username,newExp,catLimitsAll,monthlyTargets,isDark,pinVal,customCats,recurringTemplates,jars);
        showToast(`🔁 Auto-added: ${r.name}`);
      }
    });
  },[user]);

  /* Voice */
  const startVoice=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){showToast("Speech not supported in this browser.","err");return;}
    const r=new SR();r.lang=voiceLang;r.interimResults=false;r.maxAlternatives=3;
    r.onresult=async ev=>{
      let best="";
      for(let i=0;i<ev.results[0].length;i++){const a=ev.results[0][i].transcript;if(a.match(/\d+/)){best=a;break;}if(!best)best=a;}
      setVoiceText(best);setListening(false);setVLoad(true);
      let english=best;
      if(voiceLang!=="en-US"){try{english=await translateToEnglish(best);}catch{}}
      setTransText(english!==best?english:"");
      const text=english.toLowerCase().replace(/rupees?|rupaye?|rupiya|rupe|₹|rs\.?/gi,"").replace(/[,।]/g," ");
      const numMatch=text.match(/\d+[\.,]?\d*/);
      const wn={ek:1,do:2,teen:3,char:4,paanch:5,chhe:6,saat:7,aath:8,nau:9,das:10,bis:20,sau:100,hazaar:1000,be:2,tran:3,panch:5,nav:9,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twenty:20,thirty:30,forty:40,fifty:50,hundred:100,thousand:1000};
      let amount="";
      if(numMatch)amount=numMatch[0].replace(",",".");
      else{let val=0;for(const w of text.split(/\s+/))if(wn[w])val+=wn[w];if(val>0)amount=String(val);}
      const upiW=["upi","online","gpay","phonepe","paytm","neft","transfer","card","phonepay","googlepay","bhim","imps","digital","scan"];
      let type="Cash";if(upiW.some(w=>text.includes(w)))type="UPI";
      let category="other";
      for(const[cat,kws]of Object.entries(CAT_KW)){if(kws.some(k=>text.includes(k))){category=cat.toLowerCase();break;}}
      for(const cc of(customCats||[])){if(text.includes(cc.name.toLowerCase())){category=cc.id;break;}}
      let desc=english.replace(/\d+[\.,]?\d*/,"").replace(/rupees?|rupaye?|rupiya|rupe|₹|rs\.?/gi,"").trim();
      if(desc.length<3)desc=getCatById(category).name;
      setForm(prev=>({...prev,amount:amount||"",category,description:desc||getCatById(category).name,type}));
      setVLoad(false);
      if(amount)showToast(`Detected: ${fmt(parseFloat(amount))} · ${getCatById(category).name} · ${type}`);
      else showToast("Heard you — please enter amount manually","warn");
    };
    r.onerror=e=>{setListening(false);if(e.error==="not-allowed")showToast("Microphone denied.","err");else if(e.error==="no-speech")showToast("No speech detected.","warn");else showToast("Mic error: "+e.error,"err");};
    r.onend=()=>setListening(false);
    recRef.current=r;r.start();setListening(true);setVoiceText("");setTransText("");
  };
  const stopVoice=()=>recRef.current?.stop();

  const css=buildCss(T);
  const greet=now.getHours()<12?"Morning":now.getHours()<17?"Afternoon":"Evening";
  const TABS=[{id:"home",ico:"⌂",label:"Home"},{id:"add",ico:"+",label:"Add"},{id:"charts",ico:"↗",label:"Charts"},{id:"budget",ico:"◎",label:"Budget"},{id:"settings",ico:"⚙",label:"More"}];
  const mc=getMC(curTarget>0?rawPct:0,T);

  /* ── PIN screen ── */
  if(user&&locked&&pinMode==="lock")return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:24}}>
      <style>{css}</style>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:48,marginBottom:10}}>🔒</div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:32,color:T.a1}}>Spndr<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:T.a3,marginLeft:3,marginBottom:4,verticalAlign:"middle"}}/></div>
        <div style={{fontSize:13,color:T.muted,marginTop:8}}>Enter your 4-digit PIN</div>
      </div>
      <div style={{...mkCard(T,{padding:"32px 28px",width:"min(320px,100%)",textAlign:"center"})}}>
        <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:28}}>
          {[0,1,2,3].map(i=><div key={i} style={{width:16,height:16,borderRadius:"50%",background:pinInput.length>i?T.a1:T.bdrSub,border:`2px solid ${pinInput.length>i?T.a1:T.muted}`,transition:"all .2s"}}/>)}
        </div>
        {pinError&&<div style={{color:T.a4,fontSize:13,marginBottom:14,fontWeight:600}}>{pinError}</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
            <button key={i} onClick={()=>d==="⌫"?handlePinBack():d!==""&&handlePinDigit(String(d))} style={{...mkBtn({padding:"17px 8px",border:`1.5px solid ${T.bdrSub}`,background:d===""?"transparent":T.card,color:T.text,fontSize:20,fontFamily:"'JetBrains Mono',monospace",cursor:d===""?"default":"pointer"})}}>{d}</button>
          ))}
        </div>
        <button onClick={doSignOut} style={{marginTop:20,background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",textDecoration:"underline",fontFamily:"'DM Sans',sans-serif"}}>Sign out instead</button>
      </div>
    </div>
  );

  /* ── Auth screen ── */
  if(!user){
    const isUp=authMode==="signup";
    return(
      <div style={{minHeight:"100vh",width:"100%",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden",padding:"32px 16px",transition:"background .3s"}}>
        <style>{css}</style>
        <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden"}}>
          <div style={{position:"absolute",top:"-8%",left:"-8%",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${T.a1}${T.isDark?"16":"09"},transparent 70%)`,animation:"float 12s ease-in-out infinite"}}/>
          <div style={{position:"absolute",bottom:"0",right:"-8%",width:420,height:420,borderRadius:"50%",background:`radial-gradient(circle,${T.a3}${T.isDark?"12":"07"},transparent 70%)`,animation:"float 15s ease-in-out infinite",animationDelay:"4s"}}/>
        </div>
        <button onClick={()=>setIsDark(!isDark)} style={{position:"fixed",top:20,right:20,zIndex:20,width:42,height:42,borderRadius:"50%",border:`1px solid ${T.border}`,background:T.card,backdropFilter:"blur(12px)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:T.text}}>{T.isDark?"☀️":"🌙"}</button>
        <div style={{textAlign:"center",marginBottom:36,zIndex:10,animation:"fadeUp .5s ease"}}>
          <div style={{fontSize:13,letterSpacing:4,color:T.muted,fontWeight:600,marginBottom:8}}>PERSONAL FINANCE</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:46,letterSpacing:-1,color:T.a1,lineHeight:1.1}}>Spndr<span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:T.a3,marginLeft:3,marginBottom:6,verticalAlign:"middle"}}/></div>
          <div style={{width:36,height:2,background:T.grad,margin:"12px auto 0",borderRadius:99}}/>
          <div style={{fontSize:13,color:T.muted,marginTop:10}}>Track every rupee, every day</div>
        </div>
        <div style={{...mkCard(T,{padding:"32px 28px",width:"min(420px,100%)",zIndex:10,animation:"fadeUp .5s ease .1s both"})}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:T.input,borderRadius:12,padding:4,marginBottom:28,gap:4}}>
            {[["signin","Sign In"],["signup","Sign Up"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setAuthMode(m);setAErr("");setAInfo("");}} style={{...mkBtn({padding:"11px",borderRadius:9,background:authMode===m?T.grad:"transparent",color:authMode===m?"#fff":T.muted,fontSize:14,boxShadow:authMode===m?`0 2px 12px ${T.glow}`:"none"})}}>{l}</button>
            ))}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:7,fontWeight:600}}>USERNAME</div>
            <input type="text" value={aForm.username} placeholder="e.g. arjun_99" onChange={e=>setAForm(p=>({...p,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&(isUp?doSignUp():doSignIn())} style={{width:"100%",background:T.input,border:`1.5px solid ${aErr?T.a4:T.inputBdr}`,borderRadius:12,padding:"13px 16px",color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
          </div>
          <div style={{marginBottom:isUp?16:24}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:7,fontWeight:600}}>PASSWORD</div>
            <div style={{position:"relative"}}>
              <input type={showPw.password?"text":"password"} value={aForm.password} placeholder="Minimum 6 characters" onChange={e=>setAForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&(isUp?doSignUp():doSignIn())} style={{width:"100%",background:T.input,border:`1.5px solid ${aErr?T.a4:T.inputBdr}`,borderRadius:12,padding:"13px 48px 13px 16px",color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
              {/* FIX: onMouseDown preventDefault — eye works in ONE tap */}
              <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>setShowPw(p=>({...p,password:!p.password}))} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:6,color:T.muted,fontSize:18,lineHeight:1,userSelect:"none"}}>{showPw.password?"🙈":"👁️"}</button>
            </div>
          </div>
          {isUp&&(
            <div style={{marginBottom:24}}>
              <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:7,fontWeight:600}}>CONFIRM PASSWORD</div>
              <div style={{position:"relative"}}>
                <input type={showPw.confirm?"text":"password"} value={aForm.confirm} placeholder="Repeat password" onChange={e=>setAForm(p=>({...p,confirm:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doSignUp()} style={{width:"100%",background:T.input,border:`1.5px solid ${aErr?T.a4:T.inputBdr}`,borderRadius:12,padding:"13px 48px 13px 16px",color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
                <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>setShowPw(p=>({...p,confirm:!p.confirm}))} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:6,color:T.muted,fontSize:18,lineHeight:1,userSelect:"none"}}>{showPw.confirm?"🙈":"👁️"}</button>
              </div>
            </div>
          )}
          {aErr&&<div style={{padding:"12px 16px",borderRadius:12,marginBottom:12,background:`${T.a4}12`,border:`1px solid ${T.a4}35`}}><div style={{color:T.a4,fontWeight:600,fontSize:13}}>⚠ {aErr}</div></div>}
          {aInfo&&<div style={{padding:"10px 16px",borderRadius:12,marginBottom:12,background:`${T.a3}10`,border:`1px solid ${T.a3}25`}}><div style={{color:T.a3,fontSize:12,fontWeight:500}}>ℹ {aInfo}</div></div>}
          <button onClick={isUp?doSignUp:doSignIn} disabled={aLoading} style={{...mkBtn({width:"100%",padding:"15px",borderRadius:13,background:aLoading?T.input:T.grad,color:aLoading?T.muted:"#fff",fontSize:15,boxShadow:aLoading?"none":`0 6px 24px ${T.glow}`,display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:aLoading?"not-allowed":"pointer"})}}>
            {aLoading&&<div style={{width:15,height:15,borderRadius:"50%",border:`2px solid ${T.muted}`,borderTopColor:"transparent",animation:"spin .7s linear infinite"}}/>}
            {aLoading?"Please wait…":isUp?"Create Account →":"Sign In →"}
          </button>
          <p style={{textAlign:"center",marginTop:20,fontSize:13,color:T.muted}}>{isUp?"Already registered? ":"New here? "}<span onClick={()=>{setAuthMode(isUp?"signin":"signup");setAErr("");setAInfo("");}} style={{color:T.a1,fontWeight:600,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}}>{isUp?"Sign In":"Create free account"}</span></p>
        </div>
        {toast&&<ToastEl T={T} toast={toast}/>}
      </div>
    );
  }

  /* ── MAIN SHELL ──
     DESKTOP: max-width removed, full width layout with centered content
     MOBILE: max 480px, phone-style nav
  ── */
  const shellStyle=isDesk?{
    minHeight:"100vh",
    width:"100%",
    background:T.bg,
    color:T.text,
    fontFamily:"'DM Sans',sans-serif",
    transition:"background .3s,color .3s",
  }:{
    minHeight:"100vh",
    width:"100%",
    background:T.bg,
    color:T.text,
    fontFamily:"'DM Sans',sans-serif",
    position:"relative",
    maxWidth:480,
    margin:"0 auto",
    overflowX:"hidden",
    transition:"background .3s,color .3s",
  };

  /* Desktop uses a sidebar nav, mobile uses bottom nav */
  return(
    <div style={shellStyle}>
      <style>{css}</style>
      {/* Ambient blobs */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-5%",right:"5%",width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${mc}${T.isDark?"10":"06"},transparent)`,transition:"background .5s"}}/>
        <div style={{position:"absolute",bottom:"10%",left:"2%",width:240,height:240,borderRadius:"50%",background:`radial-gradient(circle,${T.a3}${T.isDark?"08":"05"},transparent)`}}/>
      </div>

      {isDesk?(
        /* ── DESKTOP LAYOUT — sidebar ── */
        <div style={{display:"flex",minHeight:"100vh",position:"relative",zIndex:1}}>
          {/* Sidebar */}
          <div style={{width:220,flexShrink:0,position:"sticky",top:0,height:"100vh",background:T.nav,borderRight:`1px solid ${T.divider}`,display:"flex",flexDirection:"column",backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)"}}>
            <div style={{padding:"28px 20px 16px"}}>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.a1}}>Spndr<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:T.a3,marginLeft:3,marginBottom:3,verticalAlign:"middle"}}/></div>
              <div style={{fontSize:11,color:T.muted,marginTop:4}}>Good {greet}, {user.username}</div>
            </div>
            {/* Sidebar nav items */}
            <div style={{flex:1,padding:"8px 12px",display:"flex",flexDirection:"column",gap:4}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{...mkBtn({width:"100%",padding:"12px 16px",borderRadius:12,textAlign:"left",background:tab===t.id?T.gradSoft:"transparent",border:`1px solid ${tab===t.id?T.border:"transparent"}`,color:tab===t.id?T.a1:T.sub,fontSize:14,display:"flex",alignItems:"center",gap:12,boxShadow:tab===t.id?`inset 0 0 0 1px ${T.border}`:"none"})}}>
                  <span style={{fontSize:18,filter:tab===t.id?"none":"grayscale(1) opacity(.5)"}}>{t.ico}</span>
                  <span style={{fontWeight:tab===t.id?700:500}}>{t.label}</span>
                  {t.id==="add"&&<span style={{marginLeft:"auto",width:22,height:22,borderRadius:6,background:T.grad,color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</span>}
                </button>
              ))}
            </div>
            {/* Budget chip */}
            {curTarget>0&&(
              <div style={{margin:"0 12px 12px",padding:"12px",borderRadius:12,background:isOver?`${T.a4}12`:`${mc}12`,border:`1px solid ${isOver?T.a4:mc}30`}}>
                <div style={{fontSize:11,color:T.muted,marginBottom:4}}>This Month</div>
                <div style={{fontSize:15,fontWeight:700,color:mc,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(total)}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:2}}>of {fmt(curTarget)} budget · {rawPct.toFixed(0)}%</div>
              </div>
            )}
            {/* Theme + sign out */}
            <div style={{padding:"12px",borderTop:`1px solid ${T.divider}`,display:"flex",gap:8}}>
              <button onClick={toggleMode} style={{...mkBtn({flex:1,padding:"9px",borderRadius:10,border:`1px solid ${T.bdrSub}`,background:T.card,color:T.muted,fontSize:15})}}>
                {T.isDark?"☀️":"🌙"}
              </button>
              <button onClick={doSignOut} style={{...mkBtn({flex:2,padding:"9px",borderRadius:10,border:`1px solid ${T.a4}30`,background:`${T.a4}08`,color:T.a4,fontSize:12})}}>
                Sign Out
              </button>
            </div>
          </div>
          {/* Main content area */}
          <div style={{flex:1,overflowY:"auto",minWidth:0}}>
            <div style={{maxWidth:760,margin:"0 auto",paddingTop:28}}>
              {tab==="home"&&<HomeView T={T} expenses={expenses} thisMonth={thisMonth} total={total} upiAmt={upiAmt} cashAmt={cashAmt} rawPct={rawPct} barPct={barPct} isOver={isOver} curTarget={curTarget} catData={catData} overspendAlert={overspendAlert} setOverspendAlert={setOverspendAlert} undoEntry={undoEntry} undoDelete={undoDelete} exportMode={exportMode} setExportMode={setExportMode} exportCSV={exportCSV} setTab={setTab} deleteEntry={deleteEntry} getCatById={getCatById} recurringTemplates={recurringTemplates} setShowWrapped={setShowWrapped} setShowChat={setShowChat} isDesk={isDesk}/>}
              {tab==="add"&&<AddView T={T} form={form} setForm={setForm} addExpense={addExpense} allCats={allCats} getCatById={getCatById} showCatMgr={showCatMgr} setShowCatMgr={setShowCatMgr} customCats={customCats} addCustomCat={addCustomCat} delCustomCat={delCustomCat} newCatName={newCatName} setNewCatName={setNewCatName} newCatEmoji={newCatEmoji} setNewCatEmoji={setNewCatEmoji} newCatColor={newCatColor} setNewCatColor={setNewCatColor} voiceLang={voiceLang} setVoiceLang={setVoiceLang} voiceText={voiceText} transText={transText} listening={listening} vLoad={vLoad} startVoice={startVoice} stopVoice={stopVoice} showVHelp={showVHelp} setShowVHelp={setShowVHelp} recurringTemplates={recurringTemplates} setRecurringTemplates={setRecurringTemplates} showToast={showToast} persist={persist} user={user} expenses={expenses} catLimitsAll={catLimitsAll} monthlyTargets={monthlyTargets} isDark={isDark} pinVal={pinVal} customCatsRaw={customCats} jars={jars} isDesk={isDesk}/>}
              {tab==="charts"&&<ChartsView T={T} expenses={expenses} period={period} setPeriod={setPeriod} allCats={allCats} isDesk={isDesk}/>}
              {tab==="budget"&&<BudgetView T={T} expenses={expenses} allCats={allCats} monthlyTargets={monthlyTargets} saveMonthTarget={saveMonthTarget} catLimitsAll={catLimitsAll} saveCatLimitsAll={saveCatLimitsAll} showToast={showToast} recurringTemplates={recurringTemplates} setRecurringTemplates={setRecurringTemplates} persist={persist} user={user} isDark={isDark} pinVal={pinVal} customCats={customCats} jars={jars} setJars={setJars} isDesk={isDesk}/>}
              {tab==="settings"&&<SettingsView T={T} user={user} expenses={expenses} total={total} isDark={isDark} setIsDark={setIsDark} pinVal={pinVal} setPinVal={setPinVal} locked={locked} setLocked={setLocked} pinMode={pinMode} setPinMode={setPinMode} pinInput={pinInput} setPinInput={setPinInput} pinError={pinError} setPinError={setPinError} pinSetup={pinSetup} setPinSetup={setPinSetup} handlePinDigit={handlePinDigit} handlePinBack={handlePinBack} removePin={removePin} doSignOut={doSignOut} persist={persist} catLimitsAll={catLimitsAll} monthlyTargets={monthlyTargets} customCats={customCats} notifEnabled={notifEnabled} setNotifEnabled={setNotifEnabled} showToast={showToast} recurringTemplates={recurringTemplates} jars={jars} anthropicKey={anthropicKey} setAnthropicKey={setAnthropicKey} isDesk={isDesk}/>}
            </div>
          </div>
        </div>
      ):(
        /* ── MOBILE LAYOUT — bottom nav ── */
        <>
          {/* Mobile header */}
          <div style={{position:"sticky",top:0,zIndex:60,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",background:T.header,borderBottom:`1px solid ${T.divider}`,padding:"13px 16px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:11,color:T.muted}}>{now.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})} · Good {greet}</div>
                <div style={{fontFamily:"'DM Serif Display',serif",fontSize:21,color:T.a1,lineHeight:1.3}}>Spndr<span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:T.a3,marginLeft:2,marginBottom:3,verticalAlign:"middle"}}/></div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <button onClick={toggleMode} style={{width:36,height:36,borderRadius:"50%",border:`1px solid ${T.border}`,background:T.card,backdropFilter:"blur(12px)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",color:T.text,transition:"all .22s"}}>{T.isDark?"☀️":"🌙"}</button>
                {curTarget>0&&<div style={{padding:"5px 11px",borderRadius:99,fontSize:11,fontWeight:600,background:isOver?`${T.a4}16`:`${mc}18`,color:isOver?T.a4:mc,fontFamily:"'JetBrains Mono',monospace",transition:"all .5s"}}>{isOver?`+${fmt(total-curTarget)} over`:`${fmt(curTarget-total)} left`}</div>}
              </div>
            </div>
          </div>
          {/* Mobile page content */}
          <div style={{position:"relative",zIndex:1,paddingTop:14}}>
            {tab==="home"&&<HomeView T={T} expenses={expenses} thisMonth={thisMonth} total={total} upiAmt={upiAmt} cashAmt={cashAmt} rawPct={rawPct} barPct={barPct} isOver={isOver} curTarget={curTarget} catData={catData} overspendAlert={overspendAlert} setOverspendAlert={setOverspendAlert} undoEntry={undoEntry} undoDelete={undoDelete} exportMode={exportMode} setExportMode={setExportMode} exportCSV={exportCSV} setTab={setTab} deleteEntry={deleteEntry} getCatById={getCatById} recurringTemplates={recurringTemplates} setShowWrapped={setShowWrapped} setShowChat={setShowChat} isDesk={false}/>}
            {tab==="add"&&<AddView T={T} form={form} setForm={setForm} addExpense={addExpense} allCats={allCats} getCatById={getCatById} showCatMgr={showCatMgr} setShowCatMgr={setShowCatMgr} customCats={customCats} addCustomCat={addCustomCat} delCustomCat={delCustomCat} newCatName={newCatName} setNewCatName={setNewCatName} newCatEmoji={newCatEmoji} setNewCatEmoji={setNewCatEmoji} newCatColor={newCatColor} setNewCatColor={setNewCatColor} voiceLang={voiceLang} setVoiceLang={setVoiceLang} voiceText={voiceText} transText={transText} listening={listening} vLoad={vLoad} startVoice={startVoice} stopVoice={stopVoice} showVHelp={showVHelp} setShowVHelp={setShowVHelp} recurringTemplates={recurringTemplates} setRecurringTemplates={setRecurringTemplates} showToast={showToast} persist={persist} user={user} expenses={expenses} catLimitsAll={catLimitsAll} monthlyTargets={monthlyTargets} isDark={isDark} pinVal={pinVal} customCatsRaw={customCats} jars={jars} isDesk={false}/>}
            {tab==="charts"&&<ChartsView T={T} expenses={expenses} period={period} setPeriod={setPeriod} allCats={allCats} isDesk={false}/>}
            {tab==="budget"&&<BudgetView T={T} expenses={expenses} allCats={allCats} monthlyTargets={monthlyTargets} saveMonthTarget={saveMonthTarget} catLimitsAll={catLimitsAll} saveCatLimitsAll={saveCatLimitsAll} showToast={showToast} recurringTemplates={recurringTemplates} setRecurringTemplates={setRecurringTemplates} persist={persist} user={user} isDark={isDark} pinVal={pinVal} customCats={customCats} jars={jars} setJars={setJars} isDesk={false}/>}
            {tab==="settings"&&<SettingsView T={T} user={user} expenses={expenses} total={total} isDark={isDark} setIsDark={setIsDark} pinVal={pinVal} setPinVal={setPinVal} locked={locked} setLocked={setLocked} pinMode={pinMode} setPinMode={setPinMode} pinInput={pinInput} setPinInput={setPinInput} pinError={pinError} setPinError={setPinError} pinSetup={pinSetup} setPinSetup={setPinSetup} handlePinDigit={handlePinDigit} handlePinBack={handlePinBack} removePin={removePin} doSignOut={doSignOut} persist={persist} catLimitsAll={catLimitsAll} monthlyTargets={monthlyTargets} customCats={customCats} notifEnabled={notifEnabled} setNotifEnabled={setNotifEnabled} showToast={showToast} recurringTemplates={recurringTemplates} jars={jars} anthropicKey={anthropicKey} setAnthropicKey={setAnthropicKey} isDesk={false}/>}
          </div>
          {/* Mobile bottom nav */}
          <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:100,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",background:T.nav,borderTop:`1px solid ${T.divider}`,padding:"10px 6px 26px"}}>
            <div style={{display:"flex",justifyContent:"space-around",alignItems:"flex-end"}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,border:"none",background:"none",cursor:"pointer",padding:"4px 2px",borderRadius:12,position:"relative",transition:"all .2s"}}>
                  {t.id==="add"?(
                    <div style={{width:52,height:52,borderRadius:"50%",marginTop:-22,background:tab==="add"?T.grad:`linear-gradient(135deg,${T.a1}55,${T.a3}50)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,color:"#fff",boxShadow:tab==="add"?`0 6px 28px ${T.glow}`:`0 4px 16px ${T.glow}55`,border:`2px solid ${tab==="add"?"transparent":T.border}`,transition:"all .25s"}}>+</div>
                  ):(
                    <>
                      <span style={{fontSize:18,filter:tab===t.id?"none":"grayscale(1) opacity(.38)",transition:"filter .2s"}}>{t.ico}</span>
                      <span style={{fontSize:10,fontWeight:600,color:tab===t.id?T.a1:T.muted,fontFamily:"'DM Sans',sans-serif",transition:"color .2s"}}>{t.label}</span>
                      {tab===t.id&&<div style={{position:"absolute",bottom:0,width:20,height:2.5,borderRadius:99,background:T.grad}}/>}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Overlays */}
      {showWrapped&&<WrappedOverlay T={T} expenses={expenses} monthlyTargets={monthlyTargets} allCats={allCats} onClose={()=>setShowWrapped(false)}/>}
      {showChat&&<ChatBuddy T={T} expenses={expenses} monthlyTargets={monthlyTargets} allCats={allCats} onClose={()=>setShowChat(false)} anthropicKey={anthropicKey} showToast={showToast}/>}
      {toast&&<ToastEl T={T} toast={toast}/>}
    </div>
  );
}

export default function App(){return<ErrorBoundary><AppInner/></ErrorBoundary>;}
