/* ═══ LS PERSONAL-MENÜ - NUI-Logik (Dunya-Listen-Stil) ═══
   Navigation: Maus (Hover/Klick) UND Pfeiltasten + Enter,
   Backspace = zurück, ESC = zurück/schließen. */
const $ = (id) => document.getElementById(id);

/* FiveM liefert LEERE Lua-Tables als {} (Objekt) statt [] -> normalisieren (Erkenntnis #18) */
const toArr = (v) => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + Number(n || 0).toLocaleString('de-DE');

function post(name, data) {
    fetch(`https://${GetParentResourceName()}/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(data || {}),
    });
}

let D = {};          // Server-Daten
let view = 'main';   // aktuelle Seite
let sel = 0;         // ausgewählter Index

/* ── Seiten-Definitionen ────────────────────────────────────────────
   Zeile: { lbl, sub?, val?, valClass?, badge?, arrow?, action?, back? }
   action = Funktion bei Enter/Klick; back = zurück zum Hauptmenü      */
function buildRows() {
    const idn = D.identity || {};
    const fullName = ((idn.firstName || '') + ' ' + (idn.lastName || '')).trim() || D.name || '-';

    if (view === 'main') {
        return {
            sub: 'Job: ' + (D.job || 'Unbekannt') + (D.grade ? ' · ' + D.grade : ''),
            rows: [
                { lbl: 'Brieftasche', arrow: true, action: () => go('wallet') },
                { lbl: 'Fahrzeug', arrow: true, action: () => go('cars') },
                { lbl: 'Einstellungen', arrow: true, action: () => go('settings') },
                { lbl: 'VIP', arrow: true, action: () => go('vip') },
                { lbl: 'Ausweis & Dokumente', arrow: true, action: () => go('id') },
            ],
        };
    }

    if (view === 'wallet') {
        const rows = [
            { lbl: '‹ Zurück', back: true },
            { lbl: 'Bargeld', val: money(D.money) },
            { lbl: 'Bank', val: money(D.bank) },
            { lbl: 'Schwarzgeld', val: money(D.black), valClass: 'black' },
        ];
        /* Dokumente über jsfour-idcard (nur wenn Ressource läuft) */
        if (D.idcard) {
            rows.push(
                { lbl: 'Personalausweis', sub: 'Ansehen', arrow: true, action: () => post('idcard', { show: false }) },
                { lbl: 'Personalausweis zeigen', sub: 'An den nächsten Spieler', arrow: true, action: () => post('idcard', { show: true }) },
                { lbl: 'Führerschein', sub: 'Ansehen', arrow: true, action: () => post('idcard', { type: 'driver', show: false }) },
                { lbl: 'Führerschein zeigen', sub: 'An den nächsten Spieler', arrow: true, action: () => post('idcard', { type: 'driver', show: true }) },
                { lbl: 'Waffenschein', sub: 'Ansehen', arrow: true, action: () => post('idcard', { type: 'weapon', show: false }) },
                { lbl: 'Waffenschein zeigen', sub: 'An den nächsten Spieler', arrow: true, action: () => post('idcard', { type: 'weapon', show: true }) },
            );
        }
        return { sub: 'Brieftasche', rows };
    }

    if (view === 'cars') {
        const cars = toArr(D.vehicles);
        const rows = [{ lbl: '‹ Zurück', back: true }];
        if (cars.length) {
            for (const v of cars) {
                rows.push({
                    lbl: v.label || 'Unbekannt',
                    sub: v.plate,
                    badge: v.stored ? { txt: 'IN GARAGE', cls: 'in' } : { txt: 'DRAUSSEN', cls: 'out' },
                });
            }
        } else {
            rows.push({ lbl: 'Keine Fahrzeuge vorhanden.' });
        }
        return { sub: 'Fahrzeug', rows };
    }

    if (view === 'settings') {
        const s = D.settings || {};
        const colors = toArr(s.colors);
        const cur = colors.find((c) => c.key === s.color) || colors[0] || {};
        return {
            sub: 'Einstellungen',
            rows: [
                { lbl: '‹ Zurück', back: true },
                { lbl: 'Map-Fehler fixen', sub: 'Lädt die Welt um dich neu', arrow: true, action: () => post('mapfix') },
                { lbl: 'Kino-Modus', sub: 'Blendet das komplette HUD aus', val: s.kino ? 'AN' : 'AUS', valClass: s.kino ? 'on' : '', action: () => { s.kino = !s.kino; post('setting', { what: 'kino' }); render(); } },
                { lbl: 'Killdot Farbe', sub: 'Punkt in der Bildschirmmitte', dot: cur.rgb, val: cur.label || '-', action: () => go('killdotcolor') },
            ],
        };
    }

    if (view === 'killdotcolor') {
        const s = D.settings || {};
        const rows = [{ lbl: '‹ Zurück', back: true }];
        for (const c of toArr(s.colors)) {
            rows.push({
                lbl: c.label,
                dot: c.rgb,
                val: c.key === s.color ? 'Aktiv' : undefined,
                valClass: c.key === s.color ? 'on' : '',
                action: () => { s.color = c.key; post('setting', { what: 'killdotcolor', color: c.key }); go('settings'); },
            });
        }
        return { sub: 'Killdot Farbe', rows };
    }

    if (view === 'vip') {
        return {
            sub: 'VIP',
            rows: [
                { lbl: '‹ Zurück', back: true },
                { lbl: 'Status', val: D.vip ? 'VIP AKTIV' : 'KEIN VIP' },
                { lbl: 'Gruppe', val: D.group || '-' },
            ],
        };
    }

    if (view === 'id') {
        const rows = [
            { lbl: '‹ Zurück', back: true },
            { lbl: 'Name', val: fullName },
            { lbl: 'Geburtsdatum', val: idn.dob || '-' },
            { lbl: 'Geschlecht', val: idn.sex === 'f' ? 'Weiblich' : (idn.sex === 'm' ? 'Männlich' : '-') },
            { lbl: 'Größe', val: idn.height ? idn.height + ' cm' : '-' },
            { lbl: 'Beschäftigung', val: (D.job || '-') + (D.grade ? ' · ' + D.grade : '') },
            { lbl: 'Server-ID', val: D.serverId },
        ];
        const lics = toArr(D.licenses);
        if (lics.length) {
            for (const l of lics) rows.push({ lbl: 'Lizenz', val: l.label || l.type });
        } else {
            rows.push({ lbl: 'Lizenzen', val: 'Keine' });
        }
        return { sub: 'Ausweis & Dokumente', rows };
    }

    return { sub: '', rows: [] };
}

/* Eltern-Seite pro View (für Zurück/Backspace/ESC) */
const PARENT = { wallet: 'main', cars: 'main', settings: 'main', vip: 'main', id: 'main', killdotcolor: 'settings' };

function go(v) { view = v; sel = 0; render(); }

/* ── Rendering ──────────────────────────────────────────────────────── */
let current = { rows: [] };

function render() {
    current = buildRows();
    if (sel >= current.rows.length) sel = Math.max(0, current.rows.length - 1);

    $('subtitle').textContent = current.sub;
    $('counter').textContent = (sel + 1) + '/' + current.rows.length;

    $('rows').innerHTML = current.rows.map((r, i) => {
        const clickable = !!(r.action || r.back);
        let right = '';
        if (r.badge) right = `<span class="badge ${r.badge.cls}">${esc(r.badge.txt)}</span>`;
        else {
            if (r.dot) right += `<span class="cdot" style="background:rgb(${toArr(r.dot).join(',')})"></span>`;
            if (r.val !== undefined) right += `<span class="val ${r.valClass || ''}">${esc(r.val)}</span>`;
            else if (r.arrow) right += `<span class="arrow">&raquo;&raquo;</span>`;
        }
        const sub = r.sub ? `<small>${esc(r.sub)}</small>` : '';
        return `<div class="row ${i === sel ? 'sel' : ''} ${clickable ? '' : 'info'}" data-i="${i}">` +
            `<span class="lbl">${esc(r.lbl)}${sub}</span><span class="right">${right}</span></div>`;
    }).join('');

    document.querySelectorAll('.row').forEach((el) => {
        const i = Number(el.dataset.i);
        el.addEventListener('mouseenter', () => { sel = i; markSel(); });
        el.addEventListener('click', () => { sel = i; activate(); });
    });
}

function markSel() {
    document.querySelectorAll('.row').forEach((el) => el.classList.toggle('sel', Number(el.dataset.i) === sel));
    $('counter').textContent = (sel + 1) + '/' + current.rows.length;
}

function activate() {
    const r = current.rows[sel];
    if (!r) return;
    if (r.back) return go(PARENT[view] || 'main');
    if (r.action) r.action();
}

function back() {
    if (view === 'main') return close();
    go(PARENT[view] || 'main');
}

function close() {
    $('app').classList.add('hidden');
    post('close');
}

/* ── Steuerung: kommt als 'nav'-Message vom Lua-Client ──────────────
   (kein NUI-Fokus -> keine echten Keyboard-Events; der Client liest
   Pfeiltasten/Enter/Backspace/ESC und reicht sie hierher weiter) */
function nav(key) {
    if ($('app').classList.contains('hidden') || !current.rows.length) return;
    if (key === 'down') { sel = (sel + 1) % current.rows.length; markSel(); }
    else if (key === 'up') { sel = (sel - 1 + current.rows.length) % current.rows.length; markSel(); }
    else if (key === 'enter') activate();
    else if (key === 'back') back();
}

/* ── Öffnen ─────────────────────────────────────────────────────────── */
window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg.action === 'open') {
        D = msg.data || {};
        view = 'main'; sel = 0;
        render();
        $('app').classList.remove('hidden');
    } else if (msg.action === 'nav') {
        nav(msg.key);
    } else if (msg.action === 'forceClose') {
        /* Client schließt das Menü (z.B. Dokument anzeigen) -> nur ausblenden */
        $('app').classList.add('hidden');
    }
});
