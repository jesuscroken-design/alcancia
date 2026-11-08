"use strict";
/* =====================================================================
   ALCANCÍA · ahorro motivador (PWA)
   · Meta de ahorro → jarra de vidrio que se llena con oro animado (GSAP).
   · Sonidos: sintetizados con WebAudio + slots para subir tus propios
     audios (.mp3/.ogg/.wav) desde la configuración (guardados en el celu).
   · Tema blanco y negro personalizable; todo gratis y sin internet.
   ===================================================================== */

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem("alc_" + k)); return (v === null || v === undefined) ? d : v; } catch (_) { return d; } };
const save = (k, v) => { try { localStorage.setItem("alc_" + k, JSON.stringify(v)); } catch (_) {} };
const nf = new Intl.NumberFormat("es", { maximumFractionDigits: 2 });
const money = n => "$" + nf.format(Math.round((n || 0) * 100) / 100);
const esc = s => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const gsapOK = () => typeof window.gsap !== "undefined";
function tw(fn) { try { if (gsapOK()) fn(); } catch (_) {} }   // animar sin romper si algo falla

/* ---------- estado ---------- */
let META = load("meta", null);        // {name, target}
let HIST = load("hist", []);          // [{d: Date.now(), a: monto, r?: true, n?: nota}]
const balance = () => HIST.reduce((s, x) => s + (x.r ? -x.a : x.a), 0);

/* ---------- tema blanco / negro ---------- */
function setTema(t) {
  document.documentElement.dataset.tema = t;
  save("tema", t);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = (t === "w" ? "#f4f2ec" : "#0b0b0f");
  const b = document.getElementById("btnTema");
  if (b) b.textContent = (t === "b" ? "☀️" : "🌙");
}
setTema(load("tema", "b"));

/* ---------- motor de sonido ---------- */
let ACX = null;
function audioCtx() {
  ACX = ACX || new (window.AudioContext || window.webkitAudioContext)();
  if (ACX.state === "suspended") ACX.resume();
  return ACX;
}
function synthCoin() {
  const a = audioCtx(), t = a.currentTime;
  [1318, 1975, 2637].forEach((f, i) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t + i * .055);
    o.frequency.exponentialRampToValueAtTime(f * 1.14, t + i * .055 + .1);
    g.gain.setValueAtTime(.0001, t + i * .055);
    g.gain.exponentialRampToValueAtTime(.2, t + i * .055 + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + i * .055 + .5);
    o.connect(g).connect(a.destination);
    o.start(t + i * .055); o.stop(t + i * .055 + .55);
  });
}
function synthFan() {
  const a = audioCtx(), t = a.currentTime;
  [523, 659, 784, 1046, 1318].forEach((f, i) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(f, t + i * .13);
    g.gain.setValueAtTime(.0001, t + i * .13);
    g.gain.exponentialRampToValueAtTime(.24, t + i * .13 + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + i * .13 + .8);
    o.connect(g).connect(a.destination);
    o.start(t + i * .13); o.stop(t + i * .13 + .85);
  });
}
function synthTap() {
  const a = audioCtx(), t = a.currentTime;
  const o = a.createOscillator(), g = a.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(720, t);
  g.gain.setValueAtTime(.14, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + .09);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + .1);
}
function sfx(slot) {
  if (MEMO[slot]) { try { new Audio(MEMO[slot]).play().catch(() => {}); } catch (_) {} return; }
  if (slot === "coin") synthCoin();
  else if (slot === "fan") synthFan();
  else synthTap();
}

/* ---------- sonidos propios (IndexedDB, viven en el celu) ---------- */
let MEMO = {};   // slot → blobURL
function abrirIDB() {
  return new Promise((res, rej) => {
    const q = indexedDB.open("alcancia", 1);
    q.onupgradeneeded = e => { try { e.target.result.createObjectStore("sfx"); } catch (_) {} };
    q.onsuccess = () => res(q.result);
    q.onerror = () => rej(q.error);
  });
}
async function idbSet(k, v) {
  const db = await abrirIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("sfx", "readwrite");
    tx.objectStore("sfx").put(v, k);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error && tx.error);
  });
}
async function idbGet(k) {
  const db = await abrirIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("sfx", "readonly");
    const r = tx.objectStore("sfx").get(k);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbDel(k) {
  const db = await abrirIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("sfx", "readwrite");
    tx.objectStore("sfx").delete(k);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
async function cargarSfx() {
  for (const slot of ["coin", "fan"]) {
    try { const b = await idbGet(slot); if (b) MEMO[slot] = URL.createObjectURL(b); } catch (_) {}
  }
}
async function subirSfx(slot, file) {
  if (!file) return;
  if (!/^audio\//.test(file.type || "")) { toast("Ese archivo no suena a audio 🤔 (mp3, ogg o wav)"); return; }
  if (file.size > 8 * 1024 * 1024) { toast("Muy grande (máx 8 MB) 🙂"); return; }
  try {
    const b = new Blob([await file.arrayBuffer()], { type: file.type });
    await idbSet(slot, b);
    if (MEMO[slot]) URL.revokeObjectURL(MEMO[slot]);
    MEMO[slot] = URL.createObjectURL(b);
    toast("Sonido de «" + (slot === "coin" ? "meter monedas" : "meta completa") + "» guardado ✔");
    if (typeof actualizarHojas === "function") actualizarHojas();
  } catch (e) { toast("No se pudo guardar: " + (e && e.message || e)); }
}
async function restaurarSfx(slot) {
  try { await idbDel(slot); } catch (_) {}
  if (MEMO[slot]) { URL.revokeObjectURL(MEMO[slot]); delete MEMO[slot]; }
  toast("Volvió el sonido original 🙂");
  if (typeof actualizarHojas === "function") actualizarHojas();
}
function nombreSfx(slot) {
  if (MEMO[slot]) return "Tu sonido ✔";
  return slot === "coin" ? "Clink de monedas (de fábrica)" : "Fanfarria de meta (de fábrica)";
}

/* ---------- jarra ---------- */
function nivelPct() {
  if (!META || !META.target) return 0;
  return Math.max(0, Math.min(100, (balance() / META.target) * 100));
}
function pintarJarra() {
  const pct = nivelPct();
  const liq = $("#liq");
  if (liq) liq.setAttribute("transform", "translate(0," + (224 - 158 * (pct / 100)) + ")");
  const f = $("#mfill");
  if (f) {
    f.style.width = pct.toFixed(1) + "%";
  }
  const p = $("#mpct");
  if (p) p.textContent = pct.toFixed(0) + " % de la meta";
  const v = $("#mval"), t = $("#mtarget"), n = $("#mname");
  if (n) n.textContent = META ? META.name : "";
  if (v) v.textContent = money(balance());
  if (t) t.textContent = " de " + money(META && META.target ? META.target : 0);
}
function animarEntrada() {
  tw(() => {
    gsap.from("#jar", { scale: .92, opacity: 0, duration: .7, ease: "power3.out" });
    gsap.from(".meta, .primary, .linkbtn", { y: 14, opacity: 0, duration: .55, stagger: .08, ease: "power2.out" });
  });
}
function contadorA(nuevo) {
  const v = $("#mval");
  if (!v) return;
  if (!gsapOK()) { pintarJarra(); return; }
  const obj = { n: ANTS };
  tw(() => {
    gsap.to(obj, {
      n: nuevo, duration: .8, ease: "power2.out",
      onUpdate: () => { v.textContent = money(obj.n); }
    });
  });
  ANTS = nuevo;
  pintarJarra();
}
let ANTS = 0;

/* lluvia de monedas */
function lluvia(nro) {
  const c = $("#lluvia");
  if (!c) return;
  const W = innerWidth, H = innerHeight;
  for (let i = 0; i < nro; i++) {
    const m = document.createElement("span");
    m.className = "moneda";
    m.style.left = (6 + Math.random() * 84) + "vw";
    m.style.width = m.style.height = (18 + Math.random() * 14) + "px";
    c.append(m);
    const fin = () => m.remove();
    const yF = H + 60, rot = 260 + Math.random() * 720, dur2 = .9 + Math.random() * .9;
    if (gsapOK()) {
      try {
        gsap.fromTo(m, { y: -50, x: 0, rotation: -90, opacity: 1 },
          { y: yF, x: (Math.random() * 90 - 45), rotation: rot, duration: dur2,
            ease: "power2.in", delay: Math.random() * .35, onComplete: fin });
        continue;
      } catch (_) { /* cae al plano */ }
    }
    m.style.transition = "transform " + dur2 + "s cubic-bezier(.4,0,1,1), opacity .3s " + dur2 + "s";
    m.style.transform = "translateY(" + yF + "px)";
    m.addEventListener("transitionend", fin);
  }
}

/* ---------- UI estática ---------- */
function init() {
  $("#hdr").innerHTML = `
    <div class="brand"><img src="icon-192.png" alt="Alcancía"><b>Alcancía</b></div>
    <div class="acts">
      <button id="btnTema" title="Blanco y negro">☀️</button>
      <button id="btnConf" title="Ajustes">⚙️</button>
    </div>`;
  $("#ui").innerHTML = `
    <div class="stage">
      <svg id="jar" viewBox="0 0 200 260" aria-hidden="true">
        <defs>
          <clipPath id="cuerpo"><rect x="25" y="66" rx="24" width="150" height="158"/></clipPath>
          <linearGradient id="oro" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="var(--oro)"/><stop offset="100%" stop-color="var(--oro2)"/>
          </linearGradient>
        </defs>
        <ellipse cx="100" cy="238" rx="64" ry="9" fill="var(--muted)" opacity=".18"/>
        <g clip-path="url(#cuerpo)">
          <g id="liq" transform="translate(0,224)">
            <rect x="25" y="0" width="150" height="200" fill="url(#oro)" opacity=".92"/>
            <path class="onda o1" d="M0,0 q12,-7 25,0 t25,0 t25,0 t25,0 t25,0 t25,0 t25,0 L175,20 L0,20 Z" fill="url(#oro)"/>
            <path class="onda o2" d="M-22,0 q12,-6 25,0 t25,0 t25,0 t25,0 t25,0 t25,0 t25,0 t25,0 L178,14 L-22,14 Z" fill="url(#oro)" opacity=".55"/>
          </g>
        </g>
        <g fill="none" stroke="var(--txt)" stroke-width="4" opacity=".9">
          <rect x="25" y="66" width="150" height="158" rx="24"/>
          <line x1="47" y1="66" x2="47" y2="44"/>
          <line x1="153" y1="66" x2="153" y2="44"/>
          <rect x="52" y="26" width="96" height="22" rx="10"/>
          <rect x="86" y="16" width="28" height="14" rx="6"/>
        </g>
        <path d="M46,96 q-6,20 4,40" fill="none" stroke="var(--txt)" stroke-width="3.4"
          stroke-linecap="round" opacity=".45"/>
      </svg>
    </div>
    <div class="meta">
      <h1 id="mname"></h1>
      <div class="sub">Tu meta de ahorro</div>
      <div class="nums"><span id="mval"></span><small id="mtarget"></small></div>
      <div class="barra"><i id="mfill"></i></div>
      <div class="pct" id="mpct"></div>
    </div>
    <button class="primary" id="btnMeter">💰 Meter dinero</button>
    <button class="linkbtn" id="btnHist">Ver historial</button>`;
  $("#btnTema").onclick = () => { sfx("tap"); setTema(document.documentElement.dataset.tema === "b" ? "w" : "b"); };
  $("#btnConf").onclick = () => { sfx("tap"); hojaConf(); };
  $("#btnMeter").onclick = meterSheet;
  $("#btnHist").onclick = histSheet;
  document.getElementById("btnTema").textContent = document.documentElement.dataset.tema === "b" ? "☀️" : "🌙";
  ANTS = balance();
  pintarJarra();
  animarEntrada();
  ondasInfinitas();
}

/* ondas del oro en movimiento perpetuo (CSS puro, siempre vivas) */
function ondasInfinitas() {
  const st = document.createElement("style");
  st.textContent = `.onda{animation:anda 5.5s linear infinite}
 .o1{animation-duration:6.2s}
 .o2{animation-duration:4.8s; animation-direction:reverse}
 @keyframes anda{from{transform:translateX(0)}to{transform:translateX(-25px)}}`;
  document.head.append(st);
}

/* ---------- hojas (bottom sheets) ---------- */
let hojaBloqueada = false, hojaActual = "", HOJAS = {};
function hoja(html, { bloqueada = false, id = "x" } = {}) {
  hojaBloqueada = bloqueada; hojaActual = id;
  const s = $("#sheet");
  $("#sheetCard").innerHTML = `<div class="tirador"></div>` + html;
  s.classList.remove("oculto");
  s.onclick = ev => { if (ev.target === s && !bloqueada) cerrarHoja(); };
  tw(() => {
    gsap.fromTo("#sheet .hoja", { y: "60%" }, { y: "0%", duration: .38, ease: "power3.out" });
    gsap.fromTo("#sheet", { opacity: 0 }, { opacity: 1, duration: .25 });
  });
}
function cerrarHoja(cb) {
  const s = $("#sheet");
  tw(() => {
    gsap.to("#sheet .hoja", { y: "70%", duration: .28, ease: "power2.in",
      onComplete: () => { s.classList.add("oculto"); if (cb) cb(); } });
  });
  if (!gsapOK()) s.classList.add("oculto");
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && !hojaBloqueada) cerrarHoja(); });

function hojaOnboarding() {
  hoja(`
    <h2>Pon tu meta ✨</h2>
    <p>¿Qué ahorras y para qué? Una jarra, una meta, monedas bonitas.</p>
    <label>Nombre de tu meta</label>
    <input type="text" id="obName" maxlength="40" placeholder="Ej: Viaje a la playa">
    <label>Cuánto juntarás</label>
    <input type="number" id="obTarget" inputmode="decimal" min="1" placeholder="Ej: 500" step="0.01">
    <button class="primary" id="obGo" style="width:100%; margin-top:16px">¡Empezar a ahorrar! 🐷</button>`,
    { bloqueada: true, id: "onboarding" });
  $("#obGo").onclick = () => {
    const name = ($("#obName").value || "Mi meta").trim();
    const target = parseFloat(String($("#obTarget").value).replace(",", "."));
    if (!(target > 0) || String(target).length > 15) { toast("Pon un monto válido 🙂"); return; }
    META = { name, target };
    save("meta", META);
    synthFan(); lluvia(18);
    cerrarHoja();
    setTimeout(() => { ANTS = balance(); pintarJarra(); animarEntrada(); }, 300);
  };
}
function actualizarHojas() {   // refresca la hoja abierta (tras cambiar sonidos)
  if (hojaActual === "conf") { cerrarHoja(() => hojaConf()); }
  else if (hojaActual === "hist") { cerrarHoja(() => histSheet()); }
}

/* meter dinero */
function meterSheet() {
  const bal = balance();
  const t = META && META.target ? META.target : 100;
  const chips = t >= 1000 ? [10, 50, 100, 500] : t >= 200 ? [5, 10, 20, 50] : [1, 5, 10, 20];
  const faltan = Math.max(0, t - bal);
  hoja(`
    <h2>Meter monedas 🪙</h2>
    ${faltan > 0 ? `<div class="aviso">Te faltan <b>${money(faltan)}</b> para completar «${esc(META ? META.name : "meta")}».</div>` : `<div class="aviso"><b>¡Ya la tienes llena!</b> Puedes seguir llenándola 🎉</div>`}
    <label>¿Cuánto metes?</label>
    <input type="number" id="amt" inputmode="decimal" min="0.01" step="0.01" placeholder="0" style="font-size:1.4rem; text-align:center">
    <div class="chips">${chips.map(c => `<button data-add="${c}">+${money(c)}</button>`).join("")}</div>
    <label>Nota (opcional)</label>
    <input type="text" id="nt" maxlength="40" placeholder="Ej: propina, extra del mes…">
    <button class="primary" id="goAmt" style="width:100%; margin-top:16px">Meter a la jarra 💰</button>`,
    { id: "meter" });
  setTimeout(() => { const a = $("#amt"); if (a) a.focus(); }, 350);
  $("#sheetCard").querySelectorAll("[data-add]").forEach(b => {
    b.onclick = () => {
      const inp = $("#amt");
      const cur = parseFloat(String(inp.value || "0").replace(",", ".")) || 0;
      inp.value = String(Math.round((cur + parseFloat(b.dataset.add)) * 100) / 100);
      sfx("tap");
    };
  });
  $("#goAmt").onclick = () => {
    const amt = parseFloat(String($("#amt").value).replace(",", "."));
    if (!(amt > 0)) { toast("Pon cuánto vas a meter 🙂"); return; }
    const nota = ($("#nt").value || "").trim();
    HIST.unshift({ d: Date.now(), a: amt, n: nota });
    save("hist", HIST);
    const antes = balance() - amt, despues = balance();
    const ANTES_LLENO = META && antes >= META.target, LLENA = META && despues >= META.target;
    cerrarHoja();
    if (!ANTES_LLENO && LLENA) { sfx("fan"); lluvia(26); toast("🏆 ¡META COMPLETADA! «" + (META.name) + "»"); }
    else { sfx("coin"); lluvia(9); }
    setTimeout(() => contadorA(despues), 250);
  };
}

/* historial (+ retirar) */
function histSheet() {
  const bal = balance();
  const filas = HIST.slice(0, 40).map(x => {
    const d = new Date(x.d);
    const fecha = d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }) + " · " +
      d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    return `<div class="hrow">
      <span class="ic">${x.r ? "↩️" : "🪙"}</span>
      <div class="d"><b>${x.n ? esc(x.n) : (x.r ? "Retiro" : "Depósito")}</b><span>${fecha}</span></div>
      <span class="a ${x.r ? "menos" : ""}">${x.r ? "−" : "+"}${money(x.a)}</span>
    </div>`;
  }).join("");
  hoja(`
    <h2>Historial 📜</h2>
    <div class="hbarra"><span>${HIST.length} movimientos</span><span>Total: <b style="color:var(--txt)">${money(bal)}</b></span></div>
    <div class="hist">${filas || `<p style="padding:8px 2px">Todavía no metes nada — ¡empieza hoy! 🐷</p>`}</div>
    <h3>Retirar dinero</h3>
    <input type="number" id="ret" inputmode="decimal" min="0.01" step="0.01" placeholder="¿Cuánto sacas?">
    <button class="ghost mal" id="goRet" style="width:100%; margin-top:10px">Retirar de la jarra ↩️</button>`,
    { id: "hist" });
  $("#goRet").onclick = () => {
    const amt = parseFloat(String($("#ret").value).replace(",", "."));
    const bal = balance();
    if (!(amt > 0)) { toast("Pon cuánto saca 🙂"); return; }
    if (amt > bal) { toast("Solo hay " + money(bal) + " en la jarra 🙂"); return; }
    HIST.unshift({ d: Date.now(), a: amt, r: true });
    save("hist", HIST);
    cerrarHoja();
    toast("Retiraste " + money(amt));
    setTimeout(() => contadorA(balance()), 250);
  };
}
/* configuración */
function hojaConf() {
  const t = document.documentElement.dataset.tema;
  hoja(`
    <h2>Ajustes ⚙️</h2>

    <h3>Tema · blanco y negro</h3>
    <div class="chips">
      <button data-tema="b" class="${t === "b" ? "on" : ""}" style="${t === "b" ? "background:var(--acc)" : ""}">🖤 Negro</button>
      <button data-tema="w" class="${t === "w" ? "on" : ""}" style="${t === "w" ? "background:var(--acc)" : ""}">🤍 Blanco</button>
    </div>

    <h3>Tus sonidos 🎵</h3>
    <p>Puedes subir tu propio audio para el clink de monedas y la fanfarria de meta. Queda guardado en este dispositivo (funciona sin internet).</p>
    <div class="slot">
      <div class="d"><b>Meter monedas</b><span>${nombreSfx("coin")}</span></div>
      <button data-play="coin">▶</button><button data-up="coin">Subir</button><button data-res="coin" class="mal">↺</button>
    </div>
    <div class="slot">
      <div class="d"><b>Meta completa</b><span>${nombreSfx("fan")}</span></div>
      <button data-play="fan">▶</button><button data-up="fan">Subir</button><button data-res="fan" class="mal">↺</button>
    </div>
    <p style="font-size:.74rem">Formatos: .mp3 / .ogg / .wav · máx 8 MB · no se sube a ningún servidor, queda solo en tu celu.</p>

    <h3>Tu meta 🎯</h3>
    <label>Nueva meta</label>
    <input type="text" id="cfName" maxlength="40" value="${META ? esc(META.name) : ""}">
    <label>Objetivo</label>
    <input type="number" id="cfTarget" inputmode="decimal" min="1" step="0.01" value="${META && META.target ? META.target : ""}">
    <button class="ghost" id="cfSave" style="width:100%; margin-top:10px">Guardar cambios ✔</button>

    <h3>Instalar en celular 📱</h3>
    <p>La app queda como icono en tu iPhone y funciona sin internet.</p>
    <button class="ghost" id="cfInst" style="width:100%">⤓ Instalar la app</button>

    <h3 style="color:var(--mal)">Zona de peligro 🚨</h3>
    <p>Esto borra TODO (historial, meta y sonidos) de este dispositivo.</p>
    <button class="ghost mal" id="cfReset" style="width:100%">Vaciar la alcancía y empezar de cero</button>`,

    { id: "conf" });
  $("#sheetCard").querySelectorAll("[data-tema]").forEach(b => {
    b.onclick = () => { sfx("tap"); setTema(b.dataset.tema); hojaConf(); };
  });
  $("#sheetCard").querySelectorAll("[data-play]").forEach(b => { b.onclick = () => sfx(b.dataset.play); });
  $("#sheetCard").querySelectorAll("[data-up]").forEach(b => {
    b.onclick = () => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "audio/*";
      inp.onchange = () => subirSfx(b.dataset.up, inp.files[0]);
      inp.click();
    };
  });
  $("#sheetCard").querySelectorAll("[data-res]").forEach(b => { b.onclick = () => restaurarSfx(b.dataset.res); });
  $("#cfSave").onclick = () => {
    const name = $("#cfName").value.trim() || (META && META.name) || "Mi meta";
    const target = parseFloat(String($("#cfTarget").value).replace(",", "."));
    if (!(target > 0)) { toast("El objetivo debe ser mayor a 0 🙂"); return; }
    META = { name, target }; save("meta", META);
    toast("Meta actualizada 🎯");
    cerrarHoja(); setTimeout(() => pintarJarra(), 300);
  };
  $("#cfInst").onclick = () => installApp();
  $("#cfReset").onclick = () => {
    const d = $("#cfReset");
    if (d.dataset.arm !== "1") { d.dataset.arm = "1"; d.textContent = "¿Seguro? 🔃 Presiona otra vez"; return; }
    localStorage.clear();
    META = null; HIST = [];
    restaurarSfx("coin"); restaurarSfx("fan");
    cerrarHoja(() => { location.reload(); });
  };
}

/* ---------- instalación PWA + guía iPhone ---------- */
let INSTALL = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); INSTALL = e; });
addEventListener("appinstalled", () => { INSTALL = null; toast("¡Alcancía instalada 🎉 Ya funciona como app!"); });
function installApp() {
  if (INSTALL) {
    const p = INSTALL; INSTALL = null;
    p.prompt();
    p.userChoice.then(r => toast(r && r.outcome === "accepted" ? "¡Instalada! 🐷 El icono ya está en tu pantalla de inicio" : "Sin problema: menú del navegador → «Añadir a pantalla de inicio» 🙂"));
  } else if (esIOS()) showIOSGuide();
  else toast("PC: icono de instalar en la barra de direcciones ⤓ · Celular: menú → «Añadir a pantalla de inicio»");
}
function esIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function showIOSGuide() {
  if (document.getElementById("guiaIOS")) return;
  const ov = document.createElement("div");
  ov.className = "ovc"; ov.id = "guiaIOS";
  ov.innerHTML = `<div class="ioscard">
    <img src="./icon-192.png" alt="Alcancía">
    <h3>Instala Alcancía en tu iPhone 📱</h3>
    <p><b>1 ·</b> toca el botón <b>Compartir</b> ⬆ abajo en Safari</p>
    <p><b>2 ·</b> desliza y toca <b>Añadir a la pantalla de inicio</b></p>
    <p><b>3 ·</b> toca <b>Añadir</b> → tienes el icono como app 🐷</p>
    <button class="pri" onclick="this.closest('#guiaIOS').remove(),localStorage.setItem('alc_iosok','1')">Listo ✔</button>
    <span class="nota">Se hace una sola vez; después abre sin internet.</span>
  </div>`;
  document.body.append(ov);
}
function chequearIOS() {
  try {
    const sysIPAInstalled = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if (!esIOS() || sysIPAInstalled || localStorage.getItem("alc_iosok")) return;
    setTimeout(showIOSGuide, 800);
  } catch (_) {}
}

/* ---------- toast ---------- */
let TOAST_T = null;
function toast(msg) {
  clearTimeout(TOAST_T);
  let el = document.getElementById("tz");
  if (!el) { el = document.createElement("div"); el.id = "tz"; el.className = "toast"; document.body.append(el); }
  el.textContent = msg;
  el.style.opacity = "1";
  tw(() => { gsap.fromTo(el, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .3, ease: "power2.out" }); });
  TOAST_T = setTimeout(() => { el.style.opacity = "0"; }, 3200);
}

/* ---------- arranque ---------- */
(async () => {
  init();
  await cargarSfx();
  if (!META || !(META.target > 0)) hojaOnboarding();
  chequearIOS();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && ACX) { try { if (ACX.state === "suspended") ACX.resume(); } catch (_) {} } });
})();
