import React, { useState, useRef, useCallback, useEffect, Component } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

/* ── SUPABASE ──────────────────────────────────────────────────────────── */
const supabase = createClient("https://zoydiohcruujgnstjmud.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpveWRpb2hjcnV1amduc3RqbXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjA0NjMsImV4cCI6MjA4OTc5NjQ2M30.8SA5zAdNYkzSIdwhfS58l0TMF2H5U-b9GxfGSWxhRVo");
const sGet = async k => { try { const {data}=await supabase.from("spndr_store").select("value").eq("key",k).single(); return data?{value:data.value}:null; } catch { return null; } };
const sSet = async (k,v) => { try { await supabase.from("spndr_store").upsert({key:k,value:v},{onConflict:"key"}); } catch(e) { throw new Error(e.message); } };

/* ── HELPERS ───────────────────────────────────────────────────────────── */
const hashPw    = s=>{let h=5381;for(let c of s)h=(h*33)^c.charCodeAt(0);return(h>>>0).toString(36);};
const fmt       = n=>`₹${Number(n).toLocaleString("en-IN")}`;
const todayStr  = ()=>new Date().toISOString().split("T")[0];
const monthKey  = (d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const monthLabel= key=>{const[y,m]=key.split("-");return new Date(parseInt(y),parseInt(m)-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"});};
const MONTHS    = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const translateToEnglish = async text => { try { const r=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`); const d=await r.json(); return d[0].map(s=>s[0]).join(" ").trim(); } catch { return text; } };

/* ── THEME ─────────────────────────────────────────────────────────────── */
const DARK  = {bg:"#0b0f1a",card:"rgba(255,255,255,.055)",header:"rgba(11,15,26,.92)",nav:"rgba(11,15,26,.97)",input:"rgba(255,255,255,.07)",inputBdr:"rgba(212,168,83,.4)",text:"#eef0f6",sub:"#9ba3b8",muted:"#4b5468",a1:"#d4a853",a3:"#2dd4bf",a4:"#f87171",upi:"#818cf8",cash:"#2dd4bf",grad:"linear-gradient(135deg,#d4a853,#2dd4bf)",gradSoft:"linear-gradient(135deg,rgba(212,168,83,.18),rgba(45,212,191,.12))",border:"rgba(212,168,83,.2)",bdrSub:"rgba(255,255,255,.08)",glow:"rgba(212,168,83,.25)",divider:"rgba(255,255,255,.07)",gridLine:"rgba(255,255,255,.06)",isDark:true};
const LIGHT = {bg:"#f7f6f2",card:"rgba(255,255,255,.94)",header:"rgba(247,246,242,.96)",nav:"rgba(247,246,242,.98)",input:"rgba(0,0,0,.045)",inputBdr:"rgba(139,101,30,.4)",text:"#0f1626",sub:"#3d4a61",muted:"#8a94a6",a1:"#b8860b",a3:"#0d9488",a4:"#dc2626",upi:"#4f46e5",cash:"#0d9488",grad:"linear-gradient(135deg,#b8860b,#0d9488)",gradSoft:"linear-gradient(135deg,rgba(184,134,11,.11),rgba(13,148,136,.08))",border:"rgba(184,134,11,.2)",bdrSub:"rgba(0,0,0,.09)",glow:"rgba(184,134,11,.2)",divider:"rgba(0,0,0,.08)",gridLine:"rgba(0,0,0,.07)",isDark:false};

/* ── MOOD ──────────────────────────────────────────────────────────────── */
const getMoodColor = (pct,T) => pct<=0?"#9ba3b8":pct<50?"#22c55e":pct<85?T.a1:pct<100?"#f59e0b":"#ef4444";
const getMoodEmoji = pct => pct<=0?"💰":pct<50?"🎉":pct<85?"💰":pct<100?"⚠️":"🔴";
const getMoodLabel = pct => pct<=0?"No Budget":pct<50?"Great Saving!":pct<85?"On Track":pct<100?"Careful!":"Over Budget!";

/* ── DATA ──────────────────────────────────────────────────────────────── */
const DEFAULT_CATS=[{id:"food",name:"Food",emoji:"🍽",color:"#f97316",isDefault:true},{id:"transport",name:"Transport",emoji:"🚇",color:"#0ea5e9",isDefault:true},{id:"shopping",name:"Shopping",emoji:"🛒",color:"#8b5cf6",isDefault:true},{id:"entertainment",name:"Entertainment",emoji:"🎬",color:"#ec4899",isDefault:true},{id:"health",name:"Health",emoji:"🏥",color:"#10b981",isDefault:true},{id:"bills",name:"Bills",emoji:"📋",color:"#f59e0b",isDefault:true},{id:"education",name:"Education",emoji:"🎓",color:"#3b82f6",isDefault:true},{id:"other",name:"Other",emoji:"📌",color:"#6b7280",isDefault:true}];
const CAT_COLORS=["#f97316","#0ea5e9","#8b5cf6","#ec4899","#10b981","#f59e0b","#3b82f6","#6b7280","#ef4444","#14b8a6","#a855f7","#f43f5e","#22c55e","#eab308","#06b6d4","#84cc16"];
const CAT_EMOJIS=["🍕","🚗","👗","🎵","💊","💡","📖","🏠","✈️","🎯","💰","🎁","🐕","🌱","☕","🎭","🏋️","💻","📱","🎮","🍷","🧴","🎪","🏦"];
const LANGS=[{label:"English",value:"en-US"},{label:"Hindi",value:"hi-IN"},{label:"Gujarati",value:"gu-IN"},{label:"Tamil",value:"ta-IN"},{label:"Telugu",value:"te-IN"},{label:"Marathi",value:"mr-IN"},{label:"Bengali",value:"bn-IN"},{label:"Punjabi",value:"pa-IN"},{label:"Kannada",value:"kn-IN"},{label:"Malayalam",value:"ml-IN"}];
const PRESETS=[2000,3000,5000,8000,10000,15000,20000,25000,30000,50000];
const CAT_KEYWORDS={Food:["food","eat","lunch","dinner","breakfast","restaurant","cafe","coffee","snack","grocery","khana","nashta","chai","sabji","fruits","vegetable","roti","dal","rice","milk","pizza","burger","biryani"],Transport:["transport","travel","auto","cab","taxi","uber","ola","bus","train","metro","petrol","diesel","fuel","rickshaw","bike","ticket","fare","car","scooter","flight","toll","parking"],Shopping:["shopping","clothes","shirt","pant","dress","shoes","amazon","flipkart","order","buy","purchase","market","bazaar","mall","online","kapda","jota","saree","watch","bag","mobile","laptop"],Entertainment:["movie","cinema","show","concert","game","gaming","netflix","hotstar","youtube","ott","fun","play","party","birthday","celebration","spotify","music","cricket","football"],Health:["health","medicine","doctor","hospital","clinic","pharmacy","medical","tablet","gym","fitness","checkup","dava","dawai","blood","xray","scan","yoga","vitamin"],Bills:["bill","electricity","wifi","internet","mobile","recharge","phone","water","gas","rent","light","bijli","paani","dth","cable","insurance","emi","loan","tax"],Education:["education","school","college","tuition","course","book","fees","class","study","exam","coaching","notes","pen","paper","library"]};
const requestNotifPermission=async()=>{if(!("Notification"in window))return false;if(Notification.permission==="granted")return true;if(Notification.permission!=="denied"){const p=await Notification.requestPermission();return p==="granted";}return false;};
const sendNotif=(title,body)=>{if("Notification"in window&&Notification.permission==="granted")new Notification(title,{body,icon:"/icon-192.png"});};

/* ── STYLE HELPERS ─────────────────────────────────────────────────────── */
const mkCard=(T,e={})=>({background:T.card,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",border:`1px solid ${T.bdrSub}`,borderRadius:16,padding:18,boxShadow:T.isDark?"0 4px 24px rgba(0,0,0,.35)":"0 2px 16px rgba(0,0,0,.07),0 1px 0 rgba(255,255,255,.9) inset",...e});
const mkBtn=(e={})=>({border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,borderRadius:12,transition:"all .2s",...e});

/* ── ERROR BOUNDARY ────────────────────────────────────────────────────── */
class ErrorBoundary extends Component {
  constructor(props){super(props);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  componentDidCatch(e,i){console.error("App error:",e,i);}
  render(){
    if(this.state.err)return(
      <div style={{minHeight:"100vh",background:"#0b0f1a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"DM Sans,sans-serif",padding:24,color:"#eef0f6",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
        <div style={{fontSize:22,fontWeight:700,marginBottom:12,fontFamily:"DM Serif Display,serif",color:"#d4a853"}}>Something went wrong</div>
        <div style={{fontSize:13,color:"#9ba3b8",marginBottom:8,maxWidth:340,lineHeight:1.6}}>{this.state.err?.message||"Unexpected error"}</div>
        <div style={{fontSize:12,color:"#4b5468",marginBottom:28,maxWidth:340}}>This usually happens when the app cannot connect to the database. Check your Supabase URL and key in App.jsx.</div>
        <button onClick={()=>window.location.reload()} style={{padding:"12px 32px",borderRadius:99,background:"linear-gradient(135deg,#d4a853,#2dd4bf)",color:"#0b0f1a",fontWeight:700,border:"none",cursor:"pointer",fontSize:15}}>Reload App</button>
      </div>
    );
    return this.props.children;
  }
}

/* ── CSS BUILDER ───────────────────────────────────────────────────────── */
const buildCss=T=>`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}html,body,#root{width:100%;min-height:100%;}
input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
input[type=number]{-moz-appearance:textfield;}
input[type=date]::-webkit-calendar-picker-indicator{filter:${T.isDark?"invert(.5)":"opacity(.5)"};cursor:pointer;}
::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:${T.a1}55;border-radius:99px;}
button:active{transform:scale(.96)!important;}select option{background:${T.isDark?"#111827":"#fff"};}
input:-webkit-autofill{-webkit-box-shadow:0 0 0 100px ${T.bg} inset!important;-webkit-text-fill-color:${T.text}!important;}
@keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes toastAnim{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes alertIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes celebrate{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
.recharts-wrapper{width:100%!important;}
`;

/* ══════════════════════════════════════════════════════════════════════
   MODULE-LEVEL VIEW COMPONENTS — defined OUTSIDE App to prevent
   React from remounting them on every render (fixes all input bugs)
══════════════════════════════════════════════════════════════════════ */

function ToastEl({T,toast}){
  const bg=toast.type==="err"?T.a4:toast.type==="warn"?"#f59e0b":T.a1;
  return<div style={{position:"fixed",top:76,left:"50%",zIndex:9999,padding:"12px 20px",borderRadius:12,whiteSpace:"nowrap",fontWeight:600,fontSize:14,fontFamily:"'DM Sans',sans-serif",background:bg,color:toast.type==="warn"?"#1a1000":"#fff",animation:"toastAnim .25s ease",boxShadow:`0 6px 28px ${bg}55`,transform:"translateX(-50%)"}}>
    {toast.msg}
  </div>;
}

function CTipComp({active,payload,label,T}){
  if(!active||!payload?.length)return null;
  return<div style={{background:T.isDark?"rgba(10,14,25,.97)":"rgba(255,255,255,.98)",border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",fontFamily:"'DM Sans',sans-serif"}}>
    <div style={{color:T.muted,fontSize:11,marginBottom:5}}>{label}</div>
    {payload.map(p=><div key={p.name} style={{color:p.color,fontWeight:600,fontSize:13,marginBottom:2}}>{p.name}: {fmt(p.value)}</div>)}
  </div>;
}

/* ══════ HOME ══════════════════════════════════════════════════════════ */
function HomeView({T,expenses,thisMonth,total,upiAmt,cashAmt,rawPct,barPct,isOver,curTarget,catData,overspendAlert,setOverspendAlert,undoEntry,undoDelete,exportMode,setExportMode,exportCSV,setTab,deleteEntry,getCatById,recurringTemplates}){
  const C=(e={})=>mkCard(T,e); const B=(e={})=>mkBtn(e);
  const now=new Date();
  const pct=rawPct; // use raw (uncapped) pct for mood
  const mc=getMoodColor(curTarget>0?pct:0,T);
  const isDanger=curTarget>0&&pct>=100;
  const isSaving=curTarget>0&&pct<50&&total>0;
  return(
    <div style={{padding:"0 16px 124px"}}>
      {/* Mood banner */}
      {curTarget>0&&total>0&&(
        <div style={{marginBottom:12,padding:"10px 16px",borderRadius:14,background:isDanger?`${T.a4}15`:isSaving?"rgba(34,197,94,.1)":"transparent",border:`1px solid ${isDanger?T.a4:isSaving?"#22c55e":"transparent"}`,display:"flex",alignItems:"center",justifyContent:"space-between",animation:isSaving?"celebrate 2.5s ease-in-out infinite":"none",transition:"all .5s"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:22}}>{getMoodEmoji(pct)}</span>
            <div><div style={{fontWeight:700,color:mc,fontSize:14,transition:"color .5s"}}>{getMoodLabel(pct)}</div><div style={{fontSize:12,color:T.muted}}>{pct.toFixed(0)}% of budget used</div></div>
          </div>
          {isSaving&&<span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:99,background:"rgba(34,197,94,.15)",color:"#22c55e"}}>🏆 SAVER</span>}
          {isDanger&&<span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:99,background:`${T.a4}18`,color:T.a4}}>EXCEEDED</span>}
        </div>
      )}
      {/* Overspend alert */}
      {overspendAlert&&(
        <div style={{marginBottom:12,animation:"alertIn .3s ease"}}>
          <div style={{background:overspendAlert.type==="over"?`${T.a4}15`:"rgba(245,158,11,.12)",border:`2px solid ${overspendAlert.type==="over"?T.a4:"#f59e0b"}`,borderRadius:16,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div style={{flex:1}}><div style={{fontWeight:700,color:overspendAlert.type==="over"?T.a4:"#f59e0b",fontSize:15,marginBottom:4}}>{overspendAlert.title}</div><div style={{fontSize:13,color:T.sub,lineHeight:1.5}}>{overspendAlert.msg}</div></div>
              <button onClick={()=>setOverspendAlert(null)} style={{...B({width:28,height:28,borderRadius:8,background:T.isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.08)",color:T.muted,fontSize:14,flexShrink:0})}}>✕</button>
            </div>
          </div>
        </div>
      )}
      {/* Hero card */}
      <div style={{...C({background:isDanger?`${T.a4}10`:isSaving?"rgba(34,197,94,.07)":T.gradSoft,borderColor:isDanger?T.a4:isSaving?"#22c55e30":T.border,marginBottom:12,padding:"22px",position:"relative",overflow:"hidden",transition:"all .5s"})}}>
        <div style={{position:"absolute",top:-40,right:-40,width:150,height:150,borderRadius:"50%",background:`radial-gradient(circle,${mc}18,transparent)`,transition:"background .5s"}}/>
        <div style={{fontSize:12,color:T.sub,marginBottom:6}}>{now.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:40,fontWeight:700,letterSpacing:-1,lineHeight:1.1,color:mc,transition:"color .5s"}}>{fmt(total)}</div>
        <div style={{fontSize:12,color:T.muted,marginTop:4}}>total spent this month</div>
        {curTarget>0?(
          <div style={{marginTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,color:T.muted}}>Budget: {fmt(curTarget)}</span>
              <span style={{fontSize:12,fontWeight:700,color:mc,transition:"color .5s"}}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{height:8,borderRadius:99,background:T.isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.07)",overflow:"hidden"}}>
              {/* barPct capped at 100 for visual bar only */}
              <div style={{height:"100%",width:`${barPct}%`,borderRadius:99,transition:"width .7s ease,background .5s",background:mc,boxShadow:`0 0 10px ${mc}44`}}/>
            </div>
            {isOver&&<div style={{marginTop:10,fontSize:13,color:T.a4,fontWeight:600}}>Over by {fmt(total-curTarget)}</div>}
          </div>
        ):<div style={{marginTop:12,fontSize:12,color:T.muted}}>No budget set — <span onClick={()=>setTab("budget")} style={{color:T.a1,cursor:"pointer",textDecoration:"underline"}}>set one in Budget</span></div>}
      </div>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
        {[{l:"UPI",v:upiAmt,c:T.upi,ico:"💳"},{l:"Cash",v:cashAmt,c:T.cash,ico:"💵"},{l:curTarget>0?(isOver?"Over":"Left"):"Spent",v:curTarget>0?Math.abs(curTarget-total):total,c:mc,ico:getMoodEmoji(curTarget>0?pct:0),p:isOver&&curTarget>0?"+":""}].map(s=>(
          <div key={s.l} style={{...C({padding:"13px 8px",textAlign:"center"})}}><div style={{fontSize:11,color:T.muted,marginBottom:5}}>{s.ico} {s.l}</div><div style={{fontWeight:700,fontSize:12,color:s.c,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.2,wordBreak:"break-all",transition:"color .5s"}}>{s.p}{fmt(s.v)}</div></div>
        ))}
      </div>
      {/* Category strip */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:14,scrollbarWidth:"none"}}>
        {catData.filter(c=>c.spent>0).map(c=><div key={c.id} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"9px 12px",borderRadius:14,background:`${c.color}12`,border:`1px solid ${c.color}28`}}><span style={{fontSize:17}}>{c.emoji}</span><span style={{fontSize:10,color:c.color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.spent)}</span></div>)}
      </div>
      {/* Recurring */}
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
      {/* Transactions */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontWeight:700,fontSize:16,color:T.text,fontFamily:"'DM Serif Display',serif"}}>Transactions</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {undoEntry&&<button onClick={undoDelete} style={{...B({fontSize:12,padding:"5px 12px",borderRadius:99,border:`1.5px solid ${T.a3}`,background:`${T.a3}15`,color:T.a3})}}>↩ Undo</button>}
          <button onClick={()=>setExportMode(p=>!p)} style={{...B({fontSize:12,padding:"5px 12px",borderRadius:99,border:`1.5px solid ${T.border}`,background:`${T.a1}12`,color:T.a1})}}>⬇ Export</button>
        </div>
      </div>
      {exportMode&&<div style={{...C({marginBottom:14,borderColor:T.border})}}>
        <div style={{fontWeight:700,color:T.text,marginBottom:10,fontSize:14}}>Export as CSV</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>{["week","month","year"].map(v=><button key={v} onClick={()=>exportCSV(v)} style={{...B({padding:"11px 4px",border:`1.5px solid ${T.border}`,background:`${T.a1}10`,color:T.a1,fontSize:12,textAlign:"center",borderRadius:12})}}>{v==="week"?"This Week":v==="month"?"This Month":"This Year"}</button>)}</div>
        <button onClick={()=>setExportMode(false)} style={{...B({width:"100%",padding:"9px",border:`1px solid ${T.bdrSub}`,background:"transparent",color:T.muted,fontSize:13})}}>Cancel</button>
      </div>}
      {expenses.length===0&&<div style={{...C({textAlign:"center",padding:"40px 20px"})}}><div style={{fontSize:40,marginBottom:12}}>💸</div><div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:T.text,marginBottom:8}}>No expenses yet</div><div style={{fontSize:13,color:T.muted}}>Tap + to add your first expense</div></div>}
      {expenses.slice(0,40).map(e=>{
        const cat=getCatById(e.category)||DEFAULT_CATS[7]; const d=new Date(e.date);
        return(
          <div key={e.id} style={{...C({marginBottom:8,display:"flex",alignItems:"center",gap:12,padding:"12px 14px"})}}>
            <div style={{width:42,height:42,borderRadius:12,flexShrink:0,background:`${cat.color}15`,border:`1px solid ${cat.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{cat.emoji}</div>
            <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:14,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.description||cat.name}</div><div style={{fontSize:11,color:T.muted,display:"flex",gap:6,marginTop:3}}><span>{cat.name}</span><span>·</span><span>{d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>{e.recurring&&<span style={{color:T.a3}}>🔁</span>}</div></div>
            <div style={{textAlign:"right",flexShrink:0,display:"flex",alignItems:"center",gap:8}}>
              <div><div style={{fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:T.text}}>−{fmt(e.amount||0)}</div><span style={{display:"inline-block",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:99,marginTop:4,background:e.type==="UPI"?`${T.upi}16`:`${T.cash}14`,color:e.type==="UPI"?T.upi:T.cash}}>{e.type}</span></div>
              <button onClick={()=>deleteEntry(e.id)} style={{width:28,height:28,borderRadius:8,border:`1px solid ${T.a4}30`,background:`${T.a4}08`,color:T.a4,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════ ADD ═══════════════════════════════════════════════════════════ */
function AddView({T,form,setForm,addExpense,allCats,getCatById,showCatManager,setShowCatManager,customCats,addCustomCat,deleteCustomCat,newCatName,setNewCatName,newCatEmoji,setNewCatEmoji,newCatColor,setNewCatColor,voiceLang,setVoiceLang,voiceText,transText,listening,vLoad,startVoice,stopVoice,showVHelp,setShowVHelp,recurringTemplates,setRecurringTemplates,showToast,persist,user,expenses,budgets,monthlyTargets,isDark,pinVal,customCatsRaw}){
  const C=(e={})=>mkCard(T,e); const B=(e={})=>mkBtn(e);
  const [ocrLoading,setOcrLoading]=useState(false);
  const [ocrStatus,setOcrStatus]=useState("");
  const [makeRecurring,setMakeRecurring]=useState(false);
  const [recurDay,setRecurDay]=useState(new Date().getDate());
  const fileRef=useRef(null);

  const scanReceipt=async file=>{
    if(!file)return; setOcrLoading(true); setOcrStatus("Loading OCR engine…");
    try{
      if(!window.Tesseract){
        await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
      }
      setOcrStatus("Reading receipt…");
      const worker=await window.Tesseract.createWorker("eng",1,{logger:m=>{if(m.status==="recognizing text")setOcrStatus(`Reading: ${(m.progress*100).toFixed(0)}%`);}});
      const{data:{text}}=await worker.recognize(file); await worker.terminate();
      const patterns=[/(?:total|grand total|amount|rs\.?|₹|inr)\s*[:=]?\s*(\d[\d,]*(?:\.\d{1,2})?)/i,/(\d[\d,]+(?:\.\d{1,2})?)\s*(?:total|rs|₹)/i,/(\d{2,6}(?:\.\d{1,2})?)/];
      let found="";
      for(const pat of patterns){const m=text.match(pat);if(m){found=m[1].replace(/,/g,"");break;}}
      if(found){setForm(p=>({...p,amount:found}));setOcrStatus(`✅ Found: ₹${found}`);showToast(`Receipt scanned: ₹${found}!`);}
      else{setOcrStatus("No amount found — enter manually");showToast("Could not read amount — enter manually","warn");}
    }catch(e){setOcrStatus("Scan failed.");showToast("OCR failed","warn");}
    setOcrLoading(false);
  };

  const handleRecurringSave=async()=>{
    if(!form.amount||parseFloat(form.amount)<=0){showToast("Enter an amount first.","warn");return;}
    const cat=getCatById(form.category)||DEFAULT_CATS[7];
    const t={id:Date.now(),name:form.description||cat.name,amount:parseFloat(form.amount),category:form.category,type:form.type,dayOfMonth:recurDay,emoji:cat.emoji||"🔁",active:true};
    const updated=[...(recurringTemplates||[]),t]; setRecurringTemplates(updated);
    if(user)await persist(user.username,expenses,budgets,monthlyTargets,isDark,pinVal,customCatsRaw,updated);
    setMakeRecurring(false); showToast(`🔁 Recurring "${t.name}" saved!`);
  };

  return(
    <div style={{padding:"0 16px 124px"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>New Expense</div>
      {/* Amount */}
      <div style={{...C({marginBottom:12,padding:"20px"})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,fontWeight:600}}>AMOUNT (₹)</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>fileRef.current?.click()} disabled={ocrLoading} style={{...B({fontSize:11,padding:"5px 12px",borderRadius:8,border:`1px solid ${T.border}`,background:`${T.a3}10`,color:T.a3,display:"flex",alignItems:"center",gap:5})}}><span>📷</span>{ocrLoading?"Scanning…":"Scan Receipt"}</button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>e.target.files[0]&&scanReceipt(e.target.files[0])}/>
          </div>
        </div>
        <input value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} type="number" placeholder="0" autoFocus style={{width:"100%",background:"none",border:"none",outline:"none",fontSize:48,fontWeight:800,letterSpacing:-2,color:T.a1,fontFamily:"'JetBrains Mono',monospace",boxSizing:"border-box"}}/>
        {ocrStatus&&<div style={{marginTop:8,fontSize:12,color:ocrLoading?T.a3:T.muted,fontStyle:"italic"}}>{ocrStatus}</div>}
      </div>
      {/* Payment */}
      <div style={{...C({marginBottom:12})}}>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:10,fontWeight:600}}>PAYMENT METHOD</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{t:"UPI",l:"UPI Transfer",c:T.upi,ico:"💳"},{t:"Cash",l:"Cash Payment",c:T.cash,ico:"💵"}].map(({t,l,c,ico})=>(
            <button key={t} onClick={()=>setForm(p=>({...p,type:t}))} style={{...B({padding:"14px",borderRadius:13,textAlign:"left",border:`1.5px solid ${form.type===t?c:T.bdrSub}`,background:form.type===t?`${c}12`:"transparent",boxShadow:form.type===t?`0 2px 12px ${c}28`:"none"})}}><div style={{fontSize:20,marginBottom:6}}>{ico}</div><div style={{fontWeight:600,color:form.type===t?c:T.muted,fontSize:14}}>{l}</div></button>
          ))}
        </div>
      </div>
      {/* Category */}
      <div style={{...C({marginBottom:12})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,fontWeight:600}}>CATEGORY</div>
          <button onClick={()=>setShowCatManager(true)} style={{...B({fontSize:11,padding:"4px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:`${T.a1}10`,color:T.a1})}}>+ Manage</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {(allCats||[]).map(c=>(
            <button key={c.id} onClick={()=>setForm(p=>({...p,category:c.id}))} style={{...B({padding:"11px 4px",borderRadius:13,border:`1.5px solid ${form.category===c.id?c.color:T.bdrSub}`,background:form.category===c.id?`${c.color}14`:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:5})}}>
              <span style={{fontSize:18}}>{c.emoji}</span><span style={{fontSize:9,fontWeight:600,color:form.category===c.id?c.color:T.muted,textAlign:"center",lineHeight:1.2}}>{c.name}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Desc + Date */}
      <div style={{...C({marginBottom:12})}}>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:8,fontWeight:600}}>DESCRIPTION</div>
        <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Brief description" style={{width:"100%",background:"none",border:"none",outline:"none",borderBottom:`1.5px solid ${T.bdrSub}`,paddingBottom:9,color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box",marginBottom:18}}/>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:8,fontWeight:600}}>DATE</div>
        <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={{background:"none",border:"none",outline:"none",borderBottom:`1.5px solid ${T.bdrSub}`,paddingBottom:6,color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",colorScheme:T.isDark?"dark":"light"}}/>
      </div>
      {/* Recurring */}
      <div style={{...C({marginBottom:12})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontWeight:700,color:T.text,fontSize:15}}>🔁 Make Recurring</div><div style={{fontSize:12,color:T.muted,marginTop:2}}>Auto-add every month</div></div>
          <button onClick={()=>setMakeRecurring(p=>!p)} style={{...B({padding:"7px 14px",borderRadius:99,border:`1.5px solid ${makeRecurring?T.a3:T.bdrSub}`,background:makeRecurring?`${T.a3}15`:"transparent",color:makeRecurring?T.a3:T.muted,fontSize:13})}}>{makeRecurring?"ON ✓":"OFF"}</button>
        </div>
        {makeRecurring&&(
          <div style={{marginTop:14,animation:"fadeIn .2s ease"}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:8,fontWeight:600}}>REPEAT ON DAY OF MONTH</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>{[1,5,10,15,20,25,28].map(d=><button key={d} onClick={()=>setRecurDay(d)} style={{...B({padding:"7px 12px",borderRadius:99,border:`1.5px solid ${recurDay===d?T.a3:T.bdrSub}`,background:recurDay===d?`${T.a3}15`:"transparent",color:recurDay===d?T.a3:T.muted,fontSize:12})}}>{d}{d===1?"st":d===2?"nd":d===3?"rd":"th"}</button>)}</div>
            <button onClick={handleRecurringSave} style={{...B({width:"100%",padding:"12px",borderRadius:12,background:`${T.a3}15`,border:`1.5px solid ${T.a3}`,color:T.a3,fontSize:14})}}>🔁 Save as Recurring Template</button>
          </div>
        )}
      </div>
      {/* Voice */}
      <div style={{...C({marginBottom:16})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div><div style={{fontWeight:700,color:T.text,fontSize:15}}>🎤 Voice Input</div><div style={{fontSize:12,color:T.muted,marginTop:2}}>Speak in any Indian language</div></div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setShowVHelp(p=>!p)} style={{...B({fontSize:11,padding:"5px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:`${T.a1}12`,color:T.a1})}}>{showVHelp?"Hide":"How?"}</button>
            <select value={voiceLang} onChange={e=>setVoiceLang(e.target.value)} style={{background:T.input,border:`1px solid ${T.border}`,borderRadius:9,color:T.text,padding:"6px 10px",fontSize:12,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",outline:"none"}}>
              {LANGS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>
        {showVHelp&&<div style={{marginBottom:14,padding:"14px",borderRadius:12,background:T.isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.04)",border:`1px solid ${T.bdrSub}`}}>
          {[{lang:"English",ex:"Two hundred food cash"},{lang:"Hindi",ex:"Do sau khana cash"},{lang:"Gujarati",ex:"Be sau jaman nakad"},{lang:"Marathi",ex:"Don she jevan cash"},{lang:"Tamil",ex:"Irunooru sapadu cash"}].map(v=><div key={v.lang} style={{display:"flex",gap:10,marginBottom:7}}><span style={{fontSize:10,fontWeight:700,color:T.a1,minWidth:58,paddingTop:2}}>{v.lang}</span><span style={{fontSize:12,color:T.sub,fontStyle:"italic"}}>"{v.ex}"</span></div>)}
          <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:`${T.a3}10`,border:`1px solid ${T.a3}20`}}><div style={{fontSize:11,color:T.a3,lineHeight:1.6}}>💡 Google Translate auto-converts your language to English before parsing</div></div>
        </div>}
        <button onClick={listening?stopVoice:startVoice} style={{...B({width:"100%",padding:"13px",borderRadius:12,border:`1.5px solid ${listening?T.a4:T.border}`,background:listening?`${T.a4}10`:`${T.a1}08`,color:listening?T.a4:T.a1,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10})}}>
          <span style={{fontSize:20,animation:listening?"pulse 1s infinite":"none"}}>{listening?"⏹":"🎙"}</span>
          {vLoad?"Translating…":listening?"Tap to stop":"Start voice recording"}
        </button>
        {voiceText&&<div style={{marginTop:10,padding:"9px 12px",borderRadius:10,background:T.isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.04)",fontSize:13,color:T.muted,fontStyle:"italic"}}>Heard: "{voiceText}"</div>}
        {transText&&<div style={{marginTop:6,padding:"9px 12px",borderRadius:10,background:`${T.a3}08`,border:`1px solid ${T.a3}20`,fontSize:13,color:T.a3}}>Translated: "{transText}"</div>}
      </div>
      <button onClick={addExpense} style={{...B({width:"100%",padding:16,borderRadius:14,background:T.grad,color:"#fff",fontSize:16,boxShadow:`0 6px 28px ${T.glow}`})}}>Save Expense</button>

      {/* Category Manager Modal */}
      {showCatManager&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.6)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"16px"}} onClick={e=>{if(e.target===e.currentTarget)setShowCatManager(false);}}>
          <div style={{...mkCard(T,{width:"min(480px,100%)",padding:"24px",maxHeight:"85vh",overflowY:"auto",borderRadius:20,background:T.isDark?"#13131f":"#fff"})}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:T.text,marginBottom:6}}>Manage Categories</div>
            <div style={{fontSize:13,color:T.muted,marginBottom:20}}>Add custom categories for your expenses</div>
            <div style={{...mkCard(T,{marginBottom:16,padding:"16px",borderColor:T.border})}}>
              <div style={{fontSize:12,color:T.a1,fontWeight:700,marginBottom:12}}>ADD NEW CATEGORY</div>
              <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="Category name" style={{width:"100%",background:T.input,border:`1.5px solid ${T.bdrSub}`,borderRadius:10,padding:"11px 14px",color:T.text,fontSize:14,fontFamily:"'DM Sans',sans-serif",outline:"none",marginBottom:12}}/>
              <div style={{fontSize:11,color:T.muted,marginBottom:8,fontWeight:600}}>PICK EMOJI</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{CAT_EMOJIS.map(e=><button key={e} onClick={()=>setNewCatEmoji(e)} style={{...mkBtn({width:36,height:36,borderRadius:8,border:`1.5px solid ${newCatEmoji===e?T.a1:T.bdrSub}`,background:newCatEmoji===e?`${T.a1}15`:"transparent",fontSize:18})}}>{e}</button>)}</div>
              <div style={{fontSize:11,color:T.muted,marginBottom:8,fontWeight:600}}>PICK COLOR</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>{CAT_COLORS.map(c=><button key={c} onClick={()=>setNewCatColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,border:`3px solid ${newCatColor===c?"#fff":"transparent"}`,cursor:"pointer",outline:newCatColor===c?`2px solid ${c}`:"none"}}/>)}</div>
              <button onClick={addCustomCat} style={{...mkBtn({width:"100%",padding:"13px",borderRadius:12,background:T.grad,color:"#fff",fontSize:14,boxShadow:`0 4px 16px ${T.glow}`})}}>+ Add Category</button>
            </div>
            {(customCats||[]).length>0&&<div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:T.muted,fontWeight:600,marginBottom:10}}>YOUR CATEGORIES</div>
              {(customCats||[]).map(c=><div key={c.id} style={{...mkCard(T,{marginBottom:8,padding:"12px 14px",display:"flex",alignItems:"center",gap:12})}}>
                <div style={{width:38,height:38,borderRadius:10,background:`${c.color}15`,border:`1px solid ${c.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{c.emoji}</div>
                <div style={{flex:1,fontWeight:600,color:T.text,fontSize:14}}>{c.name}</div>
                <button onClick={()=>deleteCustomCat(c.id)} style={{...mkBtn({padding:"6px 12px",borderRadius:8,border:`1px solid ${T.a4}30`,background:`${T.a4}08`,color:T.a4,fontSize:12})}}>Remove</button>
              </div>)}
            </div>}
            <button onClick={()=>setShowCatManager(false)} style={{...mkBtn({width:"100%",padding:"13px",border:`1px solid ${T.bdrSub}`,background:"transparent",color:T.text,fontSize:14})}}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════ CHARTS ════════════════════════════════════════════════════════ */
function ChartsView({T,chartData,period,setPeriod,catData,thisMonth,upiAmt,cashAmt}){
  const C=(e={})=>mkCard(T,e); const B=(e={})=>mkBtn(e);
  const CTip=({active,payload,label})=><CTipComp active={active} payload={payload} label={label} T={T}/>;
  const pieD=(catData||[]).filter(c=>c.spent>0).map(c=>({name:c.name,value:c.spent,color:c.color,emoji:c.emoji}));
  const pieT=pieD.reduce((s,p)=>s+p.value,0);
  return(
    <div style={{padding:"0 16px 124px",width:"100%"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>Analytics</div>
      <div style={{...C({marginBottom:14,display:"flex",padding:5,gap:4})}}>
        {[{v:"day",l:"7 Days"},{v:"month",l:"6 Months"},{v:"year",l:"3 Years"}].map(({v,l})=><button key={v} onClick={()=>setPeriod(v)} style={{...B({flex:1,padding:"10px 4px",borderRadius:11,background:period===v?T.grad:"transparent",color:period===v?"#fff":T.muted,fontSize:12,boxShadow:period===v?`0 2px 10px ${T.glow}`:"none"})}}>{l}</button>)}
      </div>
      <div style={{...C({marginBottom:14,padding:"18px 10px 12px 6px"})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingLeft:10}}><span style={{fontWeight:600,color:T.text,fontSize:15,fontFamily:"'DM Serif Display',serif"}}>UPI vs Cash</span><div style={{display:"flex",gap:12}}>{[{l:"UPI",c:T.upi},{l:"Cash",c:T.cash}].map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.muted}}><div style={{width:10,height:4,borderRadius:2,background:x.c}}/>{x.l}</div>)}</div></div>
        <ResponsiveContainer width="100%" height={210}><BarChart data={chartData} margin={{top:4,right:6,left:-12,bottom:0}} barCategoryGap="30%"><CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} vertical={false}/><XAxis dataKey="name" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>999?(v/1000).toFixed(1)+"k":v} width={36}/><Tooltip content={<CTip/>} cursor={{fill:T.isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.04)"}}/><Bar dataKey="UPI" fill={T.upi} radius={[6,6,0,0]} isAnimationActive={false}/><Bar dataKey="Cash" fill={T.cash} radius={[6,6,0,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer>
      </div>
      <div style={{...C({marginBottom:14,padding:"18px 10px 12px 6px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,paddingLeft:10,fontFamily:"'DM Serif Display',serif"}}>Spending Trend</div>
        <ResponsiveContainer width="100%" height={190}><LineChart data={chartData} margin={{top:4,right:6,left:-12,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} vertical={false}/><XAxis dataKey="name" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>999?(v/1000).toFixed(1)+"k":v} width={36}/><Tooltip content={<CTip/>}/><Line type="monotone" dataKey="UPI" stroke={T.upi} strokeWidth={2.5} dot={{fill:T.upi,r:4,strokeWidth:0}} activeDot={{r:7,strokeWidth:0}} isAnimationActive={false}/><Line type="monotone" dataKey="Cash" stroke={T.cash} strokeWidth={2.5} dot={{fill:T.cash,r:4,strokeWidth:0}} activeDot={{r:7,strokeWidth:0}} isAnimationActive={false}/><Legend wrapperStyle={{fontSize:12,color:T.muted,paddingTop:8}}/></LineChart></ResponsiveContainer>
      </div>
      <div style={{...C({marginBottom:14,padding:"18px 16px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>Category Breakdown</div>
        {pieD.length>0?(<><ResponsiveContainer width="100%" height={190}><PieChart><Pie data={pieD} cx="50%" cy="50%" innerRadius={52} outerRadius={82} dataKey="value" paddingAngle={3} isAnimationActive={false}>{pieD.map((d,i)=><Cell key={i} fill={d.color}/>)}</Pie><Tooltip formatter={v=>[fmt(v),"Amount"]} contentStyle={{background:T.isDark?"rgba(10,14,25,.97)":"rgba(255,255,255,.98)",border:`1px solid ${T.border}`,borderRadius:12,fontFamily:"DM Sans"}}/></PieChart></ResponsiveContainer>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>{pieD.map(d=><div key={d.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:d.color}}/><span style={{fontSize:13,color:T.muted}}>{d.emoji} {d.name}</span></div><div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:70,height:4,borderRadius:99,background:T.isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.07)",overflow:"hidden"}}><div style={{height:"100%",width:`${pieT>0?(d.value/pieT)*100:0}%`,background:d.color,borderRadius:99}}/></div><span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:"'JetBrains Mono',monospace",minWidth:68,textAlign:"right"}}>{fmt(d.value)}</span><span style={{fontSize:11,color:T.muted,minWidth:28,textAlign:"right"}}>{pieT>0?((d.value/pieT)*100).toFixed(0):0}%</span></div></div>)}</div></>
        ):<div style={{textAlign:"center",padding:"36px 0",color:T.muted,fontSize:14}}><div style={{fontSize:32,marginBottom:12}}>📊</div>Add expenses to see charts!</div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[{l:"UPI Total",cnt:(thisMonth||[]).filter(e=>e.type==="UPI").length,amt:upiAmt,c:T.upi},{l:"Cash Total",cnt:(thisMonth||[]).filter(e=>e.type==="Cash").length,amt:cashAmt,c:T.cash}].map(s=><div key={s.l} style={{...C({textAlign:"center",padding:"16px 10px"})}}><div style={{fontSize:11,color:T.muted,marginBottom:6}}>{s.l}</div><div style={{fontWeight:700,fontSize:17,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(s.amt)}</div><div style={{fontSize:11,color:T.muted,marginTop:4}}>{s.cnt} transactions</div></div>)}</div>
    </div>
  );
}

/* ══════ BUDGET ════════════════════════════════════════════════════════ */
function BudgetView({T,expenses,catData,monthlyTargets,saveMonthTarget,budgets,saveBudgets,total,curTarget,rawPct,isOver,showToast,recurringTemplates,setRecurringTemplates,persist,user,isDark,pinVal,customCats}){
  const C=(e={})=>mkCard(T,e); const B=(e={})=>mkBtn(e);
  const now=new Date(); const curKey=monthKey(now);
  const years=Array.from({length:11},(_,i)=>2020+i);

  /* ALL local state — safe because this is a module-level component */
  const [selMonth,setSelMonth]=useState(curKey);
  const [inputAmt,setInputAmt]=useState(()=>{const v=monthlyTargets[curKey];return v>0?String(v):"";});
  const [pickerYear,setPickerYear]=useState(now.getFullYear());
  const [catLimits,setCatLimits]=useState(()=>({...budgets}));
  const over=(catData||[]).filter(c=>c.spent>c.budget&&c.budget>0);

  const selTarget=monthlyTargets[selMonth]||0;
  const selExp=(expenses||[]).filter(e=>{
    const d=new Date(e.date); const[y,m]=selMonth.split("-");
    return d.getFullYear()===parseInt(y)&&d.getMonth()+1===parseInt(m);
  });
  const selTotal=selExp.reduce((s,e)=>s+e.amount,0);
  const selRawPct=selTarget>0?(selTotal/selTarget)*100:0;
  const selBarPct=Math.min(selRawPct,100);
  const selOver=selTarget>0&&selTotal>selTarget;

  const onMonthSelect=(key)=>{
    setSelMonth(key);
    const v=monthlyTargets[key]||0;
    setInputAmt(v>0?String(v):"");
  };
  const onYearSelect=(y)=>{
    setPickerYear(y);
    const m=selMonth.split("-")[1];
    const newKey=`${y}-${m}`;
    setSelMonth(newKey);
    const v=monthlyTargets[newKey]||0;
    setInputAmt(v>0?String(v):"");
  };
  const onBudgetSave=async()=>{
    const v=parseFloat(inputAmt);
    if(!inputAmt||inputAmt.trim()===""){showToast("Enter an amount first.","warn");return;}
    if(isNaN(v)||v<=0){showToast("Enter a valid amount.","warn");return;}
    await saveMonthTarget(selMonth,v);
    showToast(`✅ ${fmt(v)} set for ${monthLabel(selMonth)}`);
  };

  return(
    <div style={{padding:"0 16px 124px"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>Budget Control</div>

      {over.length>0&&<div style={{...C({marginBottom:14,borderColor:`${T.a4}30`,background:`${T.a4}07`,padding:"16px"})}}>
        <div style={{fontWeight:600,color:T.a4,marginBottom:10,fontSize:14}}>⚠ Over budget in {over.length} {over.length===1?"category":"categories"}</div>
        {over.map(c=><div key={c.id} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:T.sub,marginBottom:6,paddingLeft:8,borderLeft:`2px solid ${T.a4}40`}}><div style={{display:"flex",gap:7}}><span>{c.emoji}</span><span>{c.name}</span></div><span style={{color:T.a4,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>+{fmt(c.spent-c.budget)}</span></div>)}
      </div>}

      {/* Monthly budget setter */}
      <div style={{...C({marginBottom:16,background:T.gradSoft,borderColor:T.border})}}>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:14,fontWeight:600}}>SET MONTHLY BUDGET</div>
        {/* Year */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,color:T.muted,marginBottom:8,fontWeight:500}}>Year</div>
          <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
            {years.map(y=><button key={y} onClick={()=>onYearSelect(y)} style={{...B({flexShrink:0,padding:"6px 12px",borderRadius:99,border:`1.5px solid ${pickerYear===y?T.a1:T.bdrSub}`,background:pickerYear===y?`${T.a1}18`:"transparent",color:pickerYear===y?T.a1:T.muted,fontSize:12,fontWeight:pickerYear===y?700:400})}}>{y}</button>)}
          </div>
        </div>
        {/* Month grid */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:12,color:T.muted,marginBottom:8,fontWeight:500}}>Month</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {MONTHS.map((m,i)=>{
              const k=`${pickerYear}-${String(i+1).padStart(2,"0")}`;
              const hasBudget=(monthlyTargets[k]||0)>0;
              const isCur=k===curKey; const isSel=k===selMonth;
              return(
                <button key={k} onClick={()=>onMonthSelect(k)} style={{...B({padding:"9px 4px",borderRadius:11,border:`1.5px solid ${isSel?T.a1:hasBudget?T.a3+"55":T.bdrSub}`,background:isSel?`${T.a1}18`:hasBudget?`${T.a3}08`:"transparent",color:isSel?T.a1:isCur?T.a3:T.muted,fontSize:11,textAlign:"center",fontWeight:isSel?700:isCur?600:400,position:"relative"})}}>
                  {m.slice(0,3)}
                  {isCur&&<span style={{position:"absolute",top:2,right:2,width:5,height:5,borderRadius:"50%",background:T.a3}}/>}
                  {hasBudget&&!isSel&&<span style={{display:"block",fontSize:8,color:T.a3,marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(monthlyTargets[k]).replace("₹","")}</span>}
                </button>
              );
            })}
          </div>
        </div>
        {/* Current active */}
        {selTarget>0&&<div style={{marginBottom:14,padding:"10px 14px",borderRadius:12,background:T.isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.04)",border:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:11,color:T.muted,marginBottom:3}}>Budget for {monthLabel(selMonth)}</div><div style={{fontSize:20,fontWeight:700,color:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(selTarget)}</div></div>
          <span style={{fontSize:11,padding:"4px 10px",borderRadius:99,background:`${T.a1}15`,color:T.a1,fontWeight:600}}>ACTIVE</span>
        </div>}
        <div style={{fontSize:13,color:T.sub,marginBottom:10}}>{selTarget>0?"Update":"Set"} budget for <strong style={{color:T.text}}>{monthLabel(selMonth)}</strong></div>
        {/* CONTROLLED input — value tied to state, no cursor loss because BudgetView is module-level */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.sub,flexShrink:0}}>₹</span>
          <input
            type="number" value={inputAmt} placeholder="Type amount…"
            onChange={e=>setInputAmt(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&onBudgetSave()}
            style={{flex:1,background:"none",border:"none",outline:"none",borderBottom:`2px solid ${T.a1}`,paddingBottom:6,fontSize:34,fontWeight:700,color:T.a1,letterSpacing:-1,fontFamily:"'JetBrains Mono',monospace"}}
          />
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {PRESETS.map(v=><button key={v} onClick={()=>setInputAmt(String(v))} style={{...B({padding:"7px 12px",borderRadius:99,border:`1.5px solid ${inputAmt===String(v)?T.a1:T.bdrSub}`,background:inputAmt===String(v)?`${T.a1}18`:"transparent",color:inputAmt===String(v)?T.a1:T.muted,fontSize:12})}}>{fmt(v)}</button>)}
        </div>
        <button onClick={onBudgetSave} style={{...B({width:"100%",padding:"16px",borderRadius:14,background:T.grad,color:"#fff",fontSize:16,boxShadow:`0 6px 24px ${T.glow}`,letterSpacing:.3})}}>✓ Set Budget for {monthLabel(selMonth)}</button>
        {selTarget>0&&<button onClick={async()=>{await saveMonthTarget(selMonth,0);setInputAmt("");showToast("Budget cleared.");}} style={{...B({width:"100%",padding:"10px",marginTop:10,border:`1px solid ${T.a4}30`,background:"transparent",color:T.a4,fontSize:13})}}>Clear this month's budget</button>}
      </div>

      {/* Progress for selected month */}
      {selTarget>0&&<div style={{...C({marginBottom:16})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>{monthLabel(selMonth)} Progress</div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:T.muted}}>Spent: <strong style={{color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(selTotal)}</strong></span><span style={{fontSize:13,color:T.muted}}>Budget: <strong style={{color:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(selTarget)}</strong></span></div>
        <div style={{height:12,borderRadius:99,background:T.isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.07)",overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:`${selBarPct}%`,borderRadius:99,background:selOver?T.a4:T.grad,transition:"width .7s ease"}}/></div>
        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,fontWeight:600,color:selOver?T.a4:T.a1}}>{selRawPct.toFixed(1)}% used</span><span style={{fontSize:13,color:selOver?T.a4:T.muted,fontWeight:selOver?700:400}}>{selOver?`🔴 Over by ${fmt(selTotal-selTarget)}`:`${fmt(selTarget-selTotal)} remaining`}</span></div>
      </div>}

      {/* All months */}
      {Object.keys(monthlyTargets||{}).filter(k=>(monthlyTargets[k]||0)>0).length>0&&<div style={{...C({marginBottom:16})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>All Budgets</div>
        {Object.entries(monthlyTargets||{}).filter(([,v])=>v>0).sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>{
          const mExp=(expenses||[]).filter(e=>{const d=new Date(e.date);const[y,m]=k.split("-");return d.getFullYear()===parseInt(y)&&d.getMonth()+1===parseInt(m);});
          const mTotal=mExp.reduce((s,e)=>s+e.amount,0);
          const mRawPct=(mTotal/v)*100; const mBarPct=Math.min(mRawPct,100); const mOver=mTotal>v;
          return(<div key={k} style={{marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${T.bdrSub}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,fontWeight:600,color:T.text}}>{monthLabel(k)}</span>{k===curKey&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:99,background:`${T.a1}20`,color:T.a1,fontWeight:700}}>NOW</span>}</div><span style={{fontSize:12,fontWeight:700,color:mOver?T.a4:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(mTotal)} / {fmt(v)}</span></div>
            <div style={{height:6,borderRadius:99,background:T.isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",overflow:"hidden"}}><div style={{height:"100%",width:`${mBarPct}%`,borderRadius:99,background:mOver?T.a4:T.grad}}/></div>
            <div style={{fontSize:11,color:mOver?T.a4:T.muted,marginTop:5,textAlign:"right"}}>{mRawPct.toFixed(0)}% used</div>
          </div>);
        })}
      </div>}

      {/* Recurring templates */}
      {(recurringTemplates||[]).length>0&&<div style={{...C({marginBottom:16})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>🔁 Recurring Templates</div>
        {(recurringTemplates||[]).map(r=>(
          <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,padding:"10px 12px",borderRadius:12,background:T.input,border:`1px solid ${T.bdrSub}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>{r.emoji||"🔁"}</span><div><div style={{fontWeight:600,color:T.text,fontSize:13}}>{r.name}</div><div style={{fontSize:11,color:T.muted}}>Every {r.dayOfMonth}{r.dayOfMonth===1?"st":r.dayOfMonth===2?"nd":r.dayOfMonth===3?"rd":"th"} · {r.type}</div></div></div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontWeight:700,color:T.a1,fontFamily:"'JetBrains Mono',monospace",fontSize:13}}>{fmt(r.amount||0)}</span>
              <button onClick={async()=>{const upd=(recurringTemplates||[]).filter(x=>x.id!==r.id);setRecurringTemplates(upd);if(user)await persist(user.username,expenses,budgets,monthlyTargets,isDark,pinVal,customCats,upd);showToast("Template removed.");}} style={{...B({width:26,height:26,borderRadius:7,border:`1px solid ${T.a4}30`,background:`${T.a4}08`,color:T.a4,fontSize:11})}}>✕</button>
            </div>
          </div>
        ))}
      </div>}

      {/* Category limits */}
      <div style={{fontSize:15,fontWeight:600,color:T.text,marginBottom:6,fontFamily:"'DM Serif Display',serif"}}>Category Limits</div>
      <div style={{fontSize:12,color:T.muted,marginBottom:12}}>Set per-category limits. Tap outside the field to save.</div>
      {(catData||[]).map(cat=>{
        const bv=parseFloat(catLimits[cat.id])||0; const cp=bv>0?Math.min((cat.spent/bv)*100,100):0; const co=bv>0&&cat.spent>bv;
        return(<div key={cat.id} style={{...C({marginBottom:10,padding:"14px 16px"})}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:bv>0?10:0}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:18}}>{cat.emoji}</span><span style={{fontWeight:600,color:T.text,fontSize:14}}>{cat.name}</span>{co&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:`${T.a4}15`,color:T.a4,fontWeight:600}}>OVER</span>}</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(cat.spent||0)} /</span>
              <input value={catLimits[cat.id]||""} type="number" placeholder="0"
                onChange={e=>setCatLimits(p=>({...p,[cat.id]:e.target.value}))}
                onBlur={async()=>{const v=parseFloat(catLimits[cat.id])||0;const up={...budgets,[cat.id]:v};await saveBudgets(up);}}
                style={{width:70,background:"none",border:"none",outline:"none",borderBottom:`1.5px solid ${cat.color}60`,paddingBottom:2,color:cat.color,fontWeight:700,fontSize:13,textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}/>
            </div>
          </div>
          {bv>0&&<><div style={{height:5,borderRadius:99,background:T.isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",overflow:"hidden"}}><div style={{height:"100%",width:`${cp}%`,borderRadius:99,transition:"width .5s",background:co?T.a4:cat.color}}/></div><div style={{fontSize:10,color:T.muted,marginTop:5,textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{cp.toFixed(0)}% utilised</div></>}
        </div>);
      })}
    </div>
  );
}

/* ══════ SETTINGS ══════════════════════════════════════════════════════ */
function SettingsView({T,user,expenses,total,isDark,setIsDark,pinVal,setPinVal,locked,setLocked,pinMode,setPinMode,pinInput,setPinInput,pinError,setPinError,pinSetup,setPinSetup,handlePinDigit,handlePinBack,removePin,doSignOut,persist,budgets,monthlyTargets,customCats,notifEnabled,setNotifEnabled,showToast,recurringTemplates}){
  const C=(e={})=>mkCard(T,e); const B=(e={})=>mkBtn(e);
  return(
    <div style={{padding:"0 16px 124px"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>Settings</div>
      <div style={{...C({marginBottom:14,background:T.gradSoft,borderColor:T.border,padding:"20px"})}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:52,height:52,borderRadius:"50%",flexShrink:0,background:T.grad,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#fff",boxShadow:`0 4px 18px ${T.glow}`}}>{(user.username||"?")[0].toUpperCase()}</div>
          <div><div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:T.text}}>{user.username}</div><div style={{fontSize:12,color:T.muted,marginTop:3}}>{(expenses||[]).length} expenses · {fmt((expenses||[]).reduce((s,e)=>s+e.amount,0))} total</div></div>
        </div>
      </div>
      <div style={{...C({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>🔔 Notifications</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Get alerts at 50%, 85% and 100% of your budget.</div>
        <button onClick={async()=>{const ok=await requestNotifPermission();setNotifEnabled(ok);if(ok)showToast("Notifications enabled! 🔔");else showToast("Allow in browser settings.","warn");}} style={{...B({width:"100%",padding:"13px",border:`1.5px solid ${Notification?.permission==="granted"?T.a3:T.border}`,background:Notification?.permission==="granted"?`${T.a3}12`:`${T.a1}08`,color:Notification?.permission==="granted"?T.a3:T.a1,fontSize:14})}}>{Notification?.permission==="granted"?"✅ Notifications Active":"Enable Notifications →"}</button>
      </div>
      <div style={{...C({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>Display Mode</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{m:true,l:"Dark",d:"Deep slate, warm gold",ico:"🌙"},{m:false,l:"Light",d:"Ivory, clean & bright",ico:"☀"}].map(({m,l,d,ico})=>(
            <button key={String(m)} onClick={()=>{setIsDark(m);if(user)persist(user.username,expenses,budgets,monthlyTargets,m,pinVal,customCats,recurringTemplates);}} style={{...B({padding:"16px 12px",borderRadius:14,textAlign:"left",border:`1.5px solid ${isDark===m?T.a1:T.bdrSub}`,background:isDark===m?T.gradSoft:"transparent",boxShadow:isDark===m?`0 4px 18px ${T.glow}`:"none"})}}>
              <div style={{fontSize:22,marginBottom:7}}>{ico}</div><div style={{fontWeight:600,color:isDark===m?T.a1:T.text,fontSize:14}}>{l}</div><div style={{fontSize:11,color:T.muted,marginTop:3}}>{d}</div>
              {isDark===m&&<div style={{fontSize:10,color:T.a1,marginTop:8,fontWeight:700}}>● ACTIVE</div>}
            </button>
          ))}
        </div>
      </div>
      <div style={{...C({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>🔒 PIN Lock</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:14}}>Set a 4-digit PIN to lock the app.</div>
        {!pinSetup&&!pinVal&&<button onClick={()=>{setPinSetup(true);setPinMode("setup");setPinInput("");setPinError("");}} style={{...B({width:"100%",padding:"13px",border:`1.5px solid ${T.border}`,background:`${T.a1}10`,color:T.a1,fontSize:14})}}>Set Up PIN →</button>}
        {!pinSetup&&pinVal&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><button onClick={()=>{setPinSetup(true);setPinMode("setup");setPinInput("");setPinError("");}} style={{...B({padding:"11px",border:`1.5px solid ${T.bdrSub}`,background:T.input,color:T.text,fontSize:13})}}>Change PIN</button><button onClick={removePin} style={{...B({padding:"11px",border:`1.5px solid ${T.a4}30`,background:`${T.a4}08`,color:T.a4,fontSize:13})}}>Remove PIN</button></div>}
        {pinSetup&&<div style={{textAlign:"center"}}><div style={{fontSize:13,color:T.sub,marginBottom:14}}>Enter a new 4-digit PIN</div><div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:18}}>{[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:pinInput.length>i?T.a1:T.bdrSub,border:`2px solid ${pinInput.length>i?T.a1:T.muted}`,transition:"all .2s"}}/>)}</div>{pinError&&<div style={{color:T.a4,fontSize:12,marginBottom:10}}>{pinError}</div>}<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:240,margin:"0 auto"}}>{[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=><button key={i} onClick={()=>d==="⌫"?handlePinBack():d!==""&&handlePinDigit(String(d))} style={{...B({padding:"14px 6px",border:`1.5px solid ${T.bdrSub}`,background:d===""?"transparent":T.card,color:T.text,fontSize:17,fontFamily:"'JetBrains Mono',monospace",cursor:d===""?"default":"pointer"})}}>{d}</button>)}</div><button onClick={()=>{setPinSetup(false);setPinMode("none");setPinInput("");}} style={{marginTop:14,background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",textDecoration:"underline",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button></div>}
      </div>
      <div style={{...C({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>Account Summary</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{l:"All-time",v:fmt((expenses||[]).reduce((s,e)=>s+e.amount,0)),s:"total"},{l:"This Month",v:fmt(total||0),s:"spent"},{l:"Entries",v:(expenses||[]).length,s:"recorded"},{l:"Average",v:(expenses||[]).length?fmt(Math.round((expenses||[]).reduce((s,e)=>s+e.amount,0)/(expenses||[]).length)):"₹0",s:"per entry"}].map(s=>(
            <div key={s.l} style={{padding:"13px",borderRadius:12,background:T.input,border:`1px solid ${T.border}`}}><div style={{fontSize:10,color:T.muted,marginBottom:5,fontWeight:600,letterSpacing:.5}}>{s.l.toUpperCase()}</div><div style={{fontWeight:700,color:T.a1,fontFamily:"'JetBrains Mono',monospace",fontSize:14}}>{s.v}</div><div style={{fontSize:10,color:T.muted,marginTop:3}}>{s.s}</div></div>
          ))}
        </div>
      </div>
      <button onClick={doSignOut} style={{...B({width:"100%",padding:"15px",borderRadius:13,border:`1.5px solid ${T.a4}35`,background:`${T.a4}08`,color:T.a4,fontSize:15})}}>Sign Out</button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════════════════ */
function AppInner() {
  const [isDark,setIsDark]=useState(true);
  const T=isDark?DARK:LIGHT;

  /* auth */
  const [user,setUser]=useState(null);
  const [authMode,setAuthMode]=useState("signin");
  const [aForm,setAForm]=useState({username:"",password:"",confirm:""});
  const [showPw,setShowPw]=useState({password:false,confirm:false});
  const [aError,setAError]=useState(""); const [aInfo,setAInfo]=useState(""); const [aLoading,setALoading]=useState(false);

  /* pin */
  const [pinVal,setPinVal]=useState(""); const [pinInput,setPinInput]=useState(""); const [pinMode,setPinMode]=useState("none");
  const [pinError,setPinError]=useState(""); const [locked,setLocked]=useState(false); const [pinSetup,setPinSetup]=useState(false);

  /* data */
  const [tab,setTab]=useState("home");
  const [expenses,setExpenses]=useState([]);
  const [budgets,setBudgets]=useState({});
  const [monthlyTargets,setMonthlyTargets]=useState({});
  const [customCats,setCustomCats]=useState([]);
  const [recurringTemplates,setRecurringTemplates]=useState([]);

  /* add form */
  const [form,setForm]=useState({amount:"",category:"food",description:"",type:"UPI",date:todayStr()});
  const [showCatManager,setShowCatManager]=useState(false);
  const [newCatName,setNewCatName]=useState(""); const [newCatEmoji,setNewCatEmoji]=useState("🏷️"); const [newCatColor,setNewCatColor]=useState(CAT_COLORS[0]);

  /* voice */
  const [voiceLang,setVoiceLang]=useState("en-US"); const [voiceText,setVoiceText]=useState(""); const [transText,setTransText]=useState("");
  const [listening,setListening]=useState(false); const [vLoad,setVLoad]=useState(false); const [showVHelp,setShowVHelp]=useState(false);

  /* ui */
  const [period,setPeriod]=useState("month");
  const [toast,setToast]=useState(null);
  const [undoEntry,setUndoEntry]=useState(null);
  const [exportMode,setExportMode]=useState(false);
  const [overspendAlert,setOverspendAlert]=useState(null);
  const [notifEnabled,setNotifEnabled]=useState(false);

  const recRef=useRef(null); const undoTimer=useRef(null); const notifSent=useRef({});

  const allCats=[...DEFAULT_CATS,...(customCats||[])];
  const getCatById=id=>allCats.find(c=>c.id===id)||DEFAULT_CATS[7];

  /* ── DERIVED — BUG FIX: rawPct is uncapped, barPct capped for progress bar ── */
  const now=new Date(); const curKey=monthKey(now);
  const curTarget=monthlyTargets[curKey]||0;
  const thisMonth=(expenses||[]).filter(e=>{
    const d=new Date(e.date);
    return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();
  });
  const total=thisMonth.reduce((s,e)=>s+(e.amount||0),0);
  const upiAmt=thisMonth.filter(e=>e.type==="UPI").reduce((s,e)=>s+(e.amount||0),0);
  const cashAmt=thisMonth.filter(e=>e.type==="Cash").reduce((s,e)=>s+(e.amount||0),0);
  const rawPct=curTarget>0?(total/curTarget)*100:0;  // uncapped — can exceed 100
  const barPct=Math.min(rawPct,100);                  // capped only for the visual bar
  const isOver=curTarget>0&&total>curTarget;
  const catData=allCats.map(c=>({...c,spent:thisMonth.filter(e=>e.category===c.id).reduce((s,e)=>s+(e.amount||0),0),budget:budgets[c.id]||0}));

  /* overspend */
  useEffect(()=>{
    if(!curTarget||curTarget<=0)return;
    if(rawPct>=100&&!notifSent.current.over){notifSent.current.over=true;setOverspendAlert({type:"over",title:"🔴 Budget Exceeded!",msg:`Spent ${fmt(total)} — over by ${fmt(total-curTarget)} this month.`});sendNotif("🔴 Budget Exceeded!",`Overspent by ${fmt(total-curTarget)}.`);}
    else if(rawPct>=85&&!notifSent.current["85"]){notifSent.current["85"]=true;setOverspendAlert({type:"warn",title:"⚠️ 85% Budget Used",msg:`Used ${rawPct.toFixed(0)}% of ${fmt(curTarget)}. Only ${fmt(curTarget-total)} left.`});sendNotif("⚠️ Budget Warning",`${rawPct.toFixed(0)}% used.`);}
    else if(rawPct>=50&&!notifSent.current["50"]){notifSent.current["50"]=true;sendNotif("💡 Halfway","Half your monthly budget used.");}
  },[total,curTarget,rawPct]);

  /* persist */
  const persist=useCallback(async(uname,exps,buds,mTargets,dark,pin,cCats,rTemplates)=>{
    try{await sSet(`vi6:${uname}`,JSON.stringify({expenses:exps||[],budgets:buds||{},monthlyTargets:mTargets||{},dark,pin:pin||"",customCats:cCats||[],recurringTemplates:rTemplates||[]}));}catch(e){console.error(e);}
  },[]);

  const showToast=(msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3200);};

  /* auth */
  const doSignUp=async()=>{
    const{username,password,confirm}=aForm; const u=username.trim().toLowerCase();
    setAError("");setAInfo("");
    if(!u){setAError("Username is required.");return;}if(u.length<3){setAError("Min 3 characters.");return;}
    if(!/^[a-z0-9_]+$/.test(u)){setAError("Only letters, numbers, underscores.");return;}
    if(!password){setAError("Password required.");return;}if(password.length<6){setAError("Min 6 characters.");return;}
    if(password!==confirm){setAError("Passwords do not match.");return;}
    setALoading(true);
    try{
      setAInfo("Checking availability…");
      const ex=await sGet(`vi6:auth:${u}`);if(ex){setAError("Username taken.");setAInfo("");setALoading(false);return;}
      await sSet(`vi6:auth:${u}`,JSON.stringify({username:u,hash:hashPw(password)}));
      await persist(u,[],{},{},true,"",[],[]);
      setExpenses([]);setBudgets({});setMonthlyTargets({});setCustomCats([]);setRecurringTemplates([]);
      setIsDark(true);setPinVal("");setAInfo("");setUser({username:u});showToast(`Welcome, ${u}! 🎉`);
    }catch(e){setAError("Sign up failed. Check your Supabase keys.");setAInfo(e.message);}
    setALoading(false);
  };

  const doSignIn=async()=>{
    const{username,password}=aForm; const u=username.trim().toLowerCase();
    setAError("");setAInfo("");
    if(!u){setAError("Enter your username.");return;}if(!password){setAError("Enter your password.");return;}
    setALoading(true);
    try{
      setAInfo("Looking up account…");
      const ar=await sGet(`vi6:auth:${u}`);if(!ar){setAError("Account not found.");setALoading(false);return;}
      let auth;try{auth=JSON.parse(ar.value);}catch{setAError("Account data corrupted.");setALoading(false);return;}
      if(auth.hash!==hashPw(password)){setAError("Incorrect password.");setALoading(false);return;}
      setAInfo("Loading your data…");
      const dr=await sGet(`vi6:${u}`);
      if(dr){
        try{
          const d=JSON.parse(dr.value);
          setExpenses(d.expenses||[]);setBudgets(d.budgets||{});setMonthlyTargets(d.monthlyTargets||{});
          setCustomCats(d.customCats||[]);setRecurringTemplates(d.recurringTemplates||[]);setIsDark(d.dark!==false);
          if(d.pin){setPinVal(d.pin);setLocked(true);setPinMode("lock");}
        }catch{setExpenses([]);setBudgets({});setMonthlyTargets({});setCustomCats([]);setRecurringTemplates([]);}
      }
      setAInfo("");setUser({username:u});showToast(`Welcome back, ${u}!`);
    }catch(e){setAError("Sign in failed.");setAInfo(e.message);}
    setALoading(false);
  };

  const doSignOut=()=>{
    setUser(null);setExpenses([]);setTab("home");
    setAForm({username:"",password:"",confirm:""});setAError("");setAInfo("");
    setShowPw({password:false,confirm:false});setPinVal("");setLocked(false);setPinMode("none");setPinInput("");setPinError("");
    notifSent.current={};
  };

  const toggleMode=async()=>{const n=!isDark;setIsDark(n);if(user)await persist(user.username,expenses,budgets,monthlyTargets,n,pinVal,customCats,recurringTemplates);};

  /* pin */
  const handlePinDigit=d=>{
    const np=pinInput+d;setPinInput(np);setPinError("");
    if(np.length===4){
      if(pinMode==="setup"){setPinVal(np);setPinInput("");setPinMode("none");setPinSetup(false);if(user)persist(user.username,expenses,budgets,monthlyTargets,isDark,np,customCats,recurringTemplates);showToast("PIN set! 🔒");}
      else if(pinMode==="lock"){if(np===pinVal){setLocked(false);setPinInput("");setPinMode("none");}else{setPinError("Wrong PIN.");setPinInput("");}}
    }
  };
  const handlePinBack=()=>{setPinInput(p=>p.slice(0,-1));setPinError("");};
  const removePin=async()=>{setPinVal("");setLocked(false);setPinMode("none");setPinSetup(false);setPinInput("");if(user)await persist(user.username,expenses,budgets,monthlyTargets,isDark,"",customCats,recurringTemplates);showToast("PIN removed.");};

  /* custom cats */
  const addCustomCat=async()=>{
    const name=newCatName.trim();if(!name){showToast("Enter a name.","warn");return;}
    if(allCats.find(c=>c.name.toLowerCase()===name.toLowerCase())){showToast("Already exists.","warn");return;}
    const nc={id:"custom_"+Date.now(),name,emoji:newCatEmoji,color:newCatColor,isDefault:false};
    const upd=[...(customCats||[]),nc];setCustomCats(upd);
    if(user)await persist(user.username,expenses,budgets,monthlyTargets,isDark,pinVal,upd,recurringTemplates);
    setNewCatName("");setNewCatEmoji("🏷️");setNewCatColor(CAT_COLORS[0]);showToast(`"${name}" added!`);
  };
  const deleteCustomCat=async id=>{
    const upd=(customCats||[]).filter(c=>c.id!==id);setCustomCats(upd);
    if(user)await persist(user.username,expenses,budgets,monthlyTargets,isDark,pinVal,upd,recurringTemplates);
    showToast("Category removed.");
  };

  /* budget */
  const saveMonthTarget=async(key,amount)=>{
    const upd={...monthlyTargets,[key]:amount};setMonthlyTargets(upd);notifSent.current={};
    if(user)await persist(user.username,expenses,budgets,upd,isDark,pinVal,customCats,recurringTemplates);
  };
  const saveBudgets=async v=>{setBudgets(v);if(user)await persist(user.username,expenses,v,monthlyTargets,isDark,pinVal,customCats,recurringTemplates);};

  /* expense */
  const addExpense=async()=>{
    const amt=parseFloat(form.amount);if(!amt||amt<=0){showToast("Enter a valid amount.","warn");return;}
    const entry={id:Date.now(),amount:amt,category:form.category,description:form.description||getCatById(form.category).name,type:form.type,date:new Date(form.date).toISOString()};
    const newExp=[entry,...(expenses||[])];setExpenses(newExp);showToast("Expense recorded.");
    if(user)await persist(user.username,newExp,budgets,monthlyTargets,isDark,pinVal,customCats,recurringTemplates);
    setForm({amount:"",category:"food",description:"",type:"UPI",date:todayStr()});setTab("home");
  };
  const deleteEntry=async id=>{
    const entry=(expenses||[]).find(e=>e.id===id);if(!entry)return;
    const newExp=(expenses||[]).filter(e=>e.id!==id);setExpenses(newExp);
    if(user)await persist(user.username,newExp,budgets,monthlyTargets,isDark,pinVal,customCats,recurringTemplates);
    if(undoTimer.current)clearTimeout(undoTimer.current);
    setUndoEntry(entry);undoTimer.current=setTimeout(()=>setUndoEntry(null),6000);
    showToast("Deleted. Tap Undo to restore.","warn");
  };
  const undoDelete=async()=>{
    if(!undoEntry)return;if(undoTimer.current)clearTimeout(undoTimer.current);
    const newExp=[undoEntry,...(expenses||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
    setExpenses(newExp);if(user)await persist(user.username,newExp,budgets,monthlyTargets,isDark,pinVal,customCats,recurringTemplates);
    setUndoEntry(null);showToast("Entry restored!");
  };
  const exportCSV=range=>{
    const n2=new Date();let filtered=[],fn="";
    if(range==="week"){const w=new Date(n2);w.setDate(w.getDate()-7);filtered=(expenses||[]).filter(e=>new Date(e.date)>=w);fn="spndr_week";}
    else if(range==="month"){filtered=thisMonth;fn="spndr_"+n2.toLocaleDateString("en",{month:"short",year:"numeric"}).replace(" ","_");}
    else{filtered=(expenses||[]).filter(e=>new Date(e.date).getFullYear()===n2.getFullYear());fn="spndr_"+n2.getFullYear();}
    if(!filtered.length){showToast("No data.","warn");return;}
    const rows=[["Date","Description","Category","Amount","Payment"],...filtered.map(e=>[new Date(e.date).toLocaleDateString("en-IN"),`"${e.description}"`,getCatById(e.category).name,e.amount,e.type]),["","","TOTAL",filtered.reduce((s,e)=>s+e.amount,0),""]];
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"}));
    a.download=fn+".csv";a.click();setExportMode(false);showToast(`Exported ${filtered.length} entries!`);
  };

  /* ── CHART DATA — BUG FIX: use 1st of month to prevent day-overflow duplicates ── */
  const chartData=(()=>{
    if(period==="day")return Array.from({length:7},(_,i)=>{
      const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(6-i));
      const e=(expenses||[]).filter(x=>{const xd=new Date(x.date);return xd.getFullYear()===d.getFullYear()&&xd.getMonth()===d.getMonth()&&xd.getDate()===d.getDate();});
      return{name:d.toLocaleDateString("en",{weekday:"short"}),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+(x.amount||0),0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+(x.amount||0),0)};
    });
    if(period==="month")return Array.from({length:6},(_,i)=>{
      /* FIX: use day=1 to prevent month overflow (e.g. Mar31 - 1 month = Mar2, not Feb28) */
      const d=new Date(now.getFullYear(),now.getMonth()-(5-i),1);
      const e=(expenses||[]).filter(x=>{const xd=new Date(x.date);return xd.getFullYear()===d.getFullYear()&&xd.getMonth()===d.getMonth();});
      return{name:d.toLocaleDateString("en",{month:"short"}),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+(x.amount||0),0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+(x.amount||0),0)};
    });
    return Array.from({length:3},(_,i)=>{
      const yr=now.getFullYear()-(2-i);
      const e=(expenses||[]).filter(x=>new Date(x.date).getFullYear()===yr);
      return{name:String(yr),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+(x.amount||0),0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+(x.amount||0),0)};
    });
  })();

  /* voice */
  const startVoice=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){showToast("Speech not supported.","err");return;}
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
      for(const[cat,kws]of Object.entries(CAT_KEYWORDS)){if(kws.some(k=>text.includes(k))){category=cat.toLowerCase();break;}}
      for(const cc of (customCats||[])){if(text.includes(cc.name.toLowerCase())){category=cc.id;break;}}
      let desc=english.replace(/\d+[\.,]?\d*/,"").replace(/rupees?|rupaye?|rupiya|rupe|₹|rs\.?/gi,"").trim();
      if(desc.length<3)desc=getCatById(category).name;
      setForm(prev=>({...prev,amount:amount||"",category,description:desc||getCatById(category).name,type}));
      setVLoad(false);
      if(amount)showToast(`Detected: ${fmt(parseFloat(amount))} · ${getCatById(category).name} · ${type}`);
      else showToast("Heard you — please enter amount.","warn");
    };
    r.onerror=e=>{setListening(false);if(e.error==="not-allowed")showToast("Mic denied.","err");else if(e.error==="no-speech")showToast("No speech detected.","warn");else showToast("Mic error: "+e.error,"err");};
    r.onend=()=>setListening(false);
    recRef.current=r;r.start();setListening(true);setVoiceText("");setTransText("");
  };
  const stopVoice=()=>recRef.current?.stop();

  const css=buildCss(T);
  const greet=now.getHours()<12?"Morning":now.getHours()<17?"Afternoon":"Evening";
  const TABS=[{id:"home",ico:"⌂",label:"Home"},{id:"add",ico:"+",label:"Add"},{id:"charts",ico:"↗",label:"Charts"},{id:"budget",ico:"◎",label:"Budget"},{id:"settings",ico:"⚙",label:"More"}];
  const mc=getMoodColor(curTarget>0?rawPct:0,T);

  /* ── PIN SCREEN ── */
  if(user&&locked&&pinMode==="lock")return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:24}}>
      <style>{css}</style>
      <div style={{textAlign:"center",marginBottom:32}}><div style={{fontSize:48,marginBottom:10}}>🔒</div><div style={{fontFamily:"'DM Serif Display',serif",fontSize:32,color:T.a1}}>Spndr<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:T.a3,marginLeft:3,marginBottom:4,verticalAlign:"middle"}}/></div><div style={{fontSize:13,color:T.muted,marginTop:8}}>Enter your 4-digit PIN</div></div>
      <div style={{...mkCard(T,{padding:"32px 28px",width:"min(320px,100%)",textAlign:"center"})}}>
        <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:28}}>{[0,1,2,3].map(i=><div key={i} style={{width:16,height:16,borderRadius:"50%",background:pinInput.length>i?T.a1:T.bdrSub,border:`2px solid ${pinInput.length>i?T.a1:T.muted}`,transition:"all .2s"}}/>)}</div>
        {pinError&&<div style={{color:T.a4,fontSize:13,marginBottom:14,fontWeight:600}}>{pinError}</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=><button key={i} onClick={()=>d==="⌫"?handlePinBack():d!==""&&handlePinDigit(String(d))} style={{...mkBtn({padding:"17px 8px",border:`1.5px solid ${T.bdrSub}`,background:d===""?"transparent":T.card,color:T.text,fontSize:20,fontFamily:"'JetBrains Mono',monospace",cursor:d===""?"default":"pointer"})}}>{d}</button>)}
        </div>
        <button onClick={doSignOut} style={{marginTop:20,background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",textDecoration:"underline",fontFamily:"'DM Sans',sans-serif"}}>Sign out instead</button>
      </div>
    </div>
  );

  /* ── AUTH SCREEN ── */
  if(!user){
    const isUp=authMode==="signup";
    return(
      <div style={{minHeight:"100vh",width:"100%",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden",padding:"32px 16px",transition:"background .3s"}}>
        <style>{css}</style>
        <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden"}}><div style={{position:"absolute",top:"-8%",left:"-8%",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${T.a1}${T.isDark?"16":"09"},transparent 70%)`,animation:"float 12s ease-in-out infinite"}}/><div style={{position:"absolute",bottom:"0",right:"-8%",width:420,height:420,borderRadius:"50%",background:`radial-gradient(circle,${T.a3}${T.isDark?"12":"07"},transparent 70%)`,animation:"float 15s ease-in-out infinite",animationDelay:"4s"}}/></div>
        <button onClick={()=>setIsDark(!isDark)} style={{position:"fixed",top:20,right:20,zIndex:20,width:42,height:42,borderRadius:"50%",border:`1px solid ${T.border}`,background:T.card,backdropFilter:"blur(12px)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:T.text}}>{T.isDark?"☀":"🌙"}</button>
        <div style={{textAlign:"center",marginBottom:36,zIndex:10,animation:"fadeUp .5s ease"}}>
          <div style={{fontSize:13,letterSpacing:4,color:T.muted,fontWeight:600,marginBottom:8}}>PERSONAL FINANCE</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:46,letterSpacing:-1,color:T.a1,lineHeight:1.1}}>Spndr<span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:T.a3,marginLeft:3,marginBottom:6,verticalAlign:"middle"}}/></div>
          <div style={{width:36,height:2,background:T.grad,margin:"12px auto 0",borderRadius:99}}/>
          <div style={{fontSize:13,color:T.muted,marginTop:10}}>Track every rupee, every day</div>
        </div>
        <div style={{...mkCard(T,{padding:"32px 28px",width:"min(420px,100%)",zIndex:10,animation:"fadeUp .5s ease .1s both"})}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:T.input,borderRadius:12,padding:4,marginBottom:28,gap:4}}>
            {[["signin","Sign In"],["signup","Sign Up"]].map(([m,l])=><button key={m} onClick={()=>{setAuthMode(m);setAError("");setAInfo("");}} style={{...mkBtn({padding:"11px",borderRadius:9,background:authMode===m?T.grad:"transparent",color:authMode===m?"#fff":T.muted,fontSize:14,boxShadow:authMode===m?`0 2px 12px ${T.glow}`:"none"})}}>{l}</button>)}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:7,fontWeight:600}}>USERNAME</div>
            <input type="text" value={aForm.username} placeholder="e.g. arjun_99" onChange={e=>setAForm(p=>({...p,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&(isUp?doSignUp():doSignIn())} style={{width:"100%",background:T.input,border:`1.5px solid ${aError?T.a4:T.inputBdr}`,borderRadius:12,padding:"13px 16px",color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
          </div>
          <div style={{marginBottom:isUp?16:24}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:7,fontWeight:600}}>PASSWORD</div>
            <div style={{position:"relative"}}>
              <input type={showPw.password?"text":"password"} value={aForm.password} placeholder="Minimum 6 characters" onChange={e=>setAForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&(isUp?doSignUp():doSignIn())} style={{width:"100%",background:T.input,border:`1.5px solid ${aError?T.a4:T.inputBdr}`,borderRadius:12,padding:"13px 48px 13px 16px",color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
              {/* FIX: onMouseDown preventDefault stops input from losing focus — eye works in ONE tap */}
              <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>setShowPw(p=>({...p,password:!p.password}))} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:6,color:T.muted,fontSize:18,lineHeight:1,display:"flex",alignItems:"center",userSelect:"none"}}>{showPw.password?"🙈":"👁️"}</button>
            </div>
          </div>
          {isUp&&<div style={{marginBottom:24}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:7,fontWeight:600}}>CONFIRM PASSWORD</div>
            <div style={{position:"relative"}}>
              <input type={showPw.confirm?"text":"password"} value={aForm.confirm} placeholder="Repeat password" onChange={e=>setAForm(p=>({...p,confirm:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doSignUp()} style={{width:"100%",background:T.input,border:`1.5px solid ${aError?T.a4:T.inputBdr}`,borderRadius:12,padding:"13px 48px 13px 16px",color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
              <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>setShowPw(p=>({...p,confirm:!p.confirm}))} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:6,color:T.muted,fontSize:18,lineHeight:1,display:"flex",alignItems:"center",userSelect:"none"}}>{showPw.confirm?"🙈":"👁️"}</button>
            </div>
          </div>}
          {aError&&<div style={{padding:"12px 16px",borderRadius:12,marginBottom:12,background:`${T.a4}12`,border:`1px solid ${T.a4}35`}}><div style={{color:T.a4,fontWeight:600,fontSize:13}}>⚠ {aError}</div></div>}
          {aInfo&&<div style={{padding:"10px 16px",borderRadius:12,marginBottom:12,background:`${T.a3}10`,border:`1px solid ${T.a3}25`}}><div style={{color:T.a3,fontSize:12,fontWeight:500}}>ℹ {aInfo}</div></div>}
          <button onClick={isUp?doSignUp:doSignIn} disabled={aLoading} style={{...mkBtn({width:"100%",padding:"15px",borderRadius:13,background:aLoading?T.input:T.grad,color:aLoading?T.muted:"#fff",fontSize:15,boxShadow:aLoading?"none":`0 6px 24px ${T.glow}`,display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:aLoading?"not-allowed":"pointer"})}}>
            {aLoading&&<div style={{width:15,height:15,borderRadius:"50%",border:`2px solid ${T.muted}`,borderTopColor:"transparent",animation:"spin .7s linear infinite"}}/>}
            {aLoading?"Please wait…":isUp?"Create Account →":"Sign In →"}
          </button>
          <p style={{textAlign:"center",marginTop:20,fontSize:13,color:T.muted}}>{isUp?"Already registered? ":"New here? "}<span onClick={()=>{setAuthMode(isUp?"signin":"signup");setAError("");setAInfo("");}} style={{color:T.a1,fontWeight:600,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}}>{isUp?"Sign In":"Create free account"}</span></p>
        </div>
        {toast&&<ToastEl T={T} toast={toast}/>}
      </div>
    );
  }

  /* ── MAIN SHELL ── */
  return(
    <div style={{minHeight:"100vh",width:"100%",background:T.bg,color:T.text,fontFamily:"'DM Sans',sans-serif",position:"relative",maxWidth:480,margin:"0 auto",overflowX:"hidden",transition:"background .3s,color .3s"}}>
      <style>{css}</style>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}><div style={{position:"absolute",top:"-5%",right:"-10%",width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${mc}${T.isDark?"10":"06"},transparent)`,transition:"background .5s"}}/><div style={{position:"absolute",bottom:"10%",left:"-8%",width:240,height:240,borderRadius:"50%",background:`radial-gradient(circle,${T.a3}${T.isDark?"08":"05"},transparent)`}}/></div>
      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:60,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",background:T.header,borderBottom:`1px solid ${T.divider}`,padding:"13px 16px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:11,color:T.muted}}>{now.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})} · Good {greet}</div><div style={{fontFamily:"'DM Serif Display',serif",fontSize:21,color:T.a1,lineHeight:1.3}}>Spndr<span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:T.a3,marginLeft:2,marginBottom:3,verticalAlign:"middle"}}/></div></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={toggleMode} style={{width:36,height:36,borderRadius:"50%",border:`1px solid ${T.border}`,background:T.card,backdropFilter:"blur(12px)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",color:T.text,transition:"all .22s"}}>{T.isDark?"☀":"🌙"}</button>
            {curTarget>0&&<div style={{padding:"5px 11px",borderRadius:99,fontSize:11,fontWeight:600,background:isOver?`${T.a4}16`:`${mc}18`,color:isOver?T.a4:mc,fontFamily:"'JetBrains Mono',monospace",transition:"all .5s"}}>{isOver?`+${fmt(total-curTarget)} over`:`${fmt(curTarget-total)} left`}</div>}
          </div>
        </div>
      </div>
      {/* Pages — no key prop so scroll is preserved */}
      <div style={{position:"relative",zIndex:1,paddingTop:14}}>
        {tab==="home"&&<HomeView T={T} expenses={expenses} thisMonth={thisMonth} total={total} upiAmt={upiAmt} cashAmt={cashAmt} rawPct={rawPct} barPct={barPct} isOver={isOver} curTarget={curTarget} catData={catData} overspendAlert={overspendAlert} setOverspendAlert={setOverspendAlert} undoEntry={undoEntry} undoDelete={undoDelete} exportMode={exportMode} setExportMode={setExportMode} exportCSV={exportCSV} setTab={setTab} deleteEntry={deleteEntry} getCatById={getCatById} recurringTemplates={recurringTemplates}/>}
        {tab==="add"&&<AddView T={T} form={form} setForm={setForm} addExpense={addExpense} allCats={allCats} getCatById={getCatById} showCatManager={showCatManager} setShowCatManager={setShowCatManager} customCats={customCats} addCustomCat={addCustomCat} deleteCustomCat={deleteCustomCat} newCatName={newCatName} setNewCatName={setNewCatName} newCatEmoji={newCatEmoji} setNewCatEmoji={setNewCatEmoji} newCatColor={newCatColor} setNewCatColor={setNewCatColor} voiceLang={voiceLang} setVoiceLang={setVoiceLang} voiceText={voiceText} transText={transText} listening={listening} vLoad={vLoad} startVoice={startVoice} stopVoice={stopVoice} showVHelp={showVHelp} setShowVHelp={setShowVHelp} recurringTemplates={recurringTemplates} setRecurringTemplates={setRecurringTemplates} showToast={showToast} persist={persist} user={user} expenses={expenses} budgets={budgets} monthlyTargets={monthlyTargets} isDark={isDark} pinVal={pinVal} customCatsRaw={customCats}/>}
        {tab==="charts"&&<ChartsView T={T} chartData={chartData} period={period} setPeriod={setPeriod} catData={catData} thisMonth={thisMonth} upiAmt={upiAmt} cashAmt={cashAmt}/>}
        {tab==="budget"&&<BudgetView T={T} expenses={expenses} catData={catData} monthlyTargets={monthlyTargets} saveMonthTarget={saveMonthTarget} budgets={budgets} saveBudgets={saveBudgets} total={total} curTarget={curTarget} rawPct={rawPct} isOver={isOver} showToast={showToast} recurringTemplates={recurringTemplates} setRecurringTemplates={setRecurringTemplates} persist={persist} user={user} isDark={isDark} pinVal={pinVal} customCats={customCats}/>}
        {tab==="settings"&&<SettingsView T={T} user={user} expenses={expenses} total={total} isDark={isDark} setIsDark={setIsDark} pinVal={pinVal} setPinVal={setPinVal} locked={locked} setLocked={setLocked} pinMode={pinMode} setPinMode={setPinMode} pinInput={pinInput} setPinInput={setPinInput} pinError={pinError} setPinError={setPinError} pinSetup={pinSetup} setPinSetup={setPinSetup} handlePinDigit={handlePinDigit} handlePinBack={handlePinBack} removePin={removePin} doSignOut={doSignOut} persist={persist} budgets={budgets} monthlyTargets={monthlyTargets} customCats={customCats} notifEnabled={notifEnabled} setNotifEnabled={setNotifEnabled} showToast={showToast} recurringTemplates={recurringTemplates}/>}
      </div>
      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:100,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",background:T.nav,borderTop:`1px solid ${T.divider}`,padding:"10px 6px 26px"}}>
        <div style={{display:"flex",justifyContent:"space-around",alignItems:"flex-end"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,border:"none",background:"none",cursor:"pointer",padding:"4px 2px",borderRadius:12,position:"relative",transition:"all .2s"}}>
              {t.id==="add"?(
                <div style={{width:52,height:52,borderRadius:"50%",marginTop:-22,background:tab==="add"?T.grad:`linear-gradient(135deg,${T.a1}55,${T.a3}50)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,color:"#fff",boxShadow:tab==="add"?`0 6px 28px ${T.glow}`:`0 4px 16px ${T.glow}55`,border:`2px solid ${tab==="add"?"transparent":T.border}`,transition:"all .25s"}}>{t.ico}</div>
              ):(
                <><span style={{fontSize:18,filter:tab===t.id?"none":"grayscale(1) opacity(.38)",transition:"filter .2s"}}>{t.ico}</span><span style={{fontSize:10,fontWeight:600,color:tab===t.id?T.a1:T.muted,fontFamily:"'DM Sans',sans-serif",transition:"color .2s"}}>{t.label}</span>{tab===t.id&&<div style={{position:"absolute",bottom:0,width:20,height:2.5,borderRadius:99,background:T.grad}}/>}</>
              )}
            </button>
          ))}
        </div>
      </div>
      {toast&&<ToastEl T={T} toast={toast}/>}
    </div>
  );
}

export default function App(){
  return <ErrorBoundary><AppInner/></ErrorBoundary>;
}
