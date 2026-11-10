(function () {
    const form = document.getElementById("resume-form");
    if (!form) return;
    const submitButton = form.querySelector("button[type='submit']");
    const status = document.getElementById("resume-status");

    function showStatus(message, state) {
        status.textContent = message;
        status.className = "resume-status " + state;
        status.hidden = false;
        if (state === "error") status.focus();
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (submitButton.disabled || !form.reportValidity()) return;
        const formData = new FormData(form);
        const resume = formData.get("Resume");
        if (resume instanceof File && (resume.size > 5 * 1024 * 1024 || !/\.(pdf|doc|docx)$/i.test(resume.name))) {
            showStatus("Please upload a PDF, DOC or DOCX resume no larger than 5 MB. Your other details have been kept.", "error");
            return;
        }
        if (!String(formData.get("FullName") || "").trim()) {
            showStatus("Please enter your full name before submitting your resume.", "error");
            return;
        }
        submitButton.disabled = true;
        submitButton.innerText = "Submitting...";
        form.setAttribute("aria-busy", "true");
        showStatus("Submitting your resume. Please wait…", "pending");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000);

        try {
            formData.set("SubmissionId", await AmnikonApi.submissionId("careers", formData));
            const protectionHeaders = await AmnikonFormProtection.headers(form);
            const response = await fetch(AmnikonApi.endpoint("careers"), {
                method: "POST", body: formData, headers: protectionHeaders, signal: controller.signal
            });
            const result = await response.json();
            if (!response.ok || !(result?.success === true || result?.Success === true)) {
                const errors = response.status === 400 && result?.errors
                    ? Object.values(result.errors).flat().join(" ") : "";
                showStatus(errors || AmnikonFormProtection.rejectionMessage(response, result, "We could not confirm receipt of your resume. Your details have been kept. Please check the form and try again later."), "error");
                return;
            }
            showStatus("Your resume has been received and is being processed.", "success");
            form.reset();
            AmnikonApi.completeSubmission("careers");
        } catch (error) {
            showStatus(AmnikonFormProtection.errorMessage(error, "We could not confirm receipt of your resume" +
                (error.name === "AbortError" ? " because the request timed out. " : ". ") +
                "Your details have been kept. Please try again later."), "error");
        } finally {
            AmnikonFormProtection.reset(form);
            clearTimeout(timeout);
            submitButton.disabled = false;
            submitButton.innerText = "Submit Resume";
            form.setAttribute("aria-busy", "false");
        }
    });
})();
