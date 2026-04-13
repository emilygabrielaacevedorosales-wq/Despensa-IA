import { useState } from "react";

const P = {
  50:"#EEEDFE", 100:"#CECBF6", 200:"#AFA9EC",
  400:"#7F77DD", 600:"#534AB7", 800:"#3C3489", 900:"#26215C"
};

const CATS = { Granos:"🌾", Lácteos:"🥛", Verduras:"🥦", Carnes:"🥩", Otros:"📦" };

const initProds = [
  { id:1, nombre:"Arroz",   cantidad:3,   unidad:"kg", minimo:1, cat:"Granos"   },
  { id:2, nombre:"Harina",  cantidad:0.5, unidad:"kg", minimo:1, cat:"Granos"   },
  { id:3, nombre:"Leche",   cantidad:0,   unidad:"L",  minimo:2, cat:"Lácteos"  },
  { id:4, nombre:"Queso",   cantidad:1,   unidad:"un", minimo:1, cat:"Lácteos"  },
  { id:5, nombre:"Tomates", cantidad:4,   unidad:"un", minimo:3, cat:"Verduras" },
  { id:6, nombre:"Pollo",   cantidad:0,   unidad:"kg", minimo:1, cat:"Carnes"   },
];

const initLista = [
  { id:1, nombre:"Leche", checked:false, auto:true },
  { id:2, nombre:"Pollo", checked:false, auto:true },
];

const est  = (c,m) => c<=0 ? "agotado" : c<=m ? "poco" : "ok";
const ECOLORS = { ok:"#4CAF50", poco:"#FF9800", agotado:"#EF5350" };
const ELABELS = { ok:"OK", poco:"Bajo", agotado:"Agotado" };

const css = `
  @keyframes popIn { from{transform:scale(0.92);opacity:0} to{transform:scale(1);opacity:1} }
  .card { animation: popIn 0.18s ease; }
  .navbtn { transition: transform 0.12s; }
  .navbtn:active { transform: scale(0.88); }
  .pill-btn:active { transform: scale(0.95); }
`;

export default function App() {
  const [tab, setTab]         = useState(0);
  const [prods, setProds]     = useState(initProds);
  const [lista, setLista]     = useState(initLista);
  const [recetas, setRecetas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ nombre:"", cantidad:"", unidad:"kg", minimo:"1", cat:"Otros" });
  const [nuevoItem, setNuevoItem] = useState("");
  const [expanded, setExpanded]   = useState(null);

  const addProd = () => {
    if (!form.nombre.trim() || form.cantidad==="") return;
    const p = { id:Date.now(), nombre:form.nombre.trim(), cantidad:parseFloat(form.cantidad), unidad:form.unidad, minimo:parseFloat(form.minimo)||1, cat:form.cat };
    setProds(prev=>[...prev,p]);
    if (est(p.cantidad,p.minimo)==="agotado")
      setLista(l=>l.find(i=>i.nombre===p.nombre)?l:[...l,{id:Date.now()+1,nombre:p.nombre,checked:false,auto:true}]);
    setForm({ nombre:"", cantidad:"", unidad:"kg", minimo:"1", cat:"Otros" });
    setShowForm(false);
  };

  const cambiar = (id,d) => setProds(prev=>prev.map(p=>{
    if (p.id!==id) return p;
    const n = Math.max(0,parseFloat((p.cantidad+d).toFixed(2)));
    if (n<=0 && !lista.find(i=>i.nombre===p.nombre))
      setLista(l=>[...l,{id:Date.now(),nombre:p.nombre,checked:false,auto:true}]);
    return {...p,cantidad:n};
  }));

  const delProd = id => setProds(prev=>prev.filter(p=>p.id!==id));
  const toggle  = id => setLista(prev=>prev.map(i=>i.id===id?{...i,checked:!i.checked}:i));
  const delItem = id => setLista(prev=>prev.filter(i=>i.id!==id));
  const addItem = () => {
    if (!nuevoItem.trim()) return;
    setLista(prev=>[...prev,{id:Date.now(),nombre:nuevoItem.trim(),checked:false,auto:false}]);
    setNuevoItem("");
  };

  const sugerir = async () => {
    setLoading(true); setRecetas(null); setExpanded(null);
    const disp = prods.filter(p=>p.cantidad>0).map(p=>p.nombre).join(", ");
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.REACT_APP_GEMINI_KEY}`,
        {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            contents:[{ parts:[{ text:`Eres un chef. Ingredientes disponibles: ${disp}. Devuelve SOLO JSON válido sin backticks: {"recetas":[{"nombre":"...","emoji":"...","tiempo":"...","dificultad":"Fácil","ingredientes":["..."],"pasos":["..."]}]}. Exactamente 3 recetas.` }] }]
          })
        }
      );
      const data = await res.json();
      const txt = data.candidates[0].content.parts[0].text.replace(/```json|```/g,"").trim();
      setRecetas(JSON.parse(txt).recetas);
    } catch { setRecetas("error"); }
    setLoading(false);
  };

  const pendientes = lista.filter(i=>!i.checked).length;
  const agotados   = prods.filter(p=>est(p.cantidad,p.minimo)==="agotado").length;

  const inputStyle = { width:"100%", boxSizing:"border-box", borderRadius:14, border:`1.5px solid ${P[200]}`, padding:"10px 14px", fontSize:14, outline:"none", background:"#fff", color:"#1a1a2e" };

  return (
    <div style={{fontFamily:"var(--font-sans)",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",background:"#F8F7FF",minHeight:620}}>
      <style>{css}</style>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${P[600]},${P[400]})`,padding:"1.5rem 1.25rem 1.75rem",borderRadius:"0 0 28px 28px",marginBottom:"-12px",position:"relative",zIndex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <h1 style={{fontSize:24,fontWeight:500,margin:"0 0 4px",color:"#fff",letterSpacing:"-0.3px"}}>Mi Despensa 🛒</h1>
            <span style={{fontSize:12,color:P[100]}}>CASA-42 · 2 usuarios conectados</span>
          </div>
          {agotados>0 && (
            <div style={{background:"rgba(255,255,255,0.2)",borderRadius:14,padding:"8px 14px",textAlign:"center",backdropFilter:"blur(4px)"}}>
              <div style={{fontSize:20,fontWeight:500,color:"#fff"}}>{agotados}</div>
              <div style={{fontSize:10,color:P[100]}}>agotado{agotados>1?"s":""}</div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{flex:1,overflowY:"auto",padding:"1.5rem 1rem 1rem"}}>

        {/* ── DESPENSA ── */}
        {tab===0 && <>
          {prods.map(p=>{
            const e   = est(p.cantidad,p.minimo);
            const col = ECOLORS[e];
            const pct = Math.min(1, p.minimo>0 ? p.cantidad/(p.minimo*3) : 1);
            return (
              <div key={p.id} className="card" style={{background:"#fff",borderRadius:20,padding:"16px",marginBottom:12,boxShadow:`0 2px 0 ${P[100]}`}}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                  <div style={{width:46,height:46,borderRadius:16,background:P[50],display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                    {CATS[p.cat]||"📦"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:500,color:"#1a1a2e",marginBottom:2}}>{p.nombre}</div>
                    <div style={{fontSize:12,color:P[400]}}>{p.cat}</div>
                  </div>
                  <span style={{fontSize:12,fontWeight:500,padding:"4px 10px",borderRadius:99,background:col+"22",color:col}}>{ELABELS[e]}</span>
                  <button onClick={()=>delProd(p.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#ccc",padding:4,lineHeight:1}}>✕</button>
                </div>

                <div style={{height:7,borderRadius:99,background:P[50],marginBottom:12,overflow:"hidden"}}>
                  <div style={{height:"100%",width:(pct*100)+"%",background:`linear-gradient(90deg,${P[400]},${P[200]})`,borderRadius:99,transition:"width 0.4s ease"}} />
                </div>

                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,color:"#666"}}>{p.cantidad} {p.unidad}</span>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <button onClick={()=>cambiar(p.id,-1)} style={{width:34,height:34,borderRadius:99,border:`1.5px solid ${P[200]}`,background:"#fff",cursor:"pointer",fontSize:20,color:P[600],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500}}>−</button>
                    <span style={{fontSize:15,fontWeight:500,minWidth:36,textAlign:"center",color:"#1a1a2e"}}>{p.cantidad}</span>
                    <button onClick={()=>cambiar(p.id,1)} style={{width:34,height:34,borderRadius:99,border:"none",background:P[600],cursor:"pointer",fontSize:20,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500}}>+</button>
                  </div>
                </div>
              </div>
            );
          })}

          {showForm ? (
            <div className="card" style={{background:"#fff",borderRadius:20,padding:"1.25rem",marginTop:4,boxShadow:`0 2px 0 ${P[100]}`}}>
              <p style={{margin:"0 0 12px",fontWeight:500,color:P[600],fontSize:15}}>Nuevo producto</p>
              <input style={{...inputStyle,marginBottom:10}} placeholder="Nombre del producto" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} />
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <input style={{...inputStyle,flex:1}} type="number" placeholder="Cantidad" value={form.cantidad} onChange={e=>setForm(f=>({...f,cantidad:e.target.value}))} />
                <select style={{...inputStyle,flex:1}} value={form.unidad} onChange={e=>setForm(f=>({...f,unidad:e.target.value}))}>
                  {["kg","g","L","ml","un","pkg"].map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <input style={{...inputStyle,flex:1}} type="number" placeholder="Mínimo" value={form.minimo} onChange={e=>setForm(f=>({...f,minimo:e.target.value}))} />
                <select style={{...inputStyle,flex:1}} value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
                  {Object.keys(CATS).map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="pill-btn" onClick={addProd} style={{flex:1,padding:"11px 0",borderRadius:99,border:"none",background:P[600],cursor:"pointer",fontWeight:500,fontSize:14,color:"#fff"}}>Guardar</button>
                <button className="pill-btn" onClick={()=>setShowForm(false)} style={{flex:1,padding:"11px 0",borderRadius:99,border:`1.5px solid ${P[200]}`,background:"transparent",cursor:"pointer",fontSize:14,color:P[600]}}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button className="pill-btn" onClick={()=>setShowForm(true)} style={{width:"100%",padding:"14px 0",borderRadius:20,border:`2px dashed ${P[200]}`,background:"transparent",cursor:"pointer",color:P[400],fontSize:15,marginTop:4}}>
              + Agregar producto
            </button>
          )}
        </>}

        {/* ── COMPRAS ── */}
        {tab===1 && <>
          <div style={{display:"flex",gap:8,marginBottom:"1.25rem"}}>
            <input style={{...inputStyle,flex:1}} placeholder="Agregar ítem..." value={nuevoItem} onChange={e=>setNuevoItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItem()} />
            <button className="pill-btn" onClick={addItem} style={{width:46,height:46,borderRadius:99,border:"none",background:P[600],cursor:"pointer",fontSize:22,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>+</button>
          </div>

          {lista.length===0 && (
            <div style={{textAlign:"center",padding:"3rem 0"}}>
              <div style={{fontSize:48,marginBottom:12}}>🎉</div>
              <p style={{margin:0,fontSize:15,color:P[400]}}>¡Lista vacía!</p>
            </div>
          )}

          {lista.filter(i=>!i.checked).map(item=>(
            <div key={item.id} className="card" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#fff",borderRadius:18,marginBottom:10,boxShadow:`0 2px 0 ${P[100]}`}}>
              <div onClick={()=>toggle(item.id)} style={{width:24,height:24,borderRadius:99,border:`2px solid ${P[300]||P[200]}`,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}} />
              <span style={{flex:1,fontSize:15,color:"#1a1a2e"}}>{item.nombre}</span>
              {item.auto && <span style={{fontSize:11,padding:"3px 10px",borderRadius:99,background:P[50],color:P[600],fontWeight:500}}>auto</span>}
              <button onClick={()=>delItem(item.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#ccc",padding:4}}>✕</button>
            </div>
          ))}

          {lista.some(i=>i.checked) && <>
            <p style={{fontSize:13,color:P[400],margin:"1.5rem 0 10px",fontWeight:500}}>Comprados ✓</p>
            {lista.filter(i=>i.checked).map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#fff",borderRadius:18,marginBottom:10,opacity:0.45}}>
                <div onClick={()=>toggle(item.id)} style={{width:24,height:24,borderRadius:99,background:P[400],cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff"}}>✓</div>
                <span style={{flex:1,fontSize:15,color:"#999",textDecoration:"line-through"}}>{item.nombre}</span>
                <button onClick={()=>delItem(item.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#ccc",padding:4}}>✕</button>
              </div>
            ))}
            <button className="pill-btn" onClick={()=>setLista(l=>l.filter(i=>!i.checked))} style={{width:"100%",padding:"12px 0",borderRadius:99,border:`1.5px solid ${P[200]}`,background:"transparent",cursor:"pointer",fontSize:14,color:P[600],marginTop:4}}>
              Limpiar comprados
            </button>
          </>}
        </>}

        {/* ── RECETAS ── */}
        {tab===2 && <>
          <div style={{background:`linear-gradient(135deg,${P[50]},#fff)`,borderRadius:20,padding:"1.25rem",marginBottom:"1.25rem",border:`1.5px solid ${P[100]}`}}>
            <p style={{margin:"0 0 4px",fontSize:16,fontWeight:500,color:P[800]}}>¿Qué cocinar hoy? 👨‍🍳</p>
            <p style={{margin:"0 0 1rem",fontSize:13,color:P[400]}}>
              Tienes {prods.filter(p=>p.cantidad>0).length} ingredientes disponibles
            </p>
            <button className="pill-btn" onClick={sugerir} disabled={loading} style={{width:"100%",padding:"13px 0",borderRadius:99,border:"none",background:loading?P[200]:P[600],cursor:loading?"default":"pointer",fontWeight:500,fontSize:15,color:"#fff",transition:"background 0.2s"}}>
              {loading ? "✨ Generando recetas..." : "✨ Sugerir recetas"}
            </button>
          </div>

          {recetas==="error" && <p style={{color:"#EF5350",fontSize:14,textAlign:"center"}}>Algo salió mal. Intenta de nuevo.</p>}

          {Array.isArray(recetas) && recetas.map((r,i)=>(
            <div key={i} className="card" style={{background:"#fff",borderRadius:20,marginBottom:12,overflow:"hidden",boxShadow:`0 2px 0 ${P[100]}`}}>
              <div onClick={()=>setExpanded(expanded===i?null:i)} style={{padding:"16px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:52,height:52,borderRadius:18,background:P[50],display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,flexShrink:0}}>{r.emoji||"🍽"}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:16,fontWeight:500,color:"#1a1a2e",marginBottom:4}}>{r.nombre}</div>
                  <div style={{display:"flex",gap:8}}>
                    <span style={{fontSize:12,padding:"3px 10px",borderRadius:99,background:P[50],color:P[600]}}>⏱ {r.tiempo}</span>
                    <span style={{fontSize:12,padding:"3px 10px",borderRadius:99,background:P[50],color:P[600]}}>{r.dificultad}</span>
                  </div>
                </div>
                <div style={{width:28,height:28,borderRadius:99,background:P[50],display:"flex",alignItems:"center",justifyContent:"center",color:P[600],fontSize:14,transition:"transform 0.2s",transform:expanded===i?"rotate(180deg)":"rotate(0deg)"}}>▼</div>
              </div>
              {expanded===i && (
                <div style={{padding:"0 16px 18px",borderTop:`1.5px solid ${P[50]}`}}>
                  <p style={{fontSize:11,fontWeight:500,color:P[400],margin:"14px 0 8px",letterSpacing:"0.08em"}}>INGREDIENTES</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:4}}>
                    {r.ingredientes.map((ing,j)=>(
                      <span key={j} style={{background:P[50],borderRadius:99,padding:"5px 12px",fontSize:13,color:P[800]}}>{ing}</span>
                    ))}
                  </div>
                  <p style={{fontSize:11,fontWeight:500,color:P[400],margin:"14px 0 8px",letterSpacing:"0.08em"}}>PREPARACIÓN</p>
                  {r.pasos.map((paso,j)=>(
                    <div key={j} style={{display:"flex",gap:12,marginBottom:12,alignItems:"flex-start"}}>
                      <div style={{width:26,height:26,borderRadius:99,background:P[600],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:500,color:"#fff",flexShrink:0,marginTop:1}}>{j+1}</div>
                      <p style={{margin:0,fontSize:14,color:"#333",lineHeight:1.65}}>{paso}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>}
      </div>

      {/* Bottom nav */}
      <div style={{borderTop:`1.5px solid ${P[100]}`,display:"flex",background:"#fff",borderRadius:"20px 20px 0 0",paddingBottom:4}}>
        {[["🏠","Despensa",null],["🛒","Compras",pendientes||null],["👨‍🍳","Recetas",null]].map(([icon,lbl,badge],i)=>(
          <button key={i} className="navbtn" onClick={()=>setTab(i)} style={{flex:1,padding:"12px 0 8px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
            <div style={{width:44,height:44,borderRadius:16,background:tab===i?P[50]:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,transition:"background 0.2s"}}>{icon}</div>
            <span style={{fontSize:11,fontWeight:tab===i?500:400,color:tab===i?P[600]:"#aaa",transition:"color 0.2s"}}>{lbl}</span>
            {badge>0 && <div style={{position:"absolute",top:8,right:"calc(50% - 20px)",width:18,height:18,borderRadius:99,background:"#EF5350",color:"#fff",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500}}>{badge}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
