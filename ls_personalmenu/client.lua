-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  LS PERSONAL-MENÜ - Client (F5)                                    ║
-- ║  14.07.: Eigenes NUI-Listenmenü ERSETZT durch hex_menu_api         ║
-- ║  (RageUI-Look). Killdot/Kino/Mapfix-Logik unverändert.             ║
-- ╚══════════════════════════════════════════════════════════════════╝
local ESX = exports["es_extended"]:getSharedObject()

local menuOpen = false
local menuData = nil          -- Server-Daten (Geld/Fahrzeuge/Lizenzen/VIP) beim Öffnen geladen
local pageStack = {}

-- ── Einstellungen: Kino-Modus / Killeffekt-Farbe (KVP) / Mapfix ─────
local kino = false
local killdotColor = GetResourceKvpString("ls_pm_killdot_color") or Config.KilldotColors[1].key

local function killdotEntry()
    for i, c in ipairs(Config.KilldotColors) do
        if c.key == killdotColor then return c, i end
    end
    return Config.KilldotColors[1], 1
end

-- Killeffekt: KEIN eigener Punkt mehr (Standard-Reticle bleibt unberührt).
-- Beim Töten wird das native rote Kill-Kreuz kurz in der gewählten Farbe
-- gefärbt: HUD_COLOUR_RED (6) wird für die Flash-Dauer ersetzt und danach
-- auf den GTA-Standard (224,50,50) zurückgesetzt, damit andere rote
-- HUD-Elemente nicht dauerhaft umgefärbt sind.
local HUD_COLOUR_RED = 6
local killFlashToken = 0

local function resetKillColour()
    ReplaceHudColourWithRgba(HUD_COLOUR_RED, 224, 50, 50, 255)
end

AddEventHandler("gameEventTriggered", function(name, args)
    if name ~= "CEventNetworkEntityDamage" then return end
    local entry = killdotEntry()
    if not entry.rgb then return end -- Standard = GTA-Rot, nichts umfärben

    local ped = PlayerPedId()
    local victim, attacker, victimDied = args[1], args[2], args[6] == 1
    if attacker ~= ped or victim == ped or not victimDied then return end
    if not DoesEntityExist(victim) or not IsEntityAPed(victim) then return end

    ReplaceHudColourWithRgba(HUD_COLOUR_RED, entry.rgb[1], entry.rgb[2], entry.rgb[3], 255)
    killFlashToken = killFlashToken + 1
    local token = killFlashToken
    SetTimeout(1500, function()
        if token == killFlashToken then resetKillColour() end
    end)
end)

local function setKino(on)
    kino = on
    TriggerEvent("hud:setHidden", on) -- unser Custom-HUD ([hud]/hud)
    DisplayRadar(not on)
    if on then
        CreateThread(function()
            while kino do
                HideHudAndRadarThisFrame() -- GTA-HUD
                Wait(0)
            end
            DisplayRadar(true)
        end)
    end
end

AddEventHandler("onResourceStop", function(res)
    if res ~= GetCurrentResourceName() then return end
    resetKillColour()
    if kino then
        TriggerEvent("hud:setHidden", false)
        DisplayRadar(true)
    end
end)

-- Map-Fehler fixen: Streaming-Fokus kurz wegziehen -> Welt um den
-- Spieler wird komplett neu gestreamt (fixt Texturlöcher/Map-Bugs)
local mapfixBusy = false
local function doMapfix()
    if mapfixBusy then return end
    mapfixBusy = true
    CreateThread(function()
        local c = GetEntityCoords(PlayerPedId())
        SetFocusPosAndVel(c.x, c.y, c.z + 800.0, 0.0, 0.0, 0.0)
        Wait(800)
        ClearFocus()
        RequestCollisionAtCoord(c.x, c.y, c.z)
        exports["esx_notify"]:Notify("success", 4000, "Map wurde neu geladen.", "Einstellungen")
        mapfixBusy = false
    end)
end

-- ── Menü schließen ──────────────────────────────────────────────────
local function closeMenu()
    menuOpen = false
    exports["hex_menu_api"]:rageClose("ls_personalmenu", "menu")
end

-- Dokumente über jsfour-idcard: ansehen (selbst) oder zeigen (nächster Spieler).
-- Menü wird vorher geschlossen (Karte soll frei sichtbar sein, ESC/X schließt sie).
local function openIdcard(cardType, show)
    closeMenu()

    local myId = GetPlayerServerId(PlayerId())
    if show then
        local player, distance = ESX.Game.GetClosestPlayer()
        if distance ~= -1 and distance <= 3.0 then
            TriggerServerEvent("jsfour-idcard:open", myId, GetPlayerServerId(player), cardType)
        else
            exports["esx_notify"]:Notify("error", 4000, "Kein Spieler in der Nähe.", "Information")
        end
    else
        TriggerServerEvent("jsfour-idcard:open", myId, myId, cardType)
    end
end

-- ── Seiten (hex_menu_api) ───────────────────────────────────────────
local PAGE_TITLES = {
    main = "ZENITH MENÜ", wallet = "Brieftasche", vehicles = "Fahrzeuge",
    settings = "Einstellungen", vip = "VIP", id = "Ausweis & Dokumente",
}

local function fmtMoney(n)
    local s = tostring(math.floor(tonumber(n) or 0))
    local formatted = s:reverse():gsub("(%d%d%d)", "%1."):reverse()
    return (formatted:gsub("^%.", "")) .. "$"
end

local function buildElements(page)
    local els = {}
    local d = menuData or {}

    if page == "main" then
        els[#els + 1] = { title = "Brieftasche", value = "wallet", type = "buttongo", description = "Geld & Dokumente" }
        els[#els + 1] = { title = "Fahrzeuge", value = "vehicles", type = "buttongo", description = "Deine Fahrzeuge & Garagen-Status" }
        els[#els + 1] = { title = "Einstellungen", value = "settings", type = "buttongo", description = "Map-Fix · Kino-Modus · Killeffekt" }
        els[#els + 1] = { title = "VIP", value = "vip", type = "buttongo" }
        els[#els + 1] = { title = "Ausweis & Dokumente", value = "id", type = "buttongo" }

    elseif page == "wallet" then
        els[#els + 1] = { title = "GELD", type = "seperator" }
        els[#els + 1] = { title = "Bargeld: ~g~" .. fmtMoney(d.money), value = "noop", type = "button" }
        els[#els + 1] = { title = "Bank: ~b~" .. fmtMoney(d.bank), value = "noop", type = "button" }
        els[#els + 1] = { title = "Schwarzgeld: ~r~" .. fmtMoney(d.black), value = "noop", type = "button" }
        if d.idcard then
            els[#els + 1] = { title = "DOKUMENTE", type = "seperator" }
            els[#els + 1] = { title = "Personalausweis ansehen", value = "doc_id_view", type = "button" }
            els[#els + 1] = { title = "Personalausweis zeigen", value = "doc_id_show", type = "button", description = "Zeigt die Karte dem nächsten Spieler (3 m)" }
            els[#els + 1] = { title = "Führerschein ansehen", value = "doc_dl_view", type = "button" }
            els[#els + 1] = { title = "Führerschein zeigen", value = "doc_dl_show", type = "button", description = "Zeigt die Karte dem nächsten Spieler (3 m)" }
            els[#els + 1] = { title = "Waffenschein ansehen", value = "doc_ws_view", type = "button" }
            els[#els + 1] = { title = "Waffenschein zeigen", value = "doc_ws_show", type = "button", description = "Zeigt die Karte dem nächsten Spieler (3 m)" }
        end

    elseif page == "vehicles" then
        if #(d.vehicles or {}) == 0 then
            els[#els + 1] = { title = "Keine Fahrzeuge", value = "noop", type = "button" }
        end
        for _, v in ipairs(d.vehicles or {}) do
            local status = v.stored and "~g~IN GARAGE" or "~r~DRAUSSEN"
            els[#els + 1] = { title = (v.label or "Unbekannt") .. " ~s~[" .. (v.plate or "?") .. "] " .. status, value = "noop", type = "button" }
        end

    elseif page == "settings" then
        els[#els + 1] = { title = "Map-Fehler fixen", value = "mapfix", type = "button", description = "Läd die Welt um dich herum neu (Texturlöcher/Map-Bugs)" }
        els[#els + 1] = { title = "Kino-Modus", value = "kino", type = "checkbox", checked = kino, description = "Versteckt HUD + Minimap (nach Relog wieder aus)" }
        local colorLabels = {}
        for _, c in ipairs(Config.KilldotColors) do colorLabels[#colorLabels + 1] = c.label end
        local _, curIdx = killdotEntry()
        els[#els + 1] = { title = "Killeffekt-Farbe", value = "killdot", type = "list", list = colorLabels, valueList = curIdx - 1, description = "Farbe des Kill-Kreuzes beim Töten (Standard = GTA-Rot)" }

    elseif page == "vip" then
        if d.vip then
            els[#els + 1] = { title = "~y~★ VIP AKTIV", value = "noop", type = "button", description = "Gruppe: " .. tostring(d.group) }
        else
            els[#els + 1] = { title = "Kein VIP", value = "noop", type = "button", description = "Frage das Team nach VIP-Vorteilen" }
        end

    elseif page == "id" then
        local idn = d.identity or {}
        local sex = (idn.sex == "m" and "Männlich") or (idn.sex == "f" and "Weiblich") or tostring(idn.sex)
        local visumLevel = d.visum or 0
        local visumLabel = "Kein Visum"
        if visumLevel > 0 then
            visumLabel = "~y~Visum " .. visumLevel
        end
        els[#els + 1] = { title = "PERSONALAUSWEIS", type = "seperator" }
        els[#els + 1] = { title = "Name: ~h~" .. (idn.firstName or "") .. " " .. (idn.lastName or ""), value = "noop", type = "button" }
        els[#els + 1] = { title = "Geburtsdatum: " .. tostring(idn.dob), value = "noop", type = "button" }
        els[#els + 1] = { title = "Geschlecht: " .. sex, value = "noop", type = "button" }
        els[#els + 1] = { title = "Größe: " .. tostring(idn.height) .. " cm", value = "noop", type = "button" }
        els[#els + 1] = { title = "Job: " .. tostring(d.job) .. (d.grade ~= "" and (" (" .. tostring(d.grade) .. ")") or ""), value = "noop", type = "button" }
        els[#els + 1] = { title = "Server-ID: " .. tostring(d.serverId), value = "noop", type = "button" }
        els[#els + 1] = { title = "Visum: " .. visumLabel, value = "noop", type = "button", description = visumLevel > 0 and (Config.Stufen and Config.Stufen[visumLevel] and Config.Stufen[visumLevel].description or "") or "Kein gültiges Visum" }
        els[#els + 1] = { title = "LIZENZEN", type = "seperator" }
        if #(d.licenses or {}) == 0 then
            els[#els + 1] = { title = "Keine Lizenzen", value = "noop", type = "button" }
        end
        for _, l in ipairs(d.licenses or {}) do
            els[#els + 1] = { title = "✓ " .. tostring(l.label or l.type), value = "noop", type = "button" }
        end
    end

    return els
end

local function openPage()
    local page = pageStack[#pageStack]
    if not page then menuOpen = false return end
    menuOpen = true

    exports["hex_menu_api"]:rageOpen("ls_personalmenu", "menu", {
        title = PAGE_TITLES[page] or page,
        elements = buildElements(page),
        align = "left"
    }, function(data, menu)
        local v = data.current and data.current.value
        if not v or v == "noop" then return end

        if page == "main" then
            pageStack[#pageStack + 1] = v
            openPage()
        elseif v == "mapfix" then
            doMapfix()
        elseif v == "kino" then
            setKino(not kino)
        elseif v == "doc_id_view" then openIdcard(nil, false)
        elseif v == "doc_id_show" then openIdcard(nil, true)
        elseif v == "doc_dl_view" then openIdcard("driver", false)
        elseif v == "doc_dl_show" then openIdcard("driver", true)
        elseif v == "doc_ws_view" then openIdcard("weapon", false)
        elseif v == "doc_ws_show" then openIdcard("weapon", true)
        end
    end, function(data, menu)
        -- Backspace/ESC: eine Seite zurück; auf der Root-Seite muss das NUI
        -- selbst per rageClose geschlossen werden (hex_menu_api macht das NICHT automatisch)
        pageStack[#pageStack] = nil
        if #pageStack > 0 then openPage() else closeMenu() end
    end, function(data, menu)
        -- onChange: Killeffekt-Farbe live per Pfeil links/rechts
        if data.current and data.current.value == "killdot" then
            local idx = (tonumber(data.current.valueList) or 0) + 1
            local c = Config.KilldotColors[idx]
            if c then
                killdotColor = c.key
                SetResourceKvp("ls_pm_killdot_color", killdotColor)
                if not c.rgb then resetKillColour() end -- zurück auf Standard = sofort GTA-Rot
            end
        end
    end)
end

-- ── Öffnen (F5, rebindbar; auch /personalmenu) ──────────────────────
RegisterCommand("ls_personalmenu", function()
    if menuOpen then closeMenu() return end
    local pd = ESX.GetPlayerData()
    if not pd or not pd.job then return end

    ESX.TriggerServerCallback("ls_personalmenu:getData", function(data)
        if not data then return end

        -- Identity aus PlayerData (esx_identity-Felder, Erkenntnis #12)
        data.identity = {
            firstName = pd.firstName or "",
            lastName  = pd.lastName or "",
            dob       = pd.dateofbirth or "Unbekannt",
            sex       = pd.sex or "?",
            height    = tonumber(pd.height) or 0,
        }
        data.serverId = GetPlayerServerId(PlayerId())
        data.city = Config.IdCity

        -- Fahrzeug-Modellnamen client-seitig aufloesen (wie ls_garage)
        for _, v in ipairs(data.vehicles or {}) do
            local label = "Unbekannt"
            if v.model then
                local dn = GetDisplayNameFromVehicleModel(v.model)
                if dn and dn ~= "CARNOTFOUND" then
                    local lbl = GetLabelText(dn)
                    label = (lbl and lbl ~= "NULL") and lbl or dn
                end
            end
            v.label = label
        end

        -- Dokumente (jsfour-idcard) nur anbieten, wenn die Ressource läuft
        data.idcard = GetResourceState("jsfour-idcard") == "started"

        menuData = data
        pageStack = { "main" }
        openPage()
    end)
end, false)
RegisterKeyMapping("ls_personalmenu", "Personal-Menü öffnen", "keyboard", Config.DefaultKey)
RegisterCommand("personalmenu", function() ExecuteCommand("ls_personalmenu") end, false)
