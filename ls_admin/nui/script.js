/* ═══ LS ADMIN - ADuty-Namensschilder ═══ */
const container = document.getElementById('tags');
const elements = {}; // [serverId] = DOM-Element

function escapeHtml(s) {
    return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg.action !== 'adutyTags') return;

    const seen = {};
    (msg.tags || []).forEach((t) => {
        seen[t.id] = true;
        let el = elements[t.id];
        if (!el) {
            el = document.createElement('div');
            el.className = 'tag';
            el.innerHTML = `
                <div class="badge">
                    <div class="role"><span class="diamond">◆</span><span class="role-label"></span></div>
                    <div class="name"></div>
                </div>`;
            container.appendChild(el);
            elements[t.id] = el;
        }
        // Inhalt nur bei Aenderung anfassen (weniger DOM-Arbeit pro Frame)
        const labelEl = el.querySelector('.role-label');
        const nameEl = el.querySelector('.name');
        if (labelEl.textContent !== t.label) labelEl.textContent = t.label;
        if (nameEl.textContent !== t.name) nameEl.textContent = t.name;
        const c = t.color || [255, 255, 255];
        el.querySelector('.diamond').style.color = `rgb(${c[0]},${c[1]},${c[2]})`;

        el.style.left = (t.x * 100) + 'vw';
        el.style.top = (t.y * 100) + 'vh';
        el.style.transform = `translate(-50%, -100%) scale(${t.scale || 1})`;
    });

    // nicht mehr sichtbare Tags entfernen
    Object.keys(elements).forEach((id) => {
        if (!seen[id]) {
            elements[id].remove();
            delete elements[id];
        }
    });
});
