// Keep sign-in independent from the larger dashboard script so an unrelated
// admin UI error cannot cause the browser to submit the form as a plain GET.
(function setupAdminLogin() {
    const form = document.getElementById("adminLoginForm");
    const status = document.getElementById("adminLoginStatus");
    if (!form) return;

    form.addEventListener("submit", async function(event) {
        event.preventDefault();
        const button = form.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
        if (status) status.textContent = "Connecting to the sign-in service…";

        const controller = new AbortController();
        const timeout = window.setTimeout(function() { controller.abort(); }, 60000);
        try {
            const apiUrl = (window.RAYS_API_URL || "").replace(/\/$/, "");
            const response = await fetch(apiUrl + "/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    username: document.getElementById("adminUsername").value.trim(),
                    // Passwords are exact strings; whitespace may be intentional.
                    password: document.getElementById("adminPassword").value
                })
            });

            const responseText = await response.text();
            let body = {};
            try { body = responseText ? JSON.parse(responseText) : {}; } catch (error) { /* use status-specific feedback */ }

            if (!response.ok) {
                if (body.error) throw new Error(body.error);
                if (response.status === 401) throw new Error("The username or password was not accepted. Check spelling and try again.");
                if (response.status === 503) throw new Error("The sign-in service is temporarily unavailable or not configured. Please contact the site administrator.");
                if (response.status >= 500) throw new Error("The sign-in service had a server error (" + response.status + "). Please try again shortly.");
                throw new Error("The sign-in service returned an unexpected response (" + response.status + "). Please try again.");
            }
            if (!body.token) throw new Error("The sign-in service did not return a session token.");

            sessionStorage.setItem("rays-admin-token", body.token);
            document.getElementById("adminPassword").value = "";
            if (status) status.textContent = "Signed in. Opening the admin dashboard…";
            window.location.reload();
        } catch (error) {
            const message = error && error.name === "AbortError"
                ? "The sign-in request timed out while waiting for the server. Check your connection and try again."
                : error instanceof TypeError
                    ? "Could not reach the sign-in service. Check your internet connection and reload the admin page."
                    : (error && error.message) || "Sign-in failed unexpectedly. Please try again.";
            if (status) status.textContent = message;
        } finally {
            window.clearTimeout(timeout);
            if (button) button.disabled = false;
        }
    });
})();
