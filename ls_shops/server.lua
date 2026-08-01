-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  LS SHOPS - Server (Warenkorb-Checkout, server-autoritativ)       ║
-- ╚══════════════════════════════════════════════════════════════════╝
local ESX = exports["es_extended"]:getSharedObject()

-- Item + Preis im Shop finden
local function findItem(shopKey, itemName)
    local shop = Config.Shops[shopKey]
    if not shop then return nil end
    for _, it in ipairs(shop.items or {}) do
        if it.name == itemName then return it end
    end
    return nil
end

-- Steht der Spieler an einer Position dieses Shops?
local function atShop(src, shopKey)
    local shop = Config.Shops[shopKey]
    if not shop then return false end
    local ped = GetPlayerPed(src)
    if not ped or ped == 0 then return false end
    local pos = GetEntityCoords(ped)
    for _, p in ipairs(shop.positions or {}) do
        if #(pos - p) < 4.0 then return true end
    end
    return false
end

-- Warenkorb kaufen: cartItems = { { name = "bread", count = 2 }, ... }
-- account = "money" (Wallet) | "bank" (Bankkarte) - vom Spieler im NUI gewählt.
-- Preise/Existenz werden HIER server-seitig geprüft, dem Client wird nichts geglaubt.
RegisterNetEvent("ls_shops:checkout", function(shopKey, account, cartItems)
    local src = source
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return end

    if type(cartItems) ~= "table" or #cartItems == 0 then return end
    if account ~= "money" and account ~= "bank" then return end
    if not atShop(src, shopKey) then
        return xPlayer.showNotification("~r~Du bist nicht am Shop.")
    end

    -- Validieren + Gesamtpreis serverseitig berechnen
    local total = 0
    local resolved = {}
    for _, entry in ipairs(cartItems) do
        local count = math.floor(tonumber(entry.count) or 0)
        if count < 1 or count > (Config.MaxBuy or 100) then
            return xPlayer.showNotification("~r~Ungültige Menge im Warenkorb.")
        end
        local item = findItem(shopKey, entry.name)
        if not item then
            return xPlayer.showNotification("~r~Unbekanntes Item im Warenkorb.")
        end
        if not xPlayer.canCarryItem(item.name, count) then
            return xPlayer.showNotification(("~r~Du kannst so viel nicht tragen (%s)."):format(item.label or item.name))
        end
        total = total + item.price * count
        resolved[#resolved + 1] = { name = item.name, label = item.label, count = count }
    end

    local balance = account == "bank" and xPlayer.getAccount("bank").money or xPlayer.getMoney()
    if balance < total then
        return xPlayer.showNotification(("~r~Nicht genug Geld (%s$)."):format(total))
    end

    -- Erst ALLE Items geben, erst danach abbuchen (kein Geldabzug bei fehlendem Item)
    for _, it in ipairs(resolved) do
        local ok = pcall(function() xPlayer.addInventoryItem(it.name, it.count) end)
        if not ok then
            return xPlayer.showNotification(("~r~Kauf abgebrochen: %s gibt es nicht (Config prüfen)."):format(it.name))
        end
    end

    if account == "bank" then xPlayer.removeAccountMoney("bank", total) else xPlayer.removeMoney(total) end

    local newBalance = account == "bank" and xPlayer.getAccount("bank").money or xPlayer.getMoney()
    TriggerClientEvent("ls_shops:checkoutOk", src, newBalance)
    xPlayer.showNotification(("~g~Eingekauft für %s$."):format(total))
end)
