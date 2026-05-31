let state = { clients: [], prescriptions: [], stock: [], labOrders: [] };
let currentRoute = "dashboard";
let selectedClientId = "";

const routes = {
  dashboard: {
    title: "Visão geral",
    kicker: "Painel",
    section: document.querySelector("#dashboard-section")
  },
  clients: {
    title: "Clientes e histórico",
    kicker: "Clientes",
    section: document.querySelector("#clients-section")
  },
  prescriptions: {
    title: "Receitas oftalmológicas",
    kicker: "Receitas",
    section: document.querySelector("#prescriptions-section")
  },
  stock: {
    title: "Controle de estoque",
    kicker: "Estoque",
    section: document.querySelector("#stock-section")
  }
};

const categoryLabels = {
  frames: "Armações",
  lenses: "Lentes",
  accessories: "Acessórios"
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const storeInfo = {
  name: "Ótica Regina",
  subtitle: "Receita oftalmológica",
  phone: "",
  address: "",
  document: ""
};

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  setupPowerInputs();
  clearPrescriptionForm();
  try {
    await refreshData();
    showApp();
  } catch {
    updateLoginSummary();
    showLogin();
  }
});

function bindEvents() {
  document.querySelector("#login-form").addEventListener("submit", handleLogin);
  document.querySelector("#logout-button").addEventListener("click", handleLogout);
  document.querySelector("#quick-client-button").addEventListener("click", () => {
    setRoute("clients");
    showClientDetail();
    clearClientForm();
    document.querySelector("#client-name").focus();
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setRoute(button.dataset.route));
  });

  document.querySelector("#global-search").addEventListener("input", (event) => {
    setRoute("clients");
    showClientList();
    document.querySelector("#client-search").value = event.target.value;
    renderClients();
  });

  document.querySelector("#client-search").addEventListener("input", renderClients);
  document.querySelector("#new-client-button").addEventListener("click", () => {
    showClientDetail();
    clearClientForm();
    document.querySelector("#client-name").focus();
  });
  document.querySelector("#back-to-clients").addEventListener("click", showClientList);
  document.querySelector("#client-form").addEventListener("submit", saveClient);
  document.querySelector("#clear-client-form").addEventListener("click", clearClientForm);

  document.querySelector("#prescription-form").addEventListener("submit", savePrescription);
  document.querySelector("#clear-prescription-form").addEventListener("click", clearPrescriptionForm);
  document.querySelector("#prescription-search").addEventListener("input", renderPrescriptions);
  document.querySelector("#prescription-client-search").addEventListener("input", renderPrescriptionClientSearch);
  document.querySelector("#prescription-client-search").addEventListener("focus", renderPrescriptionClientSearch);

  document.querySelector("#stock-form").addEventListener("submit", saveStockItem);
  document.querySelector("#clear-stock-form").addEventListener("click", clearStockForm);
  document.querySelector("#stock-filter").addEventListener("change", renderStock);
}

function setupPowerInputs() {
  document.querySelectorAll(".rx-power").forEach((input) => {
    input.readOnly = true;
    input.value = input.value || "+0.00";
    input.removeAttribute("list");
    wrapPowerInput(input);
    input.addEventListener("blur", () => {
      input.value = normalizePower(input.value);
    });
  });
}

function wrapPowerInput(input) {
  if (input.parentElement.classList.contains("rx-stepper")) return;

  const wrapper = document.createElement("div");
  wrapper.className = "rx-stepper";
  const minus = document.createElement("button");
  const plus = document.createElement("button");
  minus.type = "button";
  plus.type = "button";
  minus.textContent = "-";
  plus.textContent = "+";
  minus.setAttribute("aria-label", "Diminuir 0,25");
  plus.setAttribute("aria-label", "Aumentar 0,25");

  input.parentNode.insertBefore(wrapper, input);
  wrapper.append(minus, input, plus);

  minus.addEventListener("click", () => changePower(input, -0.25));
  plus.addEventListener("click", () => changePower(input, 0.25));
}

function changePower(input, step) {
  input.value = formatPower(parsePower(input.value) + step);
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function loadData() {
  state = await apiGet("/api/data");
}

async function refreshData() {
  await loadData();
  renderAll();
}

async function handleLogin(event) {
  event.preventDefault();
  const user = document.querySelector("#login-user").value.trim();
  const password = document.querySelector("#login-pass").value.trim();
  const error = document.querySelector("#login-error");

  try {
    const result = await apiPost("/api/login", { user, password });
    if (result.ok) {
      error.textContent = "";
      showApp();
      return;
    }
    error.textContent = result.error || "Usuário ou senha inválidos.";
  } catch (err) {
    error.textContent = err && err.message ? err.message : "Falha ao autenticar.";
  }
}

function handleLogout() {
  try {
    await apiPost("/api/logout", {});
  } catch {
    // Ignore logout failure and clear UI anyway.
  }
  showLogin();
}

function showLogin() {
  document.querySelector("#login-view").classList.remove("is-hidden");
  document.querySelector("#app-view").classList.add("is-hidden");
  updateLoginSummary();
}

async function showApp() {
  document.querySelector("#login-view").classList.add("is-hidden");
  document.querySelector("#app-view").classList.remove("is-hidden");
  setRoute(currentRoute);
  await refreshData();
}

function setRoute(route) {
  currentRoute = route;
  Object.values(routes).forEach((item) => item.section.classList.add("is-hidden"));
  routes[route].section.classList.remove("is-hidden");

  document.querySelector("#section-title").textContent = routes[route].title;
  document.querySelector("#section-kicker").textContent = routes[route].kicker;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.route === route);
  });
}

function renderAll() {
  renderDashboard();
  renderClients();
  renderPrescriptionClientOptions();
  renderPrescriptions();
  renderStock();
  updateLoginSummary();
}

function renderDashboard() {
  const lowStock = state.stock.filter((item) => item.quantity <= item.minimum);
  document.querySelector("#metric-clients").textContent = state.clients.length;
  document.querySelector("#metric-prescriptions").textContent = state.prescriptions.length;
  document.querySelector("#metric-low-stock").textContent = lowStock.length;

  const recent = [...state.prescriptions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  document.querySelector("#recent-prescriptions").innerHTML = recent.length
    ? recent.map(renderPrescriptionCard).join("")
    : emptyState("Nenhuma receita registrada.");

  document.querySelector("#stock-alerts").innerHTML = lowStock.length
    ? lowStock.map((item) => `
      <div class="stock-row is-low">
        <div>
          <p class="row-title">${escapeHtml(item.name)}</p>
          <p class="row-meta">${stockMeta(item)}</p>
        </div>
        <span class="pill warning">Qtd. ${item.quantity}</span>
        <span class="row-meta">Mín. ${item.minimum}</span>
        <button type="button" onclick="editStockItem('${item.id}')">Editar</button>
      </div>
    `).join("")
    : emptyState("Nenhum item abaixo do estoque mínimo.");
}

function renderClients() {
  const term = normalize(document.querySelector("#client-search").value);
  const clients = state.clients.filter((client) => {
    return [client.name, client.cpf, client.phone].some((value) => normalize(value).includes(term));
  });

  document.querySelector("#clients-list").innerHTML = clients.length
    ? clients.map((client) => {
      const total = state.prescriptions.filter((item) => item.clientId === client.id).length;
      return `
        <article class="client-row">
          <div>
            <p class="row-title">${escapeHtml(client.name)}</p>
            <p class="row-meta">${escapeHtml(client.phone)} ${client.cpf ? "| CPF " + escapeHtml(client.cpf) : ""}</p>
            <span class="pill">${total} receita${total === 1 ? "" : "s"}</span>
          </div>
          <button type="button" onclick="selectClient('${client.id}')">Abrir</button>
        </article>
      `;
    }).join("")
    : emptyState("Nenhum cliente encontrado.");
}

function selectClient(clientId) {
  const client = state.clients.find((item) => item.id === clientId);
  if (!client) return;

  showClientDetail();
  selectedClientId = clientId;
  document.querySelector("#client-form-title").textContent = "Ficha do cliente";
  document.querySelector("#client-id").value = client.id;
  document.querySelector("#client-name").value = client.name;
  document.querySelector("#client-cpf").value = client.cpf || "";
  document.querySelector("#client-phone").value = client.phone || "";
  document.querySelector("#client-email").value = client.email || "";
  document.querySelector("#client-birth").value = client.birth || "";
  document.querySelector("#client-address").value = client.address || "";
  renderClientSummary(client);
  renderClientHistory(clientId);
}

function showClientDetail() {
  document.querySelector("#client-list-view").classList.add("is-hidden");
  document.querySelector("#client-detail-view").classList.remove("is-hidden");
}

function showClientList() {
  document.querySelector("#client-detail-view").classList.add("is-hidden");
  document.querySelector("#client-list-view").classList.remove("is-hidden");
  renderClients();
}

function renderClientSummary(client) {
  const total = state.prescriptions.filter((item) => item.clientId === client.id).length;
  const latestOrder = [...state.labOrders]
    .filter((item) => item.clientId === client.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  document.querySelector("#client-summary").innerHTML = `
    <article>
      <span>Cliente</span>
      <strong>${escapeHtml(client.name)}</strong>
    </article>
    <article>
      <span>Telefone</span>
      <strong>${escapeHtml(client.phone || "-")}</strong>
    </article>
    <article>
      <span>CPF</span>
      <strong>${escapeHtml(client.cpf || "-")}</strong>
    </article>
    <article>
      <span>Receitas</span>
      <strong>${total}</strong>
    </article>
    <article>
      <span>Última O.S</span>
      <strong>${latestOrder ? escapeHtml(latestOrder.orderNumber) : "-"}</strong>
    </article>
  `;
}

function renderClientHistory(clientId) {
  const history = state.prescriptions
    .filter((item) => item.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const selected = document.querySelector("#selected-prescription");

  if (!history.length) {
    document.querySelector("#client-history").innerHTML = "Este cliente ainda não possui receitas registradas.";
    selected.classList.add("is-hidden");
    selected.innerHTML = "";
    return;
  }

  document.querySelector("#client-history").innerHTML = history.map((item, index) => `
    <button class="${index === 0 ? "is-active" : ""}" type="button" onclick="selectPrescriptionDetail('${item.id}')">
      <strong>${formatDate(item.date)}</strong>
      <span>${escapeHtml(item.doctor || "Sem profissional")} | Adição ${field(item.addition)}</span>
    </button>
  `).join("");
  selectPrescriptionDetail(history[0].id);
}

function selectPrescriptionDetail(prescriptionId) {
  const prescription = state.prescriptions.find((item) => item.id === prescriptionId);
  if (!prescription) return;

  document.querySelectorAll("#client-history button").forEach((button) => {
    button.classList.toggle("is-active", button.getAttribute("onclick")?.includes(prescriptionId));
  });

  const selected = document.querySelector("#selected-prescription");
  selected.classList.remove("is-hidden");
  selected.innerHTML = renderPrescriptionDetail(prescription);
}

function renderPrescriptionDetail(item) {
  const orders = state.labOrders
    .filter((order) => order.prescriptionId === item.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return `
    <article class="rx-detail-card">
      <div class="rx-detail-header">
        <div>
          <span>Receita selecionada</span>
          <strong>${formatDate(item.date)}</strong>
        </div>
        <span>${escapeHtml(item.doctor || "Sem profissional")} ${item.crm ? "| CRM " + escapeHtml(item.crm) : ""}</span>
      </div>
      ${renderLabOrders(orders)}
      ${renderRxDetailTable("Longe", [
        ["OD", item.rightSpherical, item.rightCylindrical, item.rightAxis],
        ["OE", item.leftSpherical, item.leftCylindrical, item.leftAxis]
      ])}
      ${renderRxDetailTable("Perto", [
        ["OD", item.nearRightSpherical, item.nearRightCylindrical, item.nearRightAxis],
        ["OE", item.nearLeftSpherical, item.nearLeftCylindrical, item.nearLeftAxis]
      ])}
      <div class="rx-measure-detail">
        <span>Adição: <strong>${field(item.addition)}</strong></span>
        <span>DNP: <strong>${field(item.dnp)}</strong></span>
        <span>C.O: <strong>${field(item.co)}</strong></span>
        <span>Película: <strong>${field(item.film)}</strong></span>
        <span>D.P: <strong>${field(item.dp)}</strong></span>
      </div>
      <div class="rx-measure-detail">
        <span>Tipo de lente: <strong>${field(item.lensType)}</strong></span>
        <span>Coloração: <strong>${field(item.lensColoring)}</strong></span>
        <span>Material: <strong>${field(lensMaterialLabel(item.lensMaterial))}</strong></span>
        <span>Tratamento: <strong>${field(item.lensTreatment)}</strong></span>
      </div>
      ${item.notes ? `<p class="row-meta">${escapeHtml(item.notes)}</p>` : ""}
      <div class="rx-print-actions">
        <button type="button" onclick="generatePrescriptionPdf('${item.id}')">Gerar PDF</button>
        <button class="secondary-button" type="button" onclick="printPrescription('${item.id}')">Imprimir</button>
      </div>
    </article>
  `;
}

function renderLabOrders(orders) {
  if (!orders.length) {
    return `<div class="lab-order-list empty-state">Nenhuma O.S enviada ao laboratório para esta receita.</div>`;
  }

  return `
    <div class="lab-order-list">
      ${orders.map((order) => `
        <span><strong>${escapeHtml(order.orderNumber)}</strong> enviada em ${formatDateTime(order.createdAt)}${order.snapshot?.prescription?.laboratory ? " | Lab: " + escapeHtml(order.snapshot.prescription.laboratory) : ""}</span>
      `).join("")}
    </div>
  `;
}

async function generatePrescriptionPdf(prescriptionId) {
  openPrescriptionPrintView(prescriptionId, "pdf");
}

async function printPrescription(prescriptionId) {
  openPrescriptionPrintView(prescriptionId, "print");
}

async function openPrescriptionPrintView(prescriptionId, mode) {
  const prescription = state.prescriptions.find((item) => item.id === prescriptionId);
  if (!prescription) return;

  const client = getClient(prescription.clientId);
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return;

  printWindow.document.write(buildPrescriptionPrintHtml(client, prescription, mode));
  printWindow.document.close();
  printWindow.focus();
}

async function createLabOrder(client, prescription) {
  return apiPost("/api/lab-orders", { client, prescription });
}

async function handleLabOrderCreated(prescriptionId) {
  await refreshData();
  if (selectedClientId) {
    const client = getClient(selectedClientId);
    if (client) renderClientSummary(client);
    renderClientHistory(selectedClientId);
    selectPrescriptionDetail(prescriptionId);
  }
}

function buildPrescriptionPrintHtml(client, prescription, mode) {
  const title = mode === "pdf" ? "Salvar receita em PDF" : "Imprimir receita";
  const clientData = encodePrintData(client);
  const prescriptionData = encodePrintData(prescription);
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>${title} - ${escapeHtml(client?.name || "Cliente")}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #17202a;
            font-family: Arial, Helvetica, sans-serif;
            background: #eef4f8;
          }
          .print-toolbar {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 12px;
            background: #071827;
            box-shadow: 0 8px 24px rgba(7, 24, 39, 0.18);
          }
          .print-toolbar button {
            min-height: 40px;
            border: 0;
            border-radius: 6px;
            padding: 0 16px;
            background: #be0f16;
            color: #ffffff;
            cursor: pointer;
            font-weight: 700;
          }
          .print-toolbar .secondary {
            background: #ffffff;
            color: #17202a;
          }
          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 16mm;
            background: #ffffff;
          }
          .header {
            display: grid;
            grid-template-columns: 130px 1fr;
            gap: 18px;
            align-items: center;
            border-bottom: 2px solid #b80e15;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .header img {
            max-width: 120px;
            max-height: 78px;
            object-fit: contain;
          }
          .header h1 {
            margin: 0 0 6px;
            color: #8f090f;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 28px;
          }
          .header p,
          .section p {
            margin: 3px 0;
            color: #536273;
            font-size: 13px;
          }
          .section {
            margin-top: 16px;
          }
          .section h2 {
            margin: 0 0 10px;
            color: #102438;
            font-size: 17px;
            border-bottom: 1px solid #d8e1e8;
            padding-bottom: 7px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px 14px;
          }
          .info-box {
            border: 1px solid #d8e1e8;
            border-radius: 6px;
            padding: 9px;
          }
          .info-box span {
            display: block;
            color: #667181;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .info-box strong {
            display: block;
            margin-top: 4px;
            font-size: 14px;
          }
          .editable-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px 14px;
          }
          .print-field {
            display: grid;
            gap: 5px;
            border: 1px solid #d8e1e8;
            border-radius: 6px;
            padding: 9px;
          }
          .print-field span {
            color: #667181;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .print-field input,
          .print-field select,
          .print-field textarea {
            width: 100%;
            border: 0;
            outline: 0;
            color: #17202a;
            font: inherit;
            font-size: 14px;
            font-weight: 700;
            background: #ffffff;
          }
          .print-field textarea {
            min-height: 70px;
            resize: vertical;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th, td {
            border: 1px solid #cfd9e2;
            padding: 10px;
            text-align: center;
            font-size: 14px;
          }
          th {
            background: #f1f5f8;
            color: #344557;
          }
          td:first-child {
            background: #fff4f4;
            color: #8f090f;
            font-weight: 800;
          }
          .measure-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
          }
          .notes {
            min-height: 70px;
            border: 1px solid #d8e1e8;
            border-radius: 6px;
            padding: 10px;
            color: #344557;
          }
          .footer {
            margin-top: 28px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            align-items: end;
          }
          .signature {
            border-top: 1px solid #667181;
            padding-top: 8px;
            text-align: center;
            color: #536273;
            font-size: 12px;
          }
          @page { size: A4; margin: 0; }
          @media print {
            body { background: #ffffff; }
            .print-toolbar { display: none; }
            .page { width: auto; min-height: auto; }
            .print-field input,
            .print-field select,
            .print-field textarea {
              appearance: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-toolbar">
          <button type="button" onclick="prepareAndPrint('pdf')">Salvar como PDF</button>
          <button class="secondary" type="button" onclick="prepareAndPrint('print')">Imprimir</button>
          <button class="secondary" type="button" onclick="window.close()">Fechar</button>
        </div>
        <main class="page">
          <header class="header">
            <img src="${location.origin}/assets/logo-regina2.png" alt="Logo ${escapeHtml(storeInfo.name)}">
            <div>
              <h1>${escapeHtml(storeInfo.name)}</h1>
              <p>${escapeHtml(storeInfo.subtitle)}</p>
              ${storeInfo.phone ? `<p>Telefone: ${escapeHtml(storeInfo.phone)}</p>` : ""}
              ${storeInfo.address ? `<p>Endereço: ${escapeHtml(storeInfo.address)}</p>` : ""}
              ${storeInfo.document ? `<p>${escapeHtml(storeInfo.document)}</p>` : ""}
            </div>
          </header>

          <section class="section">
            <div class="info-grid">
              <div class="info-box">
                <span>Ordem de Serviço</span>
                <strong id="os-number">Será gerada ao salvar/imprimir</strong>
              </div>
              <div class="info-box">
                <span>Data da O.S</span>
                <strong id="os-date">-</strong>
              </div>
            </div>
          </section>

          <section class="section">
            <h2>Dados do cliente</h2>
            <div class="info-grid">
              ${printInfo("Nome", client?.name)}
            </div>
          </section>

          <section class="section">
            <h2>Dados da receita</h2>
            <div class="info-grid">
              ${printInfo("Data", formatDate(prescription.date))}
            </div>
            <div class="editable-grid">
              ${printInput("Laboratório para envio", "")}
              ${printInput("Tipo de lente", prescription.lensType)}
              ${printInput("Coloração", prescription.lensColoring)}
              ${printSelect("Material", prescription.lensMaterial)}
              ${printInput("Tratamento", prescription.lensTreatment)}
              ${printInput("Dr(a).", prescription.doctor)}
              ${printInput("CRM", prescription.crm)}
            </div>
            ${printRxTable("Longe", [
              ["OD", prescription.rightSpherical, prescription.rightCylindrical, prescription.rightAxis],
              ["OE", prescription.leftSpherical, prescription.leftCylindrical, prescription.leftAxis]
            ])}
            ${printRxTable("Perto", [
              ["OD", prescription.nearRightSpherical, prescription.nearRightCylindrical, prescription.nearRightAxis],
              ["OE", prescription.nearLeftSpherical, prescription.nearLeftCylindrical, prescription.nearLeftAxis]
            ])}
          </section>

          <section class="section">
            <h2>Medidas</h2>
            <div class="measure-grid">
              ${printInfo("Adição", prescription.addition)}
              ${printInfo("DNP", prescription.dnp)}
              ${printInfo("C.O", prescription.co)}
              ${printInfo("Película", prescription.film)}
              ${printInfo("D.P", prescription.dp)}
            </div>
          </section>

          <section class="section">
            <h2>Observações</h2>
            ${printTextarea("Observações", prescription.notes)}
          </section>

          <footer class="footer">
            <div></div>
            <div class="signature">Assinatura / carimbo</div>
          </footer>
        </main>
        <script>
          const baseClient = JSON.parse(decodeURIComponent("${clientData}"));
          const basePrescription = JSON.parse(decodeURIComponent("${prescriptionData}"));

          function fieldValue(label) {
            const fields = Array.from(document.querySelectorAll(".print-field"));
            const field = fields.find((item) => item.querySelector("span").textContent === label);
            if (!field) return "";
            const control = field.querySelector("input, select, textarea");
            return control ? control.value.trim() : "";
          }

          async function prepareAndPrint() {
            const prescription = {
              ...basePrescription,
              laboratory: fieldValue("Laboratório para envio"),
              lensType: fieldValue("Tipo de lente"),
              lensColoring: fieldValue("Coloração"),
              lensMaterial: fieldValue("Material"),
              lensTreatment: fieldValue("Tratamento"),
              doctor: fieldValue("Dr(a)."),
              crm: fieldValue("CRM"),
              notes: fieldValue("Observações")
            };

            const response = await fetch("/api/lab-orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ client: baseClient, prescription })
            });
            const order = await response.json();
            document.querySelector("#os-number").textContent = order.orderNumber;
            document.querySelector("#os-date").textContent = formatDateTime(order.createdAt);

            if (window.opener && !window.opener.closed && window.opener.handleLabOrderCreated) {
              window.opener.handleLabOrderCreated(basePrescription.id);
            }

            window.print();
          }

          function formatDateTime(value) {
            if (!value) return "-";
            const [datePart, timePart = ""] = value.split("T");
            const [year, month, day] = datePart.split("-");
            return day + "/" + month + "/" + year + (timePart ? " " + timePart.slice(0, 5) : "");
          }
        </script>
      </body>
    </html>
  `;
}

function printInfo(label, value) {
  return `
    <div class="info-box">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "-")}</strong>
    </div>
  `;
}

function encodePrintData(data) {
  return encodeURIComponent(JSON.stringify(data || {}));
}

function printInput(label, value) {
  return `
    <label class="print-field">
      <span>${escapeHtml(label)}</span>
      <input value="${escapeAttribute(value || "")}">
    </label>
  `;
}

function printSelect(label, value) {
  return `
    <label class="print-field">
      <span>${escapeHtml(label)}</span>
      <select>
        <option value="" ${!value ? "selected" : ""}>Selecione</option>
        <option value="resina" ${value === "resina" ? "selected" : ""}>Resina</option>
        <option value="poly" ${value === "poly" ? "selected" : ""}>Poly</option>
        <option value="trivex" ${value === "trivex" ? "selected" : ""}>Trivex</option>
      </select>
    </label>
  `;
}

function printTextarea(label, value) {
  return `
    <label class="print-field">
      <span>${escapeHtml(label)}</span>
      <textarea>${escapeHtml(value || "")}</textarea>
    </label>
  `;
}

function lensMaterialLabel(value) {
  const labels = {
    resina: "Resina",
    poly: "Poly",
    trivex: "Trivex"
  };

  return labels[value] || value || "";
}

function printRxTable(title, rows) {
  return `
    <section class="section">
      <h2>${title}</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Esférico</th>
            <th>Cilíndrico</th>
            <th>Eixo</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${field(row[0])}</td>
              <td>${field(row[1])}</td>
              <td>${field(row[2])}</td>
              <td>${field(row[3])}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderRxDetailTable(title, rows) {
  return `
    <div class="rx-detail-table">
      <h4>${title}</h4>
      <div class="rx-detail-grid">
        <span></span>
        <span>Esférico</span>
        <span>Cilíndrico</span>
        <span>Eixo</span>
        ${rows.map((row) => `
          <strong>${row[0]}</strong>
          <span>${field(row[1])}</span>
          <span>${field(row[2])}</span>
          <span>${field(row[3])}</span>
        `).join("")}
      </div>
    </div>
  `;
}

async function saveClient(event) {
  event.preventDefault();
  const id = document.querySelector("#client-id").value || createId("cli");
  const client = {
    id,
    name: document.querySelector("#client-name").value.trim(),
    cpf: document.querySelector("#client-cpf").value.trim(),
    phone: document.querySelector("#client-phone").value.trim(),
    email: document.querySelector("#client-email").value.trim(),
    birth: document.querySelector("#client-birth").value,
    address: document.querySelector("#client-address").value.trim()
  };

  await apiPost("/api/clients", client);
  selectedClientId = id;
  await refreshData();
  selectClient(id);
}

function clearClientForm() {
  selectedClientId = "";
  document.querySelector("#client-form-title").textContent = "Novo cliente";
  document.querySelector("#client-form").reset();
  document.querySelector("#client-id").value = "";
  document.querySelector("#client-summary").innerHTML = `
    <article>
      <span>Nova ficha</span>
      <strong>Cliente em cadastro</strong>
    </article>
  `;
  document.querySelector("#client-history").innerHTML = "Selecione um cliente para ver o histórico.";
  document.querySelector("#selected-prescription").classList.add("is-hidden");
  document.querySelector("#selected-prescription").innerHTML = "";
}

function renderPrescriptionClientOptions() {
  document.querySelector("#prescription-client").value = "";
  document.querySelector("#prescription-client-search").value = "";
  document.querySelector("#prescription-client-results").classList.add("is-hidden");
}

function renderPrescriptionClientSearch() {
  const input = document.querySelector("#prescription-client-search");
  const hidden = document.querySelector("#prescription-client");
  const results = document.querySelector("#prescription-client-results");
  const term = normalize(input.value);

  hidden.value = "";

  const clients = state.clients
    .filter((client) => {
      return [client.name, client.cpf, client.phone].some((value) => normalize(value).includes(term));
    })
    .slice(0, 8);

  if (!clients.length) {
    results.innerHTML = `<button type="button" disabled>Nenhum cliente encontrado</button>`;
    results.classList.remove("is-hidden");
    return;
  }

  results.innerHTML = clients.map((client) => `
    <button type="button" onclick="choosePrescriptionClient('${client.id}')">
      <strong>${escapeHtml(client.name)}</strong>
      <span>${escapeHtml(client.phone || "-")} ${client.cpf ? "| CPF " + escapeHtml(client.cpf) : ""}</span>
    </button>
  `).join("");
  results.classList.remove("is-hidden");
}

function choosePrescriptionClient(clientId) {
  const client = getClient(clientId);
  if (!client) return;

  document.querySelector("#prescription-client").value = client.id;
  document.querySelector("#prescription-client-search").value = `${client.name} - ${client.phone || client.cpf || ""}`.trim();
  document.querySelector("#prescription-client-results").classList.add("is-hidden");
}

async function savePrescription(event) {
  event.preventDefault();
  if (!document.querySelector("#prescription-client").value) {
    document.querySelector("#prescription-client-search").focus();
    renderPrescriptionClientSearch();
    return;
  }
  const prescription = {
    id: createId("rec"),
    clientId: document.querySelector("#prescription-client").value,
    date: document.querySelector("#prescription-date").value,
    doctor: document.querySelector("#prescription-doctor").value.trim(),
    crm: document.querySelector("#prescription-crm").value.trim(),
    lensType: document.querySelector("#lens-type").value.trim(),
    lensColoring: document.querySelector("#lens-coloring").value.trim(),
    lensMaterial: document.querySelector("#lens-material").value,
    lensTreatment: document.querySelector("#lens-treatment").value.trim(),
    rightSpherical: document.querySelector("#right-spherical").value.trim(),
    rightCylindrical: document.querySelector("#right-cylindrical").value.trim(),
    rightAxis: document.querySelector("#right-axis").value.trim(),
    leftSpherical: document.querySelector("#left-spherical").value.trim(),
    leftCylindrical: document.querySelector("#left-cylindrical").value.trim(),
    leftAxis: document.querySelector("#left-axis").value.trim(),
    nearRightSpherical: document.querySelector("#near-right-spherical").value.trim(),
    nearRightCylindrical: document.querySelector("#near-right-cylindrical").value.trim(),
    nearRightAxis: document.querySelector("#near-right-axis").value.trim(),
    nearLeftSpherical: document.querySelector("#near-left-spherical").value.trim(),
    nearLeftCylindrical: document.querySelector("#near-left-cylindrical").value.trim(),
    nearLeftAxis: document.querySelector("#near-left-axis").value.trim(),
    addition: document.querySelector("#addition").value.trim(),
    dnp: document.querySelector("#dnp").value.trim(),
    co: document.querySelector("#co").value.trim(),
    film: document.querySelector("#film").value.trim(),
    dp: document.querySelector("#dp").value.trim(),
    notes: document.querySelector("#prescription-notes").value.trim()
  };

  await apiPost("/api/prescriptions", prescription);
  selectedClientId = prescription.clientId;
  clearPrescriptionForm();
  await refreshData();
  if (currentRoute === "clients") selectClient(selectedClientId);
}

function clearPrescriptionForm() {
  document.querySelector("#prescription-form").reset();
  document.querySelectorAll(".rx-power").forEach((input) => {
    input.value = "+0.00";
  });
  document.querySelector("#prescription-date").valueAsDate = new Date();
}

function renderPrescriptions() {
  const term = normalize(document.querySelector("#prescription-search").value);
  const prescriptions = state.prescriptions
    .filter((item) => {
      const client = getClient(item.clientId);
      return [client?.name, item.doctor].some((value) => normalize(value).includes(term));
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  document.querySelector("#prescriptions-list").innerHTML = prescriptions.length
    ? prescriptions.map(renderPrescriptionCard).join("")
    : emptyState("Nenhuma receita encontrada.");
}

function renderPrescriptionCard(item) {
  const client = getClient(item.clientId);
  return `
    <article class="timeline-item">
      <div>
        <p class="row-title">${escapeHtml(client?.name || "Cliente removido")}</p>
        <p class="row-meta">${formatDate(item.date)} ${item.doctor ? "| " + escapeHtml(item.doctor) : ""}</p>
      </div>
      <div class="prescription-grid">
        <span>Longe OD: esf. ${field(item.rightSpherical)} cil. ${field(item.rightCylindrical)} eixo ${field(item.rightAxis)}</span>
        <span>Longe OE: esf. ${field(item.leftSpherical)} cil. ${field(item.leftCylindrical)} eixo ${field(item.leftAxis)}</span>
        <span>Perto OD: esf. ${field(item.nearRightSpherical)} cil. ${field(item.nearRightCylindrical)} eixo ${field(item.nearRightAxis)}</span>
        <span>Perto OE: esf. ${field(item.nearLeftSpherical)} cil. ${field(item.nearLeftCylindrical)} eixo ${field(item.nearLeftAxis)}</span>
        <span>Adição: ${field(item.addition)}</span>
        <span>DNP: ${field(item.dnp)} | C.O: ${field(item.co)} | D.P: ${field(item.dp)}</span>
        <span>Película: ${field(item.film)}</span>
      </div>
      ${item.notes ? `<p class="row-meta">${escapeHtml(item.notes)}</p>` : ""}
    </article>
  `;
}

function renderStock() {
  const filter = document.querySelector("#stock-filter").value;
  const items = state.stock.filter((item) => {
    if (filter === "low") return item.quantity <= item.minimum;
    if (filter === "all") return true;
    return item.category === filter;
  });

  document.querySelector("#stock-list").innerHTML = items.length
    ? items.map((item) => `
      <article class="stock-row ${item.quantity <= item.minimum ? "is-low" : ""}">
        <div>
          <p class="row-title">${escapeHtml(item.name)}</p>
          <p class="row-meta">${stockMeta(item)}</p>
        </div>
        <span class="pill ${item.quantity <= item.minimum ? "warning" : ""}">Qtd. ${item.quantity}</span>
        <span class="row-meta">Mín. ${item.minimum}<br>${currency.format(Number(item.price || 0))}</span>
        <button type="button" onclick="editStockItem('${item.id}')">Editar</button>
      </article>
    `).join("")
    : emptyState("Nenhum item encontrado.");
}

async function saveStockItem(event) {
  event.preventDefault();
  const id = document.querySelector("#stock-id").value || createId("stk");
  const item = {
    id,
    name: document.querySelector("#stock-name").value.trim(),
    brand: document.querySelector("#stock-brand").value.trim(),
    code: document.querySelector("#stock-code").value.trim(),
    category: document.querySelector("#stock-category").value,
    material: document.querySelector("#stock-material").value,
    colorReference: document.querySelector("#stock-color-reference").value.trim(),
    quantity: Number(document.querySelector("#stock-quantity").value),
    minimum: Number(document.querySelector("#stock-minimum").value),
    cost: Number(document.querySelector("#stock-cost").value || 0),
    price: Number(document.querySelector("#stock-price").value || 0)
  };

  await apiPost("/api/stock", item);
  clearStockForm();
  await refreshData();
}

function editStockItem(itemId) {
  const item = state.stock.find((stockItem) => stockItem.id === itemId);
  if (!item) return;

  setRoute("stock");
  document.querySelector("#stock-form-title").textContent = "Editar item";
  document.querySelector("#stock-id").value = item.id;
  document.querySelector("#stock-name").value = item.name;
  document.querySelector("#stock-brand").value = item.brand || "";
  document.querySelector("#stock-code").value = item.code || "";
  document.querySelector("#stock-category").value = item.category;
  document.querySelector("#stock-material").value = item.material || "";
  document.querySelector("#stock-color-reference").value = item.colorReference || "";
  document.querySelector("#stock-quantity").value = item.quantity;
  document.querySelector("#stock-minimum").value = item.minimum;
  document.querySelector("#stock-cost").value = item.cost;
  document.querySelector("#stock-price").value = item.price;
}

function clearStockForm() {
  document.querySelector("#stock-form-title").textContent = "Novo item";
  document.querySelector("#stock-form").reset();
  document.querySelector("#stock-id").value = "";
}

function stockMeta(item) {
  const details = [
    categoryLabels[item.category],
    item.brand ? `Marca: ${item.brand}` : "",
    item.code ? `Cód. ${item.code}` : "",
    item.material ? `Material: ${materialLabel(item.material)}` : "",
    item.colorReference ? `Cor: ${item.colorReference}` : ""
  ].filter(Boolean);

  return escapeHtml(details.join(" | "));
}

function materialLabel(value) {
  const labels = {
    acetato: "Acetato",
    nylon: "Nylon",
    metal: "Metal",
    parafusada: "Parafusada"
  };

  return labels[value] || value;
}

function getClient(clientId) {
  return state.clients.find((client) => client.id === clientId);
}

function updateLoginSummary() {
  document.querySelector("#login-client-count").textContent = state.clients.length;
  document.querySelector("#login-prescription-count").textContent = state.prescriptions.length;
  document.querySelector("#login-stock-count").textContent = state.stock.length;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  if (!value) return "Sem data";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const [datePart, timePart = ""] = value.split("T");
  const time = timePart.slice(0, 5);
  return `${formatDate(datePart)}${time ? " " + time : ""}`;
}

function field(value) {
  return escapeHtml(value || "-");
}

function normalizePower(value) {
  if (!value.trim()) return "";
  return formatPower(parsePower(value));
}

function parsePower(value) {
  const normalized = String(value || "0")
    .replace(",", ".")
    .replace(/[^\d+.-]/g, "");
  const number = Number(normalized);
  if (Number.isNaN(number)) return 0;
  return Math.round(number * 4) / 4;
}

function formatPower(value) {
  const rounded = Math.round(Number(value || 0) * 4) / 4;
  const prefix = rounded >= 0 ? "+" : "";
  return `${prefix}${rounded.toFixed(2)}`;
}

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll("\n", " ");
}

function emptyState(message) {
  return `<div class="empty-state">${message}</div>`;
}
