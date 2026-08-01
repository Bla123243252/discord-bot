-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  LS SHOPS - Config (ersetzt esx_shops)                            ║
-- ║  Schwarzer Kreis + [E] am Shop -> NUI zum Kaufen.                 ║
-- ║  Items MÜSSEN in der items-Tabelle existieren.                    ║
-- ╚══════════════════════════════════════════════════════════════════╝
Config = {}

Config.MaxBuy = 100   -- max. Stückzahl pro Item im Warenkorb (Zahlungsmethode wählt der Spieler im NUI: Wallet/Bank)

-- Schwarzer Kreis-Marker (Stil wie unsere anderen Ressourcen)
Config.Marker = {
    drawDistance = 18.0,
    interactDistance = 1.8,
    type = 1, size = 1.2, height = 0.5,
    color = { r = 10, g = 10, b = 10, a = 180 },
}

-- Standard-Sortiment (wird von jedem Shop genutzt, der kein eigenes `items` hat)
-- category: "food" | "drink" | "item" (steuert Tab-Zuordnung + Icon im Shop-NUI)
local defaultItems = {
    { name = "bread", label = "Brot",   price = 100,  category = "food" },
    { name = "water", label = "Wasser", price = 100,  category = "drink" },
    { name = "phone", label = "Handy",  price = 1500, category = "item" },
    { name = "gps",   label = "GPS",    price = 1000, category = "item" },
    { name = "fishingrod", label = "Angel", price = 500, category = "item" },
}

-- ── Shops (Orte wie in esx_shops) ────────────────────────────────────
Config.Shops = {
    ["247"] = {
        label = "24/7 Shop",
        blip  = { sprite = 59, color = 25, scale = 0.8, name = "24/7 Shop" },
        items = defaultItems,
        positions = {
            vector3(373.8, 325.8, 103.5),
            vector3(2557.4, 382.2, 108.6),
            vector3(-3038.9, 585.9, 7.9),
            vector3(-3241.9, 1001.4, 12.8),
            vector3(547.4, 2671.7, 42.1),
            vector3(1961.4, 3740.6, 32.3),
            vector3(2678.9, 3280.6, 55.2),
            vector3(1729.2, 6414.1, 35.0),
        },
    },
    ["liquor"] = {
        label = "Robs Liquor",
        blip  = { sprite = 93, color = 25, scale = 0.8, name = "Liquor Store" },
        items = defaultItems,
        positions = {
            vector3(1135.8, -982.2, 46.4),
            vector3(-1222.9, -906.9, 12.3),
            vector3(-1487.5, -379.1, 40.1),
            vector3(-2968.2, 390.9, 15.0),
            vector3(1166.0, 2708.9, 38.1),
            vector3(1392.5, 3604.6, 34.9),
            vector3(127.8, -1284.7, 29.2),
            vector3(-1393.4, -606.6, 30.3),
            vector3(-559.9, 287.0, 82.1),
        },
    },
    ["ltd"] = {
        label = "LTD Gasoline",
        blip  = { sprite = 59, color = 25, scale = 0.8, name = "LTD Shop" },
        items = defaultItems,
        positions = {
            vector3(-48.5, -1757.5, 29.4),
            vector3(1163.3, -323.8, 69.2),
            vector3(-707.5, -914.2, 19.2),
            vector3(-1820.5, 792.5, 138.1),
            vector3(1698.3, 4924.4, 42.0),
        },
    },
}
