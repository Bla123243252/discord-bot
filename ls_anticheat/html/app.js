const resource = () => (window.GetParentResourceName ? GetParentResourceName() : "ls_anticheat");

function nuiPost(endpoint, data) {
    return fetch(`https://${resource()}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(data || {}),
    }).then((r) => r.json()).catch(() => null);
}

const app = document.getElementById("app");
const modalOverlay = document.getElementById("modalOverlay");
const modalBox = document.getElementById("modalBox");

function closeModal() {
    modalOverlay.classList.add("hidden");
    modalBox.innerHTML = "";
}

function severityBadge(sev) {
    const cls = { info: "badge-info", warn: "badge-warn", high: "badge-high", critical: "badge-critical" }[sev] || "badge-info";
    return `<span class="badge ${cls}">${sev}</span>`;
}

// ── Modal: einfacher Text-Prompt (z.B. Grund/Dauer) ─────────────────────
function promptModal(title, fields, onSubmit) {
    modalBox.innerHTML = `
        <h2>${title}</h2>
        <div class="modal-sub"></div>
        <form id="promptForm">
            ${fields.map((f, i) => `<input type="text" name="f${i}" placeholder="${f}" autocomplete="off">`).join("")}
            <div class="modal-footer">
                <button type="button" class="btn" id="promptCancel">Abbrechen</button>
                <button type="submit" class="btn btn-primary">Bestätigen</button>
            </div>
        </form>
    `;
    modalOverlay.classList.remove("hidden");
    const form = document.getElementById("promptForm");
    document.getElementById("promptCancel").onclick = closeModal;
    form.onsubmit = (e) => {
        e.preventDefault();
        const values = fields.map((_, i) => form[`f${i}`].value.trim());
        closeModal();
        onSubmit(values);
    };
    form.querySelector("input") && form.querySelector("input").focus();
}

// ── Modal: Spieler-Aktionen (Goto/Bring/Spectate/Kick/Ban) ──────────────
function actionModal(title, license, extraButtons) {
    const builtins = [
        { label: "Zum Spieler teleportieren", key: "goto", onClick: () => { nuiPost("action", { action: "goto", license }); closeModal(); } },
        { label: "Spieler zu mir holen", key: "bring", onClick: () => { nuiPost("action", { action: "bring", license }); closeModal(); } },
        { label: "Spieler beobachten", key: "spectate", onClick: () => { nuiPost("action", { action: "spectate", license }); closeModal(); nuiPost("close"); } },
        { label: "Kicken", key: "kick", danger: true, onClick: () => {
            closeModal();
            promptModal("Kick-Grund", ["Grund"], ([reason]) => {
                if (!reason) return;
                nuiPost("action", { action: "kick", license, reason });
            });
        } },
        { label: "Bannen", key: "ban", danger: true, onClick: () => {
            closeModal();
            promptModal("Bannen", ["Dauer in Minuten oder 'permanent'", "Grund"], ([duration, reason]) => {
                if (!duration || !reason) return;
                nuiPost("action", { action: "ban", license, duration, reason });
            });
        } },
    ];
    const buttons = [...builtins, ...(extraButtons || [])];

    modalBox.innerHTML = `
        <h2>${title}</h2>
        <div class="modal-sub">${license}</div>
        <div class="modal-actions">
            ${buttons.map((b, i) => `<button class="btn ${b.danger ? "btn-danger" : ""}" data-idx="${i}">${b.label}</button>`).join("")}
            <button class="btn" id="modalClose">Schließen</button>
        </div>
    `;
    modalOverlay.classList.remove("hidden");
    document.getElementById("modalClose").onclick = closeModal;

    modalBox.querySelectorAll("[data-idx]").forEach((btn) => {
        btn.onclick = buttons[Number(btn.dataset.idx)].onClick;
    });
}

// ── Tabs ─────────────────────────────────────────────────────────────────
function showTab(tab) {
    document.querySelectorAll(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.tab === tab));
    document.querySelectorAll(".tab").forEach((el) => el.classList.toggle("active", el.id === `tab-${tab}`));
    if (tab === "players") loadPlayers();
    if (tab === "flags") loadFlags();
    if (tab === "bans") loadBans();
    if (tab === "whitelist") loadWhitelist();
}

document.querySelectorAll(".nav-item").forEach((el) => {
    el.addEventListener("click", () => showTab(el.dataset.tab));
});

document.getElementById("closeBtn").addEventListener("click", () => nuiPost("close"));

// ── Loaders ──────────────────────────────────────────────────────────────
function setDashboard(data) {
    document.getElementById("statPlayers").textContent = data.onlinePlayers ?? "-";
    document.getElementById("statFlags").textContent = data.openFlags ?? "-";
    document.getElementById("statBans").textContent = data.activeBans ?? "-";
}

async function loadPlayers() {
    const list = (await nuiPost("getPlayers")) || [];
    const el = document.getElementById("playerGrid");
    if (list.length === 0) {
        el.innerHTML = `<div class="empty-hint">Keine Spieler online.</div>`;
        return;
    }
    el.innerHTML = list.map((p) => `
        <div class="card" data-license="${p.license}" data-name="[${p.id}] ${p.name}">
            <div class="title">[${p.id}] ${p.name}</div>
            <div class="sub">${p.license || "?"}</div>
        </div>
    `).join("");
    el.querySelectorAll(".card").forEach((card) => {
        card.onclick = () => actionModal(card.dataset.name, card.dataset.license);
    });
}

async function loadFlags() {
    const list = (await nuiPost("getFlags")) || [];
    const el = document.getElementById("flagList");
    if (list.length === 0) {
        el.innerHTML = `<div class="empty-hint">Keine offenen Flags.</div>`;
        return;
    }
    el.innerHTML = list.map((f) => `
        <div class="row" data-flagid="${f.id}" data-license="${f.license}" data-module="${f.module}" data-name="${f.player_name || "?"}">
            <div>
                <div class="main-text">${severityBadge(f.severity)} &nbsp;${f.module} — ${f.player_name || "?"}</div>
                <div class="sub-text">${f.license} · ${f.created_at}</div>
            </div>
        </div>
    `).join("");
    el.querySelectorAll(".row").forEach((row) => {
        row.onclick = () => {
            const license = row.dataset.license;
            const flagId = row.dataset.flagid;
            const module_ = row.dataset.module;
            actionModal(row.dataset.name, license, [
                { label: "Als geprüft markieren", onClick: () => { nuiPost("action", { action: "review", flagId, license }); closeModal(); } },
                { label: "Für dieses Modul whitelisten", onClick: () => {
                    closeModal();
                    promptModal("Whitelist-Grund", ["Grund"], ([reason]) => {
                        if (!reason) return;
                        nuiPost("action", { action: "whitelist", license, module: module_, reason });
                    });
                } },
            ]);
        };
    });
}

async function loadBans() {
    const list = (await nuiPost("getBans")) || [];
    const el = document.getElementById("banList");
    if (list.length === 0) {
        el.innerHTML = `<div class="empty-hint">Keine aktiven Bans.</div>`;
        return;
    }
    el.innerHTML = list.map((b) => `
        <div class="card" style="cursor:default">
            <div class="title">${b.last_name || "?"}</div>
            <div class="sub">${b.license}</div>
            <div class="sub" style="margin-top:6px">Grund: ${b.reason}</div>
            <div class="sub">Von: ${b.banned_by} · ${b.banned_at}</div>
            <div class="sub">${b.expires_at ? "Läuft ab: " + b.expires_at : "Permanent"}</div>
            <button class="btn btn-danger" style="width:100%;margin-top:10px" data-license="${b.license}">Entbannen</button>
        </div>
    `).join("");
    el.querySelectorAll("[data-license]").forEach((btn) => {
        btn.onclick = async () => {
            await nuiPost("action", { action: "unban", license: btn.dataset.license });
            loadBans();
        };
    });
}

async function loadWhitelist() {
    const list = (await nuiPost("getWhitelist")) || [];
    const el = document.getElementById("whitelistList");
    if (list.length === 0) {
        el.innerHTML = `<div class="empty-hint">Keine aktiven Ausnahmen.</div>`;
        return;
    }
    el.innerHTML = list.map((w) => `
        <div class="row" style="cursor:default">
            <div>
                <div class="main-text">${w.license} — Modul: ${w.module || "ALLE"}</div>
                <div class="sub-text">${w.reason} · von ${w.added_by} (${w.added_at})</div>
            </div>
            <div class="row-actions">
                <button class="btn btn-danger" data-id="${w.id}">Entfernen</button>
            </div>
        </div>
    `).join("");
    el.querySelectorAll("[data-id]").forEach((btn) => {
        btn.onclick = async () => {
            await nuiPost("action", { action: "removeWhitelist", whitelistId: Number(btn.dataset.id) });
            loadWhitelist();
        };
    });
}

// ── NUI Message Handling ─────────────────────────────────────────────────
window.addEventListener("message", (e) => {
    const msg = e.data;
    if (msg.action === "open") {
        app.classList.remove("hidden");
        showTab("dashboard");
    } else if (msg.action === "close") {
        app.classList.add("hidden");
        closeModal();
    } else if (msg.action === "dashboard") {
        setDashboard(msg.data || {});
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (!modalOverlay.classList.contains("hidden")) {
            closeModal();
        } else {
            nuiPost("close");
        }
    }
});
