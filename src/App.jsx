import { useState, useRef, useCallback } from "react";
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  'https://zoydiohcruujgnstjmud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpveWRpb2hjcnV1amduc3RqbXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjA0NjMsImV4cCI6MjA4OTc5NjQ2M30.8SA5zAdNYkzSIdwhfS58l0TMF2H5U-b9GxfGSWxhRVo'
)

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

/* ── utils ──────────────────────────────────────────────────────────────── */
const hashPw = s => { let h = 5381; for (let c of s) h = (h*33)^c.charCodeAt(0); return (h>>>0).toString(36); };
const fmt    = n => `₹${Number(n).toLocaleString("en-IN")}`;
const getCat = n => CATS.find(c => c.name === n) || CATS[7];

/* ── safe storage wrappers ──────────────────────────────────────────────── */
const sGet = async (key) => {
  try {
    const { data } = await supabase
      .from('spndr_store')
      .select('value')
      .eq('key', key)
      .single()
    return data ? { value: data.value } : null
  } catch { return null }
}
const sSet = async (key, value) => {
  try {
    await supabase
      .from('spndr_store')
      .upsert({ key, value }, { onConflict: 'key' })
  } catch(e) { throw new Error(e.message) }
}

/* ── Theme — "Executive" ─────────────────────────────────────────────────
   One refined palette, two modes.
   Dark  → deep slate navy + warm gold + soft teal
   Light → ivory white + deep navy + warm gold
────────────────────────────────────────────────────────────────────────── */
const DARK = {
  mode:      "dark",
  bg:        "#0b0f1a",
  surface:   "#111827",
  card:      "rgba(255,255,255,.038)",
  cardHvr:   "rgba(255,255,255,.062)",
  header:    "rgba(11,15,26,.9)",
  nav:       "rgba(11,15,26,.97)",
  input:     "rgba(255,255,255,.055)",
  inputBdr:  "rgba(212,168,83,.3)",
  text:      "#eef0f6",
  sub:       "#9ba3b8",
  muted:     "#4b5468",
  a1:        "#d4a853",   // warm gold
  a2:        "#f0c97a",   // gold-light
  a3:        "#2dd4bf",   // teal accent
  a4:        "#f87171",   // soft red alert
  a5:        "#818cf8",   // indigo subtle
  grad:      "linear-gradient(135deg,#d4a853,#2dd4bf)",
  gradSoft:  "linear-gradient(135deg,rgba(212,168,83,.15),rgba(45,212,191,.1))",
  upi:       "#818cf8",
  cash:      "#2dd4bf",
  border:    "rgba(212,168,83,.15)",
  bdrSub:    "rgba(255,255,255,.07)",
  glow:      "rgba(212,168,83,.22)",
  divider:   "rgba(255,255,255,.06)",
};

const LIGHT = {
  mode:      "light",
  bg:        "#f7f6f2",
  surface:   "#ffffff",
  card:      "rgba(255,255,255,.92)",
  cardHvr:   "rgba(255,255,255,1)",
  header:    "rgba(247,246,242,.94)",
  nav:       "rgba(247,246,242,.97)",
  input:     "rgba(0,0,0,.04)",
  inputBdr:  "rgba(139,101,30,.35)",
  text:      "#0f1626",
  sub:       "#3d4a61",
  muted:     "#8a94a6",
  a1:        "#b8860b",   // dark gold
  a2:        "#d4a853",   // gold mid
  a3:        "#0d9488",   // teal dark
  a4:        "#dc2626",   // red alert
  a5:        "#4f46e5",   // indigo
  grad:      "linear-gradient(135deg,#b8860b,#0d9488)",
  gradSoft:  "linear-gradient(135deg,rgba(184,134,11,.09),rgba(13,148,136,.07))",
  upi:       "#4f46e5",
  cash:      "#0d9488",
  border:    "rgba(184,134,11,.18)",
  bdrSub:    "rgba(0,0,0,.08)",
  glow:      "rgba(184,134,11,.18)",
  divider:   "rgba(0,0,0,.07)",
};

/* ── Data ───────────────────────────────────────────────────────────────── */
const CATS = [
  {name:"Food",          emoji:"🍽",  color:"#f97316"},
  {name:"Transport",     emoji:"🚇",  color:"#0ea5e9"},
  {name:"Shopping",      emoji:"🛒",  color:"#8b5cf6"},
  {name:"Entertainment", emoji:"🎬",  color:"#ec4899"},
  {name:"Health",        emoji:"🏥",  color:"#10b981"},
  {name:"Bills",         emoji:"📋",  color:"#f59e0b"},
  {name:"Education",     emoji:"🎓",  color:"#3b82f6"},
  {name:"Other",         emoji:"📌",  color:"#6b7280"},
];
const LANGS = [
  {label:"English",  value:"en-US"},{label:"Hindi",   value:"hi-IN"},
  {label:"Gujarati", value:"gu-IN"},{label:"Tamil",   value:"ta-IN"},
  {label:"Telugu",   value:"te-IN"},{label:"Marathi", value:"mr-IN"},
  {label:"Bengali",  value:"bn-IN"},
];
const DEF_BUDGETS = {Food:6000,Transport:2500,Shopping:4000,Entertainment:2000,Health:1500,Bills:5000,Education:3000,Other:1500};

function generateSample() {
  const desc = {
    Food:["Restaurant lunch","Grocery run","Street food","Morning coffee","Dinner outing"],
    Transport:["Metro recharge","Cab fare","Auto ride","Bus pass","Fuel"],
    Shopping:["Online order","Clothing","Electronics","Books","Home essentials"],
    Entertainment:["Cinema","Streaming sub","Gaming","Event tickets","OTT plan"],
    Health:["Pharmacy","Gym membership","Consultation","Supplements","Checkup"],
    Bills:["Electricity","Internet","Mobile recharge","Water","Gas"],
    Education:["Online course","Study material","Tuition","Stationery","Exam fee"],
    Other:["Gift","Miscellaneous","Emergency","Donation","Other"],
  };
  const now = new Date();
  return Array.from({length:38},(_,i)=>{
    const d=new Date(now); d.setDate(d.getDate()-Math.floor(Math.random()*55));
    const cat=CATS[Math.floor(Math.random()*8)];
    return {id:i+1,amount:Math.floor(Math.random()*2800)+80,category:cat.name,
      description:desc[cat.name][Math.floor(Math.random()*5)],
      type:Math.random()>.42?"UPI":"Cash",date:d.toISOString()};
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [isDark,   setIsDark]   = useState(true);
  const T = isDark ? DARK : LIGHT;

  const [user,     setUser]     = useState(null);
  const [authMode, setAuthMode] = useState("signin");
  const [aForm,    setAForm]    = useState({username:"",password:"",confirm:""});
  const [showPw,   setShowPw]   = useState({password:false,confirm:false});
  const [aError,   setAError]   = useState("");
  const [aInfo,    setAInfo]    = useState("");   // detailed info for debugging
  const [aLoading, setALoading] = useState(false);

  const [tab,      setTab]      = useState("home");
  const [expenses, setExpenses] = useState([]);
  const [budgets,  setBudgets]  = useState(DEF_BUDGETS);
  const [target,   setTarget]   = useState(25000);
  const [form,     setForm]     = useState({amount:"",category:"Food",description:"",type:"UPI",date:new Date().toISOString().split("T")[0]});
  const [voiceLang,setVoiceLang]= useState("en-US");
  const [voiceText,setVoiceText]= useState("");
  const [listening,setListening]= useState(false);
  const [vLoad,    setVLoad]    = useState(false);
  const [period,   setPeriod]   = useState("month");
  const [toast,    setToast]    = useState(null);
  const recRef = useRef(null);

  const showToast = (msg,type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3200); };

  const persist = useCallback(async(uname,exps,buds,tgt,dark)=>{
    try { await sSet(`vi2:${uname}`,JSON.stringify({expenses:exps,budgets:buds,target:tgt,dark})); }
    catch{}
  },[]);

  /* ── AUTH ────────────────────────────────────────────────────────────── */
  const doSignUp = async () => {
    const {username,password,confirm} = aForm;
    const u = username.trim().toLowerCase();
    setAError(""); setAInfo("");

    // client-side validation
    if(!u)               { setAError("Username is required."); return; }
    if(u.length < 3)     { setAError("Username must be at least 3 characters."); return; }
    if(!/^[a-z0-9_]+$/.test(u)) { setAError("Username may only contain letters, numbers, and underscores."); return; }
    if(!password)        { setAError("Password is required."); return; }
    if(password.length < 6) { setAError("Password must be at least 6 characters."); return; }
    if(password !== confirm) { setAError("Passwords do not match."); return; }

    setALoading(true);
    try {
      setAInfo("Checking username availability…");
      const existing = await sGet(`vi2:auth:${u}`);
      if(existing) {
        setAError("This username is already taken. Please choose another.");
        setAInfo("");
        setALoading(false);
        return;
      }
      setAInfo("Creating your account…");
      await sSet(`vi2:auth:${u}`, JSON.stringify({username:u, hash:hashPw(password)}));
      const sample = generateSample();
      await persist(u, sample, DEF_BUDGETS, 25000, true);
      setExpenses([]); setBudgets(DEF_BUDGETS); setTarget(25000); setIsDark(true);
      setAInfo("");
      setUser({username:u});
      showToast(`Welcome to SPNDR, ${u}!`);
    } catch(e) {
      setAError("Account creation failed.");
      setAInfo("Error detail: " + e.message);
    }
    setALoading(false);
  };

  const doSignIn = async () => {
    const {username,password} = aForm;
    const u = username.trim().toLowerCase();
    setAError(""); setAInfo("");

    if(!u)        { setAError("Please enter your username."); return; }
    if(!password) { setAError("Please enter your password."); return; }

    setALoading(true);
    try {
      setAInfo("Looking up your account…");
      const authRec = await sGet(`vi2:auth:${u}`);
      if(!authRec) {
        setAError("No account found with that username.");
        setAInfo("Tip: Check the spelling or create a new account.");
        setALoading(false);
        return;
      }
      setAInfo("Verifying credentials…");
      let auth;
      try { auth = JSON.parse(authRec.value); }
      catch { setAError("Account data is corrupted."); setAInfo("Please create a new account."); setALoading(false); return; }

      if(auth.hash !== hashPw(password)) {
        setAError("Incorrect password. Please try again.");
        setAInfo("Forgot your password? Create a new account instead.");
        setALoading(false);
        return;
      }
      setAInfo("Loading your data…");
      const dataRec = await sGet(`vi2:${u}`);
      if(dataRec) {
        try {
          const d = JSON.parse(dataRec.value);
          setExpenses(d.expenses || []);
          setBudgets(d.budgets  || DEF_BUDGETS);
          setTarget(d.target    || 25000);
          setIsDark(d.dark !== false);
        } catch { setExpenses(generateSample()); setBudgets(DEF_BUDGETS); setTarget(25000); }
      } else {
        const s = generateSample();
        setExpenses([]); setBudgets(DEF_BUDGETS); setTarget(25000);
      }
      setAInfo("");
      setUser({username:u});
      showToast(`Welcome back, ${u}!`);
    } catch(e) {
      setAError("Sign-in failed. Please try again.");
      setAInfo("Error detail: " + e.message);
    }
    setALoading(false);
  };

  const doSignOut = () => {
    setUser(null); setExpenses([]); setTab("home");
    setAForm({username:"",password:"",confirm:""}); setAError(""); setAInfo("");
    setShowPw({password:false,confirm:false});
    showToast("Signed out successfully.");
  };

  const toggleMode = async () => {
    const next = !isDark; setIsDark(next);
    if(user) await persist(user.username,expenses,budgets,target,next);
  };

  /* ── Derived ────────────────────────────────────────────────────────── */
  const now       = new Date();
  const thisMonth = expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();});
  const total     = thisMonth.reduce((s,e)=>s+e.amount,0);
  const upiAmt    = thisMonth.filter(e=>e.type==="UPI").reduce((s,e)=>s+e.amount,0);
  const cashAmt   = thisMonth.filter(e=>e.type==="Cash").reduce((s,e)=>s+e.amount,0);
  const pct       = Math.min((total/target)*100,100);
  const isOver    = total>target;
  const catData   = CATS.map(c=>({...c,spent:thisMonth.filter(e=>e.category===c.name).reduce((s,e)=>s+e.amount,0),budget:budgets[c.name]||0}));

  const saveTarget  = async v => { setTarget(v);  if(user) await persist(user.username,expenses,budgets,v,isDark); };
  const saveBudgets = async v => { setBudgets(v); if(user) await persist(user.username,expenses,v,target,isDark); };

  const addExpense = async () => {
    const amt=parseFloat(form.amount);
    if(!amt||amt<=0){showToast("Enter a valid amount.","warn");return;}
    const entry={id:Date.now(),amount:amt,category:form.category,description:form.description||form.category,type:form.type,date:new Date(form.date).toISOString()};
    const newExp=[entry,...expenses]; setExpenses(newExp);
    if(total+amt>target) showToast("You have exceeded your budget.","err");
    else if(total+amt>target*.85) showToast("85% of budget consumed.","warn");
    else showToast("Expense recorded.");
    if(user) await persist(user.username,newExp,budgets,target,isDark);
    setForm({amount:"",category:"Food",description:"",type:"UPI",date:new Date().toISOString().split("T")[0]});
    setTab("home");
  };

  const chartData = (() => {
    if(period==="day") return Array.from({length:7},(_,i)=>{
      const d=new Date(); d.setDate(d.getDate()-(6-i));
      const e=expenses.filter(x=>new Date(x.date).toDateString()===d.toDateString());
      return {label:d.toLocaleDateString("en",{weekday:"short"}),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+x.amount,0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+x.amount,0)};
    });
    if(period==="month") return Array.from({length:6},(_,i)=>{
      const d=new Date(); d.setMonth(d.getMonth()-(5-i));
      const e=expenses.filter(x=>{const xd=new Date(x.date);return xd.getMonth()===d.getMonth()&&xd.getFullYear()===d.getFullYear();});
      return {label:d.toLocaleDateString("en",{month:"short"}),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+x.amount,0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+x.amount,0)};
    });
    return Array.from({length:3},(_,i)=>{
      const yr=now.getFullYear()-(2-i);
      const e=expenses.filter(x=>new Date(x.date).getFullYear()===yr);
      return {label:String(yr),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+x.amount,0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+x.amount,0)};
    });
  })();

  const startVoice = () => {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){showToast("Speech recognition not supported in this browser.","err");return;}
    const r=new SR(); r.lang=voiceLang; r.interimResults=false;
    r.onresult=async ev=>{
      const t=ev.results[0][0].transcript;
      setVoiceText(t); setListening(false); setVLoad(true);
      try {
        const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:256,
            messages:[{role:"user",content:`Parse expense voice input to JSON. Input: "${t}"\nReturn ONLY valid JSON: {"amount":number,"category":"Food|Transport|Shopping|Entertainment|Health|Bills|Education|Other","description":"short English description","type":"UPI|Cash"}`}]})});
        const d=await res.json();
        const txt=d.content.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
        const p=JSON.parse(txt);
        setForm(prev=>({...prev,amount:String(p.amount||""),category:p.category||"Other",description:p.description||"",type:p.type||"UPI"}));
        showToast("Voice input processed.");
      } catch { showToast("Could not parse voice input. Please fill manually.","warn"); }
      setVLoad(false);
    };
    r.onerror=(e)=>{setListening(false);showToast("Microphone error: "+e.error,"err");};
    r.onend=()=>setListening(false);
    recRef.current=r; r.start(); setListening(true); setVoiceText("");
  };

  /* ── style helpers ──────────────────────────────────────────────────── */
  const card = (extra={}) => ({
    background:  T.card,
    backdropFilter:"blur(20px)",
    WebkitBackdropFilter:"blur(20px)",
    border:`1px solid ${T.bdrSub}`,
    borderRadius: 16,
    padding: 18,
    boxShadow: isDark
      ? "0 1px 0 rgba(255,255,255,.04) inset, 0 4px 24px rgba(0,0,0,.3)"
      : "0 1px 0 rgba(255,255,255,.9) inset, 0 2px 12px rgba(0,0,0,.07)",
    ...extra,
  });

  const inputStyle = (extra={}) => ({
    width:"100%",background:T.input,border:`1.5px solid ${T.inputBdr}`,
    borderRadius:12,padding:"13px 16px",color:T.text,fontSize:15,
    fontFamily:"'DM Sans',sans-serif",outline:"none",
    transition:"border-color .2s, box-shadow .2s",
    boxSizing:"border-box",...extra,
  });

  const label = (text) => (
    <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:8,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>
      {text}
    </div>
  );

  const CTip = ({active,payload,label:lb}) => {
    if(!active||!payload?.length) return null;
    return (<div style={{background:isDark?"rgba(11,15,26,.97)":"rgba(255,255,255,.98)",border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{color:T.muted,fontSize:11,marginBottom:6}}>{lb}</div>
      {payload.map(p=>(<div key={p.name} style={{color:p.color,fontWeight:600,fontSize:13}}>{p.name}: {fmt(p.value)}</div>))}
    </div>);
  };

  /* ── EyeBtn ──────────────────────────────────────────────────────────── */
  const EyeBtn = ({field}) => (
    <button type="button" onClick={()=>setShowPw(p=>({...p,[field]:!p[field]}))}
      style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",
        background:"none",border:"none",cursor:"pointer",padding:4,
        color:T.muted,fontSize:16,lineHeight:1,display:"flex",alignItems:"center"}}>
      {showPw[field] ? "🙈" : "👁️"}
    </button>
  );

  /* GLOBAL CSS */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
    input[type=number]{-moz-appearance:textfield;}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${isDark?"invert(.5)":"opacity(.5)"};cursor:pointer;}
    ::-webkit-scrollbar{width:3px;height:3px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:${T.a1}50;border-radius:99px;}
    button:active{transform:scale(.97)!important;}
    select option{background:${isDark?"#111827":"#ffffff"};}
    input:-webkit-autofill{-webkit-box-shadow:0 0 0 100px ${T.bg} inset!important;-webkit-text-fill-color:${T.text}!important;}
    @keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
    @keyframes toastSlide{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  `;

  /* ══════════════════════════════════════════════════ AUTH SCREEN ═══════ */
  if(!user) {
    const isUp = authMode === "signup";
    return (
      <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",
        position:"relative",overflow:"hidden",padding:"32px 16px"}}>
        <style>{css}</style>

        {/* Subtle bg decoration */}
        <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden"}}>
          <div style={{position:"absolute",top:"-10%",left:"-8%",width:500,height:500,borderRadius:"50%",
            background:`radial-gradient(circle,${T.a1}${isDark?"14":"08"},transparent 70%)`,
            animation:"float 12s ease-in-out infinite"}} />
          <div style={{position:"absolute",bottom:"0",right:"-8%",width:420,height:420,borderRadius:"50%",
            background:`radial-gradient(circle,${T.a3}${isDark?"10":"06"},transparent 70%)`,
            animation:"float 15s ease-in-out infinite",animationDelay:"4s"}} />
        </div>

        {/* Mode toggle */}
        <button onClick={()=>setIsDark(!isDark)} style={{
          position:"fixed",top:20,right:20,zIndex:20,
          width:42,height:42,borderRadius:"50%",
          border:`1px solid ${T.border}`,background:T.card,
          backdropFilter:"blur(12px)",cursor:"pointer",
          fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:`0 2px 12px ${T.glow}`,color:T.text,transition:"all .22s"}}>
          {isDark?"☀":"🌙"}
        </button>

        {/* Brand */}
        <div style={{textAlign:"center",marginBottom:36,zIndex:10,animation:"fadeUp .5s ease"}}>
          <div style={{fontSize:13,letterSpacing:4,color:T.muted,fontWeight:600,marginBottom:6,fontFamily:"'DM Sans',sans-serif"}}>
            PERSONAL FINANCE
          </div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:46,letterSpacing:-1,
            background:T.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1}}>
            Spndr
          </div>
          <div style={{width:36,height:2,background:T.grad,margin:"12px auto 0",borderRadius:99}} />
        </div>

        {/* Card */}
        <div style={{...card({padding:"32px 28px",width:"min(420px,100%)",zIndex:10,animation:"fadeUp .5s ease .1s both"})}}>
          {/* Tab row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:T.input,
            borderRadius:12,padding:4,marginBottom:28,gap:4}}>
            {[["signin","Sign In"],["signup","Sign Up"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setAuthMode(m);setAError("");setAInfo("");}} style={{
                padding:"11px",borderRadius:9,border:"none",cursor:"pointer",transition:"all .22s",
                background:authMode===m?T.grad:"transparent",
                color:authMode===m?"#fff":T.muted,
                fontWeight:600,fontSize:14,fontFamily:"'DM Sans',sans-serif",letterSpacing:.3,
                boxShadow:authMode===m?`0 2px 12px ${T.glow}`:"none"}}>
                {l}
              </button>
            ))}
          </div>

          {/* Username */}
          <div style={{marginBottom:16}}>
            {label("USERNAME")}
            <input type="text" value={aForm.username} placeholder="e.g. arjun_99"
              onChange={e=>setAForm(p=>({...p,username:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&(isUp?doSignUp():doSignIn())}
              style={inputStyle()} />
          </div>

          {/* Password */}
          <div style={{marginBottom:isUp?16:24}}>
            {label("PASSWORD")}
            <div style={{position:"relative"}}>
              <input type={showPw.password?"text":"password"} value={aForm.password}
                placeholder="Minimum 6 characters"
                onChange={e=>setAForm(p=>({...p,password:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&(isUp?doSignUp():doSignIn())}
                style={inputStyle({paddingRight:48})} />
              <EyeBtn field="password" />
            </div>
          </div>

          {/* Confirm */}
          {isUp && (
            <div style={{marginBottom:24}}>
              {label("CONFIRM PASSWORD")}
              <div style={{position:"relative"}}>
                <input type={showPw.confirm?"text":"password"} value={aForm.confirm}
                  placeholder="Repeat your password"
                  onChange={e=>setAForm(p=>({...p,confirm:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&doSignUp()}
                  style={inputStyle({paddingRight:48})} />
                <EyeBtn field="confirm" />
              </div>
            </div>
          )}

          {/* Error */}
          {aError && (
            <div style={{padding:"12px 16px",borderRadius:12,marginBottom:12,
              background:`${T.a4}12`,border:`1px solid ${T.a4}35`,animation:"fadeIn .2s ease"}}>
              <div style={{color:T.a4,fontWeight:600,fontSize:13}}>⚠ {aError}</div>
            </div>
          )}

          {/* Info / progress */}
          {aInfo && (
            <div style={{padding:"10px 16px",borderRadius:12,marginBottom:12,
              background:`${T.a3}10`,border:`1px solid ${T.a3}25`,animation:"fadeIn .2s ease"}}>
              <div style={{color:T.a3,fontSize:12,fontWeight:500}}>ℹ {aInfo}</div>
            </div>
          )}

          {/* Submit */}
          <button onClick={isUp?doSignUp:doSignIn} disabled={aLoading} style={{
            width:"100%",padding:"15px",borderRadius:13,border:"none",
            cursor:aLoading?"not-allowed":"pointer",
            background:aLoading?T.input:T.grad,
            color:aLoading?T.muted:"#fff",
            fontWeight:700,fontSize:15,fontFamily:"'DM Sans',sans-serif",letterSpacing:.3,
            boxShadow:aLoading?"none":`0 6px 24px ${T.glow}`,transition:"all .22s",
            display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {aLoading && <div style={{width:15,height:15,borderRadius:"50%",
              border:`2px solid ${T.muted}`,borderTopColor:"transparent",animation:"spin .7s linear infinite"}} />}
            {aLoading?"Please wait…":isUp?"Create Account →":"Sign In →"}
          </button>

          <p style={{textAlign:"center",marginTop:20,fontSize:13,color:T.muted,lineHeight:1.6}}>
            {isUp?"Already registered? ":"Don't have an account? "}
            <span onClick={()=>{setAuthMode(isUp?"signin":"signup");setAError("");setAInfo("");}}
              style={{color:T.a1,fontWeight:600,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}}>
              {isUp?"Sign In here":"Create one free"}
            </span>
          </p>
        </div>

        <p style={{marginTop:18,fontSize:11,color:T.muted,zIndex:10,textAlign:"center",letterSpacing:.3,animation:"fadeIn .8s ease .3s both"}}>
          Secure · Private · Per-account data storage
        </p>

        {toast && <Toast T={T} toast={toast} />}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════ MAIN APP ══════════ */
  const greet = now.getHours()<12?"Morning":now.getHours()<17?"Afternoon":"Evening";
  const TABS = [
    {id:"home",     ico:"⌂",  label:"Home"},
    {id:"add",      ico:"+",  label:"Add"},
    {id:"charts",   ico:"↗",  label:"Charts"},
    {id:"budget",   ico:"◎",  label:"Budget"},
    {id:"settings", ico:"⚙",  label:"More"},
  ];

  /* ─── HOME ──────────────────────────────────────────────────────────── */
  const HomeView = () => (
    <div style={{padding:"0 16px 124px"}}>

      {/* Hero card */}
      <div style={{...card({background:T.gradSoft,borderColor:T.border,marginBottom:12,
        padding:"22px 22px 20px",position:"relative",overflow:"hidden"})}}>
        <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",
          background:`radial-gradient(circle,${T.a1}18,transparent)`}} />
        <div style={{fontSize:12,color:T.sub,fontWeight:500,marginBottom:6,letterSpacing:.3}}>
          {now.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}
        </div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:44,letterSpacing:-1,lineHeight:1.05,
          background:isOver?T.a4:T.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
          {fmt(total)}
        </div>
        <div style={{fontSize:12,color:T.muted,marginTop:4,fontWeight:400}}>total expenditure this month</div>

        <div style={{marginTop:18}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
            <span style={{fontSize:12,color:T.muted}}>Monthly budget: {fmt(target)}</span>
            <span style={{fontSize:13,fontWeight:700,color:isOver?T.a4:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>{pct.toFixed(1)}%</span>
          </div>
          <div style={{height:7,borderRadius:99,background:isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.07)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,borderRadius:99,transition:"width .7s ease",
              background:isOver?T.a4:T.grad,
              boxShadow:`0 0 10px ${isOver?T.a4:T.a1}44`}} />
          </div>
        </div>

        {isOver && (
          <div style={{marginTop:14,padding:"10px 14px",borderRadius:12,
            background:`${T.a4}12`,border:`1px solid ${T.a4}35`,
            display:"flex",alignItems:"center",gap:8}}>
            <span style={{color:T.a4,fontSize:16}}>⚠</span>
            <div>
              <div style={{color:T.a4,fontWeight:600,fontSize:13}}>Budget Exceeded</div>
              <div style={{color:T.a4,fontSize:12,opacity:.8}}>Overspent by {fmt(total-target)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
        {[
          {l:"UPI",  v:upiAmt,  c:T.upi,  ico:"💳"},
          {l:"Cash", v:cashAmt, c:T.cash, ico:"💵"},
          {l:isOver?"Overrun":"Remaining",v:Math.abs(target-total),c:isOver?T.a4:T.a1,ico:isOver?"↑":"↓",p:isOver?"+":""},
        ].map(s=>(
          <div key={s.l} style={{...card({padding:"14px 10px",textAlign:"center"})}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:6}}>{s.ico} {s.l}</div>
            <div style={{fontWeight:700,fontSize:14,color:s.c,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.1}}>
              {s.p}{fmt(s.v)}
            </div>
          </div>
        ))}
      </div>

      {/* Category row */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:16,scrollbarWidth:"none"}}>
        {catData.map(c=>(
          <div key={c.name} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",
            gap:5,padding:"10px 13px",borderRadius:14,background:`${c.color}12`,border:`1px solid ${c.color}25`}}>
            <span style={{fontSize:17}}>{c.emoji}</span>
            <span style={{fontSize:10,color:c.color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.spent)}</span>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontWeight:700,fontSize:16,color:T.text,fontFamily:"'DM Serif Display',serif"}}>Recent Transactions</span>
        <span style={{fontSize:12,color:T.a1,fontWeight:500}}>{thisMonth.length} this month</span>
      </div>

      {expenses.slice(0,30).map(e=>{
        const cat=getCat(e.category); const d=new Date(e.date);
        return (
          <div key={e.id} style={{...card({marginBottom:8,display:"flex",alignItems:"center",gap:14,
            padding:"13px 16px",transition:"all .18s ease",cursor:"default"})}}
            onMouseEnter={el=>{el.currentTarget.style.background=T.cardHvr;el.currentTarget.style.transform="translateX(4px)";}}
            onMouseLeave={el=>{el.currentTarget.style.background=T.card;el.currentTarget.style.transform="translateX(0)";}}>
            <div style={{width:42,height:42,borderRadius:12,flexShrink:0,
              background:`${cat.color}15`,border:`1px solid ${cat.color}28`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>
              {cat.emoji}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:14,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.description}</div>
              <div style={{fontSize:11,color:T.muted,display:"flex",gap:6,marginTop:3}}>
                <span>{e.category}</span><span>·</span>
                <span>{d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:T.text}}>−{fmt(e.amount)}</div>
              <span style={{display:"inline-block",fontSize:10,fontWeight:600,padding:"2px 9px",borderRadius:99,marginTop:4,
                background:e.type==="UPI"?`${T.upi}16`:`${T.cash}14`,
                color:e.type==="UPI"?T.upi:T.cash}}>
                {e.type}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ─── ADD ───────────────────────────────────────────────────────────── */
  const AddView = () => (
    <div style={{padding:"0 16px 124px"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>New Expense</div>

      <div style={{...card({marginBottom:12,padding:"20px"})}}>
        {label("AMOUNT (₹)")}
        <input value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}
          type="number" placeholder="0"
          style={{width:"100%",background:"none",border:"none",outline:"none",fontSize:48,fontWeight:800,
            letterSpacing:-2,color:T.a1,fontFamily:"'JetBrains Mono',monospace",boxSizing:"border-box"}} />
      </div>

      <div style={{...card({marginBottom:12})}}>
        {label("PAYMENT METHOD")}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{t:"UPI",l:"UPI Transfer",c:T.upi,ico:"💳"},{t:"Cash",l:"Cash Payment",c:T.cash,ico:"💵"}].map(({t,l,c,ico})=>(
            <button key={t} onClick={()=>setForm(p=>({...p,type:t}))} style={{
              padding:"14px",borderRadius:13,cursor:"pointer",textAlign:"left",transition:"all .2s",
              border:`1.5px solid ${form.type===t?c:T.bdrSub}`,
              background:form.type===t?`${c}12`:"transparent",
              boxShadow:form.type===t?`0 2px 12px ${c}28`:"none"}}>
              <div style={{fontSize:20,marginBottom:6}}>{ico}</div>
              <div style={{fontWeight:600,color:form.type===t?c:T.muted,fontSize:14,fontFamily:"'DM Sans',sans-serif"}}>{l}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{...card({marginBottom:12})}}>
        {label("CATEGORY")}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {CATS.map(c=>(
            <button key={c.name} onClick={()=>setForm(p=>({...p,category:c.name}))} style={{
              padding:"12px 4px",borderRadius:13,cursor:"pointer",transition:"all .2s",
              border:`1.5px solid ${form.category===c.name?c.color:T.bdrSub}`,
              background:form.category===c.name?`${c.color}14`:"transparent",
              display:"flex",flexDirection:"column",alignItems:"center",gap:5,
              boxShadow:form.category===c.name?`0 2px 10px ${c.color}22`:"none"}}>
              <span style={{fontSize:18}}>{c.emoji}</span>
              <span style={{fontSize:9,fontWeight:600,color:form.category===c.name?c.color:T.muted,fontFamily:"'DM Sans',sans-serif"}}>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{...card({marginBottom:12})}}>
        {label("DESCRIPTION")}
        <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
          placeholder="Brief description of the expense"
          style={{width:"100%",background:"none",border:"none",outline:"none",
            borderBottom:`1.5px solid ${T.bdrSub}`,paddingBottom:9,color:T.text,
            fontSize:15,fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box",marginBottom:18}} />
        {label("DATE")}
        <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}
          style={{background:"none",border:"none",outline:"none",borderBottom:`1.5px solid ${T.bdrSub}`,
            paddingBottom:6,color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",colorScheme:isDark?"dark":"light"}} />
      </div>

      {/* Voice */}
      <div style={{...card({marginBottom:16})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontWeight:600,color:T.text,fontSize:15}}>Voice Input</div>
            <div style={{fontSize:12,color:T.muted,marginTop:2}}>Speak in any language — AI transcribes to English</div>
          </div>
          <select value={voiceLang} onChange={e=>setVoiceLang(e.target.value)}
            style={{background:T.input,border:`1px solid ${T.border}`,borderRadius:9,
              color:T.text,padding:"6px 10px",fontSize:12,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",outline:"none"}}>
            {LANGS.map(l=>(<option key={l.value} value={l.value}>{l.label}</option>))}
          </select>
        </div>
        <button onClick={listening?()=>recRef.current?.stop():startVoice} style={{
          width:"100%",padding:"13px",borderRadius:12,cursor:"pointer",transition:"all .25s",
          border:`1.5px solid ${listening?T.a4:T.border}`,
          background:listening?`${T.a4}10`:`${T.a1}08`,
          color:listening?T.a4:T.a1,fontWeight:600,fontSize:14,
          fontFamily:"'DM Sans',sans-serif",
          display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <span style={{fontSize:20,animation:listening?"pulse 1s infinite":"none"}}>{listening?"⏹":"🎙"}</span>
          {vLoad?"Processing voice input…":listening?"Tap to stop recording":"Start recording"}
        </button>
        {voiceText&&(<div style={{marginTop:10,padding:"9px 12px",borderRadius:10,
          background:isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.04)",
          fontSize:13,color:T.muted,fontStyle:"italic",lineHeight:1.5}}>"{voiceText}"</div>)}
      </div>

      <button onClick={addExpense} style={{
        width:"100%",padding:16,borderRadius:14,border:"none",cursor:"pointer",
        background:T.grad,color:"#fff",fontWeight:700,fontSize:16,
        fontFamily:"'DM Sans',sans-serif",letterSpacing:.3,
        boxShadow:`0 6px 28px ${T.glow}`,transition:"all .22s"}}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 10px 36px ${T.glow}`;}}
        onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 6px 28px ${T.glow}`;}}>
        Save Expense
      </button>
    </div>
  );

  /* ─── CHARTS ────────────────────────────────────────────────────────── */
  const ChartsView = () => {
    const pieD=catData.filter(c=>c.spent>0).map(c=>({name:c.name,value:c.spent,color:c.color}));
    const pieT=pieD.reduce((s,p)=>s+p.value,0);
    return (
      <div style={{padding:"0 16px 124px"}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>Analytics</div>

        <div style={{...card({marginBottom:14,display:"flex",padding:5,gap:4})}}>
          {[{v:"day",l:"Past 7 Days"},{v:"month",l:"6 Months"},{v:"year",l:"3 Years"}].map(({v,l})=>(
            <button key={v} onClick={()=>setPeriod(v)} style={{
              flex:1,padding:"10px 4px",borderRadius:11,border:"none",cursor:"pointer",transition:"all .22s",
              background:period===v?T.grad:"transparent",color:period===v?"#fff":T.muted,
              fontWeight:600,fontSize:12,fontFamily:"'DM Sans',sans-serif",
              boxShadow:period===v?`0 2px 10px ${T.glow}`:"none"}}>
              {l}
            </button>
          ))}
        </div>

        <div style={{...card({marginBottom:14})}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontWeight:600,color:T.text,fontSize:15,fontFamily:"'DM Serif Display',serif"}}>UPI vs Cash</div>
            <div style={{display:"flex",gap:12}}>
              {[{l:"UPI",c:T.upi},{l:"Cash",c:T.cash}].map(x=>(<div key={x.l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.muted}}><div style={{width:10,height:4,borderRadius:2,background:x.c}} />{x.l}</div>))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{top:0,right:0,left:-22,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.06)"} />
              <XAxis dataKey="label" tick={{fill:T.muted,fontSize:11,fontFamily:"DM Sans"}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:T.muted,fontSize:10,fontFamily:"DM Sans"}} axisLine={false} tickLine={false} tickFormatter={v=>v>999?(v/1000).toFixed(1)+"k":v} />
              <Tooltip content={<CTip />} />
              <Bar dataKey="UPI"  fill={T.upi}  radius={[6,6,0,0]} />
              <Bar dataKey="Cash" fill={T.cash} radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{...card({marginBottom:14})}}>
          <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:16,fontFamily:"'DM Serif Display',serif"}}>Spending Trend</div>
          <ResponsiveContainer width="100%" height={170}>
            <LineChart data={chartData} margin={{top:0,right:0,left:-22,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.06)"} />
              <XAxis dataKey="label" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>999?(v/1000).toFixed(1)+"k":v} />
              <Tooltip content={<CTip />} />
              <Line type="monotone" dataKey="UPI"  stroke={T.upi}  strokeWidth={2.5} dot={{fill:T.upi, r:4,strokeWidth:0}} activeDot={{r:7,strokeWidth:0}} />
              <Line type="monotone" dataKey="Cash" stroke={T.cash} strokeWidth={2.5} dot={{fill:T.cash,r:4,strokeWidth:0}} activeDot={{r:7,strokeWidth:0}} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{...card({marginBottom:14})}}>
          <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:16,fontFamily:"'DM Serif Display',serif"}}>Category Distribution</div>
          {pieD.length>0?(
            <div style={{display:"flex",gap:18,alignItems:"center"}}>
              <div style={{position:"relative",flexShrink:0}}>
                <PieChart width={130} height={130}>
                  <Pie data={pieD} cx={60} cy={60} innerRadius={36} outerRadius={56} dataKey="value" paddingAngle={3}>
                    {pieD.map((d,i)=>(<Cell key={i} fill={d.color} />))}
                  </Pie>
                </PieChart>
                <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}}>
                  <div style={{fontSize:9,color:T.muted}}>Total</div>
                  <div style={{fontSize:11,fontWeight:700,color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(pieT)}</div>
                </div>
              </div>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
                {pieD.map(d=>(<div key={d.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:d.color}} />
                    <span style={{fontSize:12,color:T.muted}}>{d.name}</span>
                  </div>
                  <div>
                    <span style={{fontSize:12,fontWeight:600,color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.value)}</span>
                    <span style={{fontSize:10,color:T.muted,marginLeft:5}}>{((d.value/pieT)*100).toFixed(0)}%</span>
                  </div>
                </div>))}
              </div>
            </div>
          ):(<div style={{color:T.muted,textAlign:"center",padding:"28px 0",fontSize:13}}>No transactions yet this period.</div>)}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{l:"UPI Total",  cnt:thisMonth.filter(e=>e.type==="UPI").length,  amt:upiAmt, c:T.upi},
            {l:"Cash Total", cnt:thisMonth.filter(e=>e.type==="Cash").length, amt:cashAmt,c:T.cash}].map(s=>(
            <div key={s.l} style={{...card({textAlign:"center",padding:"18px 12px"})}}>
              <div style={{fontSize:11,color:T.muted,marginBottom:7}}>{s.l}</div>
              <div style={{fontWeight:700,fontSize:20,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(s.amt)}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:5}}>{s.cnt} transactions</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ─── BUDGET ────────────────────────────────────────────────────────── */
  const BudgetView = () => {
    const [lt,setLt]=useState(String(target));
    const [lb,setLb]=useState({...budgets});
    const over=catData.filter(c=>c.spent>c.budget&&c.budget>0);
    return (
      <div style={{padding:"0 16px 124px"}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>Budget Control</div>

        {over.length>0&&(
          <div style={{...card({marginBottom:14,borderColor:`${T.a4}30`,background:`${T.a4}07`,padding:"16px 18px"})}}>
            <div style={{fontWeight:600,color:T.a4,marginBottom:10,fontSize:14,display:"flex",alignItems:"center",gap:6}}>
              <span>⚠</span> Over budget in {over.length} {over.length===1?"category":"categories"}
            </div>
            {over.map(c=>(<div key={c.name} style={{display:"flex",justifyContent:"space-between",
              fontSize:13,color:T.sub,marginBottom:6,alignItems:"center",paddingLeft:8,
              borderLeft:`2px solid ${T.a4}40`}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}><span>{c.emoji}</span><span>{c.name}</span></div>
              <span style={{color:T.a4,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>+{fmt(c.spent-c.budget)}</span>
            </div>))}
          </div>
        )}

        <div style={{...card({marginBottom:14,background:T.gradSoft,borderColor:T.border})}}>
          <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:12,fontWeight:600}}>MONTHLY BUDGET TARGET</div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <span style={{fontFamily:"'DM Serif Display',serif",fontSize:28,color:T.sub}}>₹</span>
            <input value={lt} onChange={e=>setLt(e.target.value)} type="number"
              style={{flex:1,background:"none",border:"none",outline:"none",
                borderBottom:`2px solid ${T.border}`,paddingBottom:4,
                fontSize:36,fontWeight:700,color:T.a1,letterSpacing:-1,
                fontFamily:"'JetBrains Mono',monospace"}} />
            <button onClick={()=>{const v=parseFloat(lt);if(v>0){saveTarget(v);showToast("Budget target updated.");}}}
              style={{padding:"10px 20px",borderRadius:11,border:"none",cursor:"pointer",
                background:T.grad,color:"#fff",fontWeight:600,fontFamily:"'DM Sans',sans-serif",
                fontSize:14,boxShadow:`0 4px 14px ${T.glow}`}}>Update</button>
          </div>
          <div style={{height:7,borderRadius:99,background:isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.07)",overflow:"hidden",marginBottom:9}}>
            <div style={{height:"100%",width:`${pct}%`,borderRadius:99,background:isOver?T.a4:T.grad,transition:"width .7s ease"}} />
          </div>
          <div style={{fontSize:13,color:isOver?T.a4:T.muted}}>
            {isOver?`Over budget by ${fmt(total-target)}`:`${fmt(target-total)} remaining — ${(100-pct).toFixed(0)}% available`}
          </div>
        </div>

        <div style={{fontSize:15,fontWeight:600,color:T.text,marginBottom:12,fontFamily:"'DM Serif Display',serif"}}>Category Budgets</div>
        {CATS.map(cat=>{
          const s=catData.find(c=>c.name===cat.name)||{spent:0};
          const bv=parseFloat(lb[cat.name])||0;
          const cp=bv>0?Math.min((s.spent/bv)*100,100):0;
          const co=bv>0&&s.spent>bv;
          return (
            <div key={cat.name} style={{...card({marginBottom:10,padding:"15px 18px"})}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18}}>{cat.emoji}</span>
                  <span style={{fontWeight:600,color:T.text,fontSize:14}}>{cat.name}</span>
                  {co&&<span style={{fontSize:10,padding:"2px 8px",borderRadius:99,
                    background:`${T.a4}15`,color:T.a4,fontWeight:600,letterSpacing:.3}}>EXCEEDED</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(s.spent)} /</span>
                  <input value={lb[cat.name]} type="number"
                    onChange={e=>setLb(p=>({...p,[cat.name]:e.target.value}))}
                    onBlur={()=>{const v=parseFloat(lb[cat.name]);if(v>=0)saveBudgets({...budgets,[cat.name]:v});}}
                    style={{width:72,background:"none",border:"none",outline:"none",
                      borderBottom:`1.5px solid ${cat.color}50`,paddingBottom:2,
                      color:cat.color,fontWeight:700,fontSize:13,textAlign:"right",
                      fontFamily:"'JetBrains Mono',monospace"}} />
                </div>
              </div>
              <div style={{height:5,borderRadius:99,background:isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${cp}%`,borderRadius:99,transition:"width .5s ease",background:co?T.a4:cat.color}} />
              </div>
              {bv>0&&<div style={{fontSize:10,color:T.muted,marginTop:6,textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{cp.toFixed(0)}% utilised</div>}
            </div>
          );
        })}
      </div>
    );
  };

  /* ─── SETTINGS ──────────────────────────────────────────────────────── */
  const SettingsView = () => (
    <div style={{padding:"0 16px 124px"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>Settings</div>

      {/* Profile */}
      <div style={{...card({marginBottom:14,background:T.gradSoft,borderColor:T.border,padding:"20px 22px"})}}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{width:54,height:54,borderRadius:"50%",flexShrink:0,background:T.grad,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#fff",
            boxShadow:`0 4px 18px ${T.glow}`}}>
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:T.text}}>{user.username}</div>
            <div style={{fontSize:12,color:T.muted,marginTop:3}}>
              {expenses.length} expenses · {fmt(expenses.reduce((s,e)=>s+e.amount,0))} total
            </div>
          </div>
        </div>
      </div>

      {/* Dark / Light */}
      <div style={{...card({marginBottom:14,padding:"20px 22px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:16,fontFamily:"'DM Serif Display',serif"}}>Display Mode</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[{m:true,l:"Dark",d:"Deep slate, warm gold",ico:"🌙"},{m:false,l:"Light",d:"Ivory, gold & teal",ico:"☀"}].map(({m,l,d,ico})=>(
            <button key={String(m)} onClick={()=>{setIsDark(m);if(user)persist(user.username,expenses,budgets,target,m);}} style={{
              padding:"18px 14px",borderRadius:14,cursor:"pointer",textAlign:"left",transition:"all .22s",
              border:`1.5px solid ${isDark===m?T.a1:T.bdrSub}`,
              background:isDark===m?T.gradSoft:"transparent",
              boxShadow:isDark===m?`0 4px 18px ${T.glow}`:"none"}}>
              <div style={{fontSize:22,marginBottom:8}}>{ico}</div>
              <div style={{fontWeight:600,color:isDark===m?T.a1:T.text,fontSize:14}}>{l}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:3,lineHeight:1.4}}>{d}</div>
              {isDark===m&&<div style={{fontSize:10,color:T.a1,marginTop:8,fontWeight:700,letterSpacing:.5}}>● ACTIVE</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Theme info */}
      <div style={{...card({marginBottom:14,padding:"20px 22px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>Executive Theme</div>
        <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
          {[T.a1,T.a3,T.a5,T.a4,...CATS.map(c=>c.color)].slice(0,9).map((c,i)=>(
            <div key={i} style={{width:26,height:26,borderRadius:7,background:c,boxShadow:`0 2px 8px ${c}40`}} />
          ))}
        </div>
        <div style={{fontSize:13,color:T.muted,lineHeight:1.65}}>
          A refined, formal palette — warm gold as the primary accent, teal as the complement, on a deep slate or ivory base. Designed for clarity and professionalism.
        </div>
      </div>

      {/* Stats */}
      <div style={{...card({marginBottom:16,padding:"20px 22px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>Account Summary</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            {l:"All-time Spend", v:fmt(expenses.reduce((s,e)=>s+e.amount,0)),s:"rupees"},
            {l:"This Month",     v:fmt(total),s:"spent"},
            {l:"Transactions",   v:expenses.length,s:"recorded"},
            {l:"Avg per Entry",  v:expenses.length?fmt(Math.round(expenses.reduce((s,e)=>s+e.amount,0)/expenses.length)):"₹0",s:"average"},
          ].map(s=>(
            <div key={s.l} style={{padding:"14px",borderRadius:12,background:T.input,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:10,color:T.muted,marginBottom:6,fontWeight:600,letterSpacing:.5}}>{s.l.toUpperCase()}</div>
              <div style={{fontWeight:700,color:T.a1,fontFamily:"'JetBrains Mono',monospace",fontSize:15}}>{s.v}</div>
              <div style={{fontSize:10,color:T.muted,marginTop:3}}>{s.s}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={doSignOut} style={{
        width:"100%",padding:"15px",borderRadius:13,cursor:"pointer",
        border:`1.5px solid ${T.a4}35`,background:`${T.a4}08`,
        color:T.a4,fontWeight:600,fontSize:15,fontFamily:"'DM Sans',sans-serif",
        letterSpacing:.3,transition:"all .2s"}}
        onMouseEnter={e=>{e.currentTarget.style.background=`${T.a4}14`;}}
        onMouseLeave={e=>{e.currentTarget.style.background=`${T.a4}08`;}}>
        Sign Out
      </button>
    </div>
  );

  /* ─── SHELL ─────────────────────────────────────────────────────────── */
  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'DM Sans',sans-serif",
      position:"relative",maxWidth:430,margin:"0 auto",overflowX:"hidden",transition:"background .3s,color .3s"}}>
      <style>{css}</style>

      {/* Ambient bg */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-5%",right:"-10%",width:320,height:320,borderRadius:"50%",
          background:`radial-gradient(circle,${T.a1}${isDark?"10":"06"},transparent)`}} />
        <div style={{position:"absolute",bottom:"10%",left:"-8%",width:260,height:260,borderRadius:"50%",
          background:`radial-gradient(circle,${T.a3}${isDark?"08":"05"},transparent)`}} />
      </div>

      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:60,backdropFilter:"blur(28px)",
        WebkitBackdropFilter:"blur(28px)",background:T.header,
        borderBottom:`1px solid ${T.divider}`,padding:"14px 18px 13px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:T.muted,letterSpacing:.3}}>
              {now.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
            </div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,
              background:T.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.3}}>
              {user.username}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <button onClick={toggleMode} style={{
              width:36,height:36,borderRadius:"50%",border:`1px solid ${T.border}`,
              background:T.card,backdropFilter:"blur(12px)",cursor:"pointer",
              fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",
              transition:"all .22s",boxShadow:`0 2px 8px ${T.glow}`,color:T.text}}>
              {isDark?"☀":"🌙"}
            </button>
            <div style={{padding:"5px 12px",borderRadius:99,fontSize:11,fontWeight:600,
              background:isOver?`${T.a4}16`:`${T.a1}14`,color:isOver?T.a4:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>
              {isOver?`−${fmt(total-target)}`:`${fmt(target-total)} left`}
            </div>
          </div>
        </div>
      </div>

      {/* Page */}
      <div style={{position:"relative",zIndex:1,paddingTop:16,animation:"slideUp .3s ease"}} key={tab}>
        {tab==="home"    &&<HomeView/>}
        {tab==="add"     &&<AddView/>}
        {tab==="charts"  &&<ChartsView/>}
        {tab==="budget"  &&<BudgetView/>}
        {tab==="settings"&&<SettingsView/>}
      </div>

      {/* Bottom nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:430,zIndex:100,backdropFilter:"blur(28px)",
        WebkitBackdropFilter:"blur(28px)",background:T.nav,
        borderTop:`1px solid ${T.divider}`,padding:"10px 6px 26px"}}>
        <div style={{display:"flex",justifyContent:"space-around",alignItems:"flex-end"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",
              gap:4,border:"none",background:"none",cursor:"pointer",
              padding:"4px 2px",borderRadius:12,position:"relative",transition:"all .2s"}}>
              {t.id==="add"?(
                <div style={{width:52,height:52,borderRadius:"50%",marginTop:-22,
                  background:tab==="add"?T.grad:`linear-gradient(135deg,${T.a1}50,${T.a3}50)`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:26,fontWeight:900,color:"#fff",
                  boxShadow:tab==="add"?`0 6px 28px ${T.glow}`:`0 4px 16px ${T.glow}55`,
                  border:`2px solid ${tab==="add"?"transparent":T.border}`,transition:"all .25s"}}>
                  {t.ico}
                </div>
              ):(
                <>
                  <span style={{fontSize:18,filter:tab===t.id?"none":"grayscale(1) opacity(.38)",transition:"filter .2s"}}>{t.ico}</span>
                  <span style={{fontSize:10,fontWeight:600,color:tab===t.id?T.a1:T.muted,
                    fontFamily:"'DM Sans',sans-serif",transition:"color .2s"}}>{t.label}</span>
                  {tab===t.id&&(
                    <div style={{position:"absolute",bottom:0,width:20,height:2.5,
                      borderRadius:99,background:T.grad}} />
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {toast&&<Toast T={T} toast={toast}/>}
    </div>
  );
}

function Toast({T,toast}) {
  const cfg = {
    ok:   {bg:T.a1,     text:"#fff"},
    warn: {bg:"#f59e0b", text:"#1a1000"},
    err:  {bg:T.a4,     text:"#fff"},
  }[toast.type]||{bg:T.a1,text:"#fff"};
  return (
    <div style={{position:"fixed",top:78,left:"50%",zIndex:9999,
      padding:"12px 22px",borderRadius:12,whiteSpace:"nowrap",
      fontWeight:600,fontSize:14,fontFamily:"'DM Sans',sans-serif",
      background:cfg.bg,color:cfg.text,animation:"toastSlide .25s ease",
      boxShadow:`0 6px 28px ${cfg.bg}55`,transform:"translateX(-50%)"}}>
      {toast.msg}
    </div>
  );
}
