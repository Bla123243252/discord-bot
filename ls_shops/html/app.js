/* ═══ LS SHOPS — Tab-Design ═══ */
const RES = "ls_shops";
const $  = id => document.getElementById(id);

let items     = [];
let cart      = {};   // { [name]: { item, count } }
let activeCat = "all";
let search    = "";

const CATS = [
    { key: "all",   label: "Alle"    },
    { key: "food",  label: "Essen"   },
    { key: "drink", label: "Trinken" },
    { key: "item",  label: "Items"   },
];

const ICON_MAP = [
    [/wasser|water/,      "💧"],
    [/cola|soda|limo/,    "🥤"],
    [/bier|beer/,         "🍺"],
    [/saft|juice/,        "🧃"],
    [/brot|bread/,        "🍞"],
    [/burger/,            "🍔"],
    [/pizza/,             "🍕"],
    [/pommes|fries/,      "🍟"],
    [/donut/,             "🍩"],
    [/handy|phone/,       "📱"],
    [/gps/,               "🧭"],
    [/angel|fishingrod/,  "🎣"],
    [/bandage|medkit/,    "🩹"],
    [/coffee|kaffee/,     "☕"],
    [/sandwich/,          "🥪"],
    [/hot.?dog/,          "🌭"],
];

function iconFor(it) {
    const s = ((it.name || "") + " " + (it.label || "")).toLowerCase();
    for (const [re, emoji] of ICON_MAP) if (re.test(s)) return emoji;
    return null;
}

function catOf(it) {
    return (it.category === "food" || it.category === "drink") ? it.category : "item";
}

function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function fmt(n) {
    return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function post(name, data) {
    fetch(`https://${RES}/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(data || {})
    });
}

/* ── Tabs ── */
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        tab.classList.add("active");
        $("tab-" + tab.dataset.tab).classList.add("active");
    });
});

/* ── Kategorie-Buttons ── */
function renderCats() {
    $("cats").innerHTML = CATS.map(c =>
        `<button class="cat-btn ${c.key === activeCat ? "active" : ""}" data-cat="${c.key}">${esc(c.label)}</button>`
    ).join("");
    document.querySelectorAll(".cat-btn").forEach(el => {
        el.addEventListener("click", () => { activeCat = el.dataset.cat; renderCats(); renderGrid(); });
    });
}

/* ── Artikel-Grid ── */
function renderGrid() {
    const term = search.trim().toLowerCase();
    const list = items.filter(it => {
        if (activeCat !== "all" && catOf(it) !== activeCat) return false;
        if (term && !((it.label || it.name || "").toLowerCase().includes(term))) return false;
        return true;
    });

    $("empty").classList.toggle("hidden", list.length > 0);
    $("grid").innerHTML = list.map(it => {
        const emoji = iconFor(it);
        const catLbl = CATS.find(c => c.key === catOf(it))?.label || "Items";
        return `
        <div class="card">
            <div class="card-top">
                <div>
                    <div class="card-name">${esc(it.label || it.name)}</div>
                    <div class="card-cat">${esc(catLbl)}</div>
                </div>
                <div class="card-price">$${fmt(it.price)}</div>
            </div>
            <div class="card-ic ${emoji ? "" : "placeholder"}">${emoji || "?"}</div>
            <button class="addcart" data-name="${esc(it.name)}">In den Warenkorb 🛒</button>
        </div>`;
    }).join("");

    document.querySelectorAll(".addcart").forEach(el => {
        el.addEventListener("click", () => {
            addToCart(el.dataset.name);
            // Kurz zum Warenkorb-Tab wechseln animieren (Badge)
            flashBadge();
        });
    });
}

function flashBadge() {
    const badge = $("cartBadge");
    badge.style.transform = "scale(1.4)";
    setTimeout(() => badge.style.transform = "", 200);
}

/* ── Warenkorb ── */
function addToCart(name) {
    const it = items.find(i => i.name === name);
    if (!it) return;
    if (!cart[name]) cart[name] = { item: it, count: 0 };
    cart[name].count++;
    renderCart();
}

function changeQty(name, delta) {
    if (!cart[name]) return;
    cart[name].count += delta;
    if (cart[name].count <= 0) delete cart[name];
    renderCart();
}

function cartTotal() {
    return Object.values(cart).reduce((s, c) => s + c.item.price * c.count, 0);
}

function cartCount() {
    return Object.values(cart).reduce((s, c) => s + c.count, 0);
}

function renderCart() {
    const rows  = Object.entries(cart);
    const total = cartTotal();
    const count = cartCount();

    // Badge
    const badge = $("cartBadge");
    badge.textContent = count;
    badge.classList.toggle("hidden", count === 0);

    // Leer / Gefüllt
    $("cartEmpty").classList.toggle("hidden", rows.length > 0);
    $("cartItems").classList.toggle("hidden", rows.length === 0);

    $("cartItems").innerHTML = rows.map(([name, c]) => {
        const emoji = iconFor(c.item) || "?";
        return `
        <div class="cart-row">
            <div class="ic">${emoji}</div>
            <div class="info">
                <div class="nm">${esc(c.item.label || name)}</div>
                <div class="qty">$${fmt(c.item.price)} / Stück</div>
            </div>
            <div class="qty-ctrl">
                <button class="qty-btn rm" data-name="${esc(name)}" data-delta="-1">−</button>
                <span style="font-size:12px;font-weight:700;min-width:20px;text-align:center;">${c.count}</span>
                <button class="qty-btn" data-name="${esc(name)}" data-delta="1">+</button>
            </div>
            <div class="sum">$${fmt(c.item.price * c.count)}</div>
        </div>`;
    }).join("");

    document.querySelectorAll(".qty-btn").forEach(el => {
        el.addEventListener("click", () => changeQty(el.dataset.name, parseInt(el.dataset.delta)));
    });

    $("total").textContent = "$" + fmt(total);
    $("payWallet").disabled = total <= 0;
    $("payBank").disabled   = total <= 0;
}

function checkout(account) {
    if (cartTotal() <= 0) return;
    const cartItems = Object.values(cart).map(c => ({ name: c.item.name, count: c.count }));
    post("checkout", { account, items: cartItems });
}

/* ── Events ── */
$("search").addEventListener("input", e => { search = e.target.value; renderGrid(); });

$("closebtn").addEventListener("click", () => closeShop());
document.addEventListener("keydown", e => { if (e.key === "Escape") closeShop(); });

$("payWallet").addEventListener("click", () => checkout("money"));
$("payBank").addEventListener("click",   () => checkout("bank"));

function closeShop() {
    $("app").classList.add("hidden");
    post("close");
}

/* ── NUI-Nachrichten ── */
window.addEventListener("message", e => {
    const m = e.data;

    if (m.action === "open") {
        items     = m.items || [];
        cart      = {};
        activeCat = "all";
        search    = "";
        $("search").value = "";
        $("shoplabel").textContent = (m.label || "SHOP").toUpperCase();

        // Zum Shop-Tab wechseln
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        document.querySelector('.tab[data-tab="shop"]').classList.add("active");
        $("tab-shop").classList.add("active");

        $("app").classList.remove("hidden");
        renderCats();
        renderGrid();
        renderCart();

    } else if (m.action === "close") {
        $("app").classList.add("hidden");

    } else if (m.action === "checkoutOk") {
        cart = {};
        renderCart();
        // Zurück zum Shop-Tab
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        document.querySelector('.tab[data-tab="shop"]').classList.add("active");
        $("tab-shop").classList.add("active");
    }
});
