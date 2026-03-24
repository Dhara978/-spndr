import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

/* ── SUPABASE ───────────────────────────────────────────────────────────── */
const supabase = createClient(
  "https://zoydiohcruujgnstjmud.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpveWRpb2hjcnV1amduc3RqbXVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjA0NjMsImV4cCI6MjA4OTc5NjQ2M30.8SA5zAdNYkzSIdwhfS58l0TMF2H5U-b9GxfGSWxhRVo"
);
const sGet = async (key) => {
  try {
    const { data } = await supabase.from("spndr_store").select("value").eq("key", key).single();
    return data ? { value: data.value } : null;
  } catch { return null; }
};
const sSet = async (key, value) => {
  try { await supabase.from("spndr_store").upsert({ key, value }, { onConflict: "key" }); }
  catch (e) { throw new Error(e.message); }
};

/* ── HELPERS ────────────────────────────────────────────────────────────── */
const hashPw   = s => { let h=5381; for(let c of s) h=(h*33)^c.charCodeAt(0); return (h>>>0).toString(36); };
const fmt      = n => `₹${Number(n).toLocaleString("en-IN")}`;
const getCat   = n => CATS.find(c=>c.name===n) || CATS[7];
const todayStr = () => new Date().toISOString().split("T")[0];
const monthKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
const monthLabel = (key) => {
  const [y,m] = key.split("-");
  return new Date(parseInt(y), parseInt(m)-1, 1).toLocaleDateString("en-IN",{month:"long",year:"numeric"});
};

/* ── THEME ──────────────────────────────────────────────────────────────── */
const DARK = {
  bg:"#0b0f1a", card:"rgba(255,255,255,.055)", cardHvr:"rgba(255,255,255,.09)",
  header:"rgba(11,15,26,.92)", nav:"rgba(11,15,26,.97)",
  input:"rgba(255,255,255,.07)", inputBdr:"rgba(212,168,83,.4)",
  text:"#eef0f6", sub:"#9ba3b8", muted:"#4b5468",
  a1:"#d4a853", a3:"#2dd4bf", a4:"#f87171",
  upi:"#818cf8", cash:"#2dd4bf",
  grad:"linear-gradient(135deg,#d4a853,#2dd4bf)",
  gradSoft:"linear-gradient(135deg,rgba(212,168,83,.18),rgba(45,212,191,.12))",
  border:"rgba(212,168,83,.2)", bdrSub:"rgba(255,255,255,.08)",
  glow:"rgba(212,168,83,.25)", divider:"rgba(255,255,255,.07)",
  gridLine:"rgba(255,255,255,.06)", isDark:true,
};
const LIGHT = {
  bg:"#f7f6f2", card:"rgba(255,255,255,.94)", cardHvr:"rgba(255,255,255,1)",
  header:"rgba(247,246,242,.96)", nav:"rgba(247,246,242,.98)",
  input:"rgba(0,0,0,.045)", inputBdr:"rgba(139,101,30,.4)",
  text:"#0f1626", sub:"#3d4a61", muted:"#8a94a6",
  a1:"#b8860b", a3:"#0d9488", a4:"#dc2626",
  upi:"#4f46e5", cash:"#0d9488",
  grad:"linear-gradient(135deg,#b8860b,#0d9488)",
  gradSoft:"linear-gradient(135deg,rgba(184,134,11,.11),rgba(13,148,136,.08))",
  border:"rgba(184,134,11,.2)", bdrSub:"rgba(0,0,0,.09)",
  glow:"rgba(184,134,11,.2)", divider:"rgba(0,0,0,.08)",
  gridLine:"rgba(0,0,0,.07)", isDark:false,
};

/* ── DATA ───────────────────────────────────────────────────────────────── */
const CATS = [
  {name:"Food",          emoji:"🍽", color:"#f97316"},
  {name:"Transport",     emoji:"🚇", color:"#0ea5e9"},
  {name:"Shopping",      emoji:"🛒", color:"#8b5cf6"},
  {name:"Entertainment", emoji:"🎬", color:"#ec4899"},
  {name:"Health",        emoji:"🏥", color:"#10b981"},
  {name:"Bills",         emoji:"📋", color:"#f59e0b"},
  {name:"Education",     emoji:"🎓", color:"#3b82f6"},
  {name:"Other",         emoji:"📌", color:"#6b7280"},
];
const LANGS = [
  {label:"English",  value:"en-US"},{label:"Hindi",   value:"hi-IN"},
  {label:"Gujarati", value:"gu-IN"},{label:"Tamil",   value:"ta-IN"},
  {label:"Telugu",   value:"te-IN"},{label:"Marathi", value:"mr-IN"},
  {label:"Bengali",  value:"bn-IN"},
];
const DEF_BUDGETS = {Food:0,Transport:0,Shopping:0,Entertainment:0,Health:0,Bills:0,Education:0,Other:0};
const PRESETS = [3000,5000,8000,10000,15000,20000,25000,30000,50000];
const CAT_KEYWORDS = {
  Food:["food","eat","lunch","dinner","breakfast","restaurant","cafe","coffee","snack","grocery","khana","nashta","chai","sabji","fruits","vegetable","bhojan","khaanu","jamu","roti","dal","rice","doodh","milk","pizza","burger","biryani","thali","sweets","farsan","dhokla","juice","nasta","naasto"],
  Transport:["transport","travel","auto","cab","taxi","uber","ola","bus","train","metro","petrol","diesel","fuel","rickshaw","bike","ticket","fare","vasvu","pravas","gaadi","car","scooter","railway","flight","toll","parking","fastag","rikshaw"],
  Shopping:["shopping","clothes","shirt","pant","dress","shoes","amazon","flipkart","order","buy","purchase","market","bazaar","mall","online","kapda","jota","saree","jewellery","watch","bag","mobile","laptop","kharido","kharid"],
  Entertainment:["movie","cinema","show","concert","game","gaming","netflix","hotstar","youtube","ott","fun","play","masti","tamasha","natak","party","birthday","celebration","spotify","music","cricket","football","match","sports","picnic","trip"],
  Health:["health","medicine","doctor","hospital","clinic","pharmacy","medical","tablet","gym","fitness","checkup","dava","dawai","davakhanu","aushadh","blood","xray","scan","yoga","vitamin","supplement","chemist"],
  Bills:["bill","electricity","wifi","internet","mobile","recharge","phone","water","gas","rent","light","bijli","paani","ghar","dth","cable","broadband","insurance","emi","loan","tax","bijali","vij","pani","society","maintenance"],
  Education:["education","school","college","tuition","course","book","fees","class","study","exam","abhyas","shiksha","coaching","notes","pen","paper","uniform","library","training","skill"],
};

/* ── NOTIFICATION HELPER ────────────────────────────────────────────────── */
const requestNotifPermission = async () => {
  if(!("Notification" in window)) return false;
  if(Notification.permission === "granted") return true;
  if(Notification.permission !== "denied"){
    const perm = await Notification.requestPermission();
    return perm === "granted";
  }
  return false;
};

const sendNotif = (title, body, icon="/icon-192.png") => {
  if(!("Notification" in window)) return;
  if(Notification.permission === "granted"){
    new Notification(title, { body, icon });
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   APP
══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [isDark,     setIsDark]     = useState(true);
  const T = isDark ? DARK : LIGHT;

  /* auth */
  const [user,       setUser]       = useState(null);
  const [authMode,   setAuthMode]   = useState("signin");
  const [aForm,      setAForm]      = useState({username:"",password:"",confirm:""});
  const [showPw,     setShowPw]     = useState({password:false,confirm:false});
  const [aError,     setAError]     = useState("");
  const [aInfo,      setAInfo]      = useState("");
  const [aLoading,   setALoading]   = useState(false);

  /* pin */
  const [pinVal,     setPinVal]     = useState("");
  const [pinInput,   setPinInput]   = useState("");
  const [pinMode,    setPinMode]    = useState("none");
  const [pinError,   setPinError]   = useState("");
  const [locked,     setLocked]     = useState(false);
  const [pinSetup,   setPinSetup]   = useState(false);

  /* data */
  const [tab,        setTab]        = useState("home");
  const [expenses,   setExpenses]   = useState([]);
  const [budgets,    setBudgets]    = useState(DEF_BUDGETS);

  /* monthly targets: { "2026-03": 15000, "2026-04": 20000, ... } */
  const [monthlyTargets, setMonthlyTargets] = useState({});

  /* ui */
  const [form,       setForm]       = useState({amount:"",category:"Food",description:"",type:"UPI",date:todayStr()});
  const [voiceLang,  setVoiceLang]  = useState("en-US");
  const [voiceText,  setVoiceText]  = useState("");
  const [listening,  setListening]  = useState(false);
  const [showVHelp,  setShowVHelp]  = useState(false);
  const [period,     setPeriod]     = useState("month");
  const [toast,      setToast]      = useState(null);
  const [undoEntry,  setUndoEntry]  = useState(null);
  const [exportMode, setExportMode] = useState(false);

  /* in-app overspend alert */
  const [overspendAlert, setOverspendAlert] = useState(null);
  const [notifEnabled,   setNotifEnabled]   = useState(false);

  /* budget tab state — MUST be top-level, not inside BudgetView */
  const [selMonth,      setSelMonth]      = useState(monthKey(new Date()));
  const [budgetInput,   setBudgetInput]   = useState("");
  const [catBudgets,    setCatBudgets]    = useState(DEF_BUDGETS);

  const recRef     = useRef(null);
  const undoTimer  = useRef(null);
  const notifSent  = useRef({}); // track which notifications we already sent this session

  /* ── derived ────────────────────────────────────────────────────────── */
  const now        = new Date();
  const curKey     = monthKey(now);
  const curTarget  = monthlyTargets[curKey] || 0;

  const thisMonth  = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  });
  const total   = thisMonth.reduce((s,e)=>s+e.amount, 0);
  const upiAmt  = thisMonth.filter(e=>e.type==="UPI").reduce((s,e)=>s+e.amount, 0);
  const cashAmt = thisMonth.filter(e=>e.type==="Cash").reduce((s,e)=>s+e.amount, 0);
  const pct     = curTarget>0 ? Math.min((total/curTarget)*100, 100) : 0;
  const isOver  = curTarget>0 && total>curTarget;
  const catData = CATS.map(c=>({
    ...c,
    spent:  thisMonth.filter(e=>e.category===c.name).reduce((s,e)=>s+e.amount, 0),
    budget: budgets[c.name] || 0,
  }));

  /* ── check overspend whenever total changes ─────────────────────────── */
  useEffect(()=>{
    if(!curTarget || curTarget<=0) return;
    const pctNow = (total/curTarget)*100;

    if(pctNow>=100 && !notifSent.current["over"]){
      notifSent.current["over"] = true;
      setOverspendAlert({
        type:"over",
        title:"🔴 Budget Exceeded!",
        msg:`You have spent ${fmt(total)} this month. Your budget was ${fmt(curTarget)}. Overspent by ${fmt(total-curTarget)}.`,
      });
      sendNotif("🔴 Budget Exceeded!", `You have spent ${fmt(total)} this month. Overspent by ${fmt(total-curTarget)}.`);
    } else if(pctNow>=85 && pctNow<100 && !notifSent.current["85"]){
      notifSent.current["85"] = true;
      setOverspendAlert({
        type:"warn",
        title:"⚠️ 85% Budget Used",
        msg:`You have used ${pctNow.toFixed(0)}% of your ${fmt(curTarget)} budget. Only ${fmt(curTarget-total)} remaining this month.`,
      });
      sendNotif("⚠️ Budget Warning", `You've used ${pctNow.toFixed(0)}% of your monthly budget. ${fmt(curTarget-total)} remaining.`);
    } else if(pctNow>=50 && pctNow<85 && !notifSent.current["50"]){
      notifSent.current["50"] = true;
      sendNotif("💡 Budget Update", `Half your monthly budget used. ${fmt(curTarget-total)} remaining.`);
    }
  },[total, curTarget]);

  /* ── PERSIST ────────────────────────────────────────────────────────── */
  const persist = useCallback(async (uname, exps, buds, mTargets, dark, pin) => {
    try {
      await sSet(`vi4:${uname}`, JSON.stringify({
        expenses: exps,
        budgets:  buds,
        monthlyTargets: mTargets,
        dark,
        pin: pin||"",
      }));
    } catch(e){ console.error("persist:", e); }
  },[]);

  /* ── AUTH ───────────────────────────────────────────────────────────── */
  const doSignUp = async () => {
    const {username,password,confirm} = aForm;
    const u = username.trim().toLowerCase();
    setAError(""); setAInfo("");
    if(!u)                      { setAError("Username is required."); return; }
    if(u.length<3)              { setAError("Username must be at least 3 characters."); return; }
    if(!/^[a-z0-9_]+$/.test(u)){ setAError("Only letters, numbers and underscores allowed."); return; }
    if(!password)               { setAError("Password is required."); return; }
    if(password.length<6)       { setAError("Password must be at least 6 characters."); return; }
    if(password!==confirm)      { setAError("Passwords do not match."); return; }
    setALoading(true);
    try {
      setAInfo("Checking availability…");
      const ex = await sGet(`vi4:auth:${u}`);
      if(ex){ setAError("Username already taken."); setAInfo(""); setALoading(false); return; }
      setAInfo("Creating your account…");
      await sSet(`vi4:auth:${u}`, JSON.stringify({username:u, hash:hashPw(password)}));
      await persist(u, [], DEF_BUDGETS, {}, true, "");
      setExpenses([]); setBudgets(DEF_BUDGETS); setCatBudgets(DEF_BUDGETS);
      setMonthlyTargets({});
      setIsDark(true); setPinVal("");
      setAInfo(""); setUser({username:u});
      showToast(`Welcome, ${u}! 🎉`);
    } catch(e){ setAError("Sign up failed."); setAInfo("Detail: "+e.message); }
    setALoading(false);
  };

  const doSignIn = async () => {
    const {username,password} = aForm;
    const u = username.trim().toLowerCase();
    setAError(""); setAInfo("");
    if(!u)       { setAError("Please enter your username."); return; }
    if(!password){ setAError("Please enter your password."); return; }
    setALoading(true);
    try {
      setAInfo("Looking up your account…");
      const authRec = await sGet(`vi4:auth:${u}`);
      if(!authRec){ setAError("No account found. Check spelling or Sign Up."); setALoading(false); return; }
      setAInfo("Verifying password…");
      let auth;
      try { auth = JSON.parse(authRec.value); }
      catch { setAError("Account data corrupted."); setALoading(false); return; }
      if(auth.hash!==hashPw(password)){ setAError("Incorrect password."); setALoading(false); return; }
      setAInfo("Loading your data…");
      const dr = await sGet(`vi4:${u}`);
      if(dr){
        try {
          const d = JSON.parse(dr.value);
          setExpenses(d.expenses||[]);
          setBudgets(d.budgets||DEF_BUDGETS);
          setCatBudgets(d.budgets||DEF_BUDGETS);
          setMonthlyTargets(d.monthlyTargets||{});
          setIsDark(d.dark!==false);
          if(d.pin){ setPinVal(d.pin); setLocked(true); setPinMode("lock"); }
        } catch {
          setExpenses([]); setBudgets(DEF_BUDGETS); setMonthlyTargets({});
        }
      }
      setAInfo(""); setUser({username:u});
      showToast(`Welcome back, ${u}!`);
    } catch(e){ setAError("Sign in failed."); setAInfo("Detail: "+e.message); }
    setALoading(false);
  };

  const doSignOut = () => {
    setUser(null); setExpenses([]); setTab("home");
    setAForm({username:"",password:"",confirm:""}); setAError(""); setAInfo("");
    setShowPw({password:false,confirm:false});
    setPinVal(""); setLocked(false); setPinMode("none"); setPinInput(""); setPinError("");
    notifSent.current = {};
  };

  const toggleMode = async () => {
    const next=!isDark; setIsDark(next);
    if(user) await persist(user.username, expenses, budgets, monthlyTargets, next, pinVal);
  };

  /* ── TOAST ──────────────────────────────────────────────────────────── */
  const showToast = (msg, type="ok") => {
    setToast({msg,type}); setTimeout(()=>setToast(null),3200);
  };

  /* ── SAVE MONTHLY TARGET ─────────────────────────────────────────────── */
  const saveMonthTarget = async (key, amount) => {
    const updated = {...monthlyTargets, [key]: amount};
    setMonthlyTargets(updated);
    if(user) await persist(user.username, expenses, budgets, updated, isDark, pinVal);
    // reset notif tracking for this month when budget changes
    notifSent.current = {};
  };

  const saveBudgets = async v => {
    setBudgets(v);
    if(user) await persist(user.username, expenses, v, monthlyTargets, isDark, pinVal);
  };

  /* ── ADD EXPENSE ─────────────────────────────────────────────────────── */
  const addExpense = async () => {
    const amt = parseFloat(form.amount);
    if(!amt||amt<=0){ showToast("Enter a valid amount.","warn"); return; }
    const entry = {
      id:Date.now(), amount:amt, category:form.category,
      description:form.description||form.category,
      type:form.type, date:new Date(form.date).toISOString(),
    };
    const newExp = [entry,...expenses];
    setExpenses(newExp);
    showToast("Expense recorded.");
    if(user) await persist(user.username, newExp, budgets, monthlyTargets, isDark, pinVal);
    setForm({amount:"",category:"Food",description:"",type:"UPI",date:todayStr()});
    setTab("home");
  };

  /* ── DELETE + UNDO ───────────────────────────────────────────────────── */
  const deleteEntry = async (id) => {
    const entry = expenses.find(e=>e.id===id);
    if(!entry) return;
    const newExp = expenses.filter(e=>e.id!==id);
    setExpenses(newExp);
    if(user) await persist(user.username, newExp, budgets, monthlyTargets, isDark, pinVal);
    if(undoTimer.current) clearTimeout(undoTimer.current);
    setUndoEntry(entry);
    undoTimer.current = setTimeout(()=>setUndoEntry(null),6000);
    showToast("Entry deleted. Tap Undo to restore.","warn");
  };

  const undoDelete = async () => {
    if(!undoEntry) return;
    if(undoTimer.current) clearTimeout(undoTimer.current);
    const newExp = [undoEntry,...expenses].sort((a,b)=>new Date(b.date)-new Date(a.date));
    setExpenses(newExp);
    if(user) await persist(user.username, newExp, budgets, monthlyTargets, isDark, pinVal);
    setUndoEntry(null);
    showToast("Entry restored!");
  };

  /* ── EXPORT CSV ──────────────────────────────────────────────────────── */
  const exportCSV = (range) => {
    const n2=new Date();
    let filtered=[], filename="";
    if(range==="week"){ const w=new Date(n2); w.setDate(w.getDate()-7); filtered=expenses.filter(e=>new Date(e.date)>=w); filename="spndr_week"; }
    else if(range==="month"){ filtered=thisMonth; filename="spndr_"+n2.toLocaleDateString("en",{month:"short",year:"numeric"}).replace(" ","_"); }
    else { filtered=expenses.filter(e=>new Date(e.date).getFullYear()===n2.getFullYear()); filename="spndr_"+n2.getFullYear(); }
    if(!filtered.length){ showToast("No data for this period.","warn"); return; }
    const rows=[["Date","Description","Category","Amount","Payment Type"],...filtered.map(e=>[new Date(e.date).toLocaleDateString("en-IN"),`"${e.description}"`,e.category,e.amount,e.type]),["","","TOTAL",filtered.reduce((s,e)=>s+e.amount,0),""]];
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"}));
    a.download=filename+".csv"; a.click();
    setExportMode(false); showToast(`Exported ${filtered.length} entries!`);
  };

  /* ── CHART DATA ──────────────────────────────────────────────────────── */
  const chartData = (() => {
    if(period==="day") return Array.from({length:7},(_,i)=>{
      const d=new Date(); d.setDate(d.getDate()-(6-i));
      const e=expenses.filter(x=>new Date(x.date).toDateString()===d.toDateString());
      return {name:d.toLocaleDateString("en",{weekday:"short"}),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+x.amount,0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+x.amount,0)};
    });
    if(period==="month") return Array.from({length:6},(_,i)=>{
      const d=new Date(); d.setMonth(d.getMonth()-(5-i));
      const e=expenses.filter(x=>{const xd=new Date(x.date);return xd.getMonth()===d.getMonth()&&xd.getFullYear()===d.getFullYear();});
      return {name:d.toLocaleDateString("en",{month:"short"}),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+x.amount,0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+x.amount,0)};
    });
    return Array.from({length:3},(_,i)=>{
      const yr=now.getFullYear()-(2-i);
      const e=expenses.filter(x=>new Date(x.date).getFullYear()===yr);
      return {name:String(yr),UPI:e.filter(x=>x.type==="UPI").reduce((s,x)=>s+x.amount,0),Cash:e.filter(x=>x.type==="Cash").reduce((s,x)=>s+x.amount,0)};
    });
  })();

  /* ── VOICE ───────────────────────────────────────────────────────────── */
  const startVoice = () => {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){ showToast("Speech not supported in this browser.","err"); return; }
    const r=new SR(); r.lang=voiceLang; r.interimResults=false; r.maxAlternatives=3;
    r.onresult=ev=>{
      let best="";
      for(let i=0;i<ev.results[0].length;i++){ const a=ev.results[0][i].transcript; if(a.match(/\d+/)){ best=a; break; } if(!best) best=a; }
      setVoiceText(best); setListening(false);
      const text=best.toLowerCase().replace(/rupees?|rupaye?|rupiya|rupe|₹|rs\.?/gi,"").replace(/[,।]/g," ");
      const numMatch=text.match(/\d+[\.,]?\d*/);
      const wordNums={ek:1,do:2,teen:3,char:4,paanch:5,chhe:6,saat:7,aath:8,nau:9,das:10,bis:20,tees:30,chalis:40,pachas:50,sau:100,hazaar:1000,be:2,tran:3,chaar:4,panch:5,chha:6,nav:9,vees:20,tris:30,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twenty:20,thirty:30,forty:40,fifty:50,hundred:100,thousand:1000};
      let amount="";
      if(numMatch) amount=numMatch[0].replace(",",".");
      else { let val=0; for(const w of text.split(/\s+/)) if(wordNums[w]) val+=wordNums[w]; if(val>0) amount=String(val); }
      const upiW=["upi","online","gpay","phonepe","paytm","neft","transfer","card","phonepay","googlepay","bhim","imps","digital","upi thi","upi se","online apya","net thi","scan"];
      const cashW=["cash","nakad","nakdu","haath","hath","note","nakad se","cash se","cash thi","rokda","roki"];
      let type="Cash";
      if(upiW.some(w=>text.includes(w))) type="UPI";
      else if(cashW.some(w=>text.includes(w))) type="Cash";
      let category="Other";
      for(const [cat,kws] of Object.entries(CAT_KEYWORDS)){ if(kws.some(k=>text.includes(k))){ category=cat; break; } }
      let desc=best.replace(/\d+[\.,]?\d*/,"").replace(/rupees?|rupaye?|rupiya|rupe|₹|rs\.?/gi,"").trim();
      if(desc.length<3) desc=category;
      setForm(prev=>({...prev,amount:amount||"",category,description:desc||category,type}));
      if(amount) showToast(`Detected: ${fmt(parseFloat(amount))} · ${category} · ${type}`);
      else showToast("Heard you — please enter amount manually.","warn");
    };
    r.onerror=e=>{
      setListening(false);
      if(e.error==="not-allowed") showToast("Mic denied. Allow in browser settings.","err");
      else if(e.error==="no-speech") showToast("No speech detected. Speak closer.","warn");
      else showToast("Mic error: "+e.error,"err");
    };
    r.onend=()=>setListening(false);
    recRef.current=r; r.start(); setListening(true); setVoiceText("");
  };

  /* ── PIN ─────────────────────────────────────────────────────────────── */
  const handlePinDigit = (d) => {
    const np=pinInput+d; setPinInput(np); setPinError("");
    if(np.length===4){
      if(pinMode==="setup"){ setPinVal(np); setPinInput(""); setPinMode("none"); setPinSetup(false); if(user) persist(user.username,expenses,budgets,monthlyTargets,isDark,np); showToast("PIN set! 🔒"); }
      else if(pinMode==="lock"){ if(np===pinVal){ setLocked(false); setPinInput(""); setPinMode("none"); } else { setPinError("Wrong PIN."); setPinInput(""); } }
    }
  };
  const handlePinBack = () => { setPinInput(p=>p.slice(0,-1)); setPinError(""); };
  const removePin = async () => {
    setPinVal(""); setLocked(false); setPinMode("none"); setPinSetup(false); setPinInput("");
    if(user) await persist(user.username,expenses,budgets,monthlyTargets,isDark,"");
    showToast("PIN removed.");
  };

  /* ── STYLE HELPERS ───────────────────────────────────────────────────── */
  const card=(extra={})=>({
    background:T.card, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
    border:`1px solid ${T.bdrSub}`, borderRadius:16, padding:18,
    boxShadow:T.isDark?"0 4px 24px rgba(0,0,0,.35)":"0 2px 16px rgba(0,0,0,.07),0 1px 0 rgba(255,255,255,.9) inset",
    ...extra,
  });
  const btn=(extra={})=>({border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,borderRadius:12,transition:"all .2s",...extra});
  const CTip=({active,payload,label})=>{
    if(!active||!payload?.length) return null;
    return <div style={{background:T.isDark?"rgba(10,14,25,.97)":"rgba(255,255,255,.98)",border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{color:T.muted,fontSize:11,marginBottom:5}}>{label}</div>
      {payload.map(p=><div key={p.name} style={{color:p.color,fontWeight:600,fontSize:13,marginBottom:2}}>{p.name}: {fmt(p.value)}</div>)}
    </div>;
  };

  /* ── CSS ─────────────────────────────────────────────────────────────── */
  const css=`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    html,body,#root{width:100%;min-height:100%;}
    input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
    input[type=number]{-moz-appearance:textfield;}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${T.isDark?"invert(.5)":"opacity(.5)"};cursor:pointer;}
    ::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:${T.a1}55;border-radius:99px;}
    button:active{transform:scale(.96)!important;}
    select option{background:${T.isDark?"#111827":"#fff"};}
    input:-webkit-autofill{-webkit-box-shadow:0 0 0 100px ${T.bg} inset!important;-webkit-text-fill-color:${T.text}!important;}
    @keyframes slideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
    @keyframes toastAnim{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes alertIn{from{opacity:0;transform:translateY(-20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
    .recharts-wrapper{width:100%!important;}
  `;

  /* ════════════════════════════════════════════ PIN SCREEN ════════════ */
  if(user && locked && pinMode==="lock") return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:24}}>
      <style>{css}</style>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:48,marginBottom:10}}>🔒</div>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:32,color:T.a1}}>
          Spndr<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:T.a3,marginLeft:3,marginBottom:4,verticalAlign:"middle"}}/>
        </div>
        <div style={{fontSize:13,color:T.muted,marginTop:8}}>Enter your 4-digit PIN</div>
      </div>
      <div style={{...card({padding:"32px 28px",width:"min(320px,100%)",textAlign:"center"})}}>
        <div style={{display:"flex",justifyContent:"center",gap:14,marginBottom:28}}>
          {[0,1,2,3].map(i=><div key={i} style={{width:16,height:16,borderRadius:"50%",background:pinInput.length>i?T.a1:T.bdrSub,border:`2px solid ${pinInput.length>i?T.a1:T.muted}`,transition:"all .2s"}}/>)}
        </div>
        {pinError&&<div style={{color:T.a4,fontSize:13,marginBottom:14,fontWeight:600}}>{pinError}</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
            <button key={i} onClick={()=>d==="⌫"?handlePinBack():d!==""&&handlePinDigit(String(d))}
              style={{...btn({padding:"17px 8px",border:`1.5px solid ${T.bdrSub}`,background:d===""?"transparent":T.card,color:T.text,fontSize:20,fontFamily:"'JetBrains Mono',monospace",cursor:d===""?"default":"pointer"})}}>
              {d}
            </button>
          ))}
        </div>
        <button onClick={doSignOut} style={{marginTop:20,background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",textDecoration:"underline",fontFamily:"'DM Sans',sans-serif"}}>Sign out instead</button>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════ AUTH SCREEN ═══════════ */
  if(!user) {
    const isUp=authMode==="signup";
    const EyeBtn=({field})=>(
      <button type="button" onClick={()=>setShowPw(p=>({...p,[field]:!p[field]}))} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:4,color:T.muted,fontSize:16,lineHeight:1}}>
        {showPw[field]?"🙈":"👁️"}
      </button>
    );
    return (
      <div style={{minHeight:"100vh",width:"100%",background:T.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden",padding:"32px 16px",transition:"background .3s"}}>
        <style>{css}</style>
        <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden"}}>
          <div style={{position:"absolute",top:"-8%",left:"-8%",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${T.a1}${T.isDark?"16":"09"},transparent 70%)`,animation:"float 12s ease-in-out infinite"}}/>
          <div style={{position:"absolute",bottom:"0",right:"-8%",width:420,height:420,borderRadius:"50%",background:`radial-gradient(circle,${T.a3}${T.isDark?"12":"07"},transparent 70%)`,animation:"float 15s ease-in-out infinite",animationDelay:"4s"}}/>
        </div>
        <button onClick={()=>setIsDark(!isDark)} style={{position:"fixed",top:20,right:20,zIndex:20,width:42,height:42,borderRadius:"50%",border:`1px solid ${T.border}`,background:T.card,backdropFilter:"blur(12px)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",color:T.text}}>
          {T.isDark?"☀":"🌙"}
        </button>
        <div style={{textAlign:"center",marginBottom:36,zIndex:10,animation:"fadeUp .5s ease"}}>
          <div style={{fontSize:13,letterSpacing:4,color:T.muted,fontWeight:600,marginBottom:8}}>PERSONAL FINANCE</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:46,letterSpacing:-1,color:T.a1,lineHeight:1.1}}>
            Spndr<span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:T.a3,marginLeft:3,marginBottom:6,verticalAlign:"middle"}}/>
          </div>
          <div style={{width:36,height:2,background:T.grad,margin:"12px auto 0",borderRadius:99}}/>
          <div style={{fontSize:13,color:T.muted,marginTop:10}}>Track every rupee, every day</div>
        </div>
        <div style={{...card({padding:"32px 28px",width:"min(420px,100%)",zIndex:10,animation:"fadeUp .5s ease .1s both"})}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:T.input,borderRadius:12,padding:4,marginBottom:28,gap:4}}>
            {[["signin","Sign In"],["signup","Sign Up"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setAuthMode(m);setAError("");setAInfo("");}} style={{...btn({padding:"11px",borderRadius:9,background:authMode===m?T.grad:"transparent",color:authMode===m?"#fff":T.muted,fontSize:14,boxShadow:authMode===m?`0 2px 12px ${T.glow}`:"none"})}}>
                {l}
              </button>
            ))}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:7,fontWeight:600}}>USERNAME</div>
            <input type="text" value={aForm.username} placeholder="e.g. arjun_99" onChange={e=>setAForm(p=>({...p,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&(isUp?doSignUp():doSignIn())}
              style={{width:"100%",background:T.input,border:`1.5px solid ${aError?T.a4:T.inputBdr}`,borderRadius:12,padding:"13px 16px",color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
          </div>
          <div style={{marginBottom:isUp?16:24}}>
            <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:7,fontWeight:600}}>PASSWORD</div>
            <div style={{position:"relative"}}>
              <input type={showPw.password?"text":"password"} value={aForm.password} placeholder="Minimum 6 characters" onChange={e=>setAForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&(isUp?doSignUp():doSignIn())}
                style={{width:"100%",background:T.input,border:`1.5px solid ${aError?T.a4:T.inputBdr}`,borderRadius:12,padding:"13px 48px 13px 16px",color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
              <EyeBtn field="password"/>
            </div>
          </div>
          {isUp&&(
            <div style={{marginBottom:24}}>
              <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:7,fontWeight:600}}>CONFIRM PASSWORD</div>
              <div style={{position:"relative"}}>
                <input type={showPw.confirm?"text":"password"} value={aForm.confirm} placeholder="Repeat your password" onChange={e=>setAForm(p=>({...p,confirm:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doSignUp()}
                  style={{width:"100%",background:T.input,border:`1.5px solid ${aError?T.a4:T.inputBdr}`,borderRadius:12,padding:"13px 48px 13px 16px",color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",outline:"none"}}/>
                <EyeBtn field="confirm"/>
              </div>
            </div>
          )}
          {aError&&<div style={{padding:"12px 16px",borderRadius:12,marginBottom:12,background:`${T.a4}12`,border:`1px solid ${T.a4}35`}}><div style={{color:T.a4,fontWeight:600,fontSize:13}}>⚠ {aError}</div></div>}
          {aInfo&&<div style={{padding:"10px 16px",borderRadius:12,marginBottom:12,background:`${T.a3}10`,border:`1px solid ${T.a3}25`}}><div style={{color:T.a3,fontSize:12,fontWeight:500}}>ℹ {aInfo}</div></div>}
          <button onClick={isUp?doSignUp:doSignIn} disabled={aLoading} style={{...btn({width:"100%",padding:"15px",borderRadius:13,background:aLoading?T.input:T.grad,color:aLoading?T.muted:"#fff",fontSize:15,boxShadow:aLoading?"none":`0 6px 24px ${T.glow}`,display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:aLoading?"not-allowed":"pointer"})}}>
            {aLoading&&<div style={{width:15,height:15,borderRadius:"50%",border:`2px solid ${T.muted}`,borderTopColor:"transparent",animation:"spin .7s linear infinite"}}/>}
            {aLoading?"Please wait…":isUp?"Create Account →":"Sign In →"}
          </button>
          <p style={{textAlign:"center",marginTop:20,fontSize:13,color:T.muted}}>
            {isUp?"Already registered? ":"New here? "}
            <span onClick={()=>{setAuthMode(isUp?"signin":"signup");setAError("");setAInfo("");}} style={{color:T.a1,fontWeight:600,cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3}}>
              {isUp?"Sign In":"Create free account"}
            </span>
          </p>
        </div>
        {toast&&<ToastEl T={T} toast={toast}/>}
      </div>
    );
  }

  /* ════════════════════════════════════════════ MAIN APP ══════════════ */
  const greet=now.getHours()<12?"Morning":now.getHours()<17?"Afternoon":"Evening";
  const TABS=[
    {id:"home",    ico:"⌂",label:"Home"},
    {id:"add",     ico:"+",label:"Add"},
    {id:"charts",  ico:"↗",label:"Charts"},
    {id:"budget",  ico:"◎",label:"Budget"},
    {id:"settings",ico:"⚙",label:"More"},
  ];

  /* ═══ HOME ═══════════════════════════════════════════════════════════ */
  const HomeView=()=>(
    <div style={{padding:"0 16px 124px"}}>

      {/* OVERSPEND ALERT POPUP */}
      {overspendAlert&&(
        <div style={{position:"sticky",top:0,zIndex:50,marginBottom:12,animation:"alertIn .3s ease"}}>
          <div style={{background:overspendAlert.type==="over"?`${T.a4}18`:`rgba(245,158,11,.15)`,border:`2px solid ${overspendAlert.type==="over"?T.a4:"#f59e0b"}`,borderRadius:16,padding:"14px 16px",backdropFilter:"blur(12px)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:overspendAlert.type==="over"?T.a4:"#f59e0b",fontSize:15,marginBottom:4}}>
                  {overspendAlert.title}
                </div>
                <div style={{fontSize:13,color:T.sub,lineHeight:1.5}}>{overspendAlert.msg}</div>
              </div>
              <button onClick={()=>setOverspendAlert(null)} style={{...btn({width:28,height:28,borderRadius:8,background:T.isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.08)",color:T.muted,fontSize:14,flexShrink:0,cursor:"pointer"})}}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div style={{...card({background:T.gradSoft,borderColor:T.border,marginBottom:12,padding:"22px",position:"relative",overflow:"hidden"})}}>
        <div style={{position:"absolute",top:-40,right:-40,width:150,height:150,borderRadius:"50%",background:`radial-gradient(circle,${T.a1}18,transparent)`}}/>
        <div style={{fontSize:12,color:T.sub,marginBottom:6}}>{now.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:40,fontWeight:700,letterSpacing:-1,lineHeight:1.1,color:isOver?T.a4:T.a1}}>{fmt(total)}</div>
        <div style={{fontSize:12,color:T.muted,marginTop:4}}>total spent this month</div>
        {curTarget>0?(
          <div style={{marginTop:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,color:T.muted}}>Budget: {fmt(curTarget)}</span>
              <span style={{fontSize:12,fontWeight:700,color:isOver?T.a4:T.a1}}>{pct.toFixed(1)}%</span>
            </div>
            <div style={{height:8,borderRadius:99,background:T.isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.07)",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,borderRadius:99,transition:"width .7s ease",background:isOver?T.a4:T.grad}}/>
            </div>
          </div>
        ):(
          <div style={{marginTop:12,fontSize:12,color:T.muted}}>
            No budget set — <span onClick={()=>setTab("budget")} style={{color:T.a1,cursor:"pointer",textDecoration:"underline"}}>set one in Budget tab</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
        {[
          {l:"UPI",  v:upiAmt,  c:T.upi,  ico:"💳"},
          {l:"Cash", v:cashAmt, c:T.cash, ico:"💵"},
          {l:curTarget>0?(isOver?"Overrun":"Left"):"Spent",v:curTarget>0?Math.abs(curTarget-total):total,c:isOver?T.a4:T.a1,ico:isOver?"↑":"↓",p:isOver?"+":""},
        ].map(s=>(
          <div key={s.l} style={{...card({padding:"13px 8px",textAlign:"center"})}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:5}}>{s.ico} {s.l}</div>
            <div style={{fontWeight:700,fontSize:12,color:s.c,fontFamily:"'JetBrains Mono',monospace",lineHeight:1.2,wordBreak:"break-all"}}>{s.p}{fmt(s.v)}</div>
          </div>
        ))}
      </div>

      {/* Category strip */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:14,scrollbarWidth:"none"}}>
        {catData.map(c=>(
          <div key={c.name} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"9px 12px",borderRadius:14,background:`${c.color}12`,border:`1px solid ${c.color}28`}}>
            <span style={{fontSize:17}}>{c.emoji}</span>
            <span style={{fontSize:10,color:c.color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.spent)}</span>
          </div>
        ))}
      </div>

      {/* Transactions header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontWeight:700,fontSize:16,color:T.text,fontFamily:"'DM Serif Display',serif"}}>Transactions</span>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {undoEntry&&<button onClick={undoDelete} style={{...btn({fontSize:12,padding:"5px 12px",borderRadius:99,border:`1.5px solid ${T.a3}`,background:`${T.a3}15`,color:T.a3,animation:"fadeIn .2s ease"})}}>↩ Undo</button>}
          <button onClick={()=>setExportMode(p=>!p)} style={{...btn({fontSize:12,padding:"5px 12px",borderRadius:99,border:`1.5px solid ${T.border}`,background:`${T.a1}12`,color:T.a1})}}>⬇ Export</button>
        </div>
      </div>

      {/* Export panel */}
      {exportMode&&(
        <div style={{...card({marginBottom:14,borderColor:T.border,animation:"fadeIn .2s ease"})}}>
          <div style={{fontWeight:700,color:T.text,marginBottom:10,fontSize:14}}>Export as CSV</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
            {[{v:"week",l:"This Week"},{v:"month",l:"This Month"},{v:"year",l:"This Year"}].map(({v,l})=>(
              <button key={v} onClick={()=>exportCSV(v)} style={{...btn({padding:"11px 4px",border:`1.5px solid ${T.border}`,background:`${T.a1}10`,color:T.a1,fontSize:12,textAlign:"center",borderRadius:12})}}>{l}</button>
            ))}
          </div>
          <button onClick={()=>setExportMode(false)} style={{...btn({width:"100%",padding:"9px",border:`1px solid ${T.bdrSub}`,background:"transparent",color:T.muted,fontSize:13})}}>Cancel</button>
        </div>
      )}

      {/* Empty */}
      {expenses.length===0&&(
        <div style={{...card({textAlign:"center",padding:"40px 20px",borderColor:T.border})}}>
          <div style={{fontSize:40,marginBottom:12}}>💸</div>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18,color:T.text,marginBottom:8}}>No expenses yet</div>
          <div style={{fontSize:13,color:T.muted}}>Tap + to add your first expense</div>
        </div>
      )}

      {/* List */}
      {expenses.slice(0,40).map(e=>{
        const cat=getCat(e.category); const d=new Date(e.date);
        return(
          <div key={e.id} style={{...card({marginBottom:8,display:"flex",alignItems:"center",gap:12,padding:"12px 14px"})}}>
            <div style={{width:42,height:42,borderRadius:12,flexShrink:0,background:`${cat.color}15`,border:`1px solid ${cat.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{cat.emoji}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:14,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.description}</div>
              <div style={{fontSize:11,color:T.muted,display:"flex",gap:6,marginTop:3}}><span>{e.category}</span><span>·</span><span>{d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span></div>
            </div>
            <div style={{textAlign:"right",flexShrink:0,display:"flex",alignItems:"center",gap:8}}>
              <div>
                <div style={{fontWeight:700,fontFamily:"'JetBrains Mono',monospace",fontSize:14,color:T.text}}>−{fmt(e.amount)}</div>
                <span style={{display:"inline-block",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:99,marginTop:4,background:e.type==="UPI"?`${T.upi}16`:`${T.cash}14`,color:e.type==="UPI"?T.upi:T.cash}}>{e.type}</span>
              </div>
              <button onClick={()=>deleteEntry(e.id)} style={{width:28,height:28,borderRadius:8,border:`1px solid ${T.a4}30`,background:`${T.a4}08`,color:T.a4,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ═══ ADD ════════════════════════════════════════════════════════════ */
  const AddView=()=>(
    <div style={{padding:"0 16px 124px"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>New Expense</div>
      <div style={{...card({marginBottom:12,padding:"20px"})}}>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:10,fontWeight:600}}>AMOUNT (₹)</div>
        <input value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} type="number" placeholder="0" autoFocus
          style={{width:"100%",background:"none",border:"none",outline:"none",fontSize:48,fontWeight:800,letterSpacing:-2,color:T.a1,fontFamily:"'JetBrains Mono',monospace",boxSizing:"border-box"}}/>
      </div>
      <div style={{...card({marginBottom:12})}}>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:10,fontWeight:600}}>PAYMENT METHOD</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{t:"UPI",l:"UPI Transfer",c:T.upi,ico:"💳"},{t:"Cash",l:"Cash Payment",c:T.cash,ico:"💵"}].map(({t,l,c,ico})=>(
            <button key={t} onClick={()=>setForm(p=>({...p,type:t}))} style={{...btn({padding:"14px",borderRadius:13,textAlign:"left",border:`1.5px solid ${form.type===t?c:T.bdrSub}`,background:form.type===t?`${c}12`:"transparent",boxShadow:form.type===t?`0 2px 12px ${c}28`:"none"})}}>
              <div style={{fontSize:20,marginBottom:6}}>{ico}</div>
              <div style={{fontWeight:600,color:form.type===t?c:T.muted,fontSize:14}}>{l}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{...card({marginBottom:12})}}>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:10,fontWeight:600}}>CATEGORY</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {CATS.map(c=>(
            <button key={c.name} onClick={()=>setForm(p=>({...p,category:c.name}))} style={{...btn({padding:"11px 4px",borderRadius:13,border:`1.5px solid ${form.category===c.name?c.color:T.bdrSub}`,background:form.category===c.name?`${c.color}14`:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:5})}}>
              <span style={{fontSize:18}}>{c.emoji}</span>
              <span style={{fontSize:9,fontWeight:600,color:form.category===c.name?c.color:T.muted}}>{c.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{...card({marginBottom:12})}}>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:8,fontWeight:600}}>DESCRIPTION</div>
        <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Brief description"
          style={{width:"100%",background:"none",border:"none",outline:"none",borderBottom:`1.5px solid ${T.bdrSub}`,paddingBottom:9,color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box",marginBottom:18}}/>
        <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:8,fontWeight:600}}>DATE</div>
        <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}
          style={{background:"none",border:"none",outline:"none",borderBottom:`1.5px solid ${T.bdrSub}`,paddingBottom:6,color:T.text,fontSize:15,fontFamily:"'DM Sans',sans-serif",colorScheme:T.isDark?"dark":"light"}}/>
      </div>
      <div style={{...card({marginBottom:16})}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <div style={{fontWeight:700,color:T.text,fontSize:15}}>🎤 Voice Input</div>
            <div style={{fontSize:12,color:T.muted,marginTop:2}}>Speak in any language</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={()=>setShowVHelp(p=>!p)} style={{...btn({fontSize:11,padding:"5px 10px",borderRadius:8,border:`1px solid ${T.border}`,background:`${T.a1}12`,color:T.a1})}}>{showVHelp?"Hide":"How?"}</button>
            <select value={voiceLang} onChange={e=>setVoiceLang(e.target.value)} style={{background:T.input,border:`1px solid ${T.border}`,borderRadius:9,color:T.text,padding:"6px 10px",fontSize:12,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",outline:"none"}}>
              {LANGS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>
        {showVHelp&&(
          <div style={{marginBottom:14,padding:"14px",borderRadius:12,background:T.isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.04)",border:`1px solid ${T.bdrSub}`,animation:"fadeIn .2s ease"}}>
            <div style={{fontSize:12,fontWeight:700,color:T.a1,marginBottom:10}}>HOW TO SPEAK</div>
            {[{lang:"English",ex:"Two hundred food cash"},{lang:"Hindi",ex:"Do sau khana cash"},{lang:"Gujarati",ex:"Be sau jaman nakad"},{lang:"Marathi",ex:"Don she jevan cash"},{lang:"Tamil",ex:"Irunooru sapadu cash"}].map(v=>(
              <div key={v.lang} style={{display:"flex",gap:10,marginBottom:7,alignItems:"flex-start"}}>
                <span style={{fontSize:10,fontWeight:700,color:T.a1,minWidth:58,paddingTop:2}}>{v.lang}</span>
                <span style={{fontSize:12,color:T.sub,fontStyle:"italic"}}>"{v.ex}"</span>
              </div>
            ))}
            <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:`${T.a3}10`,border:`1px solid ${T.a3}20`}}>
              <div style={{fontSize:11,color:T.a3,lineHeight:1.6}}>💡 Say: Amount → What it is → UPI or Cash · Speak slowly</div>
            </div>
          </div>
        )}
        <button onClick={listening?()=>recRef.current?.stop():startVoice} style={{...btn({width:"100%",padding:"13px",borderRadius:12,border:`1.5px solid ${listening?T.a4:T.border}`,background:listening?`${T.a4}10`:`${T.a1}08`,color:listening?T.a4:T.a1,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10})}}>
          <span style={{fontSize:20,animation:listening?"pulse 1s infinite":"none"}}>{listening?"⏹":"🎙"}</span>
          {listening?"Tap to stop — speak now":"Start voice recording"}
        </button>
        {voiceText&&<div style={{marginTop:10,padding:"9px 12px",borderRadius:10,background:T.isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.04)",fontSize:13,color:T.muted,fontStyle:"italic"}}>Heard: "{voiceText}"</div>}
      </div>
      <button onClick={addExpense} style={{...btn({width:"100%",padding:16,borderRadius:14,background:T.grad,color:"#fff",fontSize:16,boxShadow:`0 6px 28px ${T.glow}`})}}>Save Expense</button>
    </div>
  );

  /* ═══ CHARTS ══════════════════════════════════════════════════════════ */
  const ChartsView=()=>{
    const pieD=catData.filter(c=>c.spent>0).map(c=>({name:c.name,value:c.spent,color:c.color,emoji:c.emoji}));
    const pieT=pieD.reduce((s,p)=>s+p.value,0);
    return(
      <div style={{padding:"0 16px 124px",width:"100%"}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>Analytics</div>
        <div style={{...card({marginBottom:14,display:"flex",padding:5,gap:4})}}>
          {[{v:"day",l:"7 Days"},{v:"month",l:"6 Months"},{v:"year",l:"3 Years"}].map(({v,l})=>(
            <button key={v} onClick={()=>setPeriod(v)} style={{...btn({flex:1,padding:"10px 4px",borderRadius:11,background:period===v?T.grad:"transparent",color:period===v?"#fff":T.muted,fontSize:12,boxShadow:period===v?`0 2px 10px ${T.glow}`:"none"})}}>{l}</button>
          ))}
        </div>
        <div style={{...card({marginBottom:14,padding:"18px 10px 12px 6px"})}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingLeft:10}}>
            <span style={{fontWeight:600,color:T.text,fontSize:15,fontFamily:"'DM Serif Display',serif"}}>UPI vs Cash</span>
            <div style={{display:"flex",gap:12}}>{[{l:"UPI",c:T.upi},{l:"Cash",c:T.cash}].map(x=><div key={x.l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.muted}}><div style={{width:10,height:4,borderRadius:2,background:x.c}}/>{x.l}</div>)}</div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={chartData} margin={{top:4,right:6,left:-12,bottom:0}} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} vertical={false}/>
              <XAxis dataKey="name" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>999?(v/1000).toFixed(1)+"k":v} width={36}/>
              <Tooltip content={<CTip/>} cursor={{fill:T.isDark?"rgba(255,255,255,.04)":"rgba(0,0,0,.04)"}}/>
              <Bar dataKey="UPI" fill={T.upi} radius={[6,6,0,0]} isAnimationActive={false}/>
              <Bar dataKey="Cash" fill={T.cash} radius={[6,6,0,0]} isAnimationActive={false}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{...card({marginBottom:14,padding:"18px 10px 12px 6px"})}}>
          <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,paddingLeft:10,fontFamily:"'DM Serif Display',serif"}}>Spending Trend</div>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={chartData} margin={{top:4,right:6,left:-12,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} vertical={false}/>
              <XAxis dataKey="name" tick={{fill:T.muted,fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.muted,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v>999?(v/1000).toFixed(1)+"k":v} width={36}/>
              <Tooltip content={<CTip/>}/>
              <Line type="monotone" dataKey="UPI" stroke={T.upi} strokeWidth={2.5} dot={{fill:T.upi,r:4,strokeWidth:0}} activeDot={{r:7,strokeWidth:0}} isAnimationActive={false}/>
              <Line type="monotone" dataKey="Cash" stroke={T.cash} strokeWidth={2.5} dot={{fill:T.cash,r:4,strokeWidth:0}} activeDot={{r:7,strokeWidth:0}} isAnimationActive={false}/>
              <Legend wrapperStyle={{fontSize:12,color:T.muted,paddingTop:8}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{...card({marginBottom:14,padding:"18px 16px"})}}>
          <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>Category Breakdown</div>
          {pieD.length>0?(
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pieD} cx="50%" cy="50%" innerRadius={52} outerRadius={82} dataKey="value" paddingAngle={3} isAnimationActive={false}>
                    {pieD.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>[fmt(v),"Amount"]} contentStyle={{background:T.isDark?"rgba(10,14,25,.97)":"rgba(255,255,255,.98)",border:`1px solid ${T.border}`,borderRadius:12,fontFamily:"DM Sans"}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
                {pieD.map(d=>(
                  <div key={d.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/><span style={{fontSize:13,color:T.muted}}>{d.emoji} {d.name}</span></div>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{width:70,height:4,borderRadius:99,background:T.isDark?"rgba(255,255,255,.07)":"rgba(0,0,0,.07)",overflow:"hidden"}}><div style={{height:"100%",width:`${(d.value/pieT)*100}%`,background:d.color,borderRadius:99}}/></div>
                      <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:"'JetBrains Mono',monospace",minWidth:68,textAlign:"right"}}>{fmt(d.value)}</span>
                      <span style={{fontSize:11,color:T.muted,minWidth:28,textAlign:"right"}}>{((d.value/pieT)*100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ):(
            <div style={{textAlign:"center",padding:"36px 0",color:T.muted,fontSize:14}}><div style={{fontSize:32,marginBottom:12}}>📊</div>Add some expenses to see charts!</div>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{l:"UPI Total",cnt:thisMonth.filter(e=>e.type==="UPI").length,amt:upiAmt,c:T.upi},{l:"Cash Total",cnt:thisMonth.filter(e=>e.type==="Cash").length,amt:cashAmt,c:T.cash}].map(s=>(
            <div key={s.l} style={{...card({textAlign:"center",padding:"16px 10px"})}}>
              <div style={{fontSize:11,color:T.muted,marginBottom:6}}>{s.l}</div>
              <div style={{fontWeight:700,fontSize:17,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(s.amt)}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:4}}>{s.cnt} transactions</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ═══ BUDGET ══════════════════════════════════════════════════════════ */
  /* All state (selMonth, budgetInput, catBudgets) lives at App top level  */
  const monthOptions = Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-2+i,1);
    return {key:monthKey(d), label:monthLabel(monthKey(d))};
  });
  const selTarget    = monthlyTargets[selMonth]||0;
  const selMonthExp  = expenses.filter(e=>{
    const d=new Date(e.date); const [y,m]=selMonth.split("-");
    return d.getMonth()+1===parseInt(m)&&d.getFullYear()===parseInt(y);
  });
  const selTotal = selMonthExp.reduce((s,e)=>s+e.amount,0);
  const selPct   = selTarget>0?Math.min((selTotal/selTarget)*100,100):0;
  const selOver  = selTarget>0&&selTotal>selTarget;

  const handleBudgetSave = async () => {
    const v = parseFloat(budgetInput);
    if(!budgetInput||budgetInput.trim()===""){
      showToast("Please enter an amount first.","warn"); return;
    }
    if(isNaN(v)||v<=0){
      showToast("Enter a valid amount greater than 0.","warn"); return;
    }
    await saveMonthTarget(selMonth, v);
    showToast(`✅ Budget set: ${fmt(v)} for ${monthLabel(selMonth)}`);
  };

  const BudgetView=()=>{
    const over = catData.filter(c=>c.spent>c.budget&&c.budget>0);
    return(
      <div style={{padding:"0 16px 124px"}}>
        <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>Budget Control</div>

        {/* Overspend warning */}
        {over.length>0&&(
          <div style={{...card({marginBottom:14,borderColor:`${T.a4}30`,background:`${T.a4}07`,padding:"16px"})}}>
            <div style={{fontWeight:600,color:T.a4,marginBottom:10,fontSize:14}}>⚠ Over budget in {over.length} {over.length===1?"category":"categories"}</div>
            {over.map(c=>(
              <div key={c.name} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:T.sub,marginBottom:6,paddingLeft:8,borderLeft:`2px solid ${T.a4}40`}}>
                <div style={{display:"flex",gap:7}}><span>{c.emoji}</span><span>{c.name}</span></div>
                <span style={{color:T.a4,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>+{fmt(c.spent-c.budget)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Monthly budget setter */}
        <div style={{...card({marginBottom:16,background:T.gradSoft,borderColor:T.border})}}>
          <div style={{fontSize:11,color:T.muted,letterSpacing:1.4,marginBottom:14,fontWeight:600}}>SET MONTHLY BUDGET</div>

          {/* Month selector pills */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:T.muted,marginBottom:8,fontWeight:500}}>Choose Month</div>
            <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none"}}>
              {monthOptions.map(({key,label})=>(
                <button key={key} onClick={()=>{
                  setSelMonth(key);
                  setBudgetInput(monthlyTargets[key]?String(monthlyTargets[key]):"");
                }} style={{...btn({
                  flexShrink:0,padding:"8px 14px",borderRadius:99,
                  border:`1.5px solid ${selMonth===key?T.a1:T.bdrSub}`,
                  background:selMonth===key?`${T.a1}15`:"transparent",
                  color:selMonth===key?T.a1:T.muted,
                  fontSize:12,whiteSpace:"nowrap",
                  fontWeight:selMonth===key?700:400,
                })}}>
                  {label}{key===curKey?" ★":""}
                </button>
              ))}
            </div>
          </div>

          {/* Current saved budget for this month */}
          {selTarget>0&&(
            <div style={{marginBottom:14,padding:"10px 14px",borderRadius:12,background:isDark?"rgba(255,255,255,.05)":"rgba(0,0,0,.04)",border:`1px solid ${T.border}`}}>
              <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Currently set for {monthLabel(selMonth)}</div>
              <div style={{fontSize:22,fontWeight:700,color:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(selTarget)}</div>
            </div>
          )}

          {/* Input row */}
          <div style={{fontSize:13,color:T.sub,marginBottom:10,fontWeight:500}}>
            {selTarget>0?"Update budget for ":"Set budget for "}<strong style={{color:T.text}}>{monthLabel(selMonth)}</strong>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <span style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.sub,flexShrink:0}}>₹</span>
            <input
              value={budgetInput}
              onChange={e=>setBudgetInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleBudgetSave()}
              type="number"
              placeholder="Type amount here…"
              style={{
                flex:1,background:"none",border:"none",outline:"none",
                borderBottom:`2px solid ${T.a1}`,paddingBottom:6,
                fontSize:34,fontWeight:700,color:T.a1,letterSpacing:-1,
                fontFamily:"'JetBrains Mono',monospace",
              }}
            />
          </div>

          {/* Quick presets */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
            {PRESETS.map(v=>(
              <button key={v} onClick={()=>setBudgetInput(String(v))} style={{...btn({
                padding:"7px 12px",borderRadius:99,
                border:`1.5px solid ${budgetInput===String(v)?T.a1:T.bdrSub}`,
                background:budgetInput===String(v)?`${T.a1}18`:"transparent",
                color:budgetInput===String(v)?T.a1:T.muted,fontSize:12,
              })}}>
                {fmt(v)}
              </button>
            ))}
          </div>

          {/* SET BUTTON — big and clear */}
          <button onClick={handleBudgetSave} style={{...btn({
            width:"100%",padding:"16px",borderRadius:14,
            background:T.grad,color:"#fff",fontSize:16,
            boxShadow:`0 6px 24px ${T.glow}`,letterSpacing:.3,
          })}}>
            ✓ Set Budget for {monthLabel(selMonth)}
          </button>
        </div>

        {/* Progress for selected month */}
        {selTarget>0&&(
          <div style={{...card({marginBottom:16})}}>
            <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>
              {monthLabel(selMonth)} Progress
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:13,color:T.muted}}>Spent: <strong style={{color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(selTotal)}</strong></span>
              <span style={{fontSize:13,color:T.muted}}>Budget: <strong style={{color:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(selTarget)}</strong></span>
            </div>
            <div style={{height:12,borderRadius:99,background:isDark?"rgba(255,255,255,.08)":"rgba(0,0,0,.07)",overflow:"hidden",marginBottom:10}}>
              <div style={{height:"100%",width:`${selPct}%`,borderRadius:99,background:selOver?T.a4:T.grad,transition:"width .7s ease"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:600,color:selOver?T.a4:T.a1}}>{selPct.toFixed(1)}% used</span>
              <span style={{fontSize:13,color:selOver?T.a4:T.muted,fontWeight:selOver?700:400}}>
                {selOver?`🔴 Over by ${fmt(selTotal-selTarget)}`:`${fmt(selTarget-selTotal)} remaining`}
              </span>
            </div>
          </div>
        )}

        {/* All months summary */}
        {Object.keys(monthlyTargets).filter(k=>monthlyTargets[k]>0).length>0&&(
          <div style={{...card({marginBottom:16})}}>
            <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>All Months Summary</div>
            {Object.entries(monthlyTargets).filter(([,v])=>v>0).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,6).map(([k,v])=>{
              const mExp=expenses.filter(e=>{const d=new Date(e.date);const[y,m]=k.split("-");return d.getMonth()+1===parseInt(m)&&d.getFullYear()===parseInt(y);});
              const mTotal=mExp.reduce((s,e)=>s+e.amount,0);
              const mPct=Math.min((mTotal/v)*100,100);
              const mOver=mTotal>v;
              return(
                <div key={k} style={{marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${T.bdrSub}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:13,fontWeight:600,color:T.text}}>{monthLabel(k)}</span>
                      {k===curKey&&<span style={{fontSize:10,padding:"1px 7px",borderRadius:99,background:`${T.a1}20`,color:T.a1,fontWeight:700}}>NOW</span>}
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:mOver?T.a4:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(mTotal)} / {fmt(v)}</span>
                  </div>
                  <div style={{height:6,borderRadius:99,background:isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${mPct}%`,borderRadius:99,background:mOver?T.a4:T.grad,transition:"width .5s ease"}}/>
                  </div>
                  <div style={{fontSize:11,color:mOver?T.a4:T.muted,marginTop:5,textAlign:"right"}}>{mPct.toFixed(0)}% used</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Category limits */}
        <div style={{fontSize:15,fontWeight:600,color:T.text,marginBottom:6,fontFamily:"'DM Serif Display',serif"}}>Category Limits</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:12,lineHeight:1.5}}>Set a limit per category. Tap outside the field to save.</div>
        {CATS.map(cat=>{
          const s=catData.find(c=>c.name===cat.name)||{spent:0};
          const bv=parseFloat(catBudgets[cat.name])||0;
          const cp=bv>0?Math.min((s.spent/bv)*100,100):0;
          const co=bv>0&&s.spent>bv;
          return(
            <div key={cat.name} style={{...card({marginBottom:10,padding:"14px 16px"})}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:bv>0?10:0}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <span style={{fontSize:18}}>{cat.emoji}</span>
                  <span style={{fontWeight:600,color:T.text,fontSize:14}}>{cat.name}</span>
                  {co&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:99,background:`${T.a4}15`,color:T.a4,fontWeight:600}}>OVER</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(s.spent)} /</span>
                  <input
                    value={catBudgets[cat.name]||""}
                    type="number" placeholder="0"
                    onChange={e=>setCatBudgets(p=>({...p,[cat.name]:e.target.value}))}
                    onBlur={async()=>{
                      const v=parseFloat(catBudgets[cat.name])||0;
                      const updated={...budgets,[cat.name]:v};
                      await saveBudgets(updated);
                    }}
                    style={{width:70,background:"none",border:"none",outline:"none",borderBottom:`1.5px solid ${cat.color}60`,paddingBottom:2,color:cat.color,fontWeight:700,fontSize:13,textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}
                  />
                </div>
              </div>
              {bv>0&&(
                <>
                  <div style={{height:5,borderRadius:99,background:isDark?"rgba(255,255,255,.06)":"rgba(0,0,0,.06)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${cp}%`,borderRadius:99,transition:"width .5s ease",background:co?T.a4:cat.color}}/>
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginTop:5,textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{cp.toFixed(0)}% utilised</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  /* ═══ SETTINGS ════════════════════════════════════════════════════════ */
  const SettingsView=()=>(
    <div style={{padding:"0 16px 124px"}}>
      <div style={{fontFamily:"'DM Serif Display',serif",fontSize:26,color:T.text,marginBottom:20}}>Settings</div>

      <div style={{...card({marginBottom:14,background:T.gradSoft,borderColor:T.border,padding:"20px"})}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:52,height:52,borderRadius:"50%",flexShrink:0,background:T.grad,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#fff",boxShadow:`0 4px 18px ${T.glow}`}}>{user.username[0].toUpperCase()}</div>
          <div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,color:T.text}}>{user.username}</div>
            <div style={{fontSize:12,color:T.muted,marginTop:3}}>{expenses.length} expenses · {fmt(expenses.reduce((s,e)=>s+e.amount,0))} total</div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div style={{...card({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>🔔 Notifications</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:14,lineHeight:1.6}}>Get alerts when you hit 50%, 85% and 100% of your budget.</div>
        <button onClick={async()=>{
          const ok=await requestNotifPermission();
          setNotifEnabled(ok);
          if(ok) showToast("Notifications enabled! 🔔");
          else showToast("Please allow notifications in browser settings.","warn");
        }} style={{...btn({width:"100%",padding:"13px",border:`1.5px solid ${notifEnabled||Notification?.permission==="granted"?T.a3:T.border}`,background:notifEnabled||Notification?.permission==="granted"?`${T.a3}12`:`${T.a1}08`,color:notifEnabled||Notification?.permission==="granted"?T.a3:T.a1,fontSize:14})}}>
          {Notification?.permission==="granted"?"✅ Notifications Active — tap to refresh":"Enable Notifications →"}
        </button>
      </div>

      {/* Display mode */}
      <div style={{...card({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>Display Mode</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[{m:true,l:"Dark",d:"Deep slate, warm gold",ico:"🌙"},{m:false,l:"Light",d:"Ivory, clean & bright",ico:"☀"}].map(({m,l,d,ico})=>(
            <button key={String(m)} onClick={()=>{setIsDark(m);if(user)persist(user.username,expenses,budgets,monthlyTargets,m,pinVal);}} style={{...btn({padding:"16px 12px",borderRadius:14,textAlign:"left",border:`1.5px solid ${isDark===m?T.a1:T.bdrSub}`,background:isDark===m?T.gradSoft:"transparent",boxShadow:isDark===m?`0 4px 18px ${T.glow}`:"none"})}}>
              <div style={{fontSize:22,marginBottom:7}}>{ico}</div>
              <div style={{fontWeight:600,color:isDark===m?T.a1:T.text,fontSize:14}}>{l}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:3}}>{d}</div>
              {isDark===m&&<div style={{fontSize:10,color:T.a1,marginTop:8,fontWeight:700}}>● ACTIVE</div>}
            </button>
          ))}
        </div>
      </div>

      {/* PIN */}
      <div style={{...card({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:4,fontFamily:"'DM Serif Display',serif"}}>🔒 PIN Lock</div>
        <div style={{fontSize:12,color:T.muted,marginBottom:14,lineHeight:1.6}}>Set a 4-digit PIN to lock the app on open.</div>
        {!pinSetup&&!pinVal&&(
          <button onClick={()=>{setPinSetup(true);setPinMode("setup");setPinInput("");setPinError("");}} style={{...btn({width:"100%",padding:"13px",border:`1.5px solid ${T.border}`,background:`${T.a1}10`,color:T.a1,fontSize:14})}}>Set Up PIN →</button>
        )}
        {!pinSetup&&pinVal&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <button onClick={()=>{setPinSetup(true);setPinMode("setup");setPinInput("");setPinError("");}} style={{...btn({padding:"11px",border:`1.5px solid ${T.bdrSub}`,background:T.input,color:T.text,fontSize:13})}}>Change PIN</button>
            <button onClick={removePin} style={{...btn({padding:"11px",border:`1.5px solid ${T.a4}30`,background:`${T.a4}08`,color:T.a4,fontSize:13})}}>Remove PIN</button>
          </div>
        )}
        {pinSetup&&(
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:13,color:T.sub,marginBottom:14}}>Enter a new 4-digit PIN</div>
            <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:18}}>
              {[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:"50%",background:pinInput.length>i?T.a1:T.bdrSub,border:`2px solid ${pinInput.length>i?T.a1:T.muted}`,transition:"all .2s"}}/>)}
            </div>
            {pinError&&<div style={{color:T.a4,fontSize:12,marginBottom:10}}>{pinError}</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:240,margin:"0 auto"}}>
              {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d,i)=>(
                <button key={i} onClick={()=>d==="⌫"?handlePinBack():d!==""&&handlePinDigit(String(d))}
                  style={{...btn({padding:"14px 6px",border:`1.5px solid ${T.bdrSub}`,background:d===""?"transparent":T.card,color:T.text,fontSize:17,fontFamily:"'JetBrains Mono',monospace",cursor:d===""?"default":"pointer"})}}>{d}</button>
              ))}
            </div>
            <button onClick={()=>{setPinSetup(false);setPinMode("none");setPinInput("");}} style={{marginTop:14,background:"none",border:"none",color:T.muted,fontSize:13,cursor:"pointer",textDecoration:"underline",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{...card({marginBottom:14,padding:"20px"})}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,marginBottom:14,fontFamily:"'DM Serif Display',serif"}}>Account Summary</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {[
            {l:"All-time",  v:fmt(expenses.reduce((s,e)=>s+e.amount,0)),s:"total"},
            {l:"This Month",v:fmt(total),s:"spent"},
            {l:"Entries",   v:expenses.length,s:"recorded"},
            {l:"Average",   v:expenses.length?fmt(Math.round(expenses.reduce((s,e)=>s+e.amount,0)/expenses.length)):"₹0",s:"per entry"},
          ].map(s=>(
            <div key={s.l} style={{padding:"13px",borderRadius:12,background:T.input,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:10,color:T.muted,marginBottom:5,fontWeight:600,letterSpacing:.5}}>{s.l.toUpperCase()}</div>
              <div style={{fontWeight:700,color:T.a1,fontFamily:"'JetBrains Mono',monospace",fontSize:14}}>{s.v}</div>
              <div style={{fontSize:10,color:T.muted,marginTop:3}}>{s.s}</div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={doSignOut} style={{...btn({width:"100%",padding:"15px",borderRadius:13,border:`1.5px solid ${T.a4}35`,background:`${T.a4}08`,color:T.a4,fontSize:15})}}>Sign Out</button>
    </div>
  );

  /* ═══ SHELL ══════════════════════════════════════════════════════════ */
  return(
    <div style={{minHeight:"100vh",width:"100%",background:T.bg,color:T.text,fontFamily:"'DM Sans',sans-serif",position:"relative",maxWidth:480,margin:"0 auto",overflowX:"hidden",transition:"background .3s,color .3s"}}>
      <style>{css}</style>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        <div style={{position:"absolute",top:"-5%",right:"-10%",width:300,height:300,borderRadius:"50%",background:`radial-gradient(circle,${T.a1}${T.isDark?"10":"06"},transparent)`}}/>
        <div style={{position:"absolute",bottom:"10%",left:"-8%",width:240,height:240,borderRadius:"50%",background:`radial-gradient(circle,${T.a3}${T.isDark?"08":"05"},transparent)`}}/>
      </div>
      <div style={{position:"sticky",top:0,zIndex:60,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",background:T.header,borderBottom:`1px solid ${T.divider}`,padding:"13px 16px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:T.muted}}>{now.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})} · Good {greet}</div>
            <div style={{fontFamily:"'DM Serif Display',serif",fontSize:21,color:T.a1,lineHeight:1.3}}>
              Spndr<span style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:T.a3,marginLeft:2,marginBottom:3,verticalAlign:"middle"}}/>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button onClick={toggleMode} style={{width:36,height:36,borderRadius:"50%",border:`1px solid ${T.border}`,background:T.card,backdropFilter:"blur(12px)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",color:T.text,transition:"all .22s"}}>
              {T.isDark?"☀":"🌙"}
            </button>
            {curTarget>0&&(
              <div style={{padding:"5px 11px",borderRadius:99,fontSize:11,fontWeight:600,background:isOver?`${T.a4}16`:`${T.a1}14`,color:isOver?T.a4:T.a1,fontFamily:"'JetBrains Mono',monospace"}}>
                {isOver?`−${fmt(total-curTarget)}`:`${fmt(curTarget-total)} left`}
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{position:"relative",zIndex:1,paddingTop:14,animation:"slideUp .3s ease"}} key={tab}>
        {tab==="home"    &&<HomeView/>}
        {tab==="add"     &&<AddView/>}
        {tab==="charts"  &&<ChartsView/>}
        {tab==="budget"  &&<BudgetView/>}
        {tab==="settings"&&<SettingsView/>}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:100,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",background:T.nav,borderTop:`1px solid ${T.divider}`,padding:"10px 6px 26px"}}>
        <div style={{display:"flex",justifyContent:"space-around",alignItems:"flex-end"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,border:"none",background:"none",cursor:"pointer",padding:"4px 2px",borderRadius:12,position:"relative",transition:"all .2s"}}>
              {t.id==="add"?(
                <div style={{width:52,height:52,borderRadius:"50%",marginTop:-22,background:tab==="add"?T.grad:`linear-gradient(135deg,${T.a1}55,${T.a3}50)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,color:"#fff",boxShadow:tab==="add"?`0 6px 28px ${T.glow}`:`0 4px 16px ${T.glow}55`,border:`2px solid ${tab==="add"?"transparent":T.border}`,transition:"all .25s"}}>
                  {t.ico}
                </div>
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
      {toast&&<ToastEl T={T} toast={toast}/>}
    </div>
  );
}

function ToastEl({T,toast}){
  const bg=toast.type==="err"?T.a4:toast.type==="warn"?"#f59e0b":T.a1;
  const fg=toast.type==="warn"?"#1a1000":"#fff";
  return<div style={{position:"fixed",top:76,left:"50%",zIndex:9999,padding:"12px 20px",borderRadius:12,whiteSpace:"nowrap",fontWeight:600,fontSize:14,fontFamily:"'DM Sans',sans-serif",background:bg,color:fg,animation:"toastAnim .25s ease",boxShadow:`0 6px 28px ${bg}55`,transform:"translateX(-50%)"}}>
    {toast.msg}
  </div>;
}
