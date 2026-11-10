// Keep the edit dialog closed by default and make its close control independent
// from the larger dashboard script.
(function setupAdminEditorControls() {
    const section = document.getElementById("edit-section");
    const cancelButton = document.getElementById("cancelEditButton");

    function closeEditor() {
        if (section) {
            section.hidden = true;
            section.style.display = "none";
        }
        document.body.classList.remove("edit-editor-open");
        document.body.style.overflow = "";
    }

    window.cancelEdit = closeEditor;
    if (cancelButton) cancelButton.addEventListener("click", closeEditor);
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape" && section && !section.hidden) closeEditor();
    });
})();
