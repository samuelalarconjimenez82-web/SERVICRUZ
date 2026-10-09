// Panel de llamadas: solo para ti. Con Supabase pide inicio de sesión; sin Supabase funciona en modo demo.
(function () {
  const SC = window.SC;
  const { $, esc, BARRIOS, CATS, ESTADOS, distKm, ringOf, zonaTxt, nearestBarrio, estado, store, toast, sb, live, demoData, C_LAT, C_LNG } = SC;

  let items = [], sel = null, fEst = null, pickAdd = null, solicitudes = [], fromSol = null;
  let me = store("sc-panel-me") || { lat: BARRIOS[0][1], lng: BARRIOS[0][2], label: BARRIOS[0][0] };

  // ---------- Capa de datos ----------
  const DEMO_KEY = "sc-demo-db";
  const db = {
    async all() {
      if (live) { const { data, error } = await sb.from("negocios").select("*").order("nombre"); if (error) throw error; return data; }
      const saved = store(DEMO_KEY); if (saved) return saved;
      const d = await demoData(); store(DEMO_KEY, d); return d;
    },
    async update(id, patch) {
      if (live) { const { error } = await sb.from("negocios").update(patch).eq("id", id); if (error) throw error; return; }
      store(DEMO_KEY, items);
    },
    async remove(id) {
      if (live) { const { error } = await sb.from("negocios").delete().eq("id", id); if (error) throw error; return; }
      store(DEMO_KEY, items);
    },
    async add(row) {
      if (live) { const { data, error } = await sb.from("negocios").insert(row).select().single(); if (error) throw error; return data; }
      const r = { ...row, id: "d" + Date.now().toString(36) }; items.push(r); store(DEMO_KEY, items); return r;
    },
    async solicitudes() {
      if (!live) return [];
      const { data, error } = await sb.from("solicitudes").select("*").order("creado", { ascending: false });
      if (error) throw error; return data;
    },
    async removeSolicitud(id) { if (live) await sb.from("solicitudes").delete().eq("id", id); }
  };

  // ---------- Mapa ----------
  const map = SC.RingMap($("#map"), { color: i => estado(i.estado).c });
  map.onSelect(id => { sel = id; render(); const r = document.querySelector(`[data-row="${CSS.escape(id)}"]`); r && r.scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("#zin").onclick = map.zoomIn; $("#zout").onclick = map.zoomOut; $("#zreset").onclick = map.reset;

  // ---------- Controles ----------
  const bSel = $("#barrio");
  bSel.innerHTML = BARRIOS.map((b, i) => `<option value="${i}">${esc(b[0])}</option>`).join("") + `<option value="custom">Punto marcado en el mapa</option>`;
  const syncSel = () => { const i = BARRIOS.findIndex(b => b[0] === me.label); bSel.value = i >= 0 ? String(i) : "custom"; };
  syncSel();
  const setMe = m => { me = m; store("sc-panel-me", me); syncSel(); render(); };
  bSel.onchange = () => { if (bSel.value === "custom") { pickMe(); return; } const b = BARRIOS[+bSel.value]; setMe({ lat: b[1], lng: b[2], label: b[0] }); };
  function pickMe() { $("#tapBtn").classList.add("on"); $("#tapBtn").textContent = "Toca tu punto…"; map.pick(ll => { $("#tapBtn").classList.remove("on"); $("#tapBtn").textContent = "Tocar el mapa"; setMe({ ...ll, label: "custom" }); toast("Ubicación fijada · " + nearestBarrio(ll.lat, ll.lng)); }); }
  $("#tapBtn").onclick = pickMe;
  $("#fCat").innerHTML = `<option value="all">Todos los rubros</option>` + CATS.map(c => `<option>${c}</option>`).join("");
  $("#aCat").innerHTML = CATS.map(c => `<option>${c}</option>`).join("");
  $("#aEstado").innerHTML = ESTADOS.map(e => `<option value="${e.k}">${e.t}</option>`).join("");
  ["fCat", "fZona", "fQ"].forEach(id => $("#" + id).addEventListener("input", render));
  $("#fKm").addEventListener("input", () => { const v = +$("#fKm").value; $("#kmOut").textContent = v >= 16 ? "sin límite" : v + " km"; render(); });
  $("#aPick").onclick = () => { toast("Toca el mapa donde está el negocio"); $("#map").scrollIntoView({ behavior: "smooth", block: "center" });
    map.pick(ll => { pickAdd = ll; $("#aCoord").value = ll.lat.toFixed(5) + ", " + ll.lng.toFixed(5); $("#addBox").open = true; $("#addBox").scrollIntoView({ behavior: "smooth", block: "center" }); render(); }); };
  $("#legend").innerHTML = ESTADOS.map(e => `<span><span class="dot" style="background:var(${e.c})"></span>${e.t}</span>`).join("") + `<span><span class="dot" style="background:var(--me)"></span>Tú</span><span>Anillos 1º–8º · radiales aprox.</span>`;

  // ---------- Render ----------
  let cur = [];
  function render() {
    items.forEach(i => i._d = distKm(me.lat, me.lng, i.lat, i.lng));
    const c = $("#fCat").value, z = $("#fZona").value, km = +$("#fKm").value, q = $("#fQ").value.trim().toLowerCase();
    cur = items.filter(i => (c === "all" || i.categoria === c) && (z === "all" || (z === "in" ? i.anillo <= 4 : i.anillo >= 6)) && (km >= 16 || i._d <= km) && (!fEst || i.estado === fEst) && (!q || (i.nombre + " " + i.barrio).toLowerCase().includes(q))).sort((a, b) => a._d - b._d);
    map.set({ items: cur, me, sel, pin: pickAdd });
    const t = $("#tally");
    t.innerHTML = ESTADOS.map(e => `<button type="button" data-est="${e.k}" aria-pressed="${fEst === e.k}"><span class="dot" style="background:var(${e.c})"></span>${e.t} <span class="num">${items.filter(i => i.estado === e.k).length}</span></button>`).join("");
    t.querySelectorAll("button").forEach(b => b.onclick = () => { fEst = fEst === b.dataset.est ? null : b.dataset.est; render(); });
    $("#count").textContent = cur.length;
    const rows = $("#rows");
    if (!items.length) { rows.innerHTML = `<div class="empty">Todavía no hay negocios. Agrega el primero abajo.</div>`; return; }
    if (!cur.length) { rows.innerHTML = `<div class="empty">Ningún negocio cumple estos filtros.</div>`; return; }
    rows.innerHTML = cur.map(i => {
      const on = i.id === sel, id = esc(i.id);
      return `<div class="row${on ? " sel" : ""}" data-row="${id}">
        <span class="stripe" style="background:var(${estado(i.estado).c})"></span>
        <div class="name">${esc(i.nombre)}${i.simulado ? '<span class="chip">ejemplo</span>' : ""}</div>
        <div class="km num">${i._d.toFixed(1)}<small>km</small></div>
        <div class="meta">${esc(i.categoria)} · ${esc(i.barrio)} · ${esc(i.zona)}${i.telefono ? ` · <span class="num">${esc(i.telefono)}</span>` : ""}</div>
        ${on ? `<div class="detail" data-detail>
          <div><label class="lbl" for="e-${id}">Estado</label><select id="e-${id}" data-f="estado">${ESTADOS.map(e => `<option value="${e.k}" ${e.k === i.estado ? "selected" : ""}>${e.t}</option>`).join("")}</select></div>
          <div><label class="lbl" for="t-${id}">Teléfono / WhatsApp</label><input id="t-${id}" data-f="telefono" value="${esc(i.telefono)}" inputmode="tel" placeholder="7xxxxxxx"></div>
          <div class="full"><label class="lbl" for="n-${id}">Nota de la llamada</label><textarea id="n-${id}" data-f="nota" rows="2" placeholder="Ej: llamar el lunes, pide precio">${esc(i.nota)}</textarea></div>
          <div class="acts">
            ${i.telefono ? `<a class="btn" href="tel:${esc(String(i.telefono).replace(/[^\d+]/g, ""))}">Llamar</a>` : ""}
            ${SC.waLink(i.telefono) ? `<a class="btn" href="${SC.waLink(i.telefono)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
            <span style="flex:1"></span>
            <button class="btn danger" type="button" data-del="${id}">Quitar de la lista</button>
          </div></div>` : ""}
      </div>`;
    }).join("");
    rows.querySelectorAll(".row").forEach(r => r.addEventListener("click", e => { if (e.target.closest("[data-detail]")) return; sel = sel === r.dataset.row ? null : r.dataset.row; render(); }));
    rows.querySelectorAll("[data-f]").forEach(inp => {
      const id = sel, f = inp.dataset.f;
      inp.addEventListener(f === "estado" ? "change" : "blur", async () => {
        const it = items.find(x => x.id === id); const v = inp.value; if (!it || (it[f] ?? "") === v) return;
        const old = it[f]; it[f] = v;
        try { await db.update(id, { [f]: v }); toast("Guardado"); } catch (e) { it[f] = old; toast("No se pudo guardar"); }
        if (f === "estado") render();
      });
    });
    rows.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
      if (!b.dataset.confirm) { b.dataset.confirm = "1"; b.textContent = "¿Seguro? Toca otra vez"; setTimeout(() => { if (b.isConnected) { delete b.dataset.confirm; b.textContent = "Quitar de la lista"; } }, 3500); return; }
      const id = b.dataset.del, it = items.find(x => String(x.id) === id);
      items = items.filter(x => String(x.id) !== id); sel = null;
      try { await db.remove(id); toast(`${it?.nombre || "Negocio"} quitado`); } catch (e) { items.push(it); toast("No se pudo quitar"); }
      render();
    });
  }

  // ---------- Solicitudes de técnicos ----------
  function renderSol() {
    $("#solBox").hidden = !solicitudes.length; $("#solN").textContent = solicitudes.length;
    $("#solList").innerHTML = solicitudes.map(s => `<div class="row" style="cursor:default" data-sol="${s.id}">
      <span class="stripe" style="background:var(--st-int)"></span>
      <div class="name">${esc(s.nombre)}</div>
      <div class="km" style="font-size:12px;color:var(--muted)">${new Date(s.creado).toLocaleDateString("es-BO")}</div>
      <div class="meta">${esc(s.categoria)} · ${esc(s.barrio || "sin zona")} · <span class="num">${esc(s.telefono)}</span></div>
      <div class="acts" style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;padding-top:6px">
        <button class="btn primary" type="button" data-use="${s.id}">Pasar a la lista</button>
        <button class="btn danger" type="button" data-drop="${s.id}">Descartar</button>
      </div></div>`).join("");
    $("#solList").querySelectorAll("[data-use]").forEach(b => b.onclick = () => {
      const s = solicitudes.find(x => String(x.id) === b.dataset.use); fromSol = s.id;
      $("#aNombre").value = s.nombre; $("#aCat").value = s.categoria; $("#aTel").value = s.telefono; $("#aEstado").value = "interesado";
      $("#addBox").open = true; $("#addBox").scrollIntoView({ behavior: "smooth", block: "center" });
      toast("Falta su ubicación: pégala o márcala en el mapa");
    });
    $("#solList").querySelectorAll("[data-drop]").forEach(b => b.onclick = async () => {
      await db.removeSolicitud(b.dataset.drop); solicitudes = solicitudes.filter(x => String(x.id) !== b.dataset.drop); renderSol();
    });
  }

  // ---------- Agregar ----------
  $("#addForm").addEventListener("submit", async e => {
    e.preventDefault();
    let ll = pickAdd; const raw = $("#aCoord").value.trim();
    if (raw) { const m = raw.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/); if (!m) { toast("Escribe la ubicación así: -17.78, -63.18"); return; } ll = { lat: +m[1], lng: +m[2] }; }
    if (!ll) { toast("Falta la ubicación: pégala o márcala en el mapa"); return; }
    if (Math.abs(ll.lat - C_LAT) > 0.3 || Math.abs(ll.lng - C_LNG) > 0.3) { toast("Esa ubicación queda fuera de Santa Cruz"); return; }
    const k = ringOf(ll.lat, ll.lng);
    const row = { nombre: $("#aNombre").value.trim(), categoria: $("#aCat").value, telefono: $("#aTel").value.trim(), estado: $("#aEstado").value,
      barrio: nearestBarrio(ll.lat, ll.lng), anillo: k, zona: zonaTxt(k), lat: +ll.lat.toFixed(5), lng: +ll.lng.toFixed(5), nota: "", simulado: false };
    try {
      const saved = await db.add(row); if (live) items.push(saved);
      if (fromSol) { await db.removeSolicitud(fromSol); solicitudes = solicitudes.filter(x => x.id !== fromSol); fromSol = null; renderSol(); }
      sel = saved.id; pickAdd = null; e.target.reset(); toast("Negocio agregado"); render();
    } catch (err) { toast("No se pudo guardar"); }
  });

  // ---------- CSV ----------
  $("#csvBtn").onclick = () => {
    const head = ["nombre", "rubro", "barrio", "zona", "anillo", "lat", "lng", "telefono", "estado", "nota", "ejemplo", "km_desde_mi_ubicacion"];
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [head.join(",")].concat(cur.map(i => [i.nombre, i.categoria, i.barrio, i.zona, i.anillo, i.lat, i.lng, i.telefono, estado(i.estado).t, i.nota, i.simulado ? "si" : "no", i._d.toFixed(2)].map(q).join(",")));
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "servicruz-negocios.csv" }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // ---------- Arranque ----------
  async function start() {
    $("#app").hidden = false; $("#loginBox").hidden = true;
    try { items = await db.all(); } catch (e) { toast("No se pudo cargar la lista"); items = []; }
    render();
    try { solicitudes = await db.solicitudes(); renderSol(); } catch (e) { }
  }
  if (!live) { $("#demo").hidden = false; start(); return; }
  $("#logout").onclick = async () => { await sb.auth.signOut(); location.reload(); };
  $("#loginBox").addEventListener("submit", async e => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({ email: $("#lEmail").value.trim(), password: $("#lPass").value });
    if (error) { toast("Correo o contraseña incorrectos"); return; }
    $("#logout").hidden = false; start();
  });
  sb.auth.getSession().then(({ data }) => { if (data.session) { $("#logout").hidden = false; start(); } else $("#loginBox").hidden = false; });
})();
