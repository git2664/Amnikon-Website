/* ==========================================================
   CONTACT FORM
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("contactForm");

    if (form) {

        const submitBtn = document.getElementById("submitBtn");
        const successMessage = document.getElementById("formSuccess");

        successMessage.hidden = true;

        form.addEventListener("input", (e) => {
            successMessage.hidden = true;
            if (typeof e.target.setCustomValidity === "function") {
                e.target.setCustomValidity("");
            }
        });

        form.addEventListener("invalid", () => {
            successMessage.hidden = true;
        }, true);

        form.addEventListener("submit", async (e) => {

            e.preventDefault();

            if (submitBtn.disabled) return;

            successMessage.hidden = true;

            // Native validation handles required fields and email format. Trim first
            // so whitespace-only names/messages cannot pass the required check.
            ["firstName", "lastName", "email", "company", "message"].forEach(id => {
                const field = document.getElementById(id);
                field.value = field.value.trim();
            });

            if (!form.reportValidity()) return;

            submitBtn.disabled = true;
            submitBtn.innerHTML = "Sending...";

            successMessage.hidden = true;

            const contactData = {

                firstName: document.getElementById("firstName").value.trim(),
                lastName: document.getElementById("lastName").value.trim(),
                email: document.getElementById("email").value.trim(),
                company: document.getElementById("company").value.trim(),
                service: document.getElementById("service").value,
                message: document.getElementById("message").value.trim()

            };

            try {

                contactData.submissionId = await AmnikonApi.submissionId("contact", contactData);
                const protectionHeaders = await AmnikonFormProtection.headers(form);

                const response = await fetch(AmnikonApi.endpoint("contact"), {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        ...protectionHeaders
                    },

                    body: JSON.stringify(contactData)

                });

                const result = await response.json();

                if (response.ok && (result.success === true || result.Success === true)) {

                    successMessage.hidden = false;
                    successMessage.replaceChildren();
            const heading = document.createElement("strong");
            heading.textContent = "Message received";
            const message = document.createElement("p");
            message.textContent = "Thank you for contacting AMNIKON. Our team will review your enquiry and get back to you within 3 business days.";
            successMessage.append(heading, message);
            if (result.submissionId) {
                const receipt = document.createElement("small");
                receipt.textContent = "Your enquiry reference: " + result.submissionId;
                successMessage.append(receipt);
            }

                    form.reset();
                    AmnikonApi.completeSubmission("contact");

                } else {

                    let fieldError = false;
                    if (result.errors && typeof result.errors === "object") {
                        Object.entries(result.errors).forEach(([key, messages]) => {
                            const id = ["firstName", "lastName", "email", "company", "service", "message"]
                                .find(name => name.toLowerCase() === key.toLowerCase());
                            if (!id) return;
                            const field = document.getElementById(id);
                            field.setCustomValidity(Array.isArray(messages) ? messages.join(" ") : String(messages));
                            fieldError = true;
                        });
                    }
                    if (fieldError) form.reportValidity();
                    else alert(AmnikonFormProtection.rejectionMessage(response, result, "We could not send your message. Please try again later."));

                }

            } catch (error) {

                console.error(error);

                alert(AmnikonFormProtection.errorMessage(error, "We could not confirm receipt. Your details have been kept. Please try again later."));

            } finally {
                AmnikonFormProtection.reset(form);

                submitBtn.disabled = false;

                submitBtn.innerHTML = "Send Message →";

            }

        });

    }


    /* ==========================================================
       GSAP HERO ANIMATION
    ========================================================== */

    const hero = document.querySelector(".contact-hero");

    if (!hero) return;

    // Keep the hero readable if an optional animation CDN is unavailable.
    if (typeof window.gsap === "undefined") {
        hero.querySelectorAll(".eyebrow, .hero-title span, p").forEach(element => {
            element.style.opacity = "1";
            element.style.transform = "none";
            element.style.filter = "none";
        });
        return;
    }

    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({

        defaults: {
            ease: "power4.out"
        }

    });


    /* Eyebrow */

    tl.from(".contact-hero .eyebrow", {

        y: 40,
        opacity: 0,
        duration: 0.8

    })


    /* Heading */

    .to(".hero-title span", {

        y: 0,
        opacity: 1,
        rotate: 0,
        filter: "blur(0px)",

        stagger: 0.08,

        duration: 1

    }, "-=0.3")


    /* Paragraph */

    .from(".contact-hero p", {

        y: 35,
        opacity: 0,
        duration: 0.8

    }, "-=0.5");


    /* ==========================================================
       Background Parallax
    ========================================================== */

    if (window.ScrollTrigger) {
        gsap.to(".contact-hero .container", {
            yPercent: -8,
            ease: "none",
            scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });
    }


    /* ==========================================================
       Decorative Rings
    ========================================================== */

    // Decorative pseudo-elements are CSS-only; targeting one with GSAP creates
    // selector warnings in browsers and does not animate the generated element.

});
