let state = { users: [], clients: [], prescriptions: [], stock: [], labOrders: [], quotes: [], installments: [], auditLogs: [] };
let currentRoute = "dashboard";
let selectedClientId = "";
let currentFinanceClientId = "";
let currentStockCategory = "frames";
let globalSearchTerm = "";

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
  sales: {
    title: "Vendas",
    kicker: "Vendas",
    section: document.querySelector("#sales-section")
  },
  quotations: {
    title: "Orçamentos",
    kicker: "Vendas",
    section: document.querySelector("#quotations-section")
  },
  stock: {
    title: "Controle de estoque",
    kicker: "Estoque",
    section: document.querySelector("#stock-section")
  },
  finance: {
    title: "Recebimentos e parcelas",
    kicker: "Financeiro",
    section: document.querySelector("#finance-section")
  },
  reports: {
    title: "Relatórios",
    kicker: "Gestão",
    section: document.querySelector("#reports-section")
  },
  settings: {
    title: "Configurações",
    kicker: "Sistema",
    section: document.querySelector("#settings-section")
  }
};

const categoryLabels = {
  frames: "Armações",
  sports: "Óculos esporte",
  lenses: "Óculos esporte",
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
  document.addEventListener("click", handleAppClick);
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
    globalSearchTerm = event.target.value;
    setRoute("clients");
    showClientList();
    document.querySelector("#client-search").value = event.target.value;
    renderClients();
    renderGlobalSearchResults();
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

  document.querySelector("#sales-form").addEventListener("submit", saveQuote);
  document.querySelector("#clear-sales-form").addEventListener("click", clearSalesForm);
  document.querySelector("#print-current-quote").addEventListener("click", printCurrentQuote);
  document.querySelector("#sales-payment-method").addEventListener("change", updateSalesPaymentFields);
  document.querySelector("#sales-secondary-payment-method").addEventListener("change", updateSalesPaymentFields);
  document.querySelector("#sales-total").addEventListener("input", updateSalesPaymentAmounts);
  document.querySelector("#sales-lens-amount").addEventListener("input", updateSalesTotal);
  document.querySelector("#sales-consultation-amount").addEventListener("input", updateSalesTotal);
  document.querySelector("#sales-consultation-status").addEventListener("change", updateSalesTotal);
  document.querySelector("#sales-primary-payment-amount").addEventListener("input", updateSecondaryPaymentAmount);
  document.querySelector("#sales-frame-code").addEventListener("input", updateSalesFrameHint);
  document.querySelector("#sales-client-search").addEventListener("input", renderSalesClientSearch);
  document.querySelector("#sales-client-search").addEventListener("focus", renderSalesClientSearch);
  document.querySelector("#sales-prescription-link").addEventListener("change", updateSalesPrescriptionHint);

  document.querySelector("#stock-form").addEventListener("submit", saveStockItem);
  document.querySelector("#clear-stock-form").addEventListener("click", clearStockForm);
  document.querySelector("#export-stock-button").addEventListener("click", exportStockCsv);
  document.querySelector("#print-stock-button").addEventListener("click", printStockReport);
  document.querySelectorAll("[data-stock-category]").forEach((button) => {
    button.addEventListener("click", () => {
      currentStockCategory = button.dataset.stockCategory;
      renderStock();
    });
  });

  document.querySelector("#finance-filter").addEventListener("change", renderFinance);
  document.querySelector("#finance-search").addEventListener("input", renderFinance);
  document.querySelector("#export-finance-button").addEventListener("click", exportFinanceCsv);
  document.querySelector("#print-finance-button").addEventListener("click", printFinanceReport);
  document.querySelector("#finance-back-button").addEventListener("click", showFinanceList);
  document.querySelector("#finance-detail-list").addEventListener("click", handleFinanceDetailClick);
  document.querySelector("#backup-button").addEventListener("click", createBackup);
  document.querySelector("#password-form").addEventListener("submit", changePassword);
  document.querySelector("#user-form").addEventListener("submit", saveUser);
  document.querySelector("#report-start-date").addEventListener("change", renderReports);
  document.querySelector("#report-end-date").addEventListener("change", renderReports);
  document.querySelector("#report-current-month").addEventListener("click", setReportCurrentMonth);
}

function handleAppClick(event) {
  const routeButton = event.target.closest("[data-route-button]");
  if (routeButton) {
    setRoute(routeButton.dataset.routeButton);
    return;
  }

  const actionButton = event.target.closest("[data-app-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.appAction;
  if (action === "select-client") {
    selectClient(actionButton.dataset.clientId);
    return;
  }
  if (action === "choose-sales-client") {
    chooseSalesClient(actionButton.dataset.clientId);
    return;
  }
  if (action === "choose-prescription-client") {
    choosePrescriptionClient(actionButton.dataset.clientId);
    return;
  }
  if (action === "edit-quote") {
    editQuote(actionButton.dataset.quoteId, actionButton.dataset.mode || "quote");
    return;
  }
  if (action === "quote-print") {
    openQuotePrint(actionButton.dataset.quoteId);
    return;
  }
  if (action === "sale-receipt") {
    openSaleReceipt(actionButton.dataset.quoteId);
    return;
  }
  if (action === "carnet-pdf") {
    openCarnetPdf(actionButton.dataset.quoteId);
    return;
  }
  if (action === "edit-stock") {
    editStockItem(actionButton.dataset.stockId);
    return;
  }
  if (action === "finance-detail") {
    showFinanceDetail(actionButton.dataset.clientId);
    return;
  }
  if (action === "open-prescription") {
    const prescription = getPrescription(actionButton.dataset.prescriptionId);
    if (!prescription) return;
    setRoute("clients");
    selectClient(prescription.clientId);
    selectPrescriptionDetail(prescription.id);
    return;
  }
  if (action === "sale-from-prescription") {
    startSaleFromPrescription(actionButton.dataset.prescriptionId);
    return;
  }
  if (action === "prescription-pdf") {
    generatePrescriptionPdf(actionButton.dataset.prescriptionId);
    return;
  }
  if (action === "prescription-print") {
    printPrescription(actionButton.dataset.prescriptionId);
    return;
  }
  if (action === "quote-status") {
    updateQuoteStatus(actionButton.dataset.quoteId, actionButton.dataset.workflowStatus);
    return;
  }
  if (action === "pickup-receipt") {
    openPickupReceipt(actionButton.dataset.quoteId);
    return;
  }
  if (action === "lab-status") {
    updateLabStatus(actionButton.dataset.labOrderId, actionButton.dataset.status);
  }
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

async function handleLogout() {
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
  renderSalesClientOptions();
  renderPrescriptions();
  renderSales();
  renderQuotations();
  renderStock();
  renderFinance();
  renderReports();
  renderAuditLog();
  renderUsers();
  updateSalesFrameHint();
  updateLoginSummary();
}

function renderDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const lowStock = state.stock.filter((item) => item.quantity <= item.minimum);
  const openQuotes = state.quotes.filter((quote) => quote.status === "quote");
  const sales = state.quotes.filter((quote) => quote.status === "sale");
  const monthSales = sales.filter((quote) => String(quote.updatedAt || quote.createdAt || "").slice(0, 7) === currentMonth);
  const monthSalesValue = monthSales.reduce((sum, quote) => sum + Number(quote.totalAmount || 0), 0);
  const openQuotesValue = openQuotes.reduce((sum, quote) => sum + Number(quote.totalAmount || 0), 0);
  const totalSalesValue = sales.reduce((sum, quote) => sum + Number(quote.totalAmount || 0), 0);
  const averageTicket = sales.length ? totalSalesValue / sales.length : 0;
  const openReceivable = state.installments
    .filter((installment) => !installment.paid)
    .reduce((sum, installment) => sum + Number(installment.amount || 0), 0);
  const overdue = state.installments.filter((installment) => !installment.paid && installment.dueDate < today);

  document.querySelector("#metric-sales-value").textContent = currency.format(monthSalesValue);
  document.querySelector("#metric-sales-count").textContent = `${monthSales.length} venda${monthSales.length === 1 ? "" : "s"} fechada${monthSales.length === 1 ? "" : "s"}`;
  document.querySelector("#metric-open-quotes").textContent = openQuotes.length;
  document.querySelector("#metric-open-quotes-value").textContent = `${currency.format(openQuotesValue)} em negociação`;
  document.querySelector("#metric-closed-quotes").textContent = sales.length;
  document.querySelector("#metric-average-ticket").textContent = `Ticket médio ${currency.format(averageTicket)}`;
  document.querySelector("#metric-receivable").textContent = currency.format(openReceivable);
  document.querySelector("#metric-overdue").textContent = `${overdue.length} parcela${overdue.length === 1 ? "" : "s"} vencida${overdue.length === 1 ? "" : "s"}`;
  document.querySelector("#metric-low-stock").textContent = lowStock.length;
  document.querySelector("#metric-stock-status").textContent = lowStock.length ? "Repor produtos críticos" : "Estoque em dia";

  renderDashboardInsights({
    sales,
    openQuotes,
    monthSales,
    openReceivable,
    overdue,
    lowStock
  });
  renderDashboardSalesChart(sales);
  renderDashboardFunnel(openQuotes, sales);
  renderDashboardFinanceHealth();
  renderDashboardNextInstallments();
  renderDashboardTodayAccounts();

  const recentSales = [...sales]
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))
    .slice(0, 5);
  document.querySelector("#recent-sales").innerHTML = recentSales.length
    ? recentSales.map(renderDashboardSaleCard).join("")
    : emptyState("Nenhuma venda fechada.");

  const priorityQuotes = [...openQuotes]
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 5);
  document.querySelector("#dashboard-open-quotes").innerHTML = priorityQuotes.length
    ? priorityQuotes.map(renderDashboardQuoteCard).join("")
    : emptyState("Nenhum orçamento aberto.");

  const paymentTotals = {};
  sales.forEach((quote) => {
    const primary = Number(quote.primaryPaymentAmount || quote.totalAmount || 0);
    paymentTotals[quote.paymentMethod] = (paymentTotals[quote.paymentMethod] || 0) + primary;
    if (quote.secondaryPaymentMethod) {
      paymentTotals[quote.secondaryPaymentMethod] = (paymentTotals[quote.secondaryPaymentMethod] || 0) + Number(quote.secondaryPaymentAmount || 0);
    }
  });
  const paymentTotal = Object.values(paymentTotals).reduce((sum, total) => sum + total, 0);
  document.querySelector("#dashboard-payment-methods").innerHTML = Object.keys(paymentTotals).length
    ? Object.entries(paymentTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([method, total]) => {
        const percent = paymentTotal ? Math.round((total / paymentTotal) * 100) : 0;
        return `
          <div class="payment-row">
            <div>
              <strong>${paymentLabel(method)}</strong>
              <span>${currency.format(total)}</span>
            </div>
            <div class="payment-bar" aria-hidden="true"><span style="width: ${percent}%"></span></div>
            <small>${percent}%</small>
          </div>
        `;
      }).join("")
    : emptyState("Nenhum pagamento registrado.");

  document.querySelector("#stock-alerts").innerHTML = lowStock.length
    ? lowStock.map((item) => `
      <div class="stock-row is-low">
        <div>
          <p class="row-title">${escapeHtml(item.name)}</p>
          <p class="row-meta">${stockMeta(item)}</p>
        </div>
        <span class="pill warning">Qtd. ${item.quantity}</span>
        <span class="row-meta">Mín. ${item.minimum}</span>
        <button type="button" data-app-action="edit-stock" data-stock-id="${escapeAttribute(item.id)}">Editar</button>
      </div>
    `).join("")
    : emptyState("Nenhum item abaixo do estoque mínimo.");
}

function renderDashboardInsights({ sales, openQuotes, monthSales, openReceivable, overdue, lowStock }) {
  const activeClients = new Set(sales.map((quote) => quote.clientId)).size;
  const openQuotesValue = openQuotes.reduce((sum, quote) => sum + Number(quote.totalAmount || 0), 0);
  const insights = [
    `${activeClients} cliente${activeClients === 1 ? "" : "s"} com compra registrada`,
    `${currency.format(openQuotesValue)} em oportunidades abertas`,
    openReceivable ? `${currency.format(openReceivable)} a receber` : "Recebíveis em dia",
    overdue.length ? `${overdue.length} parcela${overdue.length === 1 ? "" : "s"} vencida${overdue.length === 1 ? "" : "s"}` : "Sem atraso financeiro",
    lowStock.length ? `${lowStock.length} item${lowStock.length === 1 ? "" : "s"} abaixo do mínimo` : "Estoque crítico zerado",
    `${monthSales.length} venda${monthSales.length === 1 ? "" : "s"} neste mês`
  ];
  document.querySelector("#dashboard-insights").innerHTML = insights
    .map((insight) => `<span>${escapeHtml(insight)}</span>`)
    .join("");
}

function renderDashboardSalesChart(sales) {
  const months = getRecentMonthKeys(6);
  const totals = months.map((monthKey) => {
    return sales
      .filter((quote) => String(quote.updatedAt || quote.createdAt || "").slice(0, 7) === monthKey)
      .reduce((sum, quote) => sum + Number(quote.totalAmount || 0), 0);
  });
  const maxTotal = Math.max(...totals, 1);
  const current = totals[totals.length - 1] || 0;
  const previous = totals[totals.length - 2] || 0;
  const growth = previous ? Math.round(((current - previous) / previous) * 100) : current ? 100 : 0;
  document.querySelector("#dashboard-growth-rate").textContent = `${growth >= 0 ? "+" : ""}${growth}% vs mês anterior`;
  document.querySelector("#dashboard-sales-chart").innerHTML = months.map((monthKey, index) => {
    const total = totals[index];
    const height = Math.max(Math.round((total / maxTotal) * 100), total ? 10 : 4);
    return `
      <div class="sales-chart-bar">
        <span>${currency.format(total)}</span>
        <div style="height: ${height}%"></div>
        <small>${monthLabel(monthKey)}</small>
      </div>
    `;
  }).join("");
}

function renderDashboardFunnel(openQuotes, sales) {
  const totalQuotes = openQuotes.length + sales.length;
  const conversion = totalQuotes ? Math.round((sales.length / totalQuotes) * 100) : 0;
  document.querySelector("#dashboard-conversion-rate").textContent = `${conversion}% conversão`;
  const maxValue = Math.max(totalQuotes, sales.length, openQuotes.length, 1);
  const rows = [
    { label: "Atendimentos", value: totalQuotes },
    { label: "Orçamentos abertos", value: openQuotes.length },
    { label: "Vendas fechadas", value: sales.length }
  ];
  document.querySelector("#dashboard-funnel").innerHTML = rows.map((row) => {
    const width = Math.max(Math.round((row.value / maxValue) * 100), row.value ? 18 : 8);
    return `
      <div class="funnel-row">
        <div>
          <strong>${escapeHtml(row.label)}</strong>
          <span>${row.value}</span>
        </div>
        <div class="funnel-track"><span style="width: ${width}%"></span></div>
      </div>
    `;
  }).join("");
}

function renderDashboardFinanceHealth() {
  const today = new Date().toISOString().slice(0, 10);
  const open = state.installments.filter((installment) => !installment.paid);
  const overdue = open.filter((installment) => installment.dueDate < today);
  const paid = state.installments.filter((installment) => installment.paid);
  const openAmount = open.reduce((sum, installment) => sum + Number(installment.amount || 0), 0);
  const overdueAmount = overdue.reduce((sum, installment) => sum + Number(installment.amount || 0), 0);
  const paidAmount = paid.reduce((sum, installment) => sum + Number(installment.paidAmount || installment.amount || 0), 0);
  const total = Math.max(openAmount + paidAmount, 1);
  const paidPercent = Math.round((paidAmount / total) * 100);
  const overduePercent = Math.round((overdueAmount / total) * 100);
  const openPercent = Math.max(100 - paidPercent - overduePercent, 0);

  document.querySelector("#dashboard-finance-health").innerHTML = `
    <div class="finance-orbit" style="--paid:${paidPercent}; --open:${openPercent}; --overdue:${overduePercent};">
      <strong>${paidPercent}%</strong>
      <span>liquidado</span>
    </div>
    <div class="finance-health-list">
      <span><i class="dot paid"></i>Pago ${currency.format(paidAmount)}</span>
      <span><i class="dot open"></i>Em aberto ${currency.format(openAmount)}</span>
      <span><i class="dot overdue"></i>Vencido ${currency.format(overdueAmount)}</span>
    </div>
  `;
}

function renderDashboardNextInstallments() {
  const upcoming = state.installments
    .filter((installment) => !installment.paid)
    .sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")))
    .slice(0, 5);

  document.querySelector("#dashboard-next-installments").innerHTML = upcoming.length
    ? upcoming.map((installment) => {
      const quote = state.quotes.find((item) => item.id === installment.quoteId);
      const client = quote ? getClient(quote.clientId) : null;
      const overdue = installment.dueDate < new Date().toISOString().slice(0, 10);
      return `
        <article class="timeline-item dashboard-row ${overdue ? "is-attention" : ""}">
          <div>
            <p class="row-title">${escapeHtml(client?.name || "Cliente removido")}</p>
            <p class="row-meta">Parcela ${installment.installmentNumber} | Venc. ${formatDate(installment.dueDate)}</p>
          </div>
          <strong>${currency.format(Number(installment.amount || 0))}</strong>
        </article>
      `;
    }).join("")
    : emptyState("Nenhuma parcela em aberto.");
}

function renderDashboardTodayAccounts() {
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = state.installments.filter((installment) => !installment.paid && installment.dueDate === today);
  const overdue = state.installments.filter((installment) => !installment.paid && installment.dueDate < today);
  const paidToday = state.installments.filter((installment) => installment.paid && installment.paidAt === today);
  const todaySales = state.quotes.filter((quote) => quote.status === "sale" && String(quote.updatedAt || quote.createdAt || "").slice(0, 10) === today);
  const total = dueToday.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    + overdue.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  document.querySelector("#dashboard-today-total").textContent = currency.format(total);
  const rows = [
    ["Vencem hoje", dueToday.length, dueToday.reduce((sum, item) => sum + Number(item.amount || 0), 0)],
    ["Atrasadas", overdue.length, overdue.reduce((sum, item) => sum + Number(item.amount || 0), 0)],
    ["Recebidas hoje", paidToday.length, paidToday.reduce((sum, item) => sum + Number(item.paidAmount || item.amount || 0), 0)],
    ["Vendas hoje", todaySales.length, todaySales.reduce((sum, quote) => sum + Number(quote.totalAmount || 0), 0)]
  ];
  document.querySelector("#dashboard-today-accounts").innerHTML = rows.map(([label, count, amount]) => `
    <article class="timeline-item dashboard-row">
      <div>
        <p class="row-title">${label}</p>
        <p class="row-meta">${count} registro${count === 1 ? "" : "s"}</p>
      </div>
      <strong>${currency.format(amount)}</strong>
    </article>
  `).join("");
}

function renderDashboardSaleCard(quote) {
  const client = getClient(quote.clientId);
  return `
    <article class="timeline-item dashboard-row">
      <div>
        <p class="row-title">${escapeHtml(client?.name || "Cliente removido")}</p>
        <p class="row-meta">${formatDateTime(quote.updatedAt || quote.createdAt)} | ${paymentSummary(quote)}</p>
      </div>
      <strong>${currency.format(Number(quote.totalAmount || 0))}</strong>
    </article>
  `;
}

function renderDashboardQuoteCard(quote) {
  const client = getClient(quote.clientId);
  return `
    <article class="timeline-item dashboard-row">
      <div>
        <p class="row-title">${escapeHtml(client?.name || "Cliente removido")}</p>
        <p class="row-meta">${formatDateTime(quote.createdAt)} | ${escapeHtml(quote.serviceDescription || "Orçamento")}</p>
      </div>
      <div class="dashboard-row-actions">
        <strong>${currency.format(Number(quote.totalAmount || 0))}</strong>
        <button type="button" data-app-action="edit-quote" data-quote-id="${escapeAttribute(quote.id)}" data-mode="sale">Fechar</button>
      </div>
    </article>
  `;
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
          <button type="button" data-app-action="select-client" data-client-id="${escapeAttribute(client.id)}">Abrir</button>
        </article>
      `;
    }).join("")
    : emptyState("Nenhum cliente encontrado.");
  renderGlobalSearchResults();
}

function renderGlobalSearchResults() {
  const container = document.querySelector("#global-search-results");
  if (!container) return;
  const term = normalize(globalSearchTerm);
  if (!term) {
    container.classList.add("is-hidden");
    container.innerHTML = "";
    return;
  }

  const matchingClients = state.clients.filter((client) => {
    return [client.name, client.cpf, client.phone, client.email].some((value) => normalize(value).includes(term));
  }).slice(0, 6);
  const matchingQuotes = state.quotes.filter((quote) => {
    const client = getClient(quote.clientId);
    const link = quoteLinkSummary(quote);
    return [
      quote.serviceDescription,
      quote.frameCode,
      quote.notes,
      quote.id,
      client?.name,
      client?.cpf,
      client?.phone,
      link
    ].some((value) => normalize(value).includes(term));
  }).slice(0, 6);
  const matchingOrders = state.labOrders.filter((order) => {
    const client = getClient(order.clientId);
    const prescription = getPrescription(order.prescriptionId);
    return [
      order.orderNumber,
      order.id,
      client?.name,
      client?.cpf,
      client?.phone,
      prescription?.doctor,
      prescription?.crm
    ].some((value) => normalize(value).includes(term));
  }).slice(0, 6);

  container.classList.remove("is-hidden");
  container.innerHTML = `
    <div class="panel-header">
      <h2>Busca geral</h2>
      <span class="row-meta">Resultados para "${escapeHtml(globalSearchTerm)}"</span>
    </div>
    <div class="global-result-grid">
      ${renderGlobalResultGroup("Clientes", matchingClients, (client) => `
        <button type="button" data-app-action="select-client" data-client-id="${escapeAttribute(client.id)}">
          <strong>${escapeHtml(client.name)}</strong>
          <span>${escapeHtml(client.phone || "-")} ${client.cpf ? "| CPF " + escapeHtml(client.cpf) : ""}</span>
        </button>
      `)}
      ${renderGlobalResultGroup("Vendas e orçamentos", matchingQuotes, (quote) => {
        const client = getClient(quote.clientId);
        return `
          <button type="button" data-app-action="edit-quote" data-quote-id="${escapeAttribute(quote.id)}" data-mode="${quote.status === "sale" ? "sale" : "quote"}">
            <strong>${escapeHtml(client?.name || "Cliente removido")} | ${quote.status === "sale" ? "Venda" : "Orçamento"}</strong>
            <span>${escapeHtml(quote.serviceDescription || "-")} | ${currency.format(Number(quote.totalAmount || 0))}</span>
          </button>
        `;
      })}
      ${renderGlobalResultGroup("O.S.", matchingOrders, (order) => {
        const client = getClient(order.clientId);
        return `
          <button type="button" data-app-action="open-prescription" data-prescription-id="${escapeAttribute(order.prescriptionId)}">
            <strong>${escapeHtml(order.orderNumber)}</strong>
            <span>${escapeHtml(client?.name || "Cliente removido")} | ${formatDateTime(order.createdAt)}</span>
          </button>
        `;
      })}
    </div>
  `;
}

function renderGlobalResultGroup(title, items, renderer) {
  return `
    <section class="global-result-group">
      <h3>${escapeHtml(title)}</h3>
      ${items.length ? items.map(renderer).join("") : `<p class="row-meta">Nenhum resultado.</p>`}
    </section>
  `;
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
  renderClientFinancialHistory(clientId);
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
  const financial = getClientFinancial(client.id);
  const profile = getClientFinancialProfile(financial);
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
    <article>
      <span>Perfil financeiro</span>
      <strong>${profile.label}</strong>
    </article>
  `;
}

function renderClientFinancialHistory(clientId) {
  const client = getClient(clientId);
  const container = document.querySelector("#client-financial-history");
  if (!client || !container) return;
  const financial = getClientFinancial(clientId);
  const profile = getClientFinancialProfile(financial);
  const recentQuotes = financial.quotes.slice(0, 4);

  container.innerHTML = `
    <article class="client-financial-card ${profile.className}">
      <div>
        <p class="row-title">${profile.label}</p>
        <p class="row-meta">${profile.description}</p>
      </div>
      <div class="prescription-grid">
        <span><strong>Em aberto:</strong> ${financial.openCount} parcela(s), ${currency.format(financial.openAmount)}</span>
        <span><strong>Vencido:</strong> ${financial.overdueCount} parcela(s), ${currency.format(financial.overdueAmount)}</span>
        <span><strong>Pago:</strong> ${financial.paidCount} parcela(s), ${currency.format(financial.paidAmount)}</span>
        <span><strong>Compras:</strong> ${financial.quotes.length}</span>
      </div>
      ${recentQuotes.length ? `
        <div class="client-financial-timeline">
          ${recentQuotes.map((quote) => `
            <span>${formatDateTime(quote.createdAt)} | ${escapeHtml(quote.serviceDescription || "Venda")} | ${quote.status === "sale" ? "Venda" : "Orçamento"} | ${currency.format(Number(quote.totalAmount || 0))}${quoteLinkSummary(quote) ? " | " + escapeHtml(quoteLinkSummary(quote)) : ""}</span>
          `).join("")}
        </div>
      ` : `<p class="row-meta">Cliente ainda sem histórico de vendas.</p>`}
    </article>
  `;
}

function getClientFinancialProfile(financial) {
  if (!financial.totalInstallments && !financial.quotes.length) {
    return {
      label: "Sem histórico financeiro",
      className: "is-neutral",
      description: "Ainda não há compras ou parcelas suficientes para avaliar."
    };
  }
  if (financial.overdueCount > 0) {
    return {
      label: "Atenção: cliente com atraso",
      className: "is-risk",
      description: "Existem parcelas vencidas. Recomenda-se regularizar antes de novas vendas parceladas."
    };
  }
  if (financial.openCount > 0) {
    return {
      label: "Bom cliente em acompanhamento",
      className: "is-watch",
      description: "Tem parcelas em aberto, mas sem atraso registrado."
    };
  }
  if (financial.paidCount > 0) {
    return {
      label: "Bom cliente",
      className: "is-good",
      description: "Histórico sem pendências. Pagamentos registrados como quitados."
    };
  }
  return {
    label: "Cliente novo",
    className: "is-neutral",
    description: "Sem pendências registradas."
  };
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
    <button class="${index === 0 ? "is-active" : ""}" type="button" data-app-action="open-prescription" data-prescription-id="${escapeAttribute(item.id)}">
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
        <button type="button" data-app-action="sale-from-prescription" data-prescription-id="${escapeAttribute(item.id)}">Vender com esta receita</button>
        <button type="button" data-app-action="prescription-pdf" data-prescription-id="${escapeAttribute(item.id)}">Gerar PDF</button>
        <button class="secondary-button" type="button" data-app-action="prescription-print" data-prescription-id="${escapeAttribute(item.id)}">Imprimir</button>
      </div>
    </article>
  `;
}

function startSaleFromPrescription(prescriptionId) {
  const prescription = getPrescription(prescriptionId);
  if (!prescription) return;
  clearSalesForm();
  setRoute("sales");
  chooseSalesClient(prescription.clientId);
  const latestOrder = state.labOrders
    .filter((order) => order.prescriptionId === prescription.id)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0];
  renderSalesPrescriptionLinks(prescription.clientId, prescription.id, latestOrder?.id || "");
  document.querySelector("#sales-service").value = "Venda de óculos";
  document.querySelector("#sales-error").textContent = latestOrder
    ? `Venda vinculada à O.S. ${latestOrder.orderNumber}.`
    : "Venda vinculada à receita selecionada.";
  document.querySelector("#sales-frame-code").focus();
}

function renderLabOrders(orders) {
  if (!orders.length) {
    return `<div class="lab-order-list empty-state">Nenhuma O.S enviada ao laboratório para esta receita.</div>`;
  }

  return `
    <div class="lab-order-list">
      ${orders.map((order) => `
        <span>
          <strong>${escapeHtml(order.orderNumber)}</strong>
          enviada em ${formatDateTime(order.createdAt)}
          | Status: ${escapeHtml(labStatusLabel(order.status))}
          ${order.laboratory || order.snapshot?.prescription?.laboratory ? " | Lab: " + escapeHtml(order.laboratory || order.snapshot.prescription.laboratory) : ""}
          ${order.expectedAt ? " | Prev.: " + formatDate(order.expectedAt) : ""}
          <button class="secondary-button" type="button" data-app-action="lab-status" data-lab-order-id="${escapeAttribute(order.id)}" data-status="${nextLabStatus(order.status)}">${labActionLabel(order.status)}</button>
        </span>
      `).join("")}
    </div>
  `;
}

function labStatusLabel(status = "sent") {
  const labels = {
    sent: "Enviada",
    lab: "Em laboratório",
    ready: "Pronta",
    returned: "Retornou",
    delivered: "Entregue"
  };
  return labels[status] || labels.sent;
}

function nextLabStatus(status = "sent") {
  const next = { sent: "lab", lab: "ready", ready: "returned", returned: "delivered" };
  return next[status || "sent"] || "delivered";
}

function labActionLabel(status = "sent") {
  const labels = {
    sent: "Em laboratório",
    lab: "Marcar pronta",
    ready: "Retornou",
    returned: "Entregue",
    delivered: "Entregue"
  };
  return labels[status] || labels.sent;
}

async function updateLabStatus(orderId, status) {
  try {
    await apiPost("/api/lab-orders/status", { id: orderId, status });
    await refreshData();
    showToast("Status da O.S. atualizado.", "success");
  } catch (err) {
    showToast(err.message || "Falha ao atualizar O.S.", "error");
  }
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
            <img src="${location.origin}/assets/vetor.png" alt="Logo ${escapeHtml(storeInfo.name)}">
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
  document.querySelector("#client-financial-history").innerHTML = "Selecione um cliente para ver o histórico financeiro.";
  document.querySelector("#selected-prescription").classList.add("is-hidden");
  document.querySelector("#selected-prescription").innerHTML = "";
}

function renderPrescriptionClientOptions() {
  document.querySelector("#prescription-client").value = "";
  document.querySelector("#prescription-client-search").value = "";
  document.querySelector("#prescription-client-results").classList.add("is-hidden");
}

function clearSalesClientSelection() {
  const hidden = document.querySelector("#sales-client");
  const search = document.querySelector("#sales-client-search");
  const results = document.querySelector("#sales-client-results");
  const summary = document.querySelector("#sales-client-summary");
  if (!hidden || !search || !results || !summary) return;
  hidden.value = "";
  search.value = "";
  results.classList.add("is-hidden");
  summary.textContent = "";
  renderSalesPrescriptionLinks("");
}

function renderSalesClientOptions() {
  const selectedClient = getClient(document.querySelector("#sales-client")?.value);
  if (selectedClient) {
    updateSalesClientSummary(selectedClient);
    renderSalesPrescriptionLinks(selectedClient.id);
  }
}

function renderSalesClientSearch() {
  const input = document.querySelector("#sales-client-search");
  const hidden = document.querySelector("#sales-client");
  const results = document.querySelector("#sales-client-results");
  const term = normalize(input.value);

  hidden.value = "";
  updateSalesClientSummary(null);
  renderSalesPrescriptionLinks("");

  const clients = state.clients
    .filter((client) => {
      return [client.name, client.cpf, client.phone].some((value) => normalize(value).includes(term));
    })
    .slice(0, 8);

  if (!clients.length) {
    results.innerHTML = `<button type="button" disabled>Nenhum cliente encontrado no cadastro</button>`;
    results.classList.remove("is-hidden");
    return;
  }

  results.innerHTML = clients.map((client) => `
    <button type="button" data-app-action="choose-sales-client" data-client-id="${escapeAttribute(client.id)}">
      <strong>${escapeHtml(client.name)}</strong>
      <span>${escapeHtml(client.phone || "-")} ${client.cpf ? "| CPF " + escapeHtml(client.cpf) : ""}</span>
    </button>
  `).join("");
  results.classList.remove("is-hidden");
}

function chooseSalesClient(clientId) {
  const client = getClient(clientId);
  if (!client) return;
  document.querySelector("#sales-client").value = client.id;
  document.querySelector("#sales-client-search").value = `${client.name} - ${client.phone || client.cpf || ""}`.trim();
  document.querySelector("#sales-client-results").classList.add("is-hidden");
  updateSalesClientSummary(client);
  renderSalesPrescriptionLinks(client.id);
}

function updateSalesClientSummary(client) {
  const summary = document.querySelector("#sales-client-summary");
  if (!summary) return;
  if (!client) {
    summary.textContent = "";
    return;
  }
  const financial = getClientFinancial(client.id);
  const overdueText = financial.overdueCount
    ? ` | Atenção: ${financial.overdueCount} parcela(s) vencida(s), ${currency.format(financial.overdueAmount)}`
    : "";
  summary.textContent = `${client.phone || "Sem telefone"} ${client.cpf ? "| CPF " + client.cpf : ""}${overdueText}`;
}

function renderSalesPrescriptionLinks(clientId, selectedPrescriptionId = "", selectedLabOrderId = "") {
  const select = document.querySelector("#sales-prescription-link");
  if (!select) return;
  const prescriptions = state.prescriptions
    .filter((item) => item.clientId === clientId)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  if (!clientId) {
    select.innerHTML = `<option value="">Selecione um cliente para ver receitas e O.S.</option>`;
    updateSalesPrescriptionHint();
    return;
  }

  const options = [`<option value="">Sem vínculo de receita/O.S.</option>`];
  prescriptions.forEach((prescription) => {
    const orders = state.labOrders
      .filter((order) => order.prescriptionId === prescription.id)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    const baseLabel = `Receita ${formatDate(prescription.date)} - ${prescription.doctor || "Sem profissional"}`;
    if (orders.length) {
      orders.forEach((order) => {
        const value = `${prescription.id}::${order.id}`;
        const selected = prescription.id === selectedPrescriptionId && order.id === selectedLabOrderId ? " selected" : "";
        options.push(`<option value="${escapeAttribute(value)}"${selected}>${escapeHtml(baseLabel)} - O.S. ${escapeHtml(order.orderNumber)}</option>`);
      });
      return;
    }
    const selected = prescription.id === selectedPrescriptionId && !selectedLabOrderId ? " selected" : "";
    options.push(`<option value="${escapeAttribute(prescription.id + "::")}"${selected}>${escapeHtml(baseLabel)} - sem O.S.</option>`);
  });

  select.innerHTML = options.join("");
  updateSalesPrescriptionHint();
}

function parseSalesPrescriptionLink() {
  const value = document.querySelector("#sales-prescription-link")?.value || "";
  if (!value) return { prescriptionId: "", labOrderId: "" };
  const [prescriptionId = "", labOrderId = ""] = value.split("::");
  return { prescriptionId, labOrderId };
}

function updateSalesPrescriptionHint() {
  const hint = document.querySelector("#sales-os-hint");
  if (!hint) return;
  const { prescriptionId, labOrderId } = parseSalesPrescriptionLink();
  hint.textContent = quoteLinkSummary({ prescriptionId, labOrderId });
}

function quoteLinkSummary(quote) {
  const prescription = getPrescription(quote.prescriptionId);
  const labOrder = getLabOrder(quote.labOrderId);
  if (labOrder) {
    return `Vinculado à O.S. ${labOrder.orderNumber}${prescription ? " | Receita " + formatDate(prescription.date) : ""}`;
  }
  if (prescription) {
    return `Vinculado à receita de ${formatDate(prescription.date)}`;
  }
  return "";
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
    <button type="button" data-app-action="choose-prescription-client" data-client-id="${escapeAttribute(client.id)}">
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
  updateStockCategoryTabs();
  const items = state.stock.filter((item) => stockCategoryKey(item.category) === currentStockCategory);

  document.querySelector("#stock-list").innerHTML = items.length
    ? `
      <div class="stock-grid-table" role="table" aria-label="Itens de ${escapeAttribute(categoryLabels[currentStockCategory])}">
        <div class="stock-grid-row stock-grid-head" role="row">
          <span>Produto</span>
          <span>Marca</span>
          <span>Código</span>
          <span>Material</span>
          <span>Ref. cor</span>
          <span>Qtd.</span>
          <span>Mín.</span>
          <span>Preço de venda</span>
          <span>Ações</span>
        </div>
        ${items.map((item) => `
          <div class="stock-grid-row ${item.quantity <= item.minimum ? "is-low" : ""}" role="row">
            <span data-label="Produto"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(categoryLabels[stockCategoryKey(item.category)] || "-")}</small></span>
            <span data-label="Marca">${escapeHtml(item.brand || "-")}</span>
            <span data-label="Código">${escapeHtml(item.code || "-")}</span>
            <span data-label="Material">${escapeHtml(item.material ? materialLabel(item.material) : "-")}</span>
            <span data-label="Ref. cor">${escapeHtml(item.colorReference || "-")}</span>
            <span data-label="Qtd."><strong>${item.quantity}</strong></span>
            <span data-label="Mín.">${item.minimum}</span>
            <span data-label="Preço de venda">${currency.format(Number(item.price || 0))}</span>
            <span data-label="Ações"><button type="button" data-app-action="edit-stock" data-stock-id="${escapeAttribute(item.id)}">Editar</button></span>
          </div>
        `).join("")}
      </div>
    `
    : emptyState(`Nenhum item cadastrado em ${categoryLabels[currentStockCategory]}.`);
}

function stockCategoryKey(category) {
  return category === "lenses" ? "sports" : category;
}

function updateStockCategoryTabs() {
  document.querySelectorAll("[data-stock-category]").forEach((button) => {
    const category = button.dataset.stockCategory;
    const count = state.stock.filter((item) => stockCategoryKey(item.category) === category).length;
    const countElement = button.querySelector("span");
    if (countElement) countElement.textContent = count;
    button.classList.toggle("is-active", category === currentStockCategory);
  });
}

function renderSales() {
  const list = state.quotes
    .filter((quote) => quote.status === "sale")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  document.querySelector("#sales-list").innerHTML = list.length
    ? list.map((quote) => {
      const client = getClient(quote.clientId);
      const installments = state.installments.filter((item) => item.quoteId === quote.id);
      const linkSummary = quoteLinkSummary(quote);
      return `
      <article class="timeline-item">
        <div>
          <p class="row-title">${escapeHtml(client?.name || "Cliente removido")}</p>
          <p class="row-meta">${escapeHtml(quote.saleNumber || quote.id)} | ${formatDateTime(quote.createdAt)} | ${paymentSummary(quote)} | ${workflowStatusLabel(quote.workflowStatus)}</p>
          ${linkSummary ? `<p class="row-meta">${escapeHtml(linkSummary)}</p>` : ""}
        </div>
        <div class="prescription-grid">
          <span><strong>Serviço:</strong> ${escapeHtml(quote.serviceDescription)}</span>
          <span><strong>Armação:</strong> ${escapeHtml(quote.frameCode || "-")}</span>
          <span><strong>Lente:</strong> ${currency.format(Number(quote.lensAmount || 0))}</span>
          <span><strong>Consulta:</strong> ${consultationSummary(quote)}</span>
          <span><strong>Valor:</strong> ${currency.format(Number(quote.totalAmount || 0))}</span>
          <span><strong>Entrada:</strong> ${currency.format(Number(quote.downPayment || 0))}</span>
          <span><strong>Parcelas:</strong> ${quote.installments || 1}</span>
          <span><strong>Entrega:</strong> ${quote.deliveredAt ? formatDate(quote.deliveredAt) : "-"}</span>
        </div>
        ${quote.notes ? `<p class="row-meta">${escapeHtml(quote.notes)}</p>` : ""}
        ${installments.length ? `
          <div class="prescription-grid">
            <span><strong>Parcelas geradas:</strong></span>
            <span>${installments.map((installment) => `${formatDate(installment.dueDate)}: ${currency.format(Number(installment.amount || 0))}${installment.paid ? " (Pago)" : ""}`).join("<br>")}</span>
          </div>
        ` : ""}
        <div class="form-actions">
          <button type="button" data-app-action="edit-quote" data-quote-id="${escapeAttribute(quote.id)}" data-mode="sale">Editar venda</button>
          <button class="secondary-button" type="button" data-app-action="sale-receipt" data-quote-id="${escapeAttribute(quote.id)}">Recibo</button>
          ${nextWorkflowStatus(quote.workflowStatus) ? `<button class="secondary-button" type="button" data-app-action="quote-status" data-quote-id="${escapeAttribute(quote.id)}" data-workflow-status="${nextWorkflowStatus(quote.workflowStatus)}">${workflowActionLabel(quote.workflowStatus)}</button>` : ""}
          ${quote.workflowStatus === "delivered" ? `<button class="secondary-button" type="button" data-app-action="pickup-receipt" data-quote-id="${escapeAttribute(quote.id)}">Comprovante retirada</button>` : ""}
          ${(quote.paymentMethod === "carne" || quote.secondaryPaymentMethod === "carne") ? `<button class="secondary-button" type="button" data-app-action="carnet-pdf" data-quote-id="${escapeAttribute(quote.id)}">Gerar carnê PDF</button>` : ""}
        </div>
      </article>
    `;
    }).join("")
    : emptyState("Nenhuma venda fechada.");
}

function renderQuotations() {
  const list = state.quotes
    .filter((quote) => quote.status === "quote")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const container = document.querySelector("#quotations-list");
  if (!container) return;

  container.innerHTML = list.length
    ? list.map((quote) => {
      const client = getClient(quote.clientId);
      const linkSummary = quoteLinkSummary(quote);
      return `
        <article class="timeline-item">
          <div>
            <p class="row-title">${escapeHtml(client?.name || "Cliente removido")}</p>
            <p class="row-meta">${formatDateTime(quote.createdAt)} | ${paymentSummary(quote)} | Total ${currency.format(Number(quote.totalAmount || 0))}</p>
            ${linkSummary ? `<p class="row-meta">${escapeHtml(linkSummary)}</p>` : ""}
          </div>
          <div class="prescription-grid">
            <span><strong>Serviço:</strong> ${escapeHtml(quote.serviceDescription || "-")}</span>
            <span><strong>Armação:</strong> ${escapeHtml(quote.frameCode || "-")}</span>
            <span><strong>Lente:</strong> ${currency.format(Number(quote.lensAmount || 0))}</span>
            <span><strong>Consulta:</strong> ${consultationSummary(quote)}</span>
          </div>
          ${quote.notes ? `<p class="row-meta">${escapeHtml(quote.notes)}</p>` : ""}
          <div class="form-actions">
            <button type="button" data-app-action="edit-quote" data-quote-id="${escapeAttribute(quote.id)}" data-mode="quote">Editar orçamento</button>
            <button type="button" data-app-action="edit-quote" data-quote-id="${escapeAttribute(quote.id)}" data-mode="sale">Fechar venda</button>
            <button class="secondary-button" type="button" data-app-action="quote-print" data-quote-id="${escapeAttribute(quote.id)}">Imprimir orçamento</button>
          </div>
        </article>
      `;
    }).join("")
    : emptyState("Nenhum orçamento pendente.");
}

function paymentLabel(method) {
  const labels = {
    dinheiro: "Dinheiro",
    cartao: "Cartão",
    boleto: "Boleto",
    carne: "Carnê",
  };
  return labels[method] || method;
}

function paymentSummary(quote) {
  const primaryAmount = Number(quote.primaryPaymentAmount || quote.totalAmount || 0);
  const secondaryAmount = Number(quote.secondaryPaymentAmount || 0);
  if (quote.secondaryPaymentMethod) {
    return `${paymentLabel(quote.paymentMethod)} ${currency.format(primaryAmount)} + ${paymentLabel(quote.secondaryPaymentMethod)} ${currency.format(secondaryAmount)}`;
  }
  return paymentLabel(quote.paymentMethod);
}

function workflowStatusLabel(status = "sold") {
  const labels = {
    sold: "Vendido",
    lab: "Em laboratório",
    ready: "Pronto",
    delivered: "Entregue"
  };
  return labels[status] || labels.sold;
}

function nextWorkflowStatus(status = "sold") {
  const next = { sold: "lab", lab: "ready", ready: "delivered" };
  return next[status || "sold"] || "";
}

function workflowActionLabel(status = "sold") {
  const labels = {
    sold: "Enviar laboratório",
    lab: "Marcar pronto",
    ready: "Marcar entregue"
  };
  return labels[status || "sold"] || "";
}

async function updateQuoteStatus(quoteId, workflowStatus) {
  try {
    await apiPost("/api/quotes/status", { id: quoteId, workflowStatus });
    await refreshData();
    showToast("Status da venda atualizado.", "success");
  } catch (err) {
    showToast(err.message || "Falha ao atualizar status.", "error");
  }
}

function consultationCharge(amount, status) {
  const value = Number(amount || 0);
  if (status === "with_purchase") return value / 2;
  if (status === "without_purchase") return value;
  return 0;
}

function consultationSummary(quote) {
  const status = quote.consultationStatus || "exempt";
  const labels = {
    with_purchase: "compra, cliente paga 50%",
    without_purchase: "sem compra, integral",
    exempt: "isento"
  };
  return `${currency.format(consultationCharge(quote.consultationAmount, status))} (${labels[status] || "isento"})`;
}

function getQuoteInstallmentPlan(quote) {
  const usesCarnet = quote.paymentMethod === "carne" || quote.secondaryPaymentMethod === "carne";
  if (!usesCarnet) return null;

  const savedInstallments = state.installments
    .filter((installment) => installment.quoteId === quote.id)
    .sort((a, b) => a.installmentNumber - b.installmentNumber);
  if (savedInstallments.length) {
    return {
      downPayment: Number(quote.downPayment || 0),
      financedAmount: savedInstallments.reduce((sum, installment) => sum + Number(installment.amount || 0), 0),
      installments: savedInstallments
    };
  }

  let carnetTotal = quote.secondaryPaymentMethod === "carne"
    ? Number(quote.secondaryPaymentAmount || 0)
    : Number(quote.primaryPaymentAmount || 0);
  if (carnetTotal <= 0) {
    carnetTotal = Number(quote.totalAmount || 0);
  }
  const downPayment = Number(quote.downPayment || 0);
  const financedAmount = Math.max(carnetTotal - downPayment, 0);
  const count = Math.max(Number(quote.installments || 1), 1);
  const amount = Math.round((financedAmount / count) * 100) / 100;
  const values = Array(count).fill(amount);
  values[count - 1] = Math.round((financedAmount - values.slice(0, -1).reduce((sum, value) => sum + value, 0)) * 100) / 100;
  const baseDate = String(quote.createdAt || new Date().toISOString()).slice(0, 10);
  const installments = values.map((value, index) => {
    const dueDate = new Date(`${baseDate}T00:00:00`);
    dueDate.setDate(dueDate.getDate() + (30 * index));
    return {
      installmentNumber: index + 1,
      dueDate: dueDate.toISOString().slice(0, 10),
      amount: value
    };
  });

  return { downPayment, financedAmount, installments };
}

function updateSalesFrameHint() {
  const input = document.querySelector("#sales-frame-code");
  const hint = document.querySelector("#sales-frame-hint");
  const amountInput = document.querySelector("#sales-frame-amount");
  if (!input || !hint) return;
  const code = input.value.trim();
  if (!code) {
    hint.textContent = "";
    if (amountInput) amountInput.value = "";
    updateSalesTotal();
    return;
  }
  const item = state.stock.find((stockItem) => String(stockItem.code || "").toLowerCase() === code.toLowerCase());
  if (!item) {
    hint.textContent = "Código não encontrado no estoque.";
    if (amountInput) amountInput.value = "";
    updateSalesTotal();
    return;
  }
  hint.textContent = `${item.name} | Qtd. ${item.quantity} | ${currency.format(Number(item.price || 0))}`;
  if (amountInput) amountInput.value = Number(item.price || 0).toFixed(2);
  updateSalesTotal();
}

function renderFinance() {
  const list = document.querySelector("#finance-list");
  if (!list) return;
  const filter = document.querySelector("#finance-filter").value;
  const term = normalize(document.querySelector("#finance-search").value);
  const clients = state.clients
    .map((client) => ({ client, financial: getClientFinancial(client.id) }))
    .filter(({ client, financial }) => {
      const matchesTerm = [client.name, client.cpf, client.phone].some((value) => normalize(value).includes(term));
      if (!matchesTerm) return false;
      if (filter === "open") return financial.openCount > 0;
      if (filter === "overdue") return financial.overdueCount > 0;
      if (filter === "paid") return financial.paidCount > 0;
      return financial.totalInstallments > 0;
    })
    .sort((a, b) => b.financial.overdueAmount - a.financial.overdueAmount || a.client.name.localeCompare(b.client.name));

  list.innerHTML = clients.length
    ? clients.map(({ client, financial }) => {
      return `
        <article class="timeline-item ${financial.overdueCount ? "is-overdue" : ""}">
          <div>
            <p class="row-title">${escapeHtml(client.name)}</p>
            <p class="row-meta">${escapeHtml(client.phone || "-")} ${client.cpf ? "| CPF " + escapeHtml(client.cpf) : ""}</p>
          </div>
          <div class="prescription-grid">
            <span><strong>Em aberto:</strong> ${financial.openCount} parcela(s), ${currency.format(financial.openAmount)}</span>
            <span><strong>Vencidas:</strong> ${financial.overdueCount} parcela(s), ${currency.format(financial.overdueAmount)}</span>
            <span><strong>Pagas:</strong> ${financial.paidCount} parcela(s), ${currency.format(financial.paidAmount)}</span>
            <span><strong>Última compra:</strong> ${financial.latestQuote ? formatDateTime(financial.latestQuote.createdAt) : "-"}</span>
          </div>
          <div class="form-actions">
            <button type="button" data-app-action="finance-detail" data-client-id="${escapeAttribute(client.id)}">Abrir financeiro</button>
          </div>
        </article>
      `;
    }).join("")
    : emptyState("Nenhum cliente encontrado.");
}

function showFinanceList() {
  currentFinanceClientId = "";
  document.querySelector("#finance-detail-view").classList.add("is-hidden");
  document.querySelector("#finance-list-view").classList.remove("is-hidden");
  renderFinance();
}

function showFinanceDetail(clientId) {
  const client = getClient(clientId);
  if (!client) return;
  currentFinanceClientId = clientId;
  document.querySelector("#finance-list-view").classList.add("is-hidden");
  document.querySelector("#finance-detail-view").classList.remove("is-hidden");
  document.querySelector("#finance-client-title").textContent = `Vida financeira - ${client.name}`;

  const financial = getClientFinancial(clientId);
  document.querySelector("#finance-client-summary").innerHTML = `
    <article><span>Em aberto</span><strong>${currency.format(financial.openAmount)}</strong></article>
    <article><span>Vencido</span><strong>${currency.format(financial.overdueAmount)}</strong></article>
    <article><span>Pago</span><strong>${currency.format(financial.paidAmount)}</strong></article>
    <article><span>Parcelas</span><strong>${financial.paidCount}/${financial.totalInstallments}</strong></article>
  `;

  const rows = financial.quotes.map((quote) => {
    const installments = state.installments
      .filter((item) => item.quoteId === quote.id)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
    return `
      <article class="timeline-item">
        <div>
          <p class="row-title">${escapeHtml(quote.serviceDescription || "Venda")}</p>
          <p class="row-meta">${formatDateTime(quote.createdAt)} | ${paymentSummary(quote)} | Total ${currency.format(Number(quote.totalAmount || 0))}</p>
          ${quoteLinkSummary(quote) ? `<p class="row-meta">${escapeHtml(quoteLinkSummary(quote))}</p>` : ""}
        </div>
        <div class="finance-installments">
          ${installments.map(renderFinanceInstallment).join("") || `<div class="empty-state">Venda sem parcelas.</div>`}
        </div>
      </article>
    `;
  });

  document.querySelector("#finance-detail-list").innerHTML = rows.length
    ? rows.join("")
    : emptyState("Cliente sem vendas parceladas.");
}

function renderFinanceInstallment(installment) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = !installment.paid && installment.dueDate < today;
  return `
    <div class="finance-installment ${installment.paid ? "is-paid" : ""} ${overdue ? "is-overdue" : ""}">
      <div>
        <strong>Parcela ${installment.installmentNumber}</strong>
        <span>Venc. ${formatDate(installment.dueDate)} | ${currency.format(Number(installment.amount || 0))}</span>
        <span>${installment.paid ? `Pago em ${formatDate(installment.paidAt)} (${paymentLabel(installment.paymentMethod)})` : overdue ? "Vencida" : "Em aberto"}</span>
      </div>
      ${installment.paid
        ? `<button class="secondary-button" type="button" data-finance-action="reopen" data-installment-id="${escapeAttribute(installment.id)}">Reabrir</button>`
        : `<button type="button" data-finance-action="pay" data-installment-id="${escapeAttribute(installment.id)}">Dar baixa</button>`}
    </div>
  `;
}

function getClientFinancial(clientId) {
  const today = new Date().toISOString().slice(0, 10);
  const quotes = state.quotes
    .filter((quote) => quote.clientId === clientId)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const quoteIds = new Set(quotes.map((quote) => quote.id));
  const installments = state.installments.filter((installment) => quoteIds.has(installment.quoteId));
  const open = installments.filter((installment) => !installment.paid);
  const overdue = open.filter((installment) => installment.dueDate < today);
  const paid = installments.filter((installment) => installment.paid);
  return {
    quotes,
    latestQuote: quotes[0],
    totalInstallments: installments.length,
    openCount: open.length,
    paidCount: paid.length,
    overdueCount: overdue.length,
    openAmount: open.reduce((sum, installment) => sum + Number(installment.amount || 0), 0),
    paidAmount: paid.reduce((sum, installment) => sum + Number(installment.paidAmount || installment.amount || 0), 0),
    overdueAmount: overdue.reduce((sum, installment) => sum + Number(installment.amount || 0), 0)
  };
}

function renderReports() {
  if (!document.querySelector("#report-month-sales")) return;
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const range = getReportRange();
  const sales = state.quotes.filter((quote) => quote.status === "sale");
  const periodSales = sales
    .filter((quote) => isDateInRange(String(quote.updatedAt || quote.createdAt || "").slice(0, 10), range))
    .reduce((sum, quote) => sum + Number(quote.totalAmount || 0), 0);
  const openReceivable = state.installments
    .filter((installment) => !installment.paid && isDateInRange(installment.dueDate, range))
    .reduce((sum, installment) => sum + Number(installment.amount || 0), 0);
  const overdue = state.installments.filter((installment) => !installment.paid && installment.dueDate < today && isDateInRange(installment.dueDate, range));
  const consultationCost = state.quotes.filter((quote) => isDateInRange(String(quote.updatedAt || quote.createdAt || "").slice(0, 10), range)).reduce((sum, quote) => {
    if (quote.consultationStatus === "with_purchase") return sum + Number(quote.consultationAmount || 0) / 2;
    return sum;
  }, 0);

  document.querySelector("#report-month-sales").textContent = currency.format(periodSales);
  document.querySelector("#report-open-receivable").textContent = currency.format(openReceivable);
  document.querySelector("#report-overdue-count").textContent = overdue.length;
  document.querySelector("#report-consultation-cost").textContent = currency.format(consultationCost);

  const paymentTotals = {};
  state.quotes.filter((quote) => isDateInRange(String(quote.updatedAt || quote.createdAt || "").slice(0, 10), range)).forEach((quote) => {
    const primary = Number(quote.primaryPaymentAmount || quote.totalAmount || 0);
    paymentTotals[quote.paymentMethod] = (paymentTotals[quote.paymentMethod] || 0) + primary;
    if (quote.secondaryPaymentMethod) {
      paymentTotals[quote.secondaryPaymentMethod] = (paymentTotals[quote.secondaryPaymentMethod] || 0) + Number(quote.secondaryPaymentAmount || 0);
    }
  });
  document.querySelector("#report-payment-methods").innerHTML = Object.keys(paymentTotals).length
    ? Object.entries(paymentTotals).map(([method, total]) => `
      <article class="timeline-item">
        <p class="row-title">${paymentLabel(method)}</p>
        <p class="row-meta">${currency.format(total)}</p>
      </article>
    `).join("")
    : emptyState("Nenhum pagamento registrado.");

  const lowStock = state.stock.filter((item) => item.quantity <= item.minimum);
  document.querySelector("#report-low-stock").innerHTML = lowStock.length
    ? lowStock.map((item) => `
      <article class="timeline-item">
        <p class="row-title">${escapeHtml(item.name)}</p>
        <p class="row-meta">${stockMeta(item)} | Qtd. ${item.quantity} | Mín. ${item.minimum}</p>
      </article>
    `).join("")
    : emptyState("Nenhum item abaixo do mínimo.");
}

function getReportRange() {
  const startInput = document.querySelector("#report-start-date");
  const endInput = document.querySelector("#report-end-date");
  const today = new Date().toISOString().slice(0, 10);
  const defaultStart = `${today.slice(0, 7)}-01`;
  if (!startInput.value) startInput.value = defaultStart;
  if (!endInput.value) endInput.value = today;
  return { start: startInput.value, end: endInput.value };
}

function setReportCurrentMonth() {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelector("#report-start-date").value = `${today.slice(0, 7)}-01`;
  document.querySelector("#report-end-date").value = today;
  renderReports();
}

function isDateInRange(date, range) {
  if (!date) return false;
  return date >= range.start && date <= range.end;
}

function renderAuditLog() {
  const container = document.querySelector("#audit-log-list");
  if (!container) return;
  const logs = [...(state.auditLogs || [])].slice(0, 40);
  container.innerHTML = logs.length
    ? logs.map((log) => `
      <article class="timeline-item">
        <div>
          <p class="row-title">${escapeHtml(log.summary || log.action)}</p>
          <p class="row-meta">${formatDateTime(log.createdAt)} | ${escapeHtml(log.username || "sistema")} | ${escapeHtml(auditActionLabel(log.action))}</p>
        </div>
      </article>
    `).join("")
    : emptyState("Nenhuma ação registrada ainda.");
}

function auditActionLabel(action) {
  const labels = {
    save: "Salvamento",
    update: "Atualização",
    create: "Criação",
    save_quote: "Orçamento",
    close_sale: "Venda",
    convert_quote: "Conversão",
    pay_installment: "Baixa financeira",
    reopen_installment: "Reabertura financeira",
    backup: "Backup"
  };
  return labels[action] || action;
}

function exportStockCsv() {
  const rows = state.stock
    .filter((item) => stockCategoryKey(item.category) === currentStockCategory)
    .map((item) => ({
      categoria: categoryLabels[stockCategoryKey(item.category)] || item.category,
      produto: item.name,
      marca: item.brand || "",
      codigo: item.code || "",
      material: item.material ? materialLabel(item.material) : "",
      referencia_cor: item.colorReference || "",
      quantidade: item.quantity,
      estoque_minimo: item.minimum,
      custo: Number(item.cost || 0).toFixed(2),
      preco_venda: Number(item.price || 0).toFixed(2)
    }));
  downloadCsv(`estoque-${currentStockCategory}.csv`, rows);
}

function exportFinanceCsv() {
  const rows = state.installments.map((installment) => {
    const quote = state.quotes.find((item) => item.id === installment.quoteId);
    const client = quote ? getClient(quote.clientId) : null;
    return {
      cliente: client?.name || "",
      cpf: client?.cpf || "",
      telefone: client?.phone || "",
      venda: quote?.serviceDescription || "",
      os_receita: quote ? quoteLinkSummary(quote) : "",
      parcela: installment.installmentNumber,
      vencimento: installment.dueDate,
      valor: Number(installment.amount || 0).toFixed(2),
      status: installment.paid ? "Pago" : "Em aberto",
      pago_em: installment.paidAt || "",
      forma_pagamento: installment.paymentMethod ? paymentLabel(installment.paymentMethod) : ""
    };
  });
  downloadCsv("financeiro-parcelas.csv", rows);
}

function printStockReport() {
  const rows = state.stock
    .filter((item) => stockCategoryKey(item.category) === currentStockCategory)
    .map((item) => ({
      Produto: item.name,
      Marca: item.brand || "-",
      Código: item.code || "-",
      Material: item.material ? materialLabel(item.material) : "-",
      Cor: item.colorReference || "-",
      Qtd: item.quantity,
      Mínimo: item.minimum,
      "Preço de venda": currency.format(Number(item.price || 0))
    }));
  openSimpleReportPrint(`Estoque - ${categoryLabels[currentStockCategory]}`, rows);
}

function printFinanceReport() {
  const rows = state.installments.map((installment) => {
    const quote = state.quotes.find((item) => item.id === installment.quoteId);
    const client = quote ? getClient(quote.clientId) : null;
    return {
      Cliente: client?.name || "-",
      Venda: quote?.serviceDescription || "-",
      Parcela: installment.installmentNumber,
      Vencimento: formatDate(installment.dueDate),
      Valor: currency.format(Number(installment.amount || 0)),
      Status: installment.paid ? "Pago" : "Em aberto",
      "Pago em": installment.paidAt ? formatDate(installment.paidAt) : "-"
    };
  });
  openSimpleReportPrint("Financeiro - parcelas", rows);
}

function openSimpleReportPrint(title, rows) {
  if (!rows.length) {
    showToast("Não há dados para imprimir.", "error");
    return;
  }
  const headers = Object.keys(rows[0]);
  const printWindow = window.open("", "_blank", "width=1000,height=900");
  if (!printWindow) return;
  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #17202a; background: #eef4f8; }
          .toolbar { position: sticky; top: 0; display: flex; gap: 10px; justify-content: center; padding: 12px; background: #071827; }
          button { min-height: 40px; border: 0; border-radius: 6px; padding: 0 16px; background: #be0f16; color: #fff; font-weight: 700; cursor: pointer; }
          main { width: 297mm; min-height: 210mm; margin: 0 auto; padding: 14mm; background: #fff; }
          h1 { margin: 0 0 4px; color: #8f090f; font-family: Georgia, "Times New Roman", serif; }
          p { margin: 0 0 18px; color: #536273; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d8e1e8; padding: 7px; text-align: left; vertical-align: top; }
          th { background: #f3f7fa; color: #102438; }
          @page { size: A4 landscape; margin: 0; }
          @media print { body { background: #fff; } .toolbar { display: none; } main { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button type="button" onclick="window.print()">Salvar como PDF / Imprimir</button>
          <button type="button" onclick="window.close()">Fechar</button>
        </div>
        <main>
          <h1>Ótica Regina</h1>
          <p>${escapeHtml(title)} | Emitido em ${formatDate(new Date().toISOString().slice(0, 10))}</p>
          <table>
            <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
            <tbody>
              ${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </main>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
}

function downloadCsv(filename, rows) {
  if (!rows.length) {
    showToast("Não há dados para exportar.", "error");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(";"))
  ].join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Arquivo CSV gerado.", "success");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

async function payInstallment(installmentId) {
  const installment = state.installments.find((item) => item.id === installmentId);
  if (!installment) return;
  const quote = state.quotes.find((item) => item.id === installment.quoteId);
  await apiPost("/api/installments/pay", {
    id: installmentId,
    paidAmount: installment.amount,
    paymentMethod: "dinheiro"
  });
  installment.paid = true;
  installment.paidAt = new Date().toISOString().slice(0, 10);
  installment.paymentMethod = "dinheiro";
  installment.paidAmount = installment.amount;
  renderAll();
  showFinanceDetail(quote?.clientId || currentFinanceClientId);
  await loadData();
  renderAll();
  showFinanceDetail(quote?.clientId || currentFinanceClientId);
}

async function reopenInstallment(installmentId) {
  const installment = state.installments.find((item) => item.id === installmentId);
  const quote = installment ? state.quotes.find((item) => item.id === installment.quoteId) : null;
  await apiPost("/api/installments/reopen", { id: installmentId });
  if (installment) {
    installment.paid = false;
    installment.paidAt = "";
    installment.paymentMethod = "";
    installment.paidAmount = 0;
  }
  renderAll();
  showFinanceDetail(quote?.clientId || currentFinanceClientId);
  await loadData();
  renderAll();
  showFinanceDetail(quote?.clientId || currentFinanceClientId);
}

async function handleFinanceDetailClick(event) {
  const button = event.target.closest("[data-finance-action]");
  if (!button) return;
  const action = button.dataset.financeAction;
  const installmentId = button.dataset.installmentId;
  button.disabled = true;
  button.textContent = action === "pay" ? "Baixando..." : "Reabrindo...";
  try {
    if (action === "pay") {
      await payInstallment(installmentId);
    } else {
      await reopenInstallment(installmentId);
    }
  } catch (err) {
    showToast(err.message || "Falha ao atualizar parcela.", "error");
    await loadData();
    renderAll();
    if (currentFinanceClientId) showFinanceDetail(currentFinanceClientId);
  }
}

async function createBackup() {
  const status = document.querySelector("#backup-status");
  status.textContent = "Gerando backup...";
  try {
    const result = await apiPost("/api/backup", {});
    status.textContent = `Backup criado: ${result.file}`;
  } catch (err) {
    status.textContent = err.message || "Falha ao gerar backup.";
  }
}

async function changePassword(event) {
  event.preventDefault();
  const status = document.querySelector("#password-status");
  status.textContent = "";
  try {
    await apiPost("/api/change-password", {
      oldPassword: document.querySelector("#current-password").value,
      newPassword: document.querySelector("#new-password").value
    });
    document.querySelector("#password-form").reset();
    status.textContent = "Senha alterada com sucesso.";
  } catch (err) {
    status.textContent = err.message || "Falha ao alterar senha.";
  }
}

async function saveUser(event) {
  event.preventDefault();
  const status = document.querySelector("#user-status");
  status.textContent = "Salvando usuário...";
  try {
    await apiPost("/api/users", {
      username: document.querySelector("#user-username").value.trim(),
      password: document.querySelector("#user-password").value,
      role: document.querySelector("#user-role").value
    });
    document.querySelector("#user-form").reset();
    status.textContent = "";
    await refreshData();
    showToast("Usuário salvo.", "success");
  } catch (err) {
    status.textContent = err.message || "Falha ao salvar usuário.";
  }
}

function renderUsers() {
  const container = document.querySelector("#users-list");
  if (!container) return;
  container.innerHTML = (state.users || []).length
    ? state.users.map((user) => `
      <article class="timeline-item">
        <p class="row-title">${escapeHtml(user.username)}</p>
        <p class="row-meta">Permissão: ${escapeHtml(userRoleLabel(user.role))} | Criado em ${formatDateTime(user.createdAt)}</p>
      </article>
    `).join("")
    : emptyState("Nenhum usuário cadastrado.");
}

function userRoleLabel(role) {
  const labels = { admin: "Admin", operator: "Operador", finance: "Financeiro" };
  return labels[role] || role;
}

function clearSalesForm() {
  document.querySelector("#sales-form").reset();
  document.querySelector("#sales-id").value = "";
  document.querySelector("#sales-error").textContent = "";
  document.querySelector("#sales-consultation-status").value = "with_purchase";
  document.querySelector("#sales-frame-amount").value = "";
  clearSalesClientSelection();
  updateSalesPaymentFields();
  updateSalesTotal();
}

function updateSalesPaymentFields() {
  const method = document.querySelector("#sales-payment-method").value;
  const secondaryMethod = document.querySelector("#sales-secondary-payment-method").value;
  const planFields = document.querySelector("#sales-plan-fields");
  const secondaryLabel = document.querySelector("#sales-secondary-payment-label");
  const hasSecondary = Boolean(secondaryMethod);

  secondaryLabel.classList.toggle("is-hidden", !hasSecondary);
  document.querySelector("#sales-secondary-payment-amount").required = hasSecondary;

  if (method === "carne" || secondaryMethod === "carne") {
    planFields.classList.remove("is-hidden");
    document.querySelector("#sales-downpayment").required = true;
    document.querySelector("#sales-installments").required = true;
  } else {
    planFields.classList.add("is-hidden");
    document.querySelector("#sales-downpayment").value = "0";
    document.querySelector("#sales-installments").value = "1";
    document.querySelector("#sales-downpayment").required = false;
    document.querySelector("#sales-installments").required = false;
  }
  updateSalesPaymentAmounts();
}

function updateSalesTotal() {
  const frameCode = document.querySelector("#sales-frame-code").value.trim();
  const frame = state.stock.find((stockItem) => String(stockItem.code || "").toLowerCase() === frameCode.toLowerCase());
  const frameAmount = frame ? Number(frame.price || 0) : 0;
  const lensAmount = Number(document.querySelector("#sales-lens-amount").value || 0);
  const consultationAmount = Number(document.querySelector("#sales-consultation-amount").value || 0);
  const consultationStatus = document.querySelector("#sales-consultation-status").value;
  const total = frameAmount + lensAmount + consultationCharge(consultationAmount, consultationStatus);
  document.querySelector("#sales-total").value = total ? total.toFixed(2) : "";
  updateSalesPaymentAmounts();
}

function updateSalesPaymentAmounts() {
  const total = Number(document.querySelector("#sales-total").value || 0);
  const secondaryMethod = document.querySelector("#sales-secondary-payment-method").value;
  const primary = document.querySelector("#sales-primary-payment-amount");
  const secondary = document.querySelector("#sales-secondary-payment-amount");
  if (!secondaryMethod) {
    primary.value = total ? total.toFixed(2) : "";
    secondary.value = "";
    return;
  }
  if (!primary.value || Number(primary.value) > total) {
    primary.value = total ? total.toFixed(2) : "";
  }
  updateSecondaryPaymentAmount();
}

function updateSecondaryPaymentAmount() {
  const total = Number(document.querySelector("#sales-total").value || 0);
  const secondaryMethod = document.querySelector("#sales-secondary-payment-method").value;
  if (!secondaryMethod) return;
  const primaryAmount = Number(document.querySelector("#sales-primary-payment-amount").value || 0);
  document.querySelector("#sales-secondary-payment-amount").value = Math.max(total - primaryAmount, 0).toFixed(2);
}

async function saveQuote(event) {
  event.preventDefault();
  const submitter = event.submitter;
  const action = submitter?.dataset.salesAction || "quote";
  const errorElement = document.querySelector("#sales-error");
  errorElement.textContent = "";

  if (!document.querySelector("#sales-client").value) {
    errorElement.textContent = "Busque e selecione um cliente cadastrado.";
    document.querySelector("#sales-client-search").focus();
    renderSalesClientSearch();
    return;
  }

  const linkedPrescription = parseSalesPrescriptionLink();
  const quote = {
    id: document.querySelector("#sales-id").value || createId("qto"),
    clientId: document.querySelector("#sales-client").value,
    prescriptionId: linkedPrescription.prescriptionId,
    labOrderId: linkedPrescription.labOrderId,
    serviceDescription: document.querySelector("#sales-service").value.trim(),
    frameCode: document.querySelector("#sales-frame-code").value.trim(),
    lensAmount: Number(document.querySelector("#sales-lens-amount").value || 0),
    consultationAmount: Number(document.querySelector("#sales-consultation-amount").value || 0),
    consultationStatus: document.querySelector("#sales-consultation-status").value,
    totalAmount: Number(document.querySelector("#sales-total").value || 0),
    paymentMethod: document.querySelector("#sales-payment-method").value,
    secondaryPaymentMethod: document.querySelector("#sales-secondary-payment-method").value,
    primaryPaymentAmount: Number(document.querySelector("#sales-primary-payment-amount").value || document.querySelector("#sales-total").value || 0),
    secondaryPaymentAmount: Number(document.querySelector("#sales-secondary-payment-amount").value || 0),
    downPayment: Number(document.querySelector("#sales-downpayment").value || 0),
    installments: Number(document.querySelector("#sales-installments").value || 1),
    notes: document.querySelector("#sales-notes").value.trim(),
    status: action === "sale" ? "sale" : "quote",
    createdAt: new Date().toISOString(),
  };

  try {
    await apiPost("/api/quotes", quote);
    clearSalesForm();
    await refreshData();
    setRoute(action === "sale" ? "sales" : "quotations");
    if (quote.paymentMethod === "carne" || quote.secondaryPaymentMethod === "carne") {
      openCarnetPdf(quote.id);
    }
  } catch (err) {
    errorElement.textContent = err.message || "Falha ao salvar orçamento.";
  }
}

function editQuote(quoteId, mode = "quote") {
  const quote = state.quotes.find((item) => item.id === quoteId);
  if (!quote) return;
  const client = getClient(quote.clientId);
  setRoute("sales");

  document.querySelector("#sales-id").value = quote.id;
  document.querySelector("#sales-client").value = quote.clientId;
  document.querySelector("#sales-client-search").value = client ? `${client.name} - ${client.phone || client.cpf || ""}`.trim() : "";
  updateSalesClientSummary(client);
  renderSalesPrescriptionLinks(quote.clientId, quote.prescriptionId || "", quote.labOrderId || "");
  document.querySelector("#sales-client-results").classList.add("is-hidden");
  document.querySelector("#sales-service").value = quote.serviceDescription || "";
  document.querySelector("#sales-frame-code").value = quote.frameCode || "";
  updateSalesFrameHint();
  document.querySelector("#sales-lens-amount").value = quote.lensAmount || "";
  document.querySelector("#sales-consultation-amount").value = quote.consultationAmount || "";
  document.querySelector("#sales-consultation-status").value = quote.consultationStatus || "exempt";
  document.querySelector("#sales-total").value = Number(quote.totalAmount || 0).toFixed(2);
  document.querySelector("#sales-payment-method").value = quote.paymentMethod || "dinheiro";
  document.querySelector("#sales-secondary-payment-method").value = quote.secondaryPaymentMethod || "";
  document.querySelector("#sales-primary-payment-amount").value = quote.primaryPaymentAmount || quote.totalAmount || "";
  document.querySelector("#sales-secondary-payment-amount").value = quote.secondaryPaymentAmount || "";
  document.querySelector("#sales-downpayment").value = quote.downPayment || 0;
  document.querySelector("#sales-installments").value = quote.installments || 1;
  document.querySelector("#sales-notes").value = quote.notes || "";
  document.querySelector("#sales-error").textContent = mode === "sale"
    ? "Revise os dados e clique em Fechar venda."
    : "Editando orçamento. Clique em Gerar orçamento para salvar.";
  updateSalesPaymentFields();
  updateSalesFrameHint();
}

function getCurrentQuoteFromForm() {
  const clientId = document.querySelector("#sales-client").value;
  if (!clientId) return null;
  return {
    id: document.querySelector("#sales-id").value || "prévia",
    clientId,
    ...parseSalesPrescriptionLink(),
    createdAt: new Date().toISOString(),
    serviceDescription: document.querySelector("#sales-service").value.trim(),
    frameCode: document.querySelector("#sales-frame-code").value.trim(),
    lensAmount: Number(document.querySelector("#sales-lens-amount").value || 0),
    consultationAmount: Number(document.querySelector("#sales-consultation-amount").value || 0),
    consultationStatus: document.querySelector("#sales-consultation-status").value,
    totalAmount: Number(document.querySelector("#sales-total").value || 0),
    paymentMethod: document.querySelector("#sales-payment-method").value,
    secondaryPaymentMethod: document.querySelector("#sales-secondary-payment-method").value,
    primaryPaymentAmount: Number(document.querySelector("#sales-primary-payment-amount").value || document.querySelector("#sales-total").value || 0),
    secondaryPaymentAmount: Number(document.querySelector("#sales-secondary-payment-amount").value || 0),
    downPayment: Number(document.querySelector("#sales-downpayment").value || 0),
    installments: Number(document.querySelector("#sales-installments").value || 1),
    notes: document.querySelector("#sales-notes").value.trim(),
    status: "quote"
  };
}

function printCurrentQuote() {
  const quote = getCurrentQuoteFromForm();
  if (!quote) {
    document.querySelector("#sales-error").textContent = "Selecione um cliente antes de imprimir o orçamento.";
    return;
  }
  openQuotePrint(null, quote);
}

function openQuotePrint(quoteId, draftQuote = null) {
  const quote = draftQuote || state.quotes.find((item) => item.id === quoteId);
  if (!quote) return;
  const client = getClient(quote.clientId);
  const printWindow = window.open("", "_blank", "width=850,height=1000");
  if (!printWindow) return;
  printWindow.document.write(buildQuotePrintHtml(client, quote));
  printWindow.document.close();
  printWindow.focus();
}

function buildQuotePrintHtml(client, quote) {
  const issueDate = String(quote.createdAt || new Date().toISOString()).slice(0, 10);
  const validUntil = new Date(issueDate);
  validUntil.setDate(validUntil.getDate() + 7);
  const frame = state.stock.find((item) => String(item.code || "").toLowerCase() === String(quote.frameCode || "").toLowerCase());
  const installmentPlan = getQuoteInstallmentPlan(quote);
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Orçamento - ${escapeHtml(client?.name || "Cliente")}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; color: #17202a; font-family: Arial, Helvetica, sans-serif; background: #eef4f8; }
          .toolbar { position: sticky; top: 0; display: flex; gap: 10px; justify-content: center; padding: 12px; background: #071827; }
          button { min-height: 40px; border: 0; border-radius: 6px; padding: 0 16px; background: #be0f16; color: #fff; font-weight: 700; cursor: pointer; }
          .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm; background: #fff; }
          header { display: grid; grid-template-columns: 110px 1fr; gap: 16px; align-items: center; border-bottom: 2px solid #be0f16; padding-bottom: 14px; margin-bottom: 18px; }
          header img { max-width: 105px; max-height: 70px; object-fit: contain; }
          h1 { margin: 0; color: #8f090f; font-family: Georgia, "Times New Roman", serif; font-size: 28px; }
          h2 { margin: 20px 0 10px; font-size: 17px; color: #102438; border-bottom: 1px solid #d8e1e8; padding-bottom: 7px; }
          p { margin: 4px 0; color: #536273; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 14px; }
          .box { border: 1px solid #cfd9e2; border-radius: 6px; padding: 10px; }
          .box span { display: block; color: #667181; font-size: 11px; font-weight: 800; text-transform: uppercase; }
          .box strong { display: block; margin-top: 5px; font-size: 15px; }
          .total { margin-top: 18px; border: 2px solid #be0f16; border-radius: 8px; padding: 14px; display: flex; justify-content: space-between; font-size: 22px; font-weight: 800; }
          .note { margin-top: 18px; border: 1px solid #d8e1e8; border-radius: 6px; padding: 12px; min-height: 70px; }
          .installment-summary { margin-top: 18px; border: 1px solid #cfd9e2; border-radius: 6px; overflow: hidden; }
          .installment-summary table { width: 100%; border-collapse: collapse; }
          .installment-summary th, .installment-summary td { padding: 8px 10px; border-bottom: 1px solid #e2e8ef; text-align: left; font-size: 13px; }
          .installment-summary th { background: #f3f7fa; color: #102438; font-size: 11px; text-transform: uppercase; }
          .installment-summary tr:last-child td { border-bottom: 0; }
          .fine-print { margin-top: 18px; color: #667181; font-size: 12px; }
          .signature { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .signature div { border-top: 1px solid #667181; padding-top: 8px; text-align: center; color: #536273; font-size: 12px; }
          @page { size: A4; margin: 0; }
          @media print { body { background: #fff; } .toolbar { display: none; } .page { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button type="button" onclick="window.print()">Salvar como PDF / Imprimir</button>
          <button type="button" onclick="window.close()">Fechar</button>
        </div>
        <main class="page">
          <header>
            <img src="${location.origin}/assets/vetor.png" alt="Ótica Regina">
            <div>
              <h1>Orçamento</h1>
              <p><strong>Ótica Regina</strong></p>
              <p>Emitido em ${formatDate(issueDate)} | Válido até ${formatDate(validUntil.toISOString().slice(0, 10))}</p>
            </div>
          </header>

          <h2>Cliente</h2>
          <section class="grid">
            <div class="box"><span>Nome</span><strong>${escapeHtml(client?.name || "-")}</strong></div>
            <div class="box"><span>Telefone</span><strong>${escapeHtml(client?.phone || "-")}</strong></div>
            <div class="box"><span>CPF</span><strong>${escapeHtml(client?.cpf || "-")}</strong></div>
            <div class="box"><span>Email</span><strong>${escapeHtml(client?.email || "-")}</strong></div>
            <div class="box"><span>Receita / O.S.</span><strong>${escapeHtml(quoteLinkSummary(quote) || "-")}</strong></div>
          </section>

          <h2>Itens do orçamento</h2>
          <section class="grid">
            <div class="box"><span>Serviço</span><strong>${escapeHtml(quote.serviceDescription || "-")}</strong></div>
            <div class="box"><span>Armação</span><strong>${escapeHtml(quote.frameCode || "-")}${frame ? " | " + escapeHtml(frame.name) : ""}</strong></div>
            <div class="box"><span>Lente</span><strong>${currency.format(Number(quote.lensAmount || 0))}</strong></div>
            <div class="box"><span>Consulta</span><strong>${consultationSummary(quote)}</strong></div>
            <div class="box"><span>Pagamento</span><strong>${paymentSummary(quote)}</strong></div>
            <div class="box"><span>Entrada / Parcelas</span><strong>${currency.format(Number(quote.downPayment || 0))} | ${quote.installments || 1}x</strong></div>
          </section>

          ${installmentPlan ? `
            <h2>Resumo das parcelas</h2>
            <section class="grid">
              <div class="box"><span>Entrada</span><strong>${currency.format(installmentPlan.downPayment)}</strong></div>
              <div class="box"><span>Valor parcelado</span><strong>${currency.format(installmentPlan.financedAmount)}</strong></div>
              <div class="box"><span>Quantidade</span><strong>${installmentPlan.installments.length} parcela(s)</strong></div>
              <div class="box"><span>Forma</span><strong>Carnê</strong></div>
            </section>
            <div class="installment-summary">
              <table>
                <thead>
                  <tr>
                    <th>Parcela</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${installmentPlan.installments.map((installment) => `
                    <tr>
                      <td>${installment.installmentNumber}</td>
                      <td>${formatDate(installment.dueDate)}</td>
                      <td>${currency.format(Number(installment.amount || 0))}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : ""}

          <div class="total">
            <span>Total</span>
            <span>${currency.format(Number(quote.totalAmount || 0))}</span>
          </div>

          <h2>Observações</h2>
          <div class="note">${escapeHtml(quote.notes || "Sem observações.")}</div>
          <p class="fine-print">Valores sujeitos à disponibilidade do produto em estoque. Orçamento válido por 7 dias.</p>

          <section class="signature">
            <div>Cliente</div>
            <div>Ótica Regina</div>
          </section>
        </main>
      </body>
    </html>
  `;
}

async function convertQuote(quoteId) {
  try {
    await apiPost("/api/quotes/convert", { id: quoteId });
    await refreshData();
    const quote = state.quotes.find((item) => item.id === quoteId);
    if (quote && (quote.paymentMethod === "carne" || quote.secondaryPaymentMethod === "carne")) {
      openCarnetPdf(quoteId);
    }
  } catch (err) {
    showToast(err.message || "Falha ao converter o orçamento.", "error");
  }
}

function openCarnetPdf(quoteId) {
  const quote = state.quotes.find((item) => item.id === quoteId);
  if (!quote) return;
  const client = getClient(quote.clientId);
  const installments = state.installments.filter((item) => item.quoteId === quote.id);
  if (!installments.length) {
    showToast("Salve o orçamento em carnê para gerar as parcelas.", "error");
    return;
  }
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  if (!printWindow) return;
  printWindow.document.write(buildCarnetPrintHtml(client, quote, installments));
  printWindow.document.close();
  printWindow.focus();
}

function openSaleReceipt(quoteId) {
  const quote = state.quotes.find((item) => item.id === quoteId);
  if (!quote) return;
  const client = getClient(quote.clientId);
  const printWindow = window.open("", "_blank", "width=850,height=1000");
  if (!printWindow) return;
  printWindow.document.write(buildSaleReceiptHtml(client, quote));
  printWindow.document.close();
  printWindow.focus();
}

function openPickupReceipt(quoteId) {
  const quote = state.quotes.find((item) => item.id === quoteId);
  if (!quote) return;
  const client = getClient(quote.clientId);
  const printWindow = window.open("", "_blank", "width=850,height=1000");
  if (!printWindow) return;
  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Comprovante de retirada - ${escapeHtml(client?.name || "Cliente")}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; color: #17202a; font-family: Arial, Helvetica, sans-serif; background: #eef4f8; }
          .toolbar { position: sticky; top: 0; display: flex; gap: 10px; justify-content: center; padding: 12px; background: #071827; }
          button { min-height: 40px; border: 0; border-radius: 6px; padding: 0 16px; background: #be0f16; color: #fff; font-weight: 700; cursor: pointer; }
          main { width: 148mm; min-height: 210mm; margin: 0 auto; padding: 16mm; background: #fff; }
          h1 { margin: 0 0 8px; color: #8f090f; text-align: center; }
          p { line-height: 1.55; }
          .row { border-bottom: 1px solid #d8e1e8; padding: 10px 0; display: flex; justify-content: space-between; gap: 16px; }
          .signature { margin-top: 58px; border-top: 1px solid #667181; padding-top: 8px; text-align: center; }
          @page { size: A5; margin: 0; }
          @media print { body { background: #fff; } .toolbar { display: none; } main { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button type="button" onclick="window.print()">Salvar como PDF / Imprimir</button>
          <button type="button" onclick="window.close()">Fechar</button>
        </div>
        <main>
          <h1>Comprovante de retirada</h1>
          <div class="row"><strong>Cliente</strong><span>${escapeHtml(client?.name || "-")}</span></div>
          <div class="row"><strong>Venda</strong><span>${escapeHtml(quote.saleNumber || quote.id)}</span></div>
          <div class="row"><strong>Produto/serviço</strong><span>${escapeHtml(quote.serviceDescription || "-")}</span></div>
          <div class="row"><strong>Data da entrega</strong><span>${formatDate(quote.deliveredAt || new Date().toISOString().slice(0, 10))}</span></div>
          <p>Declaro que recebi o produto acima em boas condições, conforme combinado com a Ótica Regina.</p>
          <div class="signature">Assinatura do cliente</div>
        </main>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
}

function buildSaleReceiptHtml(client, quote) {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Recibo - ${escapeHtml(client?.name || "Cliente")}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; color: #17202a; font-family: Arial, Helvetica, sans-serif; background: #eef4f8; }
          .toolbar { position: sticky; top: 0; display: flex; gap: 10px; justify-content: center; padding: 12px; background: #071827; }
          button { min-height: 40px; border: 0; border-radius: 6px; padding: 0 16px; background: #be0f16; color: #fff; font-weight: 700; cursor: pointer; }
          .page { width: 148mm; min-height: 210mm; margin: 0 auto; padding: 14mm; background: #fff; }
          h1 { margin: 0; color: #8f090f; text-align: center; }
          .subtitle { margin: 4px 0 22px; text-align: center; color: #536273; }
          .row { border-bottom: 1px solid #cfd9e2; padding: 10px 0; display: flex; justify-content: space-between; gap: 18px; }
          .row span { color: #667181; font-weight: 700; }
          .row strong { text-align: right; }
          .total { margin-top: 18px; border: 2px solid #8f090f; padding: 14px; font-size: 20px; }
          .signature { margin-top: 42px; border-top: 1px solid #667181; padding-top: 8px; text-align: center; color: #536273; }
          @page { size: A5; margin: 0; }
          @media print { body { background: #fff; } .toolbar { display: none; } .page { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button type="button" onclick="window.print()">Salvar como PDF / Imprimir</button>
          <button type="button" onclick="window.close()">Fechar</button>
        </div>
        <main class="page">
          <h1>Ótica Regina</h1>
          <p class="subtitle">Recibo de venda</p>
          <div class="row"><span>Cliente</span><strong>${escapeHtml(client?.name || "-")}</strong></div>
          <div class="row"><span>Telefone</span><strong>${escapeHtml(client?.phone || "-")}</strong></div>
          <div class="row"><span>Serviço</span><strong>${escapeHtml(quote.serviceDescription || "-")}</strong></div>
          <div class="row"><span>Receita / O.S.</span><strong>${escapeHtml(quoteLinkSummary(quote) || "-")}</strong></div>
          <div class="row"><span>Armação</span><strong>${escapeHtml(quote.frameCode || "-")}</strong></div>
          <div class="row"><span>Lente</span><strong>${currency.format(Number(quote.lensAmount || 0))}</strong></div>
          <div class="row"><span>Consulta</span><strong>${consultationSummary(quote)}</strong></div>
          <div class="row"><span>Pagamento</span><strong>${paymentSummary(quote)}</strong></div>
          <div class="row total"><span>Total</span><strong>${currency.format(Number(quote.totalAmount || 0))}</strong></div>
          <div class="signature">Assinatura / carimbo</div>
        </main>
      </body>
    </html>
  `;
}

function buildCarnetPrintHtml(client, quote, installments) {
  const issuedAt = formatDate(String(quote.createdAt || new Date().toISOString()).slice(0, 10));
  const total = currency.format(Number(quote.totalAmount || 0));
  const documents = [];
  if (Number(quote.downPayment || 0) > 0) {
    documents.push({
      label: "Entrada",
      number: "------",
      value: currency.format(Number(quote.downPayment || 0)),
      dueDate: issuedAt
    });
  }
  installments.forEach((installment) => {
    documents.push({
      label: "",
      number: String(installment.installmentNumber).padStart(2, "0"),
      value: currency.format(Number(installment.amount || 0)),
      dueDate: formatDate(installment.dueDate)
    });
  });

  const documentRows = documents.map((document) => `
    <section class="carnet-row">
      <aside class="stub">
        <div class="mini-grid">
          <label>Documento<span>${escapeHtml(quote.id.slice(0, 10))}</span></label>
          <label>Data de Emissão<span>${issuedAt}</span></label>
        </div>
        <div class="mini-grid">
          <label>Parcela<span>${document.number}</span></label>
          <label>Valor<span>${document.value}</span></label>
        </div>
        <label>Total compra :<span>${total}</span></label>
        <label>Vencimento :<span>${document.dueDate}</span></label>
        <div class="big-box">${escapeHtml(document.label)}</div>
      </aside>
      <article class="receipt">
        <header>
          <h1>ÓTICA REGINA</h1>
          <p>Rua Bom Jesus n° 13 - João de Deus - São Luís - MA</p>
          <p>Fones: (98) 98766-9551 | (98)3237-9394</p>
        </header>
        <label class="client-line">Cliente :<span>${escapeHtml(client?.name || "-")}</span></label>
        <div class="receipt-body">
          <div class="receipt-fields">
            <label>Total compra :<span>${total}</span></label>
            <label>Vencimento :<span>${document.dueDate}</span></label>
            <div class="mini-grid">
              <label>Documento<span>${escapeHtml(quote.id.slice(0, 10))}</span></label>
              <label>Data de Emissão:<span>${issuedAt}</span></label>
            </div>
            <div class="mini-grid">
              <label>Parcela<span>${document.number}</span></label>
              <label>Valor<span>${document.value}</span></label>
            </div>
          </div>
          <div class="big-box">${escapeHtml(document.label)}</div>
        </div>
      </article>
    </section>
  `).join("");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Carnê - ${escapeHtml(client?.name || "Cliente")}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; background: #e9edf1; }
          .toolbar { position: sticky; top: 0; z-index: 5; display: flex; gap: 10px; justify-content: center; padding: 12px; background: #071827; }
          button { min-height: 40px; border: 0; border-radius: 6px; padding: 0 16px; background: #be0f16; color: white; font-weight: 700; cursor: pointer; }
          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 8mm 0 8mm 12mm;
            background: #fff;
          }
          .carnet-row {
            display: grid;
            grid-template-columns: 55mm 110mm;
            width: 165mm;
            height: 60mm;
            border: 1.5px solid #111;
            border-bottom-width: 0;
            page-break-inside: avoid;
            break-inside: avoid;
            overflow: hidden;
          }
          .carnet-row:last-child {
            border-bottom-width: 1.5px;
          }
          .carnet-row:nth-of-type(4n) {
            border-bottom-width: 1.5px;
            break-after: page;
            page-break-after: always;
          }
          .stub,
          .receipt {
            padding: 2mm;
          }
          .stub {
            border-right: 1.5px solid #111;
          }
          .receipt header {
            min-height: 11mm;
            text-align: center;
          }
          .receipt h1 {
            margin: 0;
            font-size: 14px;
            line-height: 1.1;
            letter-spacing: 0;
          }
          .receipt p {
            margin: 1px 0;
            font-size: 8.5px;
            font-weight: 700;
          }
          label {
            display: block;
            font-size: 10px;
            font-weight: 800;
            line-height: 1.1;
          }
          label span {
            display: block;
            min-height: 6mm;
            margin-top: 0.6mm;
            border: 1px solid #555;
            padding: 1mm 1.4mm;
            font-size: 9px;
            font-weight: 700;
          }
          .mini-grid {
            display: grid;
            grid-template-columns: 1fr 2.05fr;
            gap: 2.5mm;
            margin-bottom: 1.2mm;
          }
          .stub > label {
            margin-bottom: 1.2mm;
          }
          .client-line span {
            min-height: 6mm;
          }
          .receipt-body {
            display: grid;
            grid-template-columns: 51mm 1fr;
            gap: 3mm;
            margin-top: 1.4mm;
          }
          .receipt-fields > label {
            margin-bottom: 1.2mm;
          }
          .big-box {
            min-height: 14mm;
            border: 1px solid #555;
            display: grid;
            place-items: center;
            padding: 1.5mm;
            font-size: 19px;
            font-weight: 400;
          }
          .receipt .big-box {
            min-height: 35mm;
            font-size: 27px;
          }
          @page { size: A4; margin: 0; }
          @media print {
            body { background: white; }
            .toolbar { display: none; }
            .page { width: auto; min-height: auto; margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button type="button" onclick="window.print()">Salvar como PDF / Imprimir</button>
          <button type="button" onclick="window.close()">Fechar</button>
        </div>
        <main class="page">
          ${documentRows}
        </main>
      </body>
    </html>
  `;
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
  document.querySelector("#stock-category").value = stockCategoryKey(item.category);
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

function getPrescription(prescriptionId) {
  return state.prescriptions.find((prescription) => prescription.id === prescriptionId);
}

function getLabOrder(labOrderId) {
  return state.labOrders.find((order) => order.id === labOrderId);
}

function updateLoginSummary() {
  const clientCount = document.querySelector("#login-client-count");
  const prescriptionCount = document.querySelector("#login-prescription-count");
  const stockCount = document.querySelector("#login-stock-count");

  if (clientCount) clientCount.textContent = state.clients.length;
  if (prescriptionCount) prescriptionCount.textContent = state.prescriptions.length;
  if (stockCount) stockCount.textContent = state.stock.length;
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

function getRecentMonthKeys(count) {
  const date = new Date();
  date.setDate(1);
  const months = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const item = new Date(date);
    item.setMonth(date.getMonth() - index);
    months.push(item.toISOString().slice(0, 7));
  }
  return months;
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
}

function field(value) {
  return escapeHtml(value || "-");
}

function showToast(message, type = "info") {
  const container = document.querySelector("#toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast is-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 4200);
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
