(function () {
    function updateAdminAccess() {
        const authenticated = Boolean(sessionStorage.getItem("rays-admin-token"));
        document.body.classList.toggle("admin-authenticated", authenticated);

        const loginPanel = document.getElementById("admin-login");
        if (loginPanel) loginPanel.hidden = authenticated;
    }

    updateAdminAccess();
    window.setInterval(updateAdminAccess, 250);
}());
