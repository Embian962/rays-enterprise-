(function () {
    const originalFetch = window.fetch.bind(window);

    window.fetch = function (input, options) {
        const token = sessionStorage.getItem("rays-admin-token");
        const url = typeof input === "string" ? input : input && input.url;

        if (token && url && url.includes("/api/")) {
            const headers = new Headers(options && options.headers);
            headers.set("X-Admin-Token", token);
            return originalFetch(input, { ...(options || {}), headers });
        }

        return originalFetch(input, options);
    };

    function updateAdminAccess() {
        const authenticated = Boolean(sessionStorage.getItem("rays-admin-token"));
        document.body.classList.toggle("admin-authenticated", authenticated);

        const loginPanel = document.getElementById("admin-login");
        if (loginPanel) loginPanel.hidden = authenticated;
    }

    updateAdminAccess();
    window.setInterval(updateAdminAccess, 250);
}());
