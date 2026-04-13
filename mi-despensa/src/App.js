import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

const P = {
  50:"#EEEDFE", 100:"#CECBF6", 200:"#AFA9EC",
  400:"#7F77DD", 600:"#534AB7", 800:"#3C3489", 900:"#26215C"
};

const CATS = { Granos:"🌾", Lácteos:"🥛", Verduras:"🥦", Carnes:"🥩", Otros:"📦" };

const est  = (c,m) => c<=0 ? "agotado" : c<=m ? "poco" : "ok";
const ECOLORS = { ok:"#4CAF50", poco:"#FF9800", agotado:"#EF5350" };
const ELABELS = { ok:"OK", poco:"Bajo", agotado:"Agotado" };

const css = `
  @keyframes popIn { from{transform:scale(0.92);opacity:0} to{transform:scale(1);opacity:1} }
  .card { animation: popIn 0.18s ease; }
  .navbtn { transition: transform 0.12s; }
  @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
  .loading-skeleton { animation: pulse 1.5s infinite ease-in-out; }
  .navbtn:active { transform: scale(0.88); }
  .pill-btn:active { transform: scale(0.95); }
`;

const genId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default function App() {
  const [user, setUser]         = useState(localStorage.getItem("pantry_user") || "");
  const [pantryId, setPantryId] = useState(localStorage.getItem("pantry_id") || "");
  const [pantryName, setPantryName] = useState("Mi Hogar");

  const [tab, setTab]         = useState(0);
  const [prods, setProds]     = useState([]);
  const [lista, setLista]     = useState([]);
  const [logros, setLogros]   = useState([]);
  const [recetas, setRecetas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ nombre:"", cantidad:"", unidad:"kg", minimo:"1", cat:"Otros" });
  const [nuevoItem, setNuevoItem] = useState("");
  const [expanded, setExpanded]   = useState(null);
  const [editName, setEditName]   = useState(false);

  // Suscripción a datos de Firebase
  useEffect(() => {
    if (!pantryId) return;

    // Cargar Info de la Despensa
    const unsubPantry = onSnapshot(doc(db, "pantries", pantryId), (d) => {
      if (d.exists()) setPantryName(d.data().name || "Mi Hogar");
    });

    const qProds = query(collection(db, "pantries", pantryId, "productos"), orderBy("nombre"));
    const unsubProds = onSnapshot(qProds, (snap) => {
      setProds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qLista = collection(db, "pantries", pantryId, "lista");
    const unsubLista = onSnapshot(qLista, (snap) => {
      setLista(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qRecetas = query(collection(db, "pantries", pantryId, "sugerencias"), orderBy("createdAt", "desc"), limit(1));
    const unsubRecetas = onSnapshot(qRecetas, (snap) => {
      if (!snap.empty) setRecetas(snap.docs[0].data().recetas);
    });

    const qLogros = query(collection(db, "pantries", pantryId, "logros"), orderBy("createdAt", "desc"));
    const unsubLogros = onSnapshot(qLogros, (snap) => {
      setLogros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubPantry(); unsubProds(); unsubLista(); unsubRecetas(); unsubLogros(); };
  }, [pantryId]);

  const setupPantry = async (id, isNew = false) => {
    if (!user.trim()) return alert("Por favor, ingresa tu nombre primero");
    try {
      // Autenticación anónima para cumplir con las reglas de seguridad de Firebase
      await signInAnonymously(auth);
      
      if (isNew) {
        await setDoc(doc(db, "pantries", id), { name: "Nueva Despensa", createdAt: serverTimestamp() });
      } else {
        const d = await getDoc(doc(db, "pantries", id));
        if (!d.exists()) return alert("Código de despensa no encontrado");
      }
      localStorage.setItem("pantry_id", id);
      localStorage.setItem("pantry_user", user);
      setPantryId(id);
    } catch (err) {
      console.error("Error detallado:", err);
      alert("Error al conectar: " + err.message);
    }
  };

  const updatePantryName = async (val) => {
    await updateDoc(doc(db, "pantries", pantryId), { name: val });
    setEditName(false);
  };

  const addProd = async () => {
    if (!form.nombre.trim() || form.cantidad==="") return;
    const p = { nombre:form.nombre.trim(), cantidad:parseFloat(form.cantidad), unidad:form.unidad, minimo:parseFloat(form.minimo)||1, cat:form.cat, createdAt: serverTimestamp() };
    
    await addDoc(collection(db, "pantries", pantryId, "productos"), p);
    
    if (est(p.cantidad, p.minimo) === "agotado") {
      if (!lista.find(i => i.nombre === p.nombre)) {
        await addDoc(collection(db, "pantries", pantryId, "lista"), { nombre: p.nombre, checked: false, auto: true });
      }
    }
    setForm({ nombre:"", cantidad:"", unidad:"kg", minimo:"1", cat:"Otros" });
    setShowForm(false);
  };

  const cambiar = async (id, d) => {
    const p = prods.find(x => x.id === id);
    if (!p) return;
    const n = Math.max(0, parseFloat((p.cantidad + d).toFixed(2)));
    
    await updateDoc(doc(db, "pantries", pantryId, "productos", id), { cantidad: n });

    if (n <= 0 && !lista.find(i => i.nombre === p.nombre)) {
      await addDoc(collection(db, "pantries", pantryId, "lista"), { nombre: p.nombre, checked: false, auto: true });
    }
  };

  const delProd = async id => await deleteDoc(doc(db, "pantries", pantryId, "productos", id));
  const toggle  = async (id, current) => await updateDoc(doc(db, "pantries", pantryId, "lista", id), { checked: !current });
  const delItem = async id => await deleteDoc(doc(db, "pantries", pantryId, "lista", id));
  const addItem = async () => {
    if (!nuevoItem.trim()) return;
    await addDoc(collection(db, "pantries", pantryId, "lista"), { nombre: nuevoItem.trim(), checked: false, auto: false });
    setNuevoItem("");
  };

  const cocinarReceta = async (r) => {
    await addDoc(collection(db, "pantries", pantryId, "logros"), {
      nombre: r.nombre,
      emoji: r.emoji || "🍳",
      createdAt: serverTimestamp()
    });
  };

  const sugerir = async () => {
    const ingredientesDisponibles = prods.filter(p=>p.cantidad>0);
    if (ingredientesDisponibles.length === 0) return;
    
    setLoading(true); setExpanded(null);
    const disp = ingredientesDisponibles.map(p=>`${p.nombre} (${p.cantidad} ${p.unidad})`).join(", ");
    
    try {
      const apiKey = process.env.REACT_APP_GEMINI_KEY?.trim();
      if (!apiKey) {
        throw new Error("La API Key no está definida en el archivo .env");
      }

      // URL definitiva: Usamos v1beta para asegurar compatibilidad con gemini-1.5-flash si v1 falla
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      console.log("Iniciando petición a:", url);

      const res = await fetch(url, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            contents:[{ parts:[{ text:`Genera 3 recetas cortas con estos ingredientes: ${disp}. Responde exclusivamente en formato JSON: {"recetas":[{"nombre":"...","emoji":"...","tiempo":"...","dificultad":"...","ingredientes":["..."],"pasos":["..."]}]}` }] }]
          })
        }
      );
      
      if (res.status === 429) {
        setRecetas("rate-limit");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`Error API: ${res.status}`);

      const data = await res.json();
      if (!data.candidates || !data.candidates[0]) throw new Error("No se recibió respuesta de la IA");

      let txt = data.candidates[0].content.parts[0].text;
      // Intenta extraer solo el contenido entre llaves si hay texto extra
      const jsonMatch = txt.match(/\{[\s\S]*\}/);
      if (jsonMatch) txt = jsonMatch[0];
      
      const parsed = JSON.parse(txt);
      
      // EN LUGAR DE setRecetas local, GUARDAMOS EN FIREBASE
      await addDoc(collection(db, "pantries", pantryId, "sugerencias"), {
        recetas: parsed.recetas || [],
        createdAt: serverTimestamp()
      });
      setRecetas(parsed.recetas || []);

    } catch (err) { 
      console.error("Error al obtener recetas:", err);
      setRecetas("error"); 
    }
    setLoading(false);
  };

  const pendientes = lista.filter(i=>!i.checked).length;
  const agotados   = prods.filter(p=>est(p.cantidad,p.minimo)==="agotado").length;
  const dispCount  = prods.filter(p=>p.cantidad>0).length;

  const inputStyle = { width:"100%", boxSizing:"border-box", borderRadius:14, border:`1.5px solid ${P[200]}`, padding:"10px 14px", fontSize:14, outline:"none", background:"#fff", color:"#1a1a2e" };

  if (!pantryId) return (
    <div style={{fontFamily:"var(--font-sans)",maxWidth:480,margin:"0 auto",padding:"2rem 1.5rem",background:"#F8F7FF",minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center"}}>
      <div style={{textAlign:"center",marginBottom:"2rem"}}>
        <div style={{fontSize:60,marginBottom:10}}>🏠</div>
        <h2 style={{color:P[900],margin:0}}>Bienvenido a Despensa IA</h2>
        <p style={{color:P[400],fontSize:14}}>Gestiona tu hogar de forma inteligente</p>
      </div>
      <div className="card" style={{background:"#fff",padding:"1.5rem",borderRadius:24,boxShadow:`0 4px 20px ${P[100]}`}}>
        <p style={{margin:"0 0 8px",fontSize:13,fontWeight:600,color:P[600]}}>TU NOMBRE</p>
        <input style={{...inputStyle,marginBottom:20}} placeholder="Ej. Ana García" value={user} onChange={e=>setUser(e.target.value)} />
        
        <div style={{height:"1.5px",background:P[50],margin:"10px 0 20px"}} />
        
        <button className="pill-btn" onClick={() => setupPantry(genId(), true)} style={{width:"100%",padding:"14px",background:P[600],color:"#fff",border:"none",borderRadius:16,fontWeight:600,marginBottom:12,cursor:"pointer"}}>Crear Nueva Despensa</button>
        
        <p style={{textAlign:"center",fontSize:12,color:P[300],margin:"10px 0"}}>— O IMPORTAR UNA EXISTENTE —</p>
        
        <input style={{...inputStyle,textAlign:"center",letterSpacing:4,fontWeight:700,marginBottom:10}} placeholder="CÓDIGO" maxLength={6} onChange={e=>{
          const val = e.target.value.toUpperCase();
          if(val.length===6) setupPantry(val);
        }} />
        <p style={{textAlign:"center",fontSize:11,color:P[400]}}>Ingresa el código de 6 dígitos de tu compañero</p>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:"var(--font-sans)",maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column",background:"#F8F7FF",minHeight:620}}>
      <style>{css}</style>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${P[600]},${P[400]})`,padding:"1.5rem 1.25rem 1.75rem",borderRadius:"0 0 28px 28px",marginBottom:"-12px",position:"relative",zIndex:1}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {editName ? (
                <input autoFocus onBlur={e=>updatePantryName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&updatePantryName(e.target.value)} defaultValue={pantryName} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",fontSize:20,fontWeight:600,borderRadius:8,padding:"2px 8px",outline:"none",width:180}} />
              ) : (
                <h1 onClick={()=>setEditName(true)} style={{fontSize:24,fontWeight:500,margin:0,color:"#fff",letterSpacing:"-0.3px",cursor:"pointer"}}>{pantryName} 🛒</h1>
              )}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
              <span style={{fontSize:11,color:P[100],background:"rgba(0,0,0,0.1)",padding:"2px 8px",borderRadius:99,cursor:"pointer"}} onClick={()=>{navigator.clipboard.writeText(pantryId);alert("Código copiado!")}}>ID: {pantryId} 📋</span>
              <span style={{fontSize:11,color:P[100]}}>• Hola, {user}</span>
            </div>
          </div>
          <button onClick={() => {
            if(window.confirm("¿Deseas salir de esta despensa?")) {
              localStorage.clear();
              window.location.reload();
            }
          }} style={{background:"rgba(255,255,255,0.15)", border:"none", borderRadius:12, padding:"8px", color:"#fff", cursor:"pointer", marginLeft:10, fontSize:18}}>🚪</button>
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
                  <button onClick={() => delProd(p.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#ccc",padding:4,lineHeight:1}}>✕</button>
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
              <div onClick={() => toggle(item.id, item.checked)} style={{width:24,height:24,borderRadius:99,border:`2px solid ${P[300]||P[200]}`,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}} />
              <span style={{flex:1,fontSize:15,color:"#1a1a2e"}}>{item.nombre}</span>
              {item.auto && <span style={{fontSize:11,padding:"3px 10px",borderRadius:99,background:P[50],color:P[600],fontWeight:500}}>auto</span>}
              <button onClick={()=>delItem(item.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#ccc",padding:4}}>✕</button>
            </div>
          ))}

          {lista.some(i=>i.checked) && <>
            <p style={{fontSize:13,color:P[400],margin:"1.5rem 0 10px",fontWeight:500}}>Comprados ✓</p>
            {lista.filter(i=>i.checked).map(item=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#fff",borderRadius:18,marginBottom:10,opacity:0.45}}>
                <div onClick={() => toggle(item.id, item.checked)} style={{width:24,height:24,borderRadius:99,background:P[400],cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff"}}>✓</div>
                <span style={{flex:1,fontSize:15,color:"#999",textDecoration:"line-through"}}>{item.nombre}</span>
                <button onClick={()=>delItem(item.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#ccc",padding:4}}>✕</button>
              </div>
            ))}
            <button className="pill-btn" onClick={() => lista.filter(i => i.checked).forEach(i => delItem(i.id))} style={{width:"100%",padding:"12px 0",borderRadius:99,border:`1.5px solid ${P[200]}`,background:"transparent",cursor:"pointer",fontSize:14,color:P[600],marginTop:4}}>
              Limpiar comprados
            </button>
          </>}
        </>}

        {/* ── RECETAS ── */}
        {tab===2 && <>
          <div style={{background:`linear-gradient(135deg,${P[50]},#fff)`,borderRadius:20,padding:"1.25rem",marginBottom:"1.25rem",border:`1.5px solid ${P[100]}`}}>
            <p style={{margin:"0 0 4px",fontSize:16,fontWeight:500,color:P[800]}}>¿Qué cocinar hoy? 👨‍🍳</p>
            <p style={{margin:"0 0 1rem",fontSize:13,color:P[400]}}>
              Tienes {dispCount} ingredientes disponibles
            </p>
            <button 
              className="pill-btn" 
              onClick={sugerir} 
              disabled={loading || dispCount === 0} 
              style={{width:"100%",padding:"13px 0",borderRadius:99,border:"none",background:(loading || dispCount === 0)?P[200]:P[600],cursor:(loading || dispCount === 0)?"default":"pointer",fontWeight:500,fontSize:15,color:"#fff",transition:"background 0.2s"}}
            >
              {loading ? "✨ Generando recetas..." : dispCount === 0 ? "Agrega ingredientes para sugerencias" : "✨ Sugerir recetas"}
            </button>
          </div>

          {recetas==="error" && <p style={{color:"#EF5350",fontSize:14,textAlign:"center",padding:"10px"}}>❌ Algo salió mal. Intenta de nuevo.</p>}
          {recetas==="rate-limit" && <p style={{color:"#FF9800",fontSize:14,textAlign:"center",padding:"10px",background:"#FFF3E0",borderRadius:12}}>⚠️ Demasiadas peticiones. Por favor, espera 60 segundos antes de intentar de nuevo.</p>}

          {loading && [1,2,3].map(n => (
            <div key={n} className="loading-skeleton" style={{background:"#fff",borderRadius:20,marginBottom:12,padding:"16px",display:"flex",alignItems:"center",gap:14,boxShadow:`0 2px 0 ${P[100]}`}}>
              <div style={{width:52,height:52,borderRadius:18,background:P[50],flexShrink:0}} />
              <div style={{flex:1}}>
                <div style={{height:14,width:"60%",background:P[50],borderRadius:4,marginBottom:8}} />
                <div style={{display:"flex",gap:8}}>
                  <div style={{height:10,width:50,background:P[50],borderRadius:99}} />
                  <div style={{height:10,width:50,background:P[50],borderRadius:99}} />
                </div>
              </div>
            </div>
          ))}

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
                  <button 
                    className="pill-btn" 
                    onClick={() => cocinarReceta(r)}
                    style={{marginTop:16, width:"100%", padding:"12px", background:P[600], color:"#fff", border:"none", borderRadius:14, cursor:"pointer", fontWeight:600, fontSize:14}}
                  >
                    🍳 ¡La cociné! (Ganar Logro)
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Sección de Logros */}
          {logros.length > 0 && (
            <div style={{marginTop:32, paddingBottom:20}}>
              <p style={{fontSize:14, fontWeight:600, color:P[800], marginBottom:16, display:"flex", alignItems:"center", gap:8}}>
                Mis Logros Culinarios 🏆 <span style={{fontSize:12, color:P[400], fontWeight:400}}>({logros.length})</span>
              </p>
              <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(80px, 1fr))", gap:12}}>
                {logros.map(l => (
                  <div key={l.id} className="card" style={{background:"#fff", borderRadius:18, padding:12, textAlign:"center", boxShadow:`0 2px 0 ${P[100]}`}}>
                    <div style={{fontSize:28, marginBottom:4}}>{l.emoji}</div>
                    <div style={{fontSize:10, fontWeight:600, color:"#1a1a2e", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{l.nombre}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>}
      </div>

      {/* Bottom nav */}
      <div style={{borderTop:`1.5px solid ${P[100]}`,display:"flex",background:"#fff",borderRadius:"20px 20px 0 0",paddingBottom:10,boxShadow:"0 -2px 10px rgba(0,0,0,0.03)"}}>
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
