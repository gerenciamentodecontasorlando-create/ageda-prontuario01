// BTX Prontuário PRO v2 — sem modal/sem "X".
// Pacientes + Prontuário (timeline) + Data/Hora + Templates editáveis + PDFs + Backup/Restore.

const LS_KEY = "btx_prontuario_pro_v2";
const db = loadDB() ?? seedDB();
ensureShape();

render();
registerSW();
autosaveLoop();

function render(){
  const app = document.getElementById("app");
  const p = getSelectedPatient();
  const v = getSelectedVisit();
  const pName = p?.name || "Nenhum paciente selecionado";
  const pSub = p ? `${fmtDoc(p)} • criado ${fmtDate(p.createdAt)}` : "Crie ou selecione um paciente";
  const vLabel = v ? `Visita: ${fmtDateTime(v.when)}` : "Nenhuma visita selecionada";

  app.innerHTML = `
    <div class="wrap">
      <div class="topbar">
        <div class="brand">
          <div class="badge" aria-hidden="true"></div>
          <div>
            <h1>BTX Prontuário</h1>
            <small>Paciente + prontuário + data/hora + documentos • sem modal • autosave</small>
          </div>
        </div>

        <div class="actions">
          <div class="pill"><b>Paciente:</b> ${esc(pName)}</div>
          <div class="pill"><b>${esc(vLabel)}</b></div>
          <button class="btn ghost" id="btnBackup" title="Exporta backup JSON">Backup</button>
          <button class="btn ghost" id="btnRestore" title="Restaura backup JSON">Restaurar</button>
          <button class="btn danger" id="btnZerar" title="Apaga tudo do dispositivo">Zerar</button>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <h2>Pacientes</h2>

          <div class="notice">
            <div>🧠</div>
            <div>
              <div><b style="color:var(--text)">Prontuário de verdade.</b></div>
              <div>Nome, documento, telefone, histórico de visitas e data/hora em cada atendimento.</div>
            </div>
          </div>

          <div class="hr"></div>

          <div class="row tight">
            <input class="input" id="searchPatient" placeholder="Buscar paciente..." value="${esc(db.ui.patientQuery || "")}" />
            <button class="btn primary" id="btnNovoPaciente">+ Paciente</button>
          </div>

          <div class="hr"></div>
          <div class="list" id="patientList"></div>

          <div class="hr"></div>

          <details ${db.ui.showPatientForm ? "open" : ""}>
            <summary>${db.ui.editingPatientId ? "Editar paciente" : "Novo paciente"}</summary>
            <div class="content">
              <div class="field">
                <div class="label"><span>Nome completo</span><span class="small">obrigatório</span></div>
                <input class="input" id="p_name" placeholder="Ex: Maria da Silva" value="${esc(db.ui.patientForm.name||"")}" />
              </div>

              <div class="kv">
                <div class="field">
                  <div class="label"><span>Documento</span><span class="small">CPF/RG</span></div>
                  <input class="input" id="p_doc" placeholder="Ex: 000.000.000-00" value="${esc(db.ui.patientForm.doc||"")}" />
                </div>
                <div class="field">
                  <div class="label"><span>Telefone</span><span class="small">WhatsApp</span></div>
                  <input class="input" id="p_tel" placeholder="Ex: (91) 99999-9999" value="${esc(db.ui.patientForm.tel||"")}" />
                </div>
              </div>

              <div class="kv">
                <div class="field">
                  <div class="label"><span>Nascimento</span><span class="small">dd/mm/aaaa</span></div>
                  <input class="input" id="p_birth" placeholder="Ex: 10/01/1990" value="${esc(db.ui.patientForm.birth||"")}" />
                </div>
                <div class="field">
                  <div class="label"><span>Observações</span><span class="small">alergias/comorbidades</span></div>
                  <input class="input" id="p_notes" placeholder="Ex: alérgico a dipirona" value="${esc(db.ui.patientForm.notes||"")}" />
                </div>
              </div>

              <div class="row">
                <button class="btn primary" id="btnSalvarPaciente">${db.ui.editingPatientId ? "Salvar alterações" : "Criar paciente"}</button>
                <button class="btn" id="btnCancelarPaciente">Cancelar</button>
              </div>

              <div class="small" style="margin-top:10px">
                Para editar um paciente: clique com o botão direito em cima dele (sem modal).
              </div>
            </div>
          </details>
        </div>

        <div class="card">
          <h2>Prontuário do paciente</h2>

          <div class="notice">
            <div>📅</div>
            <div>
              <div><b style="color:var(--text)">${esc(pName)}</b></div>
              <div>${esc(pSub)}</div>
            </div>
          </div>

          <div class="hr"></div>

          <div class="row">
            <button class="btn primary" id="btnNovaVisita" ${p ? "" : "disabled"}>+ Nova visita (agora)</button>
            <button class="btn" id="btnExcluirVisita" ${v ? "" : "disabled"}>Excluir visita</button>
          </div>

          <div class="hr"></div>
          <div class="list" id="visitList"></div>

          ${p ? `<div class="small" style="margin-top:10px">Total de visitas: <b>${p.visits.length}</b></div>` : ""}
        </div>

        <div class="card col3">
          <h2>Atendimento + Documentos</h2>

          ${(!p) ? `
            <div class="notice">
              <div>➡️</div>
              <div>
                <div><b style="color:var(--text)">Comece pela esquerda.</b></div>
                <div>Crie um paciente e depois clique em “Nova visita”.</div>
              </div>
            </div>
          ` : ""}

          ${p && !v ? `
            <div class="notice">
              <div>🧾</div>
              <div>
                <div><b style="color:var(--text)">Selecione uma visita</b> (ou crie uma).</div>
                <div>O editor e os PDFs puxam os dados dela.</div>
              </div>
            </div>
          ` : ""}

          ${p && v ? `
            <div class="pill" style="margin-bottom:10px"><b>Data/Hora:</b> ${esc(fmtDateTime(v.when))} • <b>Status:</b> ${esc(v.status||"aberto")}</div>

            <div class="kv">
              <div class="field">
                <div class="label"><span>Queixa principal</span><span class="small">texto curto</span></div>
                <input class="input" id="f_queixa" value="${esc(v.fields.queixa||"")}" />
              </div>
              <div class="field">
                <div class="label"><span>Procedimento (resumo)</span><span class="small">ex: exodontia</span></div>
                <input class="input" id="f_proc" value="${esc(v.fields.procedimento||"")}" />
              </div>
            </div>

            <div class="field">
              <div class="label"><span>Subjetivo</span><span class="small">história</span></div>
              <textarea class="textarea" id="f_sub">${esc(v.fields.subjetivo||"")}</textarea>
            </div>
            <div class="field">
              <div class="label"><span>Objetivo</span><span class="small">exame/achados</span></div>
              <textarea class="textarea" id="f_obj">${esc(v.fields.objetivo||"")}</textarea>
            </div>
            <div class="field">
              <div class="label"><span>Avaliação</span><span class="small">hipótese/diagnóstico</span></div>
              <textarea class="textarea" id="f_ava">${esc(v.fields.avaliacao||"")}</textarea>
            </div>
            <div class="field">
              <div class="label"><span>Plano / Conduta</span><span class="small">tratamento</span></div>
              <textarea class="textarea" id="f_con">${esc(v.fields.conduta||"")}</textarea>
            </div>

            <div class="hr"></div>

            <div class="field">
              <div class="label"><span>Templates de receita</span><span class="small">1 clique</span></div>
              <div class="row tight" id="templateChips"></div>
              <div class="small" style="margin-top:8px">Clique num template e ele entra na receita. Você edita livre.</div>
            </div>

            <div class="field">
              <div class="label"><span>Receita (texto)</span><span class="small">vai pro PDF</span></div>
              <textarea class="textarea" id="f_rec" placeholder="Escreva a receita aqui...">${esc(v.fields.receita||"")}</textarea>
            </div>

            <div class="row">
              <button class="btn" id="btnStatus">${v.status==="falta" ? "Marcar como presente" : "Marcar como falta"}</button>
              <button class="btn primary" id="btnSalvarVisita">Salvar agora</button>
            </div>

            <div class="hr"></div>

            <div class="label"><span>Documentos</span><span class="small">sob demanda</span></div>
            <div class="row">
              <button class="btn primary" id="btnPdfEvolucao">PDF Evolução</button>
              <button class="btn" id="btnPdfReceita">PDF Receita</button>
              <button class="btn" id="btnRecibo">Recibo</button>
            </div>

            <div class="hr"></div>

            <details>
              <summary>Configurar templates</summary>
              <div class="content">
                <div class="small">Edite nomes e textos. Fica salvo no dispositivo.</div>
                <div class="hr"></div>
                <div id="templateEditor"></div>
                <div class="row" style="margin-top:10px">
                  <button class="btn primary" id="btnSalvarTemplates">Salvar templates</button>
                  <button class="btn" id="btnResetTemplates">Resetar padrão</button>
                </div>
              </div>
            </details>
          ` : ""}

          <div class="toast" id="toast"></div>
        </div>
      </div>
    </div>
  `;

  renderPatients();
  renderVisits();
  bindTop();
  bindPatientForm();

  if(p && v){
    bindVisitEditor();
    renderTemplateChips();
    renderTemplateEditor();
    bindTemplateInputs();
    bindDocs();
  }
}

function renderPatients(){
  const el = document.getElementById("patientList");
  if(!el) return;

  const q = (db.ui.patientQuery || "").trim().toLowerCase();
  const list = db.patients
    .filter(p => !q || p.name.toLowerCase().includes(q) || (p.doc||"").toLowerCase().includes(q))
    .sort((a,b)=> (b.updatedAt||b.createdAt) - (a.updatedAt||a.createdAt));

  el.innerHTML = list.length ? list.map(p => `
    <div class="item ${p.id===db.ui.selectedPatientId ? "active" : ""}" data-id="${p.id}">
      <div class="title">${esc(p.name)}</div>
      <div class="meta"><span>${esc(p.doc || "sem doc")}</span><span>${p.visits.length} visita(s)</span></div>
    </div>
  `).join("") : `<div class="small">Nenhum paciente. Clique em “+ Paciente”.</div>`;

  el.querySelectorAll(".item").forEach(it=>{
    it.addEventListener("click", ()=>{
      db.ui.selectedPatientId = it.getAttribute("data-id");
      const p = getSelectedPatient();
      db.ui.selectedVisitId = p?.visits?.[0]?.id || null;
      saveDB(); render();
    });
    it.addEventListener("contextmenu", (e)=>{
      e.preventDefault();
      const id = it.getAttribute("data-id");
      const p = db.patients.find(x=>x.id===id);
      if(!p) return;
      db.ui.showPatientForm = true;
      db.ui.editingPatientId = id;
      db.ui.patientForm = { name:p.name, doc:p.doc||"", tel:p.tel||"", birth:p.birth||"", notes:p.notes||"" };
      saveDB(); render();
    });
  });

  const search = document.getElementById("searchPatient");
  search?.addEventListener("input", ()=>{
    db.ui.patientQuery = search.value;
    saveDB();
    renderPatients();
  });

  document.getElementById("btnNovoPaciente")?.addEventListener("click", ()=>{
    db.ui.showPatientForm = true;
    db.ui.editingPatientId = null;
    db.ui.patientForm = { name:"", doc:"", tel:"", birth:"", notes:"" };
    saveDB(); render();
    setTimeout(()=> document.getElementById("p_name")?.focus(), 50);
  });
}

function renderVisits(){
  const el = document.getElementById("visitList");
  if(!el) return;

  const p = getSelectedPatient();
  if(!p){ el.innerHTML = `<div class="small">Selecione um paciente.</div>`; return; }

  const visits = [...p.visits].sort((a,b)=> b.when - a.when);
  el.innerHTML = visits.length ? visits.map(v => `
    <div class="item ${v.id===db.ui.selectedVisitId ? "active" : ""}" data-id="${v.id}">
      <div class="title">${esc(fmtDateTime(v.when))}</div>
      <div class="meta"><span>${esc(v.fields.queixa || "sem queixa")}</span><span>${esc(v.status || "aberto")}</span></div>
    </div>
  `).join("") : `<div class="small">Sem visitas ainda. Clique em “Nova visita (agora)”.</div>`;

  el.querySelectorAll(".item").forEach(it=>{
    it.addEventListener("click", ()=>{
      db.ui.selectedVisitId = it.getAttribute("data-id");
      saveDB(); render();
    });
  });

  document.getElementById("btnNovaVisita")?.addEventListener("click", ()=>{
    const visit = newVisit();
    p.visits.unshift(visit);
    p.updatedAt = Date.now();
    db.ui.selectedVisitId = visit.id;
    saveDB();
    toast("Nova visita criada.", "ok");
    render();
  });

  document.getElementById("btnExcluirVisita")?.addEventListener("click", ()=>{
    const v = getSelectedVisit();
    if(!v) return;
    p.visits = p.visits.filter(x=>x.id!==v.id);
    db.ui.selectedVisitId = p.visits[0]?.id || null;
    p.updatedAt = Date.now();
    saveDB();
    toast("Visita excluída.", "ok");
    render();
  });
}

function bindTop(){
  document.getElementById("btnBackup")?.addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(db, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `btx_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup exportado.", "ok");
  });

  document.getElementById("btnRestore")?.addEventListener("click", ()=>{
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json";
    inp.onchange = async ()=>{
      const file = inp.files?.[0];
      if(!file) return;
      try{
        const text = await file.text();
        const restored = JSON.parse(text);
        if(!restored || !Array.isArray(restored.patients)) throw new Error("Arquivo inválido.");
        localStorage.setItem(LS_KEY, JSON.stringify(restored));
        toast("Backup restaurado.", "ok");
        location.reload();
      }catch(e){
        toast("Falha ao restaurar: " + e.message, "err");
      }
    };
    inp.click();
  });

  document.getElementById("btnZerar")?.addEventListener("click", ()=>{
    localStorage.removeItem(LS_KEY);
    toast("Dados apagados. Recarregando...", "ok");
    setTimeout(()=> location.reload(), 700);
  });
}

function bindPatientForm(){
  const map = [["p_name","name"],["p_doc","doc"],["p_tel","tel"],["p_birth","birth"],["p_notes","notes"]];
  map.forEach(([id,key])=>{
    const el = document.getElementById(id);
    el?.addEventListener("input", ()=>{ db.ui.patientForm[key] = el.value; saveDB(); });
  });

  document.getElementById("btnSalvarPaciente")?.addEventListener("click", ()=>{
    const f = db.ui.patientForm || {};
    const name = (f.name||"").trim();
    if(!name){ toast("Nome do paciente é obrigatório.", "err"); return; }

    if(db.ui.editingPatientId){
      const p = db.patients.find(x=>x.id===db.ui.editingPatientId);
      if(!p) return;
      p.name = name; p.doc=(f.doc||"").trim(); p.tel=(f.tel||"").trim();
      p.birth=(f.birth||"").trim(); p.notes=(f.notes||"").trim();
      p.updatedAt = Date.now();
      db.ui.selectedPatientId = p.id;
      toast("Paciente atualizado.", "ok");
    }else{
      const p = {id:uid(), name, doc:(f.doc||"").trim(), tel:(f.tel||"").trim(), birth:(f.birth||"").trim(), notes:(f.notes||"").trim(),
                 createdAt:Date.now(), updatedAt:Date.now(), visits:[]};
      db.patients.unshift(p);
      db.ui.selectedPatientId = p.id;
      db.ui.selectedVisitId = null;
      toast("Paciente criado.", "ok");
    }

    db.ui.showPatientForm = false;
    db.ui.editingPatientId = null;
    db.ui.patientForm = { name:"", doc:"", tel:"", birth:"", notes:"" };
    saveDB(); render();
  });

  document.getElementById("btnCancelarPaciente")?.addEventListener("click", ()=>{
    db.ui.showPatientForm = false;
    db.ui.editingPatientId = null;
    db.ui.patientForm = { name:"", doc:"", tel:"", birth:"", notes:"" };
    saveDB(); render();
  });
}

function bindVisitEditor(){
  const p = getSelectedPatient(); const v = getSelectedVisit();
  if(!p || !v) return;

  bindField("f_queixa", val => v.fields.queixa = val);
  bindField("f_proc", val => v.fields.procedimento = val);
  bindField("f_sub", val => v.fields.subjetivo = val);
  bindField("f_obj", val => v.fields.objetivo = val);
  bindField("f_ava", val => v.fields.avaliacao = val);
  bindField("f_con", val => v.fields.conduta = val);
  bindField("f_rec", val => v.fields.receita = val);

  document.getElementById("btnSalvarVisita")?.addEventListener("click", ()=>{
    touchSelected(); saveDB(); toast("Visita salva.", "ok"); render();
  });

  document.getElementById("btnStatus")?.addEventListener("click", ()=>{
    v.status = (v.status==="falta") ? "aberto" : "falta";
    touchSelected(); saveDB(); toast("Status atualizado.", "ok"); render();
  });
}

function bindField(id, setter){
  const el = document.getElementById(id);
  el?.addEventListener("input", ()=>{
    setter(el.value);
    touchSelected();
    saveDB();
  });
}

function renderTemplateChips(){
  const wrap = document.getElementById("templateChips");
  if(!wrap) return;
  wrap.innerHTML = (db.templates||[]).map(t=>`<div class="chip" data-id="${t.id}">${esc(t.name)}</div>`).join("");
  const v = getSelectedVisit();
  wrap.querySelectorAll(".chip").forEach(ch=>{
    ch.addEventListener("click", ()=>{
      const id = ch.getAttribute("data-id");
      const t = db.templates.find(x=>x.id===id);
      if(!t || !v) return;
      const atual = (v.fields.receita||"").trim();
      v.fields.receita = atual ? (atual + "\\n\\n" + t.text.trim()) : t.text.trim();
      touchSelected(); saveDB(); toast("Template inserido na receita.", "ok"); render();
    });
  });
}

function renderTemplateEditor(){
  const el = document.getElementById("templateEditor");
  if(!el) return;
  el.innerHTML = (db.templates||[]).map((t,idx)=>`
    <details ${idx===0 ? "open":""} style="margin-bottom:10px">
      <summary>${esc(t.name)}</summary>
      <div class="content">
        <div class="field">
          <div class="label"><span>Nome</span><span class="small">aparece no botão</span></div>
          <input class="input" data-tname="${t.id}" value="${esc(t.name)}" />
        </div>
        <div class="field">
          <div class="label"><span>Texto</span><span class="small">vai pra receita</span></div>
          <textarea class="textarea" data-ttext="${t.id}">${esc(t.text)}</textarea>
        </div>
      </div>
    </details>
  `).join("");
}

function bindTemplateInputs(){
  document.querySelectorAll("[data-tname]").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const id = inp.getAttribute("data-tname");
      const t = db.templates.find(x=>x.id===id);
      if(t){ t.name = inp.value; saveDB(); }
    });
  });
  document.querySelectorAll("[data-ttext]").forEach(tx=>{
    tx.addEventListener("input", ()=>{
      const id = tx.getAttribute("data-ttext");
      const t = db.templates.find(x=>x.id===id);
      if(t){ t.text = tx.value; saveDB(); }
    });
  });
}

function bindDocs(){
  document.getElementById("btnPdfEvolucao")?.addEventListener("click", pdfEvolucao);
  document.getElementById("btnPdfReceita")?.addEventListener("click", pdfReceita);
  document.getElementById("btnRecibo")?.addEventListener("click", pdfRecibo);

  document.getElementById("btnSalvarTemplates")?.addEventListener("click", ()=>{ saveDB(); toast("Templates salvos.", "ok"); render(); });
  document.getElementById("btnResetTemplates")?.addEventListener("click", ()=>{ db.templates = defaultTemplates(); saveDB(); toast("Templates resetados.", "ok"); render(); });
}

/* PDFs */
function pdfBaseHeader(doc, title, p, v){
  const m = 14;
  doc.setFont("helvetica","bold"); doc.setFontSize(14);
  doc.text(title, m, 18);

  doc.setFont("helvetica","normal"); doc.setFontSize(11);
  doc.text(`Paciente: ${p.name}`, m, 28);
  doc.text(`Documento: ${p.doc || "—"}`, m, 34);
  doc.text(`Telefone: ${p.tel || "—"}`, m, 40);

  doc.text(`Data/Hora: ${fmtDateTime(v.when)}`, 120, 28);
  doc.text(`Nascimento: ${p.birth || "—"}`, 120, 34);
  doc.text(`Status: ${v.status || "aberto"}`, 120, 40);

  doc.setDrawColor(60);
  doc.rect(m, 46, 210 - m*2, 240);
  return {m};
}

function pdfEvolucao(){
  try{
    const { jsPDF } = window.jspdf || {};
    if(!jsPDF) throw new Error("jsPDF não carregou (sem internet?)");
    const p = getSelectedPatient(), v = getSelectedVisit();
    if(!p || !v) return;

    const doc = new jsPDF({ unit:"mm", format:"a4" });
    const {m} = pdfBaseHeader(doc, "EVOLUÇÃO / PRONTUÁRIO", p, v);

    const texto = [
      `Queixa: ${v.fields.queixa || "—"}`,
      `Procedimento: ${v.fields.procedimento || "—"}`,
      "",
      "Subjetivo:", v.fields.subjetivo || "—",
      "", "Objetivo:", v.fields.objetivo || "—",
      "", "Avaliação:", v.fields.avaliacao || "—",
      "", "Conduta:", v.fields.conduta || "—",
    ].join("\\n");

    const lines = doc.splitTextToSize(texto, 210 - m*2 - 8);
    doc.text(lines, m+4, 56);

    doc.save(`evolucao_${safeFile(p.name)}_${Date.now()}.pdf`);
    toast("PDF de evolução gerado.", "ok");
  }catch(e){ toast("Erro no PDF: " + e.message, "err"); }
}

function pdfReceita(){
  try{
    const { jsPDF } = window.jspdf || {};
    if(!jsPDF) throw new Error("jsPDF não carregou (sem internet?)");
    const p = getSelectedPatient(), v = getSelectedVisit();
    if(!p || !v) return;

    const doc = new jsPDF({ unit:"mm", format:"a4" });
    const {m} = pdfBaseHeader(doc, "RECEITUÁRIO", p, v);

    const texto = (v.fields.receita||"").trim() || "—";
    const lines = doc.splitTextToSize(texto, 210 - m*2 - 8);
    doc.text(lines, m+4, 56);

    doc.save(`receita_${safeFile(p.name)}_${Date.now()}.pdf`);
    toast("PDF de receita gerado.", "ok");
  }catch(e){ toast("Erro no PDF: " + e.message, "err"); }
}

function pdfRecibo(){
  try{
    const { jsPDF } = window.jspdf || {};
    if(!jsPDF) throw new Error("jsPDF não carregou (sem internet?)");
    const p = getSelectedPatient(), v = getSelectedVisit();
    if(!p || !v) return;

    const doc = new jsPDF({ unit:"mm", format:"a4" });
    const m = 14;
    doc.setFont("helvetica","bold"); doc.setFontSize(14);
    doc.text("RECIBO", m, 18);

    doc.setFont("helvetica","normal"); doc.setFontSize(11);
    doc.text(`Recebi de: ${p.name}`, m, 32);
    doc.text(`Documento: ${p.doc || "—"}`, m, 38);
    doc.text(`Referente a: ${v.fields.procedimento || "Procedimento odontológico"}`, m, 46);
    doc.text(`Valor: R$ ________`, m, 54);
    doc.text(`Data: ${fmtDate(v.when)}`, m, 64);
    doc.text("Assinatura: ________________________________", m, 90);

    doc.save(`recibo_${safeFile(p.name)}_${Date.now()}.pdf`);
    toast("Recibo gerado.", "ok");
  }catch(e){ toast("Erro no recibo: " + e.message, "err"); }
}

/* Data */
function newVisit(){
  return { id:uid(), when:Date.now(), status:"aberto", createdAt:Date.now(), updatedAt:Date.now(),
    fields:{ queixa:"", procedimento:"", subjetivo:"", objetivo:"", avaliacao:"", conduta:"", receita:"" }
  };
}

function seedDB(){
  return { patients:[], templates:defaultTemplates(), ui:{ selectedPatientId:null, selectedVisitId:null, patientQuery:"",
      showPatientForm:false, editingPatientId:null, patientForm:{name:"",doc:"",tel:"",birth:"",notes:""} } };
}

function ensureShape(){
  db.patients ||= [];
  db.templates ||= defaultTemplates();
  db.ui ||= seedDB().ui;
  db.ui.patientForm ||= {name:"",doc:"",tel:"",birth:"",notes:""};
}

function defaultTemplates(){
  const make = (name,text)=>({id:uid(), name, text});
  return [
    make("Dipirona 500mg (dor)", "Dipirona 500 mg\\nTomar 1 comprimido a cada 6 horas se dor, por até 3 dias."),
    make("Paracetamol 750mg (dor)", "Paracetamol 750 mg\\nTomar 1 comprimido a cada 8 horas se dor, por até 3 dias."),
    make("Ibuprofeno 600mg (inflamação)", "Ibuprofeno 600 mg\\nTomar 1 comprimido a cada 8 horas por 3 dias, após alimentação."),
    make("Amoxicilina 500mg", "Amoxicilina 500 mg\\nTomar 1 cápsula a cada 8 horas por 7 dias."),
    make("Clindamicina 300mg", "Clindamicina 300 mg\\nTomar 1 cápsula a cada 6 horas por 7 dias."),
    make("Clorexidina 0,12% (bochecho)", "Clorexidina 0,12%\\nBochechar 15 mL por 30 segundos, 2x ao dia por 7 dias.")
  ];
}

function getSelectedPatient(){ return db.patients.find(p=>p.id===db.ui.selectedPatientId) || null; }
function getSelectedVisit(){ const p=getSelectedPatient(); if(!p) return null; return p.visits.find(v=>v.id===db.ui.selectedVisitId) || null; }
function touchSelected(){ const p=getSelectedPatient(), v=getSelectedVisit(); if(v) v.updatedAt=Date.now(); if(p) p.updatedAt=Date.now(); }

function saveDB(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(db)); }catch(e){ toast("Falha ao salvar no dispositivo.", "err"); } }
function loadDB(){ try{ const raw=localStorage.getItem(LS_KEY); return raw?JSON.parse(raw):null; }catch{ return null; } }
function autosaveLoop(){ setInterval(()=>{ try{ saveDB(); }catch{} }, 5000); }

/* PWA */
function registerSW(){
  if(!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async()=>{ try{ await navigator.serviceWorker.register("./sw.js"); }catch(e){ console.warn("SW falhou:", e); } });
}

/* Utils */
function toast(msg,type="ok"){
  const wrap=document.getElementById("toast"); if(!wrap) return;
  const el=document.createElement("div"); el.className=`t ${type==="err"?"err":"ok"}`; el.textContent=msg;
  wrap.appendChild(el); setTimeout(()=>el.remove(), 2800);
}
function esc(str){ return String(str??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function uid(){ return (crypto?.randomUUID?.() || ("id_"+Math.random().toString(16).slice(2)+Date.now().toString(16))); }
function fmtDate(ts){ try{return new Date(ts).toLocaleDateString();}catch{return "—";} }
function fmtDateTime(ts){ try{return new Date(ts).toLocaleString();}catch{return "—";} }
function fmtDoc(p){ const a=p.doc?p.doc:"sem documento"; const b=p.tel?p.tel:"sem telefone"; return `${a} • ${b}`; }
function safeFile(name){ return (name||"paciente").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,""); }
