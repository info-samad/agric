(() => {
    const form = document.getElementById("consultationDemoForm");
    const previewButton = document.getElementById("demoPreviewButton");
    const feedback = document.getElementById("demoFeedback");

    if (!form || !previewButton || !feedback) return;

    const showDemoNotice = () => {
        if (!form.reportValidity()) return;
        feedback.textContent = "هذه معاينة شكلية فقط؛ لم تُحفظ أي بيانات ولم تُرسل إلى أي جهة.";
        feedback.hidden = false;
        feedback.focus();
    };

    previewButton.addEventListener("click", showDemoNotice);
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        showDemoNotice();
    });
    form.addEventListener("reset", () => {
        feedback.hidden = true;
        feedback.textContent = "";
    });
})();
