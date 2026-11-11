"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector("#culture .benefits-sidebar");
    const tabs = [...document.querySelectorAll("#culture .benefit-link")];
    const panels = [...document.querySelectorAll("#culture .benefit-panel")];
    if (!sidebar || tabs.length !== panels.length || !tabs.length) return;

    sidebar.setAttribute("role", "tablist");
    sidebar.setAttribute("aria-label", "Explore our culture");

    function selectTab(index, focus = false) {
        tabs.forEach((tab, i) => {
            const selected = i === index;
            tab.classList.toggle("active", selected);
            tab.setAttribute("aria-selected", String(selected));
            tab.tabIndex = selected ? 0 : -1;
            panels[i].hidden = !selected;
        });
        if (focus) tabs[index].focus();
    }

    tabs.forEach((tab, index) => {
        tab.id = `culture-tab-${index}`;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", panels[index].id);
        panels[index].setAttribute("role", "tabpanel");
        panels[index].setAttribute("aria-labelledby", tab.id);
        tab.addEventListener("click", () => selectTab(index));
        tab.addEventListener("keydown", (event) => {
            let next = index;
            if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
            else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = tabs.length - 1;
            else return;
            event.preventDefault();
            selectTab(next, true);
        });
    });

    selectTab(0);
});
