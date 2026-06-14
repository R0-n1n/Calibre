import { useState, useCallback } from "react";

// Architecture: Browser → /api/* (FastAPI) → Groq
// This file never calls Groq or any AI provider directly.

var WRAP_S  = { minHeight:"100vh", background:"linear-gradient(160deg,#07070f 0%,#0d0d1c 60%,#0a0a16 100%)", fontFamily:"'Inter',system-ui,sans-serif", color:"#e0e0f0" };
var HDR_S   = { display:"flex", alignItems:"center", gap:12, padding:"16px 28px", background:"rgba(255,255,255,0.025)", borderBottom:"1px solid rgba(255,255,255,0.06)" };
var LOGO_S  = { width:38, height:38, borderRadius:10, flexShrink:0, background:"linear-gradient(135deg,#7c6fff,#4a3fbf)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 };
var MAIN_S  = { maxWidth:960, margin:"0 auto", padding:"32px 24px 80px" };
var CARD_S  = { background:"rgba(255,255,255,0.038)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:"22px" };
var TA_S    = { width:"100%", minHeight:124, resize:"vertical", background:"rgba(255,255,255,0.035)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:12, padding:"13px 15px", color:"#dde", fontSize:13.5, fontFamily:"inherit", lineHeight:1.65, outline:"none", boxSizing:"border-box" };
var INP_S   = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:8, padding:"9px 12px", color:"#dde", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
var GHOST_S = { background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 15px", color:"#888", cursor:"pointer", fontSize:13, fontWeight:500 };
var LABEL_S = { fontSize:11, fontWeight:700, letterSpacing:"0.08em", color:"#6060a0", textTransform:"uppercase", marginBottom:10 };
var SECT_ICONS = { summary:"📝", experience:"💼", skills:"🛠️", education:"🎓" };

function bigBtnS(ok) {
  return { width:"100%", padding:"15px", border:"none", borderRadius:12,
    background:ok?"linear-gradient(135deg,#7c6fff,#4a3fbf)":"rgba(255,255,255,0.07)",
    color:ok?"#fff":"#555", fontSize:15, fontWeight:700, cursor:ok?"pointer":"not-allowed" };
}
function tabBS(a) {
  return { padding:"8px 14px", border:"none", borderRadius:8, fontSize:12.5, fontWeight:600,
    cursor:"pointer", background:a?"rgba(124,111,255,0.2)":"transparent",
    color:a?"#b0a8ff":"#666", outline:a?"1px solid rgba(124,111,255,0.35)":"none" };
}
function modeBS(a) {
  return { flex:1, padding:"12px 20px",
    border:"1px solid "+(a?"rgba(124,111,255,0.5)":"rgba(255,255,255,0.08)"),
    borderRadius:12, background:a?"rgba(124,111,255,0.15)":"rgba(255,255,255,0.03)",
    color:a?"#b0a8ff":"#666", cursor:"pointer", fontSize:14, fontWeight:600 };
}
function dropS(ov) {
  return { border:"2px dashed "+(ov?"#7c6fff":"rgba(255,255,255,0.1)"),
    borderRadius:12, padding:"36px 20px", textAlign:"center", cursor:"pointer",
    background:ov?"rgba(124,111,255,0.07)":"rgba(255,255,255,0.015)" };
}
function cpBtnS(d) {
  return { padding:"7px 14px", border:"1px solid "+(d?"#4ade8040":"rgba(255,255,255,0.1)"),
    borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer",
    background:d?"rgba(74,222,128,0.12)":"rgba(255,255,255,0.05)", color:d?"#4ade80":"#888" };
}
function purpBS(l) {
  return { padding:"7px 16px", border:"none", borderRadius:8, fontSize:12, fontWeight:700,
    background:l?"rgba(124,111,255,0.3)":"linear-gradient(135deg,#7c6fff,#4a3fbf)",
    color:"#fff", cursor:l?"not-allowed":"pointer" };
}
function scoreCol(s) { return s>=75?"#4ade80":s>=50?"#fbbf24":"#f87171"; }
function verdictCol(v) { return v==="Strong Match"?"#4ade80":v==="Partial Match"?"#fbbf24":"#f87171"; }
function priTheme(p) {
  var m = {
    High:   {bg:"rgba(248,113,113,0.09)",bd:"rgba(248,113,113,0.22)",c:"#f87171",bb:"rgba(248,113,113,0.18)"},
    Medium: {bg:"rgba(251,191,36,0.08)", bd:"rgba(251,191,36,0.22)", c:"#fbbf24",bb:"rgba(251,191,36,0.18)"},
    Low:    {bg:"rgba(74,222,128,0.07)", bd:"rgba(74,222,128,0.2)",  c:"#4ade80",bb:"rgba(74,222,128,0.15)"}
  };
  return m[p]||{bg:"rgba(255,255,255,0.04)",bd:"rgba(255,255,255,0.1)",c:"#888",bb:"rgba(255,255,255,0.08)"};
}
function impTheme(i) {
  var m = {
    High:   {bg:"rgba(248,113,113,0.09)",bd:"rgba(248,113,113,0.25)",c:"#f87171"},
    Medium: {bg:"rgba(251,191,36,0.07)", bd:"rgba(251,191,36,0.25)", c:"#fbbf24"},
    Low:    {bg:"rgba(74,222,128,0.06)", bd:"rgba(74,222,128,0.22)", c:"#4ade80"}
  };
  return m[i]||{bg:"rgba(255,255,255,0.04)",bd:"rgba(255,255,255,0.1)",c:"#888"};
}

async function apiPost(endpoint, formData) {
  var res = await fetch(endpoint, {method:"POST", body:formData});
  if (!res.ok) {
    var err = {detail:"Server error"};
    try { err = await res.json(); } catch(e) {}
    throw new Error(err.detail||"Request failed ("+res.status+")");
  }
  return res.json();
}

function ScoreRing({score, sz}) {
  var s=sz||130, r=s*0.4, c=2*Math.PI*r, col=scoreCol(score), off=c-(score/100)*c;
  return (
    <div style={{position:"relative",width:s,height:s,flexShrink:0}}>
      <svg width={s} height={s} viewBox={"0 0 "+s+" "+s}>
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="#1e1e35" strokeWidth={s*0.085}/>
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={col} strokeWidth={s*0.085}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          transform={"rotate(-90 "+(s/2)+" "+(s/2)+")"}
          style={{transition:"stroke-dashoffset 1.2s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:s*0.22,fontWeight:800,color:col,lineHeight:1}}>{score}</span>
        <span style={{fontSize:s*0.085,color:"#555",marginTop:2}}>/ 100</span>
      </div>
    </div>
  );
}

function Chip({label, color}) {
  return (
    <span style={{display:"inline-block",padding:"4px 11px",borderRadius:20,fontSize:12,
      fontWeight:500,margin:"3px",background:color+"14",border:"1px solid "+color+"38",color:color}}>
      {label}
    </span>
  );
}

function Card({children, style}) {
  return <div style={Object.assign({},CARD_S,style||{})}>{children}</div>;
}

export default function App() {
  var [mode,setMode]           = useState("single");
  var [resumeFile,setRF]       = useState(null);
  var [resumeText,setRT]       = useState("");
  var [jd,setJd]               = useState("");
  var [results,setResults]     = useState(null);
  var [loading,setLoading]     = useState(false);
  var [jobs,setJobs]           = useState([{id:1,company:"",jd:""},{id:2,company:"",jd:""}]);
  var [cmpRes,setCmpRes]       = useState(null);
  var [cmpLoading,setCmpL]     = useState(false);
  var [selJob,setSelJob]       = useState(null);
  var [drag,setDrag]           = useState(false);
  var [tab,setTab]             = useState("overview");
  var [error,setError]         = useState("");
  var [rewrites,setRewrites]   = useState({});
  var [rewriting,setRewriting] = useState(null);
  var [cover,setCover]         = useState("");
  var [coverLoading,setCoverL] = useState(false);
  var [copied,setCopied]       = useState(null);
  var [expandedQ,setExpandedQ] = useState(null);

  var readFile = function(f) {
    if (!f) return;
    var name=(f.name||"").toLowerCase(), type=(f.type||"").toLowerCase();
    var valid=name.endsWith(".pdf")||name.endsWith(".docx")||type.includes("pdf")||type.includes("wordprocessingml");
    if (!valid) { setError("Please upload a PDF or DOCX file."); return; }
    setRF(f); setRT(""); setError("");
  };
  var onDrop = useCallback(function(e) { e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files[0]); }, []);

  async function analyze() {
    if (!resumeFile||!jd.trim()) { setError("Upload a resume and paste a job description."); return; }
    setLoading(true); setError(""); setResults(null); setRewrites({}); setCover(""); setExpandedQ(null);
    try {
      var fd=new FormData(); fd.append("resume",resumeFile); fd.append("job_description",jd);
      var data=await apiPost("/api/analyze",fd);
      setRT(data.resume_text||""); setResults(data); setTab("overview");
    } catch(e) { setError(e.message||"Analysis failed — make sure the backend is running."); }
    finally { setLoading(false); }
  }

  async function compareAll() {
    var valid=jobs.filter(function(j){return j.jd.trim();});
    if (!resumeFile||!valid.length) { setError("Upload a resume and fill in at least one job."); return; }
    setCmpL(true); setError(""); setCmpRes(null); setSelJob(null);
    try {
      var all=await Promise.all(valid.map(async function(job) {
        var fd=new FormData(); fd.append("resume",resumeFile); fd.append("job_description",job.jd);
        var d=await apiPost("/api/analyze",fd);
        if (!resumeText&&d.resume_text) setRT(d.resume_text);
        return Object.assign({},d,{company:job.company||("Job "+job.id),jd:job.jd});
      }));
      setCmpRes(all.slice().sort(function(a,b){return b.score-a.score;}));
    } catch(e) { setError(e.message||"Comparison failed."); }
    finally { setCmpL(false); }
  }

  async function rewrite(sec) {
    var arData=selJob!==null?cmpRes[selJob]:results;
    var orig=arData&&arData.resume_sections&&arData.resume_sections[sec];
    if (!orig) return;
    setRewriting(sec);
    var jobDesc=selJob!==null?cmpRes[selJob].jd:jd;
    try {
      var fd=new FormData(); fd.append("section",sec); fd.append("content",orig); fd.append("job_description",jobDesc);
      var data=await apiPost("/api/rewrite",fd);
      setRewrites(function(p){return Object.assign({},p,{[sec]:data.rewritten});});
    } catch(e) { setError("Rewrite failed: "+(e.message||"unknown error")); }
    finally { setRewriting(null); }
  }

  async function genCover() {
    var r=selJob!==null?cmpRes[selJob]:results;
    var jobDesc=selJob!==null?cmpRes[selJob].jd:jd;
    setCoverL(true); setCover("");
    var resumeData=resumeText||Object.entries(r.resume_sections||{}).filter(function(kv){return kv[1];}).map(function(kv){return kv[0].toUpperCase()+":\n"+kv[1];}).join("\n\n");
    try {
      var fd=new FormData(); fd.append("resume_text",resumeData); fd.append("job_description",jobDesc); fd.append("analysis",JSON.stringify(r));
      var data=await apiPost("/api/cover-letter",fd);
      setCover(data.cover_letter);
    } catch(e) { setError("Cover letter failed: "+(e.message||"unknown error")); }
    finally { setCoverL(false); }
  }

  function copyText(t,k) { navigator.clipboard.writeText(t); setCopied(k); setTimeout(function(){setCopied(null);},2000); }
  function resetAll() { setResults(null);setCmpRes(null);setSelJob(null);setRewrites({});setCover("");setError("");setTab("overview");setExpandedQ(null); }

  var ar=selJob!==null?(cmpRes&&cmpRes[selJob]):results;
  var showInput=!results&&!cmpRes;
  var showCmpTable=!!cmpRes&&selJob===null;
  var showAnalysis=(!!results||selJob!==null)&&!!ar;
  var TABS=[{id:"overview",label:"📊 Overview"},{id:"interview",label:"🎤 Interview Prep"},{id:"gaps",label:"⚡ Gap Actions"},{id:"cover",label:"✉️ Cover Letter"},{id:"tips",label:"💡 Tips"},{id:"rewriter",label:"✍️ Rewriter"}];

  return (
    <div style={WRAP_S}>
      <div style={HDR_S}>
        <div style={LOGO_S}>📄</div>
        <div>
          <div style={{fontSize:19,fontWeight:800,color:"#fff",letterSpacing:"-0.3px"}}>ResumeIQ</div>
          <div style={{fontSize:11,color:"#555"}}>AI Resume Analyzer · Powered by Groq · llama-3.3-70b-versatile</div>
        </div>
      </div>

      <div style={MAIN_S}>

        {showInput&&(
          <div>
            <div style={{textAlign:"center",marginBottom:32}}>
              <h1 style={{fontSize:28,fontWeight:800,color:"#fff",marginBottom:8}}>Analyze Your Resume</h1>
              <p style={{fontSize:14,color:"#555"}}>ATS score · Skill gap · Interview prep · Gap projects · Cover letter</p>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:22}}>
              <button style={modeBS(mode==="single")} onClick={function(){setMode("single");}}>🔍 Single Job Analysis</button>
              <button style={modeBS(mode==="compare")} onClick={function(){setMode("compare");}}>📊 Compare Multiple Jobs</button>
            </div>

            <Card style={{marginBottom:18}}>
              <div style={LABEL_S}>📎 Resume (PDF or DOCX)</div>
              <div style={dropS(drag)} onDrop={onDrop}
                onDragOver={function(e){e.preventDefault();setDrag(true);}} onDragLeave={function(){setDrag(false);}}
                onClick={function(){document.getElementById("rf-input").click();}}>
                <input id="rf-input" type="file" accept=".pdf,.docx" style={{display:"none"}} onChange={function(e){readFile(e.target.files[0]);}}/>
                {resumeFile?(
                  <div><div style={{fontSize:32,marginBottom:6}}>✅</div><div style={{color:"#b0a8ff",fontWeight:600,fontSize:13}}>{resumeFile.name}</div><div style={{color:"#444",fontSize:11,marginTop:5}}>Click to replace</div></div>
                ):(
                  <div><div style={{fontSize:36,marginBottom:8}}>📁</div><div style={{color:"#bbb",fontWeight:600,fontSize:14}}>Drop your resume here</div><div style={{color:"#444",fontSize:12,marginTop:5}}>or click to browse · PDF or DOCX</div></div>
                )}
              </div>
            </Card>

            {mode==="single"&&(
              <Card style={{marginBottom:18}}>
                <div style={LABEL_S}>💼 Job Description</div>
                <textarea style={TA_S} placeholder="Paste the full job description here…" value={jd} onChange={function(e){setJd(e.target.value);}}/>
                <div style={{fontSize:11,color:"#444",marginTop:6,textAlign:"right"}}>{jd.length} chars</div>
              </Card>
            )}

            {mode==="compare"&&(
              <div style={{marginBottom:18}}>
                {jobs.map(function(job,idx){
                  return (
                    <Card key={job.id} style={{marginBottom:12}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                        <div style={LABEL_S}>{"Job #"+(idx+1)}</div>
                        {jobs.length>1&&<button style={Object.assign({},GHOST_S,{padding:"4px 10px",fontSize:12})} onClick={function(){setJobs(function(p){return p.filter(function(j){return j.id!==job.id;});});}}>✕</button>}
                      </div>
                      <input style={Object.assign({},INP_S,{marginBottom:10})} placeholder="Company / Role (optional)" value={job.company} onChange={function(e){var v=e.target.value;setJobs(function(p){return p.map(function(j){return j.id===job.id?Object.assign({},j,{company:v}):j;});});}}/>
                      <textarea style={Object.assign({},TA_S,{minHeight:100})} placeholder="Paste job description…" value={job.jd} onChange={function(e){var v=e.target.value;setJobs(function(p){return p.map(function(j){return j.id===job.id?Object.assign({},j,{jd:v}):j;});});}}/>
                    </Card>
                  );
                })}
                {jobs.length<6&&<button style={Object.assign({},GHOST_S,{display:"block",width:"100%",textAlign:"center",marginBottom:4})} onClick={function(){setJobs(function(p){return p.concat([{id:Date.now(),company:"",jd:""}]);});}}>+ Add Another Job</button>}
              </div>
            )}

            {error&&<div style={{color:"#f87171",textAlign:"center",fontSize:13,marginBottom:12}}>⚠️ {error}</div>}

            {mode==="single"&&<button style={bigBtnS(!loading&&!!resumeFile&&!!jd.trim())} onClick={analyze} disabled={loading||!resumeFile||!jd.trim()}>{loading?"✦ Analyzing…":"🔍 Analyze Resume"}</button>}
            {mode==="compare"&&<button style={bigBtnS(!cmpLoading&&!!resumeFile&&jobs.some(function(j){return j.jd.trim();}))} onClick={compareAll} disabled={cmpLoading||!resumeFile||!jobs.some(function(j){return j.jd.trim();})}>{cmpLoading?"✦ Analyzing…":"📊 Compare "+jobs.filter(function(j){return j.jd.trim();}).length+" Jobs"}</button>}
          </div>
        )}

        {showCmpTable&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <div><h2 style={{fontSize:20,fontWeight:800,color:"#fff",margin:0}}>Job Comparison</h2><p style={{fontSize:13,color:"#555",margin:"4px 0 0"}}>Ranked by compatibility — click any row for full analysis</p></div>
              <button style={GHOST_S} onClick={resetAll}>← New Analysis</button>
            </div>
            {cmpRes.map(function(r,i){
              var vc=verdictCol(r.verdict);
              return (
                <Card key={i} style={{marginBottom:12,cursor:"pointer",position:"relative",border:"1px solid "+(i===0?"rgba(124,111,255,0.3)":"rgba(255,255,255,0.07)")}}
                  onClick={function(){setSelJob(i);setTab("overview");setRewrites({});setCover("");setExpandedQ(null);}}>
                  {i===0&&<div style={{position:"absolute",top:-10,right:16,background:"linear-gradient(135deg,#7c6fff,#4a3fbf)",borderRadius:20,padding:"2px 12px",fontSize:11,fontWeight:700,color:"#fff"}}>🏆 Best Match</div>}
                  <div style={{display:"flex",alignItems:"center",gap:20}}>
                    <ScoreRing score={r.score} sz={80}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:6}}>{r.company}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:12,padding:"3px 10px",borderRadius:20,background:vc+"14",border:"1px solid "+vc+"35",color:vc,fontWeight:600}}>{r.verdict}</span>
                        <span style={{fontSize:12,color:"#4ade80"}}>{"✅ "+(r.matched_skills||[]).length+" matched"}</span>
                        <span style={{fontSize:12,color:"#f87171"}}>{"❌ "+(r.missing_skills||[]).length+" missing"}</span>
                      </div>
                      <p style={{fontSize:13,color:"#777",margin:0,lineHeight:1.5}}>{r.summary?r.summary.substring(0,140)+"…":""}</p>
                    </div>
                    <span style={{color:"#555",fontSize:18}}>›</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {showAnalysis&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button style={GHOST_S} onClick={selJob!==null?function(){setSelJob(null);}:resetAll}>{selJob!==null?"← Comparison":"← New Analysis"}</button>
                {selJob!==null&&<span style={{fontSize:13,color:"#b0a8ff",fontWeight:600}}>{ar.company}</span>}
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {TABS.map(function(t){return <button key={t.id} style={tabBS(tab===t.id)} onClick={function(){setTab(t.id);}}>{t.label}</button>;})}
              </div>
            </div>
            {error&&<div style={{color:"#f87171",fontSize:13,marginBottom:14}}>⚠️ {error}</div>}

            {tab==="overview"&&(
              <div>
                <Card style={{display:"flex",alignItems:"center",gap:28,marginBottom:18}}>
                  <ScoreRing score={ar.score}/>
                  <div style={{flex:1}}>
                    <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",borderRadius:20,marginBottom:10,background:verdictCol(ar.verdict)+"14",border:"1px solid "+verdictCol(ar.verdict)+"35"}}>
                      <span>{ar.verdict==="Strong Match"?"✅":ar.verdict==="Partial Match"?"⚠️":"❌"}</span>
                      <span style={{fontWeight:700,fontSize:13,color:verdictCol(ar.verdict)}}>{ar.verdict}</span>
                    </div>
                    <p style={{fontSize:14,color:"#aaa",lineHeight:1.7,margin:0}}>{ar.summary}</p>
                  </div>
                </Card>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                  <Card><div style={LABEL_S}>✅ Matched Skills</div>{(ar.matched_skills||[]).length?(ar.matched_skills||[]).map(function(s,i){return <Chip key={i} label={s} color="#4ade80"/>;}):<span style={{color:"#444",fontSize:13}}>None detected</span>}</Card>
                  <Card><div style={LABEL_S}>❌ Missing Skills</div>{(ar.missing_skills||[]).length?(ar.missing_skills||[]).map(function(s,i){return <Chip key={i} label={s} color="#f87171"/>;}):<span style={{color:"#444",fontSize:13}}>No major gaps</span>}</Card>
                </div>
                {(ar.ats_warnings||[]).length>0&&(
                  <Card><div style={LABEL_S}>⚠️ ATS Risk Flags</div>{(ar.ats_warnings||[]).map(function(w,i){return <div key={i} style={{display:"flex",gap:10,marginBottom:9,fontSize:13,color:"#ccc",alignItems:"flex-start"}}><span style={{color:"#fbbf24",flexShrink:0}}>▸</span><span>{w}</span></div>;})}</Card>
                )}
              </div>
            )}

            {tab==="interview"&&(
              <div>
                <p style={{fontSize:13,color:"#555",marginBottom:18}}>{(ar.interview_questions||[]).length} predicted questions. Tap each to see how to answer.</p>
                {(ar.interview_questions||[]).map(function(q,i){
                  var open=expandedQ===i;
                  return (
                    <div key={i} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,marginBottom:10,overflow:"hidden",cursor:"pointer"}} onClick={function(){setExpandedQ(open?null:i);}}>
                      <div style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                        <div style={{display:"flex",gap:12,alignItems:"flex-start",flex:1}}>
                          <span style={{width:26,height:26,borderRadius:"50%",background:"rgba(124,111,255,0.2)",border:"1px solid rgba(124,111,255,0.35)",color:"#b0a8ff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{"Q"+(i+1)}</span>
                          <span style={{fontSize:14,fontWeight:600,color:"#e0e0f0",lineHeight:1.5}}>{q.question}</span>
                        </div>
                        <span style={{color:"#555",fontSize:14,flexShrink:0}}>{open?"▲":"▼"}</span>
                      </div>
                      {open&&(
                        <div style={{padding:"0 20px 18px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                          <div style={{marginTop:14,marginBottom:12}}>
                            <div style={{fontSize:11,fontWeight:700,color:"#f87171",letterSpacing:"0.07em",marginBottom:6}}>WHY THEY'LL ASK THIS</div>
                            <p style={{fontSize:13,color:"#aaa",lineHeight:1.65,margin:0}}>{q.why_asked}</p>
                          </div>
                          <div style={{background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:10,padding:"14px"}}>
                            <div style={{fontSize:11,fontWeight:700,color:"#4ade80",letterSpacing:"0.07em",marginBottom:6}}>💡 YOUR TALKING POINT</div>
                            <p style={{fontSize:13,color:"#d5d5e8",lineHeight:1.65,margin:0}}>{q.talking_point}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tab==="gaps"&&(
              <div>
                <p style={{fontSize:13,color:"#555",marginBottom:18}}>For each missing skill — a concrete project to build it and add to your resume.</p>
                {(ar.gap_projects||[]).length>0?(ar.gap_projects||[]).map(function(g,i){
                  var it=impTheme(g.impact);
                  return (
                    <Card key={i} style={{marginBottom:12,background:it.bg,border:"1px solid "+it.bd}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                        <div><div style={{fontSize:11,fontWeight:700,color:"#9090cc",letterSpacing:"0.06em"}}>MISSING SKILL</div><div style={{fontSize:18,fontWeight:700,color:"#fff",marginTop:3}}>{g.skill}</div></div>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
                          <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:it.c+"20",border:"1px solid "+it.c+"40",color:it.c}}>{g.impact+" Impact"}</span>
                          <span style={{fontSize:11,color:"#666"}}>{"⏱ "+g.timeline}</span>
                        </div>
                      </div>
                      <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"12px 14px"}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#b0a8ff",letterSpacing:"0.07em",marginBottom:6}}>🛠 BUILD THIS PROJECT</div>
                        <p style={{fontSize:13.5,color:"#ddd",lineHeight:1.65,margin:0}}>{g.project}</p>
                      </div>
                    </Card>
                  );
                }):<Card><p style={{color:"#555",margin:0,fontSize:13}}>No major skill gaps — strong position!</p></Card>}
              </div>
            )}

            {tab==="cover"&&(
              <div>
                {!cover&&!coverLoading&&(
                  <Card style={{textAlign:"center",padding:"44px 32px"}}>
                    <div style={{fontSize:52,marginBottom:16}}>✉️</div>
                    <h3 style={{color:"#fff",marginBottom:8,fontSize:19}}>Generate Cover Letter</h3>
                    <p style={{color:"#666",fontSize:13,lineHeight:1.65,maxWidth:400,margin:"0 auto 24px"}}>Personalized to this role. Highlights your strengths and addresses gaps strategically.</p>
                    <button style={{padding:"13px 36px",border:"none",borderRadius:12,background:"linear-gradient(135deg,#7c6fff,#4a3fbf)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}} onClick={genCover}>✨ Generate Cover Letter</button>
                  </Card>
                )}
                {coverLoading&&<Card style={{textAlign:"center",padding:"44px"}}><div style={{fontSize:32,marginBottom:12}}>✦</div><p style={{color:"#888",fontSize:14}}>Writing your cover letter…</p></Card>}
                {cover&&(
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <div style={LABEL_S}>✉️ Your Cover Letter</div>
                      <div style={{display:"flex",gap:8}}>
                        <button style={cpBtnS(copied==="cover")} onClick={function(){copyText(cover,"cover");}}>{copied==="cover"?"✓ Copied":"📋 Copy"}</button>
                        <button style={Object.assign({},GHOST_S,{padding:"7px 14px",fontSize:12})} onClick={genCover}>↺ Regenerate</button>
                      </div>
                    </div>
                    <Card><pre style={{fontSize:13.5,color:"#dde",lineHeight:1.85,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{cover}</pre></Card>
                  </div>
                )}
              </div>
            )}

            {tab==="tips"&&(
              <div>
                <p style={{fontSize:13,color:"#555",marginBottom:18}}>{(ar.improvement_tips||[]).length+" suggestions — tackle High priority first."}</p>
                {(ar.improvement_tips||[]).map(function(t,i){
                  var pt=priTheme(t.priority);
                  return (
                    <div key={i} style={{padding:"14px 16px",borderRadius:12,marginBottom:10,background:pt.bg,border:"1px solid "+pt.bd}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7,alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:700,color:"#9090cc"}}>{t.section}</span>
                        <span style={{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:10,background:pt.bb,color:pt.c}}>{t.priority}</span>
                      </div>
                      <p style={{margin:0,fontSize:13.5,color:"#ccc",lineHeight:1.65}}>{t.tip}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {tab==="rewriter"&&(
              <div>
                <p style={{fontSize:13,color:"#555",marginBottom:18}}>Click <strong style={{color:"#b0a8ff"}}>Rewrite</strong> on any section for a JD-tailored version.</p>
                {Object.entries(ar.resume_sections||{}).map(function(entry){
                  var sec=entry[0], content=entry[1];
                  if (!content||content.length<5) return null;
                  var rwt=rewrites[sec], isL=rewriting===sec;
                  return (
                    <div key={sec} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"18px 20px",marginBottom:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span>{SECT_ICONS[sec]||"📄"}</span>
                          <span style={{fontSize:13,fontWeight:700,color:"#a0a0cc",textTransform:"capitalize"}}>{sec}</span>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          {rwt&&<button style={cpBtnS(copied===sec)} onClick={function(){copyText(rwt,sec);}}>{copied===sec?"✓ Copied":"📋 Copy"}</button>}
                          <button style={purpBS(isL)} disabled={!!rewriting} onClick={function(){rewrite(sec);}}>{isL?"✦ Rewriting…":"✨ Rewrite"}</button>
                        </div>
                      </div>
                      {rwt?(
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                          <div><div style={{fontSize:10,fontWeight:700,color:"#444",letterSpacing:"0.08em",marginBottom:7}}>ORIGINAL</div><p style={{fontSize:13,color:"#666",lineHeight:1.7,whiteSpace:"pre-wrap",margin:0}}>{content}</p></div>
                          <div style={{borderLeft:"1px solid rgba(255,255,255,0.07)",paddingLeft:14}}><div style={{fontSize:10,fontWeight:700,color:"#4ade8099",letterSpacing:"0.08em",marginBottom:7}}>AI REWRITTEN ✨</div><p style={{fontSize:13,color:"#ddd",lineHeight:1.7,whiteSpace:"pre-wrap",margin:0}}>{rwt}</p></div>
                        </div>
                      ):<p style={{fontSize:13,color:"#666",lineHeight:1.7,whiteSpace:"pre-wrap",margin:0}}>{content}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
