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
    const pdfSafeText = function(value) {
        return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "?");
    };
    const pdfEscape = function(value) { return pdfSafeText(value).replace(/([\\()])/g, "\\$1"); };
    const pdfWrap = function(value, maxLength) {
        const words = pdfSafeText(value).split(/\s+/).filter(Boolean);
        const lines = [];
        let line = "";
        words.forEach(function(word) {
            while (word.length > maxLength) {
                if (line) { lines.push(line); line = ""; }
                lines.push(word.slice(0, maxLength));
                word = word.slice(maxLength);
            }
            if (line && (line + " " + word).length > maxLength) { lines.push(line); line = word; }
            else line = line ? line + " " + word : word;
        });
        if (line) lines.push(line);
        return lines.length ? lines : [""];
    };
    const buildPdfFile = function(doc) {
        const pages = [];
        let commands = [];
        let y = 0;
        const text = function(x, baseline, value, size, bold) {
            commands.push(`BT /${bold ? "F2" : "F1"} ${size || 10} Tf ${x} ${baseline} Td (${pdfEscape(value)}) Tj ET`);
        };
        const line = function(x1, y1, x2, y2) { commands.push(`0.72 w ${x1} ${y1} m ${x2} ${y2} l S`); };
        const startPage = function(first) {
            commands = [];
            pages.push(commands);
            y = 792;
            const store = doc.store || {};
            text(46, y, store.name || "Ray's Enterprise", 18, true);
            y -= 18;
            [store.address, store.phone && `Tel: ${store.phone}`, store.email && `Email: ${store.email}`].filter(Boolean).forEach(function(value) {
                pdfWrap(value, 88).forEach(function(part) { text(46, y, part, 9, false); y -= 12; });
            });
            y -= 4;
            line(46, y, 549, y);
            y -= 27;
            text(46, y, `${doc.kind} ${doc.number}${first ? "" : " (continued)"}`, 16, true);
            text(380, y, dateText(doc.date), 9, false);
            y -= 25;
            if (first) {
                text(46, y, `Customer: ${doc.customer?.name || "Walk-in customer"}`, 10, true);
                y -= 15;
                if (doc.customer?.phone) { text(46, y, `Phone: ${doc.customer.phone}`, 9, false); y -= 13; }
                if (doc.customer?.email) { text(46, y, `Email: ${doc.customer.email}`, 9, false); y -= 13; }
                text(320, y + (doc.customer?.phone || doc.customer?.email ? 28 : 0), `Service provider: ${doc.provider || ""}`, 9, false);
                if (doc.reference) text(320, y + (doc.customer?.phone || doc.customer?.email ? 14 : -13), `Reference: ${doc.reference}`, 9, false);
                if (doc.paymentMethod) text(320, y, `Payment: ${doc.paymentMethod}`, 9, false);
                if (doc.paymentStatus) text(320, y - 13, `Status: ${doc.paymentStatus}`, 9, false);
                y -= 18;
            }
            text(46, y, "Product", 9, true);
            text(345, y, "Qty", 9, true);
            text(390, y, "Unit price", 9, true);
            text(482, y, "Amount", 9, true);
            y -= 8;
            line(46, y, 549, y);
            y -= 17;
        };
        const ensureSpace = function(height) {
            if (y - height < 60) startPage(false);
        };
        startPage(true);
        (Array.isArray(doc.items) ? doc.items : []).forEach(function(item) {
            const quantity = Number(item.quantity) || 0;
            const unit = Number(item.unitPrice ?? item.price) || 0;
            const amount = Number(item.lineTotal) || quantity * unit;
            const nameLines = pdfWrap(item.productName || item.name || "Product", 43);
            const rowHeight = nameLines.length * 14 + 8;
            ensureSpace(rowHeight);
            nameLines.forEach(function(part, index) { text(46, y - index * 13, part, 9, false); });
            text(345, y, String(quantity), 9, false);
            text(390, y, money(unit), 9, false);
            text(482, y, money(amount), 9, false);
            y -= rowHeight;
            line(46, y + 4, 549, y + 4);
        });
        ensureSpace(44);
        y -= 12;
        text(390, y, `Total: ${money(doc.total)}`, 13, true);
        y -= 25;
        if (doc.paymentMethod) { ensureSpace(18); text(46, y, `Payment method: ${doc.paymentMethod}`, 9, false); y -= 14; }
        if (doc.paymentStatus) { ensureSpace(18); text(46, y, `Payment status: ${doc.paymentStatus}`, 9, false); y -= 14; }
        if (doc.notes) {
            ensureSpace(32);
            text(46, y, "Notes / terms", 10, true);
            y -= 14;
            pdfWrap(doc.notes, 88).forEach(function(part) { ensureSpace(14); text(46, y, part, 9, false); y -= 13; });
        }
        ensureSpace(35);
        y -= 12;
        line(46, y, 549, y);
        text(46, y - 16, `Thank you for choosing ${(doc.store || {}).name || "Ray's Enterprise"}.`, 9, false);
        pages.forEach(function(page, index) { text(500, 28, `Page ${index + 1} of ${pages.length}`, 8, false); });

        const objects = [];
        objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
        const pageIds = pages.map((_, index) => 5 + index * 2);
        objects[1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
        objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
        objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
        pages.forEach(function(page, index) {
            const pageId = 5 + index * 2;
            const streamId = pageId + 1;
            const stream = page.join("\n");
            objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`;
            objects[streamId - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
        });
        let pdf = "%PDF-1.4\n";
        const offsets = [0];
        objects.forEach(function(object, index) { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
        const xrefOffset = pdf.length;
        pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
        offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, "0")} 00000 n \n`; });
        pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
        const bytes = Uint8Array.from(pdf, character => character.charCodeAt(0));
        const filename = `${doc.kind}-${doc.number}`.replace(/[^a-z0-9_-]+/gi, "-") + ".pdf";
        return new File([bytes], filename, { type: "application/pdf" });
    };
    const savePdfFile = function(file) {
        const url = URL.createObjectURL(file);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
    };
    const makeDocumentActions = function(doc, printHandler, statusNode) {
        const actions = document.createElement("div");
        actions.className = "document-actions";
        actions.innerHTML = '<button type="button" class="document-print-action">Print / PDF</button><button type="button" class="document-save-share-action">Save &amp; Share PDF</button><div class="document-pdf-options" hidden><button type="button" class="document-save-pdf-action">Save PDF</button><button type="button" class="document-share-pdf-action">Share PDF</button></div>';
        actions.querySelector(".document-print-action").addEventListener("click", printHandler);
        const options = actions.querySelector(".document-pdf-options");
        let file = null;
        actions.querySelector(".document-save-share-action").addEventListener("click", function() {
            try {
                file = buildPdfFile(doc);
                options.hidden = false;
                statusNode.textContent = `${file.name} is ready. Save it or share the PDF file.`;
            } catch (error) { statusNode.textContent = `Could not create the PDF: ${error.message}`; }
        });
        actions.querySelector(".document-save-pdf-action").addEventListener("click", function() {
            if (!file) return;
            savePdfFile(file);
            statusNode.textContent = `${file.name} downloaded.`;
        });
        actions.querySelector(".document-share-pdf-action").addEventListener("click", async function() {
            if (!file) return;
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file], title: `${doc.kind} ${doc.number}`, text: `${doc.kind} ${doc.number} from ${(doc.store || {}).name || "Ray's Enterprise"}` });
                    statusNode.textContent = "The PDF was shared using the device share menu.";
                } catch (error) {
                    if (error.name === "AbortError") statusNode.textContent = "Sharing cancelled. The PDF is still ready to save or share.";
                    else statusNode.textContent = `Could not open file sharing: ${error.message}`;
                }
                return;
            }
            savePdfFile(file);
            statusNode.textContent = "This browser cannot share PDF files directly. The PDF was downloaded; attach it in WhatsApp or Email.";
        });
        return actions;
    };
    const formatQuote = function(quote) {
        const id = quote.quotation_number || "Q-" + String(quote.id).padStart(6, "0");
        const items = Array.isArray(quote.items) ? quote.items : [];
        const row = document.createElement("article");
        row.className = "document-history-card";
        row.innerHTML = `<div><strong>${escapeHtml(id)} · ${escapeHtml(quote.customer_name)}</strong><small>${escapeHtml(dateText(quote.created_at))} · ${items.length} item${items.length === 1 ? "" : "s"}</small><small>Service provider: ${escapeHtml(quote.service_provider)}</small></div><strong>${money(quote.total)}</strong>`;
        const doc = { kind: "Quotation", number: id, date: quote.created_at, customer: { name: quote.customer_name, phone: quote.customer_phone, email: quote.customer_email }, provider: quote.service_provider, items, total: quote.total, notes: quote.notes, store: quote.store_profile || window.currentStoreProfile };
        row.appendChild(makeDocumentActions(doc, function() {
            const printWindow = openPrintWindow();
            writePrintWindow(printWindow, printableHtml("Quotation", id, quote.store_profile || window.currentStoreProfile, { name: quote.customer_name, phone: quote.customer_phone, email: quote.customer_email }, quote.service_provider, items, quote.total, { date: quote.created_at, notes: quote.notes }));
        }, quoteStatus));
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
        const searchId = "quoteProductSearch" + Math.random().toString(36).slice(2);
        row.innerHTML = `<div class="quote-product-picker"><label for="${searchId}">Search products</label><div class="quote-product-search-controls"><input class="quote-product-search" id="${searchId}" type="search" placeholder="Type a product name or ID" autocomplete="off"><button class="quote-product-search-button" type="button">Search</button></div><label>Product<select class="quote-product" required><option value="">Select a product</option></select></label><p class="quote-product-search-status" role="status" aria-live="polite"></p></div><label>Quantity<input class="quote-quantity" type="number" min="1" step="1" value="1" required></label><label>Unit price (KSh)<input class="quote-price" type="number" min="0" step="0.01" required></label><strong class="quote-line-total">KSh 0</strong><button class="remove-quote-item" type="button" aria-label="Remove product">Remove</button>`;
        const search = row.querySelector(".quote-product-search");
        const select = row.querySelector(".quote-product");
        const status = row.querySelector(".quote-product-search-status");
        const filterProducts = function() {
            const query = search.value.trim().toLocaleLowerCase();
            const selectedId = select.value;
            const matches = productOptions.filter(product => String(product.name || "").toLocaleLowerCase().includes(query) || String(product.id).toLocaleLowerCase().includes(query));
            const selectedProduct = productOptions.find(product => String(product.id) === selectedId);
            const visibleProducts = selectedProduct && !matches.some(product => String(product.id) === selectedId) ? [selectedProduct, ...matches] : matches;
            select.replaceChildren(new Option("Select a product", ""));
            visibleProducts.forEach(product => select.add(new Option(`${product.name} · ${money(product.price)}`, String(product.id))));
            select.value = selectedId;
            status.textContent = query ? `${matches.length} product${matches.length === 1 ? "" : "s"} found.` : `${productOptions.length} products available.`;
        };
        filterProducts();
        row.querySelector(".quote-product-search-button").addEventListener("click", filterProducts);
        search.addEventListener("input", filterProducts);
        search.addEventListener("keydown", function(event) { if (event.key === "Enter") { event.preventDefault(); filterProducts(); select.focus(); } });
        select.addEventListener("change", function(event) {
            const product = productOptions.find(item => String(item.id) === event.target.value);
            row.querySelector(".quote-price").value = product?.price ?? "";
            search.value = "";
            filterProducts();
            updateQuoteTotal();
        });
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
        quoteStatus.textContent = "Saving quotation…";
        const submit = document.getElementById("saveQuotationButton");
        submit.disabled = true;
        const formData = new FormData(quoteForm);
        const items = Array.from(quoteRows.querySelectorAll(".document-item-row")).map(function(row) {
            return { productId: Number(row.querySelector(".quote-product").value), quantity: Number(row.querySelector(".quote-quantity").value), unitPrice: Number(row.querySelector(".quote-price").value) };
        });
        try {
            const quote = await apiRequest("/api/quotations", { method: "POST", body: JSON.stringify({ customerName: formData.get("customerName"), customerPhone: formData.get("customerPhone"), customerEmail: formData.get("customerEmail"), serviceProvider: formData.get("serviceProvider"), notes: formData.get("notes"), items }) });
            quoteStatus.textContent = "Quotation saved. Choose Print / PDF, WhatsApp, or Email from the saved quotation.";
            quoteForm.reset(); quoteRows.replaceChildren(); addQuoteItem(); updateQuoteTotal(); await loadQuotations();
        } catch (error) { quoteStatus.textContent = error.message; }
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
                card.innerHTML = `<div><strong>${escapeHtml(source.reference)} · ${escapeHtml(source.customer_name || "Walk-in customer")}</strong><small>${escapeHtml(dateText(source.created_at))} · ${escapeHtml(source.payment_method || "")}</small><small>${escapeHtml(itemSummary)}</small></div><strong>${money(source.total)}</strong><button type="button" class="receipt-source-action">${source.receipt_id ? "Open saved receipt" : "Create receipt"}</button>`;
                card.querySelector("button").addEventListener("click", async function() {
                    if (source.receipt_id) {
                        const receipt = receipts.find(item => String(item.id) === String(source.receipt_id));
                        if (receipt) { receiptStatus.textContent = "Use the actions beside the issued receipt to print or send it."; receiptHistoryNode.scrollIntoView({ behavior: "smooth", block: "nearest" }); } else receiptStatus.textContent = "Saved receipt not found. Reload and try again.";
                        return;
                    }
                    const serviceProvider = document.getElementById("receiptServiceProvider").value.trim();
                    if (!serviceProvider) { receiptStatus.textContent = "Enter the service provider's name first."; document.getElementById("receiptServiceProvider").focus(); return; }
                    receiptStatus.textContent = "Saving receipt…";
                    try {
                        const receipt = await apiRequest("/api/receipts", { method: "POST", body: JSON.stringify({ sourceType: source.source_type, sourceId: Number(source.source_id), serviceProvider }) });
                        receiptStatus.textContent = "Receipt saved. Choose Print / PDF, WhatsApp, or Email from the issued receipt.";
                        await loadReceipts();
                    } catch (error) { receiptStatus.textContent = error.message; }
                });
                receiptSourcesNode.appendChild(card);
            });
            receiptHistoryNode.replaceChildren();
            if (!receipts.length) receiptHistoryNode.innerHTML = "<p>No receipts issued yet.</p>";
            receipts.forEach(function(receipt) {
                const card = document.createElement("article");
                card.className = "document-history-card";
                card.innerHTML = `<div><strong>${escapeHtml(receipt.receipt_number)} · ${escapeHtml(receipt.snapshot?.sale?.customerName || "Walk-in customer")}</strong><small>${escapeHtml(dateText(receipt.created_at))} · ${escapeHtml(receipt.snapshot?.sale?.reference || "")}</small><small>Service provider: ${escapeHtml(receipt.service_provider)}</small></div><strong>${money(receipt.snapshot?.sale?.total)}</strong>`;
                const snapshot = receipt.snapshot || {};
                const doc = { kind: "Receipt", number: receipt.receipt_number, date: snapshot.sale?.createdAt || receipt.created_at, customer: { name: snapshot.sale?.customerName, phone: snapshot.sale?.customerPhone, email: snapshot.sale?.customerEmail }, provider: snapshot.serviceProvider || receipt.service_provider, items: snapshot.sale?.items, total: snapshot.sale?.total, reference: snapshot.sale?.reference, paymentMethod: snapshot.sale?.paymentMethod, paymentStatus: snapshot.sale?.paymentStatus, store: snapshot.store };
                card.appendChild(makeDocumentActions(doc, function() { const printWindow = openPrintWindow(); printReceipt(receipt, printWindow); }, receiptStatus));
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
