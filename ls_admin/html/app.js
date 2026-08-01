const menu = document.getElementById("menu");
const elBanner = document.getElementById("banner");
const elTitle = document.getElementById("title");
const elCounter = document.getElementById("counter");
const elBuild = document.getElementById("build");
const elIndicator = document.getElementById("indicator");
const elTabs = document.getElementById("tabs");
const elMetaRole = document.getElementById("metaRole");
const elMetaId = document.getElementById("metaId");
const elMetaAduty = document.getElementById("metaAduty");

function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildTab(item) {
    const tab = document.createElement("div");
    tab.className = "PTab" + (item.selected ? " Selected" : "");

    if (item.kind === "divider") {
        tab.innerHTML =
            '<div class="Divider"><div class="Left"></div>' +
            '<div class="Label">' + esc(item.label) + "</div>" +
            '<div class="Right"></div></div>';
        tab.classList.remove("Selected");
        return tab;
    }

    let right = "";
    if (item.kind === "checkbox") {
        right = '<div class="Checkbox' + (item.checked ? " Checked" : "") + '"><div class="Inside"></div></div>';
    } else if (item.kind === "scroll") {
        right = '<div class="Scrollable"><span class="Chev">&lt;</span>' +
            "<span>" + esc(item.value) + "</span>" +
            '<span class="Chev">&gt;</span></div>';
    } else if (item.kind === "submenu") {
        right = '<div class="PTArrow">&rsaquo;</div>';
    }

    tab.innerHTML = '<div class="PTLabel">' + esc(item.label) + "</div>" + right;
    return tab;
}

function render(data) {
    if (data.color) {
        document.documentElement.style.setProperty("--menu-color", data.color);
    }
    elBanner.textContent = data.banner || "ADMIN MENU";
    elTitle.textContent = data.title || "";
    elCounter.textContent = data.counter || "";
    elIndicator.textContent = data.counter || "";
    elBuild.textContent = data.build || "LS ADMIN";

    if (data.meta) {
        elMetaRole.textContent = data.meta.role || "-";
        elMetaId.textContent = data.meta.id != null ? data.meta.id : "-";
        elMetaAduty.textContent = data.meta.aduty || "AUS";
    }

    elTabs.innerHTML = "";
    let selectedEl = null;
    (data.items || []).forEach((item) => {
        const el = buildTab(item);
        if (item.selected && item.kind !== "divider") selectedEl = el;
        elTabs.appendChild(el);
    });

    if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
    }
}

window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || !data.action) return;

    if (data.action === "open") {
        menu.classList.remove("Hidden");
    } else if (data.action === "close") {
        menu.classList.add("Hidden");
    } else if (data.action === "render") {
        menu.classList.remove("Hidden");
        render(data);
    }
});
