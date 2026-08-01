-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  LS SHOPS - Client (Marker + [E] -> NUI)                          ║
-- ╚══════════════════════════════════════════════════════════════════╝
local ESX = exports["es_extended"]:getSharedObject()

local isOpen = false
local currentShop = nil

-- ── Blips ────────────────────────────────────────────────────────────
CreateThread(function()
    for _, shop in pairs(Config.Shops) do
        if shop.blip then
            for _, p in ipairs(shop.positions or {}) do
                local b = AddBlipForCoord(p.x, p.y, p.z)
                SetBlipSprite(b, shop.blip.sprite or 59)
                SetBlipColour(b, shop.blip.color or 25)
                SetBlipScale(b, (shop.blip.scale or 0.8) + 0.0)
                SetBlipAsShortRange(b, true)
                BeginTextCommandSetBlipName("STRING")
                AddTextComponentSubstringPlayerName(shop.blip.name or shop.label or "Shop")
                EndTextCommandSetBlipName(b)
            end
        end
    end
end)

-- ── Öffnen / Schließen ──────────────────────────────────────────────
local function openShop(key)
    if isOpen then return end
    local shop = Config.Shops[key]
    if not shop then return end
    currentShop = key
    isOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action = "open",
        label = shop.label,
        cash = math.floor(ESX.GetPlayerData().money or 0),
        items = shop.items or {},
    })
end

local function closeShop()
    if not isOpen then return end
    isOpen = false
    currentShop = nil
    SetNuiFocus(false, false)
    SendNUIMessage({ action = "close" })
end

RegisterNUICallback("close", function(_, cb) closeShop(); cb("ok") end)
RegisterNUICallback("checkout", function(d, cb)
    cb("ok")
    if currentShop then
        TriggerServerEvent("ls_shops:checkout", currentShop, d.account, d.items or {})
    end
end)

RegisterNetEvent("ls_shops:checkoutOk", function()
    if isOpen then SendNUIMessage({ action = "checkoutOk" }) end
end)

-- ── Marker + [E] ─────────────────────────────────────────────────────
CreateThread(function()
    local m = Config.Marker
    local helpActive = false
    while true do
        local sleep = 800
        if not isOpen then
            local pos = GetEntityCoords(PlayerPedId())
            local nearKey, nearDist = nil, 9999.0
            for key, shop in pairs(Config.Shops) do
                for _, p in ipairs(shop.positions or {}) do
                    local d = #(pos - p)
                    if d < m.drawDistance then
                        sleep = 0
                        DrawMarker(m.type, p.x, p.y, p.z - 0.98, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
                            m.size + 0.0, m.size + 0.0, m.height + 0.0, m.color.r, m.color.g, m.color.b, m.color.a,
                            false, false, 2, false, nil, nil, false)
                        if d < nearDist then nearDist = d; nearKey = key end
                    end
                end
            end
            if nearKey and nearDist < m.interactDistance then
                if not helpActive then helpActive = true; ESX.TextUI("[E] Shop öffnen") end
                if IsControlJustReleased(0, 38) then helpActive = false; ESX.HideUI(); openShop(nearKey) end
            elseif helpActive then helpActive = false; ESX.HideUI() end
        elseif helpActive then helpActive = false; ESX.HideUI() end
        Wait(sleep)
    end
end)

AddEventHandler("onResourceStop", function(res)
    if res == GetCurrentResourceName() and isOpen then SetNuiFocus(false, false) end
end)
