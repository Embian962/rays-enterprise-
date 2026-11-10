(function setupAdminDocuments() {
    const apiBase = (window.RAYS_API_URL || "").replace(/\/$/, "");
    const token = function() { return sessionStorage.getItem("rays-admin-token") || ""; };
    const money = function(value) { return "KSh " + (Number(value) || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    const escapeHtml = function(value) { return String(value ?? "").replace(/[&<>"']/g, function(char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]; }); };
    const dateText = function(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-KE", { timeZone: "Africa/Nairobi" }); };
    const apiRequest = async function(path, options) {
        const response = await fetch(apiBase + path, {
            cache: "no-store",
            ...options,
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + token(), ...(options?.headers || {}) }
        });
        if (!response.ok) {
            const body = await response.json().catch(function() { return {}; });
            throw new Error(body.error || "The server could not complete this request.");
        }
        return response.status === 204 ? null : response.json();
    };
    const openPrintWindow = function() {
        const printWindow = window.open("", "_blank");
        if (!printWindow) alert("Allow pop-ups for this site to print or save the document as PDF.");
        return printWindow;
    };
    const printableHtml = function(kind, number, store, customer, provider, items, total, extra) {
        const rows = (Array.isArray(items) ? items : []).map(function(item) {
            const name = item.productName || item.name || "Product";
            const quantity = Number(item.quantity) || 0;
            const unit = Number(item.unitPrice ?? item.price) || 0;
            const line = Number(item.lineTotal) || quantity * unit;
            return `<tr><td>${escapeHtml(name)}</td><td>${quantity}</td><td>${money(unit)}</td><td>${money(line)}</td></tr>`;
        }).join("");
        const logoUrl = new URL("rays-enterprise-logo-new.jpg", window.location.href).href;
        const detail = extra || {};
        return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(kind)} ${escapeHtml(number)}</title><style>
            *{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#172033;margin:0;padding:36px}main{max-width:820px;margin:auto}.brand{display:flex;align-items:center;gap:18px;border-bottom:2px solid #0f766e;padding-bottom:18px}.brand img{width:82px;height:82px;object-fit:contain}.brand h1{font-size:24px;margin:0 0 6px}.muted{color:#64748b;line-height:1.5}.title{display:flex;justify-content:space-between;align-items:flex-start;margin:28px 0 18px}.title h2{font-size:25px;margin:0}.facts{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0}.fact{padding:12px;background:#f8fafc;border-radius:8px}.fact strong{display:block;margin-bottom:6px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:12px 8px;border-bottom:1px solid #dbe2ea;text-align:left}th{background:#f1f5f9}.total{text-align:right;font-size:20px;font-weight:bold;margin:22px 0}.note{white-space:pre-wrap;background:#f8fafc;padding:14px;border-radius:8px}.footer{margin-top:48px;border-top:1px solid #cbd5e1;padding-top:14px}.print{position:fixed;right:20px;top:16px;background:#0f766e;color:#fff;border:0;border-radius:8px;padding:12px 18px;font-weight:bold;cursor:pointer}@media print{body{padding:0}.print{display:none}main{max-width:none}.fact,.note{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
            </style></head><body><button class="print" onclick="window.print()">Download / Print PDF</button><main><header class="brand"><img src="${escapeHtml(logoUrl)}" alt=""><div><h1>${escapeHtml(store?.name || "Ray's Enterprise")}</h1><div class="muted">${escapeHtml(store?.address || "")}${store?.address && store?.phone ? " · " : ""}${escapeHtml(store?.phone || "")}${store?.email ? `<br>${escapeHtml(store.email)}` : ""}</div></div></header><div class="title"><div><h2>${escapeHtml(kind)}</h2><div class="muted">${escapeHtml(number)}</div></div><div class="muted">${escapeHtml(dateText(detail.date || detail.createdAt || detail.issuedAt || new Date().toISOString()))}</div></div><div class="facts"><div class="fact"><strong>Customer</strong>${escapeHtml(customer?.name || "Walk-in customer")}<br>${escapeHtml(customer?.phone || "")}${customer?.email ? `<br>${escapeHtml(customer.email)}` : ""}</div><div class="fact"><strong>Service provider</strong>${escapeHtml(provider || "")}${detail.reference ? `<br><span class="muted">${escapeHtml(detail.reference)}</span>` : ""}${detail.paymentMethod ? `<br>Payment: ${escapeHtml(detail.paymentMethod)}` : ""}${detail.paymentStatus ? `<br>Status: ${escapeHtml(detail.paymentStatus)}` : ""}</div></div><table><thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Total: ${money(total)}</p>${detail.notes ? `<div class="note"><strong>Notes / terms</strong><br>${escapeHtml(detail.notes)}</div>` : ""}<footer class="footer muted">Thank you for choosing ${escapeHtml(store?.name || "Ray's Enterprise")}.</footer></main></body></html>`;
    };
    const writePrintWindow = function(printWindow, html) {
        if (!printWindow) return;
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };
    const formatQuote = function(quote) {
        const id = quote.quotation_number || "Q-" + String(quote.id).padStart(6, "0");
        const items = Array.isArray(quote.items) ? quote.items : [];
        const row = document.createElement("article");
        row.className = "document-history-card";
        row.innerHTML = `<div><strong>${escapeHtml(id)} · ${escapeHtml(quote.customer_name)}</strong><small>${escapeHtml(dateText(quote.created_at))} · ${items.length} item${items.length === 1 ? "" : "s"}</small><small>Service provider: ${escapeHtml(quote.service_provider)}</small></div><strong>${money(quote.total)}</strong><button type="button" class="document-print-quote">Print / PDF</button>`;
        row.querySelector("button").addEventListener("click", function() {
            const printWindow = openPrintWindow();
            writePrintWindow(printWindow, printableHtml("Quotation", id, quote.store_profile || window.currentStoreProfile, { name: quote.customer_name, phone: quote.customer_phone, email: quote.customer_email }, quote.service_provider, items, quote.total, { date: quote.created_at, notes: quote.notes }));
        });
        return row;
    };

    const quoteForm = document.getElementById("quotationForm");
    const quoteRows = document.getElementById("quotationItems");
    const quoteStatus = document.getElementById("quotationStatus");
    let productOptions = [];
    const loadProducts = async function() {
        const products = await apiRequest("/api/products?summary=1");
        productOptions = Array.isArray(products) ? products : [];
        return productOptions;
    };
    const addQuoteItem = function() {
        const row = document.createElement("div");
        row.className = "document-item-row";
        const options = productOptions.map(product => `<option value="${escapeHtml(product.id)}" data-price="${escapeHtml(product.price)}">${escapeHtml(product.name)} · ${money(product.price)}</option>`).join("");
        row.innerHTML = `<label>Product<select class="quote-product" required><option value="">Select a product</option>${options}</select></label><label>Quantity<input class="quote-quantity" type="number" min="1" step="1" value="1" required></label><label>Unit price (KSh)<input class="quote-price" type="number" min="0" step="0.01" required></label><strong class="quote-line-total">KSh 0</strong><button class="remove-quote-item" type="button" aria-label="Remove product">Remove</button>`;
        row.querySelector(".quote-product").addEventListener("change", function(event) { row.querySelector(".quote-price").value = event.target.selectedOptions[0]?.dataset.price || ""; updateQuoteTotal(); });
        row.querySelectorAll("input").forEach(input => input.addEventListener("input", updateQuoteTotal));
        row.querySelector(".remove-quote-item").addEventListener("click", function() { row.remove(); updateQuoteTotal(); });
        quoteRows.appendChild(row);
    };
    function updateQuoteTotal() {
        let total = 0;
        quoteRows?.querySelectorAll(".document-item-row").forEach(function(row) {
            const quantity = Number(row.querySelector(".quote-quantity").value) || 0;
            const price = Number(row.querySelector(".quote-price").value) || 0;
            const line = quantity * price;
            total += line;
            row.querySelector(".quote-line-total").textContent = money(line);
        });
        const totalNode = document.getElementById("quotationTotal");
        if (totalNode) totalNode.textContent = "Total: " + money(total);
    }
    const loadQuotations = async function() {
        const history = document.getElementById("quotationHistory");
        if (!history) return;
        history.innerHTML = "<p>Loading quotations…</p>";
        try {
            const quotes = await apiRequest("/api/quotations");
            history.replaceChildren();
            if (!quotes.length) { history.innerHTML = "<p>No quotations saved yet.</p>"; return; }
            quotes.forEach(quote => history.appendChild(formatQuote(quote)));
        } catch (error) { history.innerHTML = `<p>${escapeHtml(error.message)}</p>`; }
    };
    document.getElementById("addQuotationItem")?.addEventListener("click", async function() {
        if (!productOptions.length) {
            try { await loadProducts(); } catch (error) { quoteStatus.textContent = error.message; return; }
        }
        addQuoteItem();
    });
    quoteForm?.addEventListener("submit", async function(event) {
        event.preventDefault();
        const printWindow = openPrintWindow();
        if (!printWindow) return;
        quoteStatus.textContent = "Saving quotation…";
        const submit = document.getElementById("saveQuotationButton");
        submit.disabled = true;
        const formData = new FormData(quoteForm);
        const items = Array.from(quoteRows.querySelectorAll(".document-item-row")).map(function(row) {
            return { productId: Number(row.querySelector(".quote-product").value), quantity: Number(row.querySelector(".quote-quantity").value), unitPrice: Number(row.querySelector(".quote-price").value) };
        });
        try {
            const quote = await apiRequest("/api/quotations", { method: "POST", body: JSON.stringify({ customerName: formData.get("customerName"), customerPhone: formData.get("customerPhone"), customerEmail: formData.get("customerEmail"), serviceProvider: formData.get("serviceProvider"), notes: formData.get("notes"), items }) });
            quoteStatus.textContent = "Quotation saved. Use the print dialog to print or save it as a PDF.";
            writePrintWindow(printWindow, printableHtml("Quotation", quote.quotation_number, quote.store_profile || window.currentStoreProfile, { name: quote.customer_name, phone: quote.customer_phone, email: quote.customer_email }, quote.service_provider, quote.items, quote.total, { date: quote.created_at, notes: quote.notes }));
            quoteForm.reset(); quoteRows.replaceChildren(); addQuoteItem(); updateQuoteTotal(); await loadQuotations();
        } catch (error) { printWindow.close(); quoteStatus.textContent = error.message; }
        finally { submit.disabled = false; }
    });

    const profileForm = document.getElementById("storeProfileForm");
    const profileStatus = document.getElementById("storeProfileStatus");
    const loadStoreProfile = async function() {
        const profile = await apiRequest("/api/store-profile");
        window.currentStoreProfile = profile;
        if (profileForm) Object.entries(profile).forEach(function([key, value]) { const field = profileForm.elements.namedItem(key); if (field) field.value = value || ""; });
    };
    profileForm?.addEventListener("submit", async function(event) {
        event.preventDefault();
        profileStatus.textContent = "Saving store details…";
        const data = new FormData(profileForm);
        try {
            const profile = await apiRequest("/api/store-profile", { method: "PUT", body: JSON.stringify({ name: data.get("name"), address: data.get("address"), phone: data.get("phone"), email: data.get("email") }) });
            window.currentStoreProfile = profile;
            profileStatus.textContent = "Store details saved.";
        } catch (error) { profileStatus.textContent = error.message; }
    });

    const receiptSourcesNode = document.getElementById("receiptSources");
    const receiptHistoryNode = document.getElementById("receiptHistory");
    const receiptStatus = document.getElementById("receiptStatus");
    const printReceipt = function(receipt, printWindow) {
        const snapshot = receipt.snapshot || {};
        writePrintWindow(printWindow, printableHtml("Receipt", receipt.receipt_number || "R-" + String(receipt.id).padStart(6, "0"), snapshot.store, { name: snapshot.sale?.customerName, phone: snapshot.sale?.customerPhone, email: snapshot.sale?.customerEmail }, snapshot.serviceProvider || receipt.service_provider, snapshot.sale?.items, snapshot.sale?.total, { date: snapshot.sale?.createdAt || receipt.created_at, reference: snapshot.sale?.reference, paymentMethod: snapshot.sale?.paymentMethod, paymentStatus: snapshot.sale?.paymentStatus }));
    };
    const loadReceipts = async function() {
        if (!receiptSourcesNode || !receiptHistoryNode) return;
        receiptSourcesNode.innerHTML = "<p>Loading sales…</p>";
        receiptHistoryNode.innerHTML = "<p>Loading receipts…</p>";
        try {
            const [sources, receipts] = await Promise.all([apiRequest("/api/receipts/sources"), apiRequest("/api/receipts")]);
            receiptSourcesNode.replaceChildren();
            if (!sources.length) receiptSourcesNode.innerHTML = "<p>No recorded sales or completed online orders are available yet.</p>";
            sources.forEach(function(source) {
                const card = document.createElement("article");
                card.className = "document-history-card";
                const itemSummary = source.items.map(item => `${item.productName} × ${item.quantity}`).join(", ");
                card.innerHTML = `<div><strong>${escapeHtml(source.reference)} · ${escapeHtml(source.customer_name || "Walk-in customer")}</strong><small>${escapeHtml(dateText(source.created_at))} · ${escapeHtml(source.payment_method || "")}</small><small>${escapeHtml(itemSummary)}</small></div><strong>${money(source.total)}</strong><button type="button" class="receipt-source-action">${source.receipt_id ? "Print saved receipt" : "Create receipt"}</button>`;
                card.querySelector("button").addEventListener("click", async function() {
                    const printWindow = openPrintWindow();
                    if (!printWindow) return;
                    if (source.receipt_id) {
                        const receipt = receipts.find(item => String(item.id) === String(source.receipt_id));
                        if (receipt) printReceipt(receipt, printWindow); else { printWindow.close(); receiptStatus.textContent = "Saved receipt not found. Reload and try again."; }
                        return;
                    }
                    const serviceProvider = document.getElementById("receiptServiceProvider").value.trim();
                    if (!serviceProvider) { printWindow.close(); receiptStatus.textContent = "Enter the service provider's name first."; document.getElementById("receiptServiceProvider").focus(); return; }
                    receiptStatus.textContent = "Saving receipt…";
                    try {
                        const receipt = await apiRequest("/api/receipts", { method: "POST", body: JSON.stringify({ sourceType: source.source_type, sourceId: Number(source.source_id), serviceProvider }) });
                        receiptStatus.textContent = "Receipt saved. Use the print dialog to print or save it as a PDF.";
                        printReceipt(receipt, printWindow);
                        await loadReceipts();
                    } catch (error) { printWindow.close(); receiptStatus.textContent = error.message; }
                });
                receiptSourcesNode.appendChild(card);
            });
            receiptHistoryNode.replaceChildren();
            if (!receipts.length) receiptHistoryNode.innerHTML = "<p>No receipts issued yet.</p>";
            receipts.forEach(function(receipt) {
                const card = document.createElement("article");
                card.className = "document-history-card";
                card.innerHTML = `<div><strong>${escapeHtml(receipt.receipt_number)} · ${escapeHtml(receipt.snapshot?.sale?.customerName || "Walk-in customer")}</strong><small>${escapeHtml(dateText(receipt.created_at))} · ${escapeHtml(receipt.snapshot?.sale?.reference || "")}</small><small>Service provider: ${escapeHtml(receipt.service_provider)}</small></div><strong>${money(receipt.snapshot?.sale?.total)}</strong><button type="button">Print / PDF</button>`;
                card.querySelector("button").addEventListener("click", function() { const printWindow = openPrintWindow(); printReceipt(receipt, printWindow); });
                receiptHistoryNode.appendChild(card);
            });
        } catch (error) {
            receiptSourcesNode.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
            receiptHistoryNode.innerHTML = "<p>Could not load receipts.</p>";
        }
    };

    document.addEventListener("admin:view", function(event) {
        if (event.detail === "quotations") {
            if (!quoteRows.childElementCount) loadProducts().then(addQuoteItem).catch(error => { quoteStatus.textContent = error.message; });
            loadQuotations();
            loadStoreProfile().catch(error => { profileStatus.textContent = error.message; });
        }
        if (event.detail === "receipts") loadReceipts();
        if (event.detail === "settings") loadStoreProfile().catch(error => { profileStatus.textContent = error.message; });
    });
})();
