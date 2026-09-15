(function setupAdminPwa() {
    let deferredPrompt = null;
    const installButton = document.getElementById("install-admin-app");
    if (installButton && window.matchMedia("(display-mode: standalone)").matches) installButton.hidden = true;
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/admin-service-worker.js", { scope: "/" }).catch(function(error) { console.warn("Admin offline shell unavailable.", error); });
    window.addEventListener("beforeinstallprompt", function(event) {
        event.preventDefault();
        deferredPrompt = event;
        if (installButton) installButton.hidden = false;
    });
    installButton?.addEventListener("click", async function() {
        if (!deferredPrompt) {
            let help = document.getElementById("admin-install-help");
            if (!help) {
                help = document.createElement("div");
                help.id = "admin-install-help";
                help.setAttribute("role", "dialog");
                help.innerHTML = "<div class=\"admin-install-help-card\"><button type=\"button\" aria-label=\"Close\">×</button><h2>Install the admin app</h2><p>On Chrome or Edge, open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p><p>On iPhone, open this page in Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</p></div>";
                document.body.appendChild(help);
                help.querySelector("button").addEventListener("click", function() { help.remove(); });
            }
            help.querySelector("button")?.focus();
            return;
        }
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === "accepted") installButton.hidden = true;
        deferredPrompt = null;
    });
    window.addEventListener("appinstalled", function() {
        deferredPrompt = null;
        if (installButton) installButton.hidden = true;
    });
})();