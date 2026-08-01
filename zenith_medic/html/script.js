// ── Zenith Medic Dispatch - NUI Script ───────────────────────────────
let dispatches = {}

function formatTime(ts) {
    const d = new Date(ts * 1000)
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function updateCount() {
    const active = Object.values(dispatches).filter(d => !d.taken).length
    document.getElementById('dispatch_count').textContent = active

    const list   = document.getElementById('dispatch_list')
    const noDisp = document.getElementById('no_dispatches')

    if (Object.keys(dispatches).length === 0) {
        list.style.display   = 'none'
        noDisp.style.display = 'flex'
    } else {
        list.style.display   = 'flex'
        noDisp.style.display = 'none'
    }
}

function buildCard(d) {
    const card = document.createElement('div')
    card.className = 'dispatch_card' + (d.taken ? ' taken' : '')
    card.id        = 'dispatch_' + d.id

    card.innerHTML = `
        <div class="dispatch_card_top">
            <div class="dispatch_card_info">
                <div class="dispatch_icon_wrap">
                    <i class="fa-solid fa-skull"></i>
                </div>
                <div>
                    <div class="dispatch_name">${d.name}</div>
                    <div class="dispatch_reason">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        ${d.reason}
                    </div>
                </div>
            </div>
            <div class="dispatch_meta">
                <div class="dispatch_time"><i class="fa-regular fa-clock"></i> ${formatTime(d.time)}</div>
                ${d.taken ? `<div class="dispatch_taken_label"><i class="fa-solid fa-check"></i> ${d.takenBy || 'Übernommen'}</div>` : ''}
            </div>
        </div>
        ${!d.taken ? `
        <div class="dispatch_card_btns">
            <button class="btn_accept" onclick="acceptDispatch(${d.id})">
                <i class="fa-solid fa-check"></i> Annehmen
            </button>
            <button class="btn_close" onclick="closeDispatch(${d.id})">
                <i class="fa-solid fa-xmark"></i> Schließen
            </button>
        </div>` : ''}
    `
    return card
}

function renderAll() {
    const list = document.getElementById('dispatch_list')
    list.innerHTML = ''
    Object.values(dispatches)
        .sort((a, b) => b.time - a.time)
        .forEach(d => list.appendChild(buildCard(d)))
    updateCount()
}

function openUI() {
    document.getElementById('menu').classList.remove('hidden')
    document.getElementById('backdrop').classList.remove('hidden')
}

function closeUI() {
    document.getElementById('menu').classList.add('hidden')
    document.getElementById('backdrop').classList.add('hidden')
}

// ── NUI Messages ─────────────────────────────────────────────────────
window.addEventListener('message', function(e) {
    const d = e.data

    if (d.action === 'open') {
        dispatches = {}
        ;(d.dispatches || []).forEach(dp => { dispatches[dp.id] = dp })
        renderAll()
        openUI()
        return
    }

    if (d.action === 'close') {
        closeUI()
        return
    }

    if (d.action === 'addDispatch') {
        dispatches[d.dispatch.id] = d.dispatch
        const list = document.getElementById('dispatch_list')
        list.insertBefore(buildCard(d.dispatch), list.firstChild)
        updateCount()
        return
    }

    if (d.action === 'removeDispatch') {
        delete dispatches[d.id]
        const card = document.getElementById('dispatch_' + d.id)
        if (card) {
            card.style.transition = 'opacity 0.25s, transform 0.25s'
            card.style.opacity    = '0'
            card.style.transform  = 'translateX(10px)'
            setTimeout(() => card.remove(), 260)
        }
        updateCount()
        return
    }

    if (d.action === 'dispatchTaken') {
        if (dispatches[d.id]) {
            dispatches[d.id].taken   = true
            dispatches[d.id].takenBy = d.medicName
        }
        const card = document.getElementById('dispatch_' + d.id)
        if (card) {
            card.classList.add('taken')
            const btns = card.querySelector('.dispatch_card_btns')
            if (btns) btns.remove()
            const meta = card.querySelector('.dispatch_meta')
            if (meta) meta.insertAdjacentHTML('beforeend',
                `<div class="dispatch_taken_label"><i class="fa-solid fa-check"></i> ${d.medicName}</div>`)
        }
        updateCount()
        return
    }
})

// ── Aktionen ──────────────────────────────────────────────────────────
function acceptDispatch(id) {
    fetch(`https://${GetParentResourceName()}/acceptDispatch`, {
        method: 'POST',
        body: JSON.stringify({ id })
    })
    closeUI()
}

function closeDispatch(id) {
    fetch(`https://${GetParentResourceName()}/closeDispatch`, {
        method: 'POST',
        body: JSON.stringify({ id })
    })
    delete dispatches[id]
    const card = document.getElementById('dispatch_' + id)
    if (card) {
        card.style.transition = 'opacity 0.25s'
        card.style.opacity    = '0'
        setTimeout(() => card.remove(), 260)
    }
    updateCount()
}

function closeMenu() {
    closeUI()
    fetch(`https://${GetParentResourceName()}/closeMenu`, {
        method: 'POST',
        body: JSON.stringify({})
    })
}

// ── ESC schließt Menü ─────────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMenu()
})
