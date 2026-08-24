document.querySelectorAll("[data-image-dialog]").forEach((trigger) => {
    const dialogId = trigger.dataset.imageDialog;
    const dialog = document.getElementById(dialogId);

    if (!dialog) {
        return;
    }

    const closeButton = dialog.querySelector("[data-dialog-close]");

    trigger.addEventListener("click", () => {
        dialog.showModal();
    });

    if (closeButton) {
        closeButton.addEventListener("click", () => {
            dialog.close();
        });
    }

    dialog.addEventListener("click", (event) => {
        const rect = dialog.getBoundingClientRect();

        const clickedOutside =
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom;

        if (clickedOutside) {
            dialog.close();
        }
    });
});