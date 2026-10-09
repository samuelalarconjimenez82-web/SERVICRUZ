// Página pública: lista de técnicos por cercanía.
(function () {
  const { $, esc, BARRIOS, CATS, distKm, store, toast, waLink, sb, live, demoData, cfg } = window.SC;
  let items = [], cat = "all";
  let me = store("sc-me") || { lat: BARRIOS[0][1], lng: BARRIOS[0][2], label: BARRIOS[0][0] };

  const sel = $("#barrio");
  sel.innerHTML = BARRIOS.map((b, i) => `<option value="${i}">${esc(b[0])}</option>`).join("") + `<option value="gps">Mi ubicación actual</option>`;
  const syncSel = () => { const i = BARRIOS.findIndex(b => b[0] === me.label); sel.value = i >= 0 ? String(i) : "gps"; };
  syncSel();
  sel.onchange = () => { if (sel.value === "gps") { locate(); return; } const b = BARRIOS[+sel.value]; me = { lat: b[1], lng: b[2], label: b[0] }; store("sc-me", me); render(); };

  function locate() {
    if (!navigator.geolocation) { toast("Tu navegador no comparte la ubicación"); syncSel(); return; }
    $("#gps").disabled = true; $("#gps").textContent = "Buscando…";
    navigator.geolocation.getCurrentPosition(p => {
      me = { lat: p.coords.latitude, lng: p.coords.longitude, label: "gps" }; store("sc-me", me);
      $("#gps").disabled = false; $("#gps").textContent = "Usar mi ubicación"; syncSel(); toast("Ubicación encontrada"); render();
    }, () => { $("#gps").disabled = false; $("#gps").textContent = "Usar mi ubicación"; syncSel(); toast("No se pudo obtener tu ubicación. Elige tu barrio."); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }
  $("#gps").onclick = locate;

  function render() {
    const base = items.map(i => ({ ...i, _d: distKm(me.lat, me.lng, i.lat, i.lng) }));
    const present = CATS.filter(c => base.some(i => i.categoria === c));
    if (cat !== "all" && !present.includes(cat)) cat = "all";
    $("#cats").innerHTML = [["all", "Todos"], ...present.map(c => [c, c])].map(([k, t]) => `<button type="button" data-c="${esc(k)}" aria-pressed="${cat === k}">${esc(t)}</button>`).join("");
    $("#cats").querySelectorAll("button").forEach(b => b.onclick = () => { cat = b.dataset.c; render(); });
    const list = base.filter(i => cat === "all" || i.categoria === cat).sort((a, b) => a._d - b._d).slice(0, 30);
    $("#count").textContent = list.length ? `Los ${list.length} más cercanos a ti` : "";
    const g = $("#grid");
    if (!base.length) { g.innerHTML = `<div class="empty" style="grid-column:1/-1">Muy pronto habrá técnicos inscritos en tu zona.</div>`; return; }
    g.innerHTML = list.map(i => {
      const w = waLink(i.telefono);
      const msg = encodeURIComponent(`Hola ${i.nombre}, te encontré en SERVICRUZ. Necesito un servicio de ${i.categoria.toLowerCase()}.`);
      return `<article class="card">
        <div class="top"><h3>${esc(i.nombre)}</h3><div class="km">${i._d.toFixed(1)}<small>km de ti</small></div></div>
        <div><span class="tag">${esc(i.categoria)}</span></div>
        <p class="meta">${esc(i.barrio)} · ${esc(i.zona)}</p>
        ${w ? `<a class="wa" href="${w}?text=${msg}" target="_blank" rel="noopener">Escribir por WhatsApp</a><div class="phone">${esc(i.telefono)}</div>`
            : `<span class="wa off">${i.simulado ? "Ejemplo: sin número" : "Número no disponible"}</span>`}
      </article>`;
    }).join("");
  }

  async function load() {
    try {
      if (live) {
        const { data, error } = await sb.from("negocios").select("id,nombre,categoria,barrio,zona,anillo,lat,lng,telefono").eq("estado", "inscrito");
        if (error) throw error; items = data || [];
      } else { items = await demoData(); $("#demo").hidden = false; }
    } catch (e) { items = []; toast("No se pudo cargar la lista. Revisa tu conexión."); }
    render();
  }

  // Formulario "Soy técnico"
  $("#jCat").innerHTML = CATS.map(c => `<option>${c}</option>`).join("");
  if (cfg.WHATSAPP_CONTACTO) { const w = waLink(cfg.WHATSAPP_CONTACTO); if (w) { $("#joinWa").hidden = false; $("#joinWa").innerHTML = `¿Prefieres escribirnos? <a href="${w}" target="_blank" rel="noopener">WhatsApp de SERVICRUZ</a>`; } }
  $("#joinForm").addEventListener("submit", async e => {
    e.preventDefault();
    const row = { nombre: $("#jNombre").value.trim(), categoria: $("#jCat").value, telefono: $("#jTel").value.trim(), barrio: $("#jBarrio").value.trim() };
    if (!live) { toast("Modo demo: la solicitud no se guarda todavía"); e.target.reset(); return; }
    const { error } = await sb.from("solicitudes").insert(row);
    if (error) { toast("No se pudo enviar. Intenta otra vez."); return; }
    e.target.reset(); toast("¡Listo! Te contactaremos pronto.");
  });

  load();
})();
