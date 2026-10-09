// Utilidades compartidas: geografía de Santa Cruz, mapa de anillos y acceso a datos.
(function () {
  const C_LAT = -17.7834, C_LNG = -63.1821; // Plaza 24 de Septiembre
  const KLAT = 110.6, KLNG = 111.32 * Math.cos(17.78 * Math.PI / 180);
  // Radio aproximado de cada anillo en km
  const RINGS = [1.0, 1.9, 2.8, 3.8, 4.8, 5.9, 7.0, 8.2];
  const CATS = ["Plomería", "Electricidad", "Aire acondicionado", "Refrigeración", "Cerrajería",
    "Carpintería", "Pintura", "Albañilería", "Herrería y soldadura", "Electrodomésticos",
    "Fumigación", "Vidriería"];
  const ESTADOS = [
    { k: "pendiente", t: "Por llamar", c: "--st-pend" },
    { k: "nocontesta", t: "No contesta", c: "--st-nocont" },
    { k: "interesado", t: "Interesado", c: "--st-int" },
    { k: "inscrito", t: "Inscrito", c: "--st-ins" }];
  const BARRIOS = [["Casco Viejo (Plaza 24 de Sept.)", -17.7834, -63.1821], ["Equipetrol", -17.766, -63.1975],
    ["Las Palmas", -17.7955, -63.206], ["Urbarí", -17.7985, -63.1935], ["Hamacas", -17.756, -63.181],
    ["Sirari", -17.772, -63.1945], ["Mutualista", -17.766, -63.162], ["El Trompillo", -17.799, -63.179],
    ["Villa 1ro de Mayo", -17.773, -63.129], ["Pampa de la Isla", -17.762, -63.115], ["Plan 3000", -17.832, -63.131],
    ["Los Lotes", -17.85, -63.145], ["Doble Vía La Guardia", -17.816, -63.211], ["Barrio Lindo", -17.805, -63.16],
    ["Radial 26", -17.792, -63.225], ["Banzer Norte", -17.735, -63.172], ["Av. Beni", -17.755, -63.172],
    ["Av. Alemana", -17.76, -63.158], ["Virgen de Cotoca", -17.778, -63.145], ["Santos Dumont", -17.81, -63.17],
    ["El Bajío", -17.74, -63.195], ["Villa Bolívar", -17.82, -63.195], ["Satélite Norte", -17.715, -63.175]];
  const ROADS = [["Av. Banzer", -8], ["Av. Beni", 8], ["Av. Alemana", 32], ["Av. Paraguá", 58],
    ["Av. Virgen de Cotoca", 80], ["Av. Tres Pasos", 118], ["Av. Santos Dumont", 160], ["Av. Grigotá", 193],
    ["Doble Vía La Guardia", 222], ["Av. Roca y Coronado", 262], ["Av. San Martín", 305], ["Av. Busch", 335]];

  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const toKm = (lat, lng) => ({ x: (lng - C_LNG) * KLNG, y: -(lat - C_LAT) * KLAT });
  const fromKm = (x, y) => ({ lat: C_LAT - y / KLAT, lng: C_LNG + x / KLNG });
  function distKm(a, b, c, d) {
    const R = 6371, r = Math.PI / 180, dl = (c - a) * r, dn = (d - b) * r;
    const h = Math.sin(dl / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function ringOf(lat, lng) { const p = toKm(lat, lng), r = Math.hypot(p.x, p.y); for (let i = 0; i < 8; i++) if (r <= RINGS[i]) return i + 1; return 9; }
  const zonaTxt = k => k === 1 ? "Dentro del 1er anillo" : k > 8 ? "Fuera del 8vo anillo" : `Entre ${k - 1}º y ${k}º anillo`;
  function nearestBarrio(lat, lng) { let b = BARRIOS[0], m = 1e9; for (const x of BARRIOS) { const d = (x[1] - lat) ** 2 + (x[2] - lng) ** 2; if (d < m) { m = d; b = x; } } return b[0].replace(/ \(.*\)/, ""); }
  const estado = k => ESTADOS.find(e => e.k === k) || ESTADOS[0];
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function toast(t) { let el = $("#toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; document.body.appendChild(el); } el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2400); }
  function waLink(t) { let d = String(t || "").replace(/\D/g, ""); if (d.length === 8) d = "591" + d; return d.length >= 10 ? "https://wa.me/" + d : null; }

  // ---------- Mapa de anillos (SVG, sin servicios externos) ----------
  function RingMap(svg, opts = {}) {
    const st = { vb: { x: -9.5, y: -9.5, w: 19 }, items: [], me: null, sel: null, pin: null, onPick: null, onSelect: null };
    function draw() {
      const vb = st.vb, s = vb.w / 19, fs = 0.30 * s;
      let h = `<path d="M -6.6 -9.5 C -5.4 -6, -6.2 -3, -5.6 0 S -6.4 5, -7.6 9.5" fill="none" stroke="var(--river)" stroke-width="${0.35 * s}" stroke-linecap="round"/>`;
      h += `<text x="-6.6" y="-7.4" font-size="${fs}" fill="var(--muted)" transform="rotate(-80 -6.6 -7.4)">Río Piraí</text>`;
      for (const [, a] of ROADS) { const r = a * Math.PI / 180; h += `<line x1="0" y1="0" x2="${Math.sin(r) * 9.2}" y2="${-Math.cos(r) * 9.2}" stroke="var(--road)" stroke-width="${0.09 * s}"/>`; }
      RINGS.forEach((r, i) => {
        h += `<circle cx="0" cy="0" r="${r}" fill="none" stroke="var(--ring)" stroke-width="${(i === 3 ? 0.08 : 0.05) * s}" ${i === 4 ? `stroke-dasharray="${0.15 * s} ${0.15 * s}"` : ""}/>`;
        h += `<text x="${r * 0.707 + 0.05}" y="${-r * 0.707 - 0.05}" font-size="${fs * 0.85}" fill="var(--muted)" font-family="var(--f-mono)">${i + 1}º</text>`;
      });
      if (vb.w < 12) for (const [n, a] of ROADS) { const r = a * Math.PI / 180, R = Math.min(8.6, vb.w * 0.42); h += `<text x="${Math.sin(r) * R}" y="${-Math.cos(r) * R}" font-size="${fs * 0.8}" fill="var(--muted)" text-anchor="middle">${n}</text>`; }
      h += `<circle cx="0" cy="0" r="${0.12 * s}" fill="var(--ink)"/>`;
      const sel = st.items.find(i => i.id === st.sel);
      if (sel && st.me) {
        const m = toKm(st.me.lat, st.me.lng), p = toKm(sel.lat, sel.lng);
        h += `<line x1="${m.x}" y1="${m.y}" x2="${p.x}" y2="${p.y}" stroke="var(--me)" stroke-width="${0.06 * s}" stroke-dasharray="${0.15 * s} ${0.1 * s}"/>`;
        h += `<text x="${(m.x + p.x) / 2}" y="${(m.y + p.y) / 2 - 0.15 * s}" font-size="${fs * 1.1}" fill="var(--me)" text-anchor="middle" font-weight="700" font-family="var(--f-mono)" paint-order="stroke" stroke="var(--bg)" stroke-width="${0.08 * s}">${distKm(st.me.lat, st.me.lng, sel.lat, sel.lng).toFixed(1)} km</text>`;
      }
      for (const i of st.items) {
        const p = toKm(i.lat, i.lng), on = i.id === st.sel;
        h += `<circle data-id="${esc(i.id)}" cx="${p.x}" cy="${p.y}" r="${(on ? 0.24 : 0.15) * s}" fill="var(${opts.color ? opts.color(i) : "--accent"})" stroke="var(--surface)" stroke-width="${0.05 * s}" style="cursor:pointer"><title>${esc(i.nombre)}</title></circle>`;
      }
      if (sel) { const p = toKm(sel.lat, sel.lng); h += `<text x="${p.x}" y="${p.y - 0.35 * s}" font-size="${fs * 1.05}" fill="var(--ink)" text-anchor="middle" font-weight="600" paint-order="stroke" stroke="var(--bg)" stroke-width="${0.08 * s}">${esc(sel.nombre)}</text>`; }
      if (st.pin) { const p = toKm(st.pin.lat, st.pin.lng); h += `<path d="M ${p.x} ${p.y} l ${-0.18 * s} ${-0.4 * s} h ${0.36 * s} z" fill="var(--accent)"/>`; }
      if (st.me) { const m = toKm(st.me.lat, st.me.lng); h += `<circle cx="${m.x}" cy="${m.y}" r="${0.42 * s}" fill="var(--me)" opacity=".18"/><circle cx="${m.x}" cy="${m.y}" r="${0.17 * s}" fill="var(--me)" stroke="var(--surface)" stroke-width="${0.06 * s}"/>`; }
      svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.w}`);
      svg.innerHTML = h;
    }
    function pt(ev) { const r = svg.getBoundingClientRect(); return { x: st.vb.x + (ev.clientX - r.left) / r.width * st.vb.w, y: st.vb.y + (ev.clientY - r.top) / r.height * st.vb.w }; }
    function zoom(f, cx, cy) { const vb = st.vb, nw = Math.max(2, Math.min(19, vb.w * f)); if (cx === undefined) { cx = vb.x + vb.w / 2; cy = vb.y + vb.w / 2; } st.vb = { x: cx - (cx - vb.x) * nw / vb.w, y: cy - (cy - vb.y) * nw / vb.w, w: nw }; draw(); }
    svg.addEventListener("wheel", e => { e.preventDefault(); const p = pt(e); zoom(e.deltaY < 0 ? 0.85 : 1 / 0.85, p.x, p.y); }, { passive: false });
    let drag = null;
    svg.addEventListener("pointerdown", e => { drag = { sx: e.clientX, sy: e.clientY, vx: st.vb.x, vy: st.vb.y, moved: false, target: e.target }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true; if (!drag.moved) return; const r = svg.getBoundingClientRect(); st.vb.x = drag.vx - dx / r.width * st.vb.w; st.vb.y = drag.vy - dy / r.height * st.vb.w; draw(); });
    svg.addEventListener("pointerup", e => {
      const d = drag; drag = null; if (!d || d.moved) return;
      const p = pt(e), ll = fromKm(p.x, p.y);
      if (st.onPick) { const f = st.onPick; st.onPick = null; svg.classList.remove("setting"); f(ll); return; }
      const id = d.target?.dataset?.id; if (id && st.onSelect) st.onSelect(id);
    });
    return {
      set(p) { Object.assign(st, p); draw(); },
      zoomIn: () => zoom(0.7), zoomOut: () => zoom(1 / 0.7), reset: () => { st.vb = { x: -9.5, y: -9.5, w: 19 }; draw(); },
      pick(fn) { st.onPick = fn; svg.classList.add("setting"); },
      onSelect(fn) { st.onSelect = fn; }
    };
  }

  // ---------- Datos ----------
  const cfg = window.SERVICRUZ_CONFIG || {};
  const live = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase);
  const sb = live ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
  async function demoData() { const r = await fetch("data/demo.json"); return (await r.json()).map(n => ({ ...n, simulado: true })); }

  window.SC = {
    C_LAT, C_LNG, RINGS, CATS, ESTADOS, BARRIOS, $, esc, toKm, fromKm, distKm, ringOf, zonaTxt,
    nearestBarrio, estado, store, toast, waLink, RingMap, sb, live, demoData, cfg
  };
})();
