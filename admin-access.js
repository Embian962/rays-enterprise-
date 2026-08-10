(function () {
    function updateAdminAccess() {
        document.body.classList.toggle(
            "admin-authenticated",
            Boolean(sessionStorage.getItem("rays-admin-token"))
        );
    }

    updateAdminAccess();
    window.setInterval(updateAdminAccess, 250);
}());
