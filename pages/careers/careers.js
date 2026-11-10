"use strict";
document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector(".benefits-sidebar");
    const links = [...document.querySelectorAll(".benefit-link")];
    const panels = [...document.querySelectorAll(".benefit-panel")];
    if (!sidebar || !panels.length || links.length !== panels.length) return;
    sidebar.setAttribute("role", "navigation");
    sidebar.setAttribute("aria-label", "Explore our culture");
    const progress = sidebar.querySelector(".sidebar-progress");
    function setActive(index) {
        links.forEach((link, i) => {
            link.classList.toggle("active", i === index);
            if (i === index) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
    }
    function updateProgress(index) {
        if (!progress || !links[index]) return;
        progress.style.top = links[index].offsetTop + "px";
        progress.style.height = links[index].offsetHeight + "px";
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    links.forEach((link, index) => {
        link.setAttribute("aria-controls", panels[index].id);
        panels[index].hidden = false;
        panels[index].setAttribute("role", "region");
        const heading = panels[index].querySelector("h2");
        if (heading) {
            heading.id = panels[index].id + "-heading";
            panels[index].setAttribute("aria-labelledby", heading.id);
        }
        link.addEventListener("click", () => {
            panels[index].scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
        });
    });
    let scheduled = false;
    function update() {
        scheduled = false;
        const readingLine = Math.min(260, window.innerHeight * .35);
        let active = 0;
        panels.forEach((panel, index) => {
            if (panel.getBoundingClientRect().top <= readingLine) active = index;
        });
        setActive(active);
        updateProgress(active);
    }
    function schedule() {
        if (!scheduled) { scheduled = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
});
