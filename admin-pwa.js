(function setupAdminPwa() {
    let deferredPrompt = null;
    const installButton = document.getElementById("install-admin-app");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/admin-service-worker.js", { scope: "/" }).catch(function(error) { console.warn("Admin offline shell unavailable.", error); });
    window.addEventListener("beforeinstallprompt", function(event) {
        event.preventDefault();
        deferredPrompt = event;
        if (installButton) installButton.hidden = false;
    });
    installButton?.addEventListener("click", async function() {
        if (!deferredPrompt) return;
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