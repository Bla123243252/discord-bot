local ESX = exports["es_extended"]:getSharedObject()

local RoleData = nil          -- { group, label, color, perms, menu, suitTex, aduty }
local menuOpen = false
local pageStack = { "main" }
local selected = {}           -- [pageId] = index
local playersCache = {}
local selectedTarget = nil

local state = {
    god = false, invis = false, stamina = false, noclip = false,
    aduty = false, nametags = false, spectate = false,
}
local noclipSpeed = 2         -- 1..5
local savedSkin = nil

-- Ziel-IDs / Caches für die Untermenüs
local refundTarget = nil
local bossTarget = nil
local trollTarget = nil
local jobsCache = {}

-- Tastatur-Eingabe (blockierend) -> gibt String oder nil zurück
-- Läuft jetzt über den hex_menu_api-Input-Dialog (statt natives Onscreen-Keyboard)
local function keyboardInput(title, maxLen)
    local p = promise.new()
    exports["hex_menu_api"]:inputOpen("ls_admin", "input", {
        title = title or "Eingabe:",
        maxLength = maxLen or 30
    }, function(data, menu)
        p:resolve(data.value)
        menu.close()
    end, function(data, menu)
        p:resolve(nil)
        menu.close()
    end)
    return Citizen.Await(p)
end

local function inputNumber(title)
    local r = keyboardInput(title, 12)
    return r and tonumber(r) or nil
end

-- ╔═══════════════════════════════════════════════╗
-- ║  Helfer                                        ║
-- ╚═══════════════════════════════════════════════╝
local function hasPerm(perm)
    return RoleData and PermsHave(RoleData.perms, perm)
end

local function isOwner()
    return RoleData and Config.TrollGroups and Config.TrollGroups[RoleData.group] == true
end

-- Darf die Gruppe den Fraktionsleitung-Tab sehen? (NUR Gruppen aus Config.FactionLeadGroups)
local function isFactionLead()
    return RoleData and RoleData.group and Config.FactionLeadGroups
        and Config.FactionLeadGroups[string.lower(RoleData.group)] == true
end

-- Hat die Rolle IRGENDEIN Recht in einer Kategorie? (z.B. "players" -> players.goto, players.revive ...)
local function hasCategory(cat)
    if not RoleData or not RoleData.perms then return false end
    for _, p in ipairs(RoleData.perms) do
        if p == "*" or p == cat .. ".*" or string.sub(p, 1, #cat + 1) == cat .. "." then
            return true
        end
    end
    return false
end

local function notify(msg)
    if ESX and ESX.ShowNotification then ESX.ShowNotification(msg) end
end
RegisterNetEvent("ls_admin:notify", function(msg) notify(msg) end)

-- /calladmin-Hilferuf: auffälliges Notify (orange "ghost") nur für Teammitglieder
RegisterNetEvent("ls_admin:calladmin", function(name, id, reason, reportId)
    local tag = reportId and (" (Report #" .. reportId .. ")") or ""
    exports["esx_notify"]:Notify("ghost", 10000, ("%s (ID %d) benötigt Hilfe!%s<br>Grund: %s"):format(name, id, tag, reason), "CALLADMIN")
    PlaySoundFrontend(-1, "CHECKPOINT_PERFECT", "HUD_MINI_GAME_SOUNDSET", true)
end)

-- /tc-Teamchat: Notify nur für Teammitglieder (Rang + Name + ID des Absenders)
RegisterNetEvent("ls_admin:teamchat", function(label, name, id, msg)
    exports["esx_notify"]:Notify("info", 8000, ("[%s] %s (ID %d):<br>%s"):format(label, name, id, msg), "TEAMCHAT")
    PlaySoundFrontend(-1, "Text_Arrive_Tone", "Phone_SoundSet_Default", true)
end)

local function loadRole()
    ESX.TriggerServerCallback("ls_admin:getMyRole", function(data)
        RoleData = data
        state.aduty = data and data.aduty or false
    end)
end

CreateThread(function()
    while ESX.GetPlayerData() == nil or ESX.GetPlayerData().job == nil do Wait(500) end
    Wait(1000)
    loadRole()
end)
RegisterNetEvent("esx:playerLoaded", function() Wait(1500) loadRole() end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Zeichen-Helfer                                ║
-- ╚═══════════════════════════════════════════════╝
local function drawRect(x, y, w, h, r, g, b, a)
    DrawRect(x + w / 2.0, y + h / 2.0, w, h, r, g, b, a)
end

local function txt(text, x, y, scale, r, g, b, a, align)
    SetTextFont(4)
    SetTextScale(scale, scale)
    SetTextColour(r, g, b, a or 255)
    SetTextDropshadow(1, 0, 0, 0, 200)
    SetTextDropShadow()
    if align == "right" then
        SetTextRightJustify(true)
        SetTextWrap(0.0, x)
    elseif align == "center" then
        SetTextCentre(true)
    end
    SetTextEntry("STRING")
    AddTextComponentString(text)
    DrawText(x, y)
end

-- ╔═══════════════════════════════════════════════╗
-- ║  Seiten-Verwaltung                             ║
-- ╚═══════════════════════════════════════════════╝
local function curPage() return pageStack[#pageStack] end
local function pushPage(id) pageStack[#pageStack + 1] = id; selected[id] = selected[id] or 1 end
local function popPage()
    if #pageStack > 1 then pageStack[#pageStack] = nil else menuOpen = false end
end

-- ╔═══════════════════════════════════════════════╗
-- ║  Menü-Inhalte                                  ║
-- ╚═══════════════════════════════════════════════╝
local function buildItems()
    local page = curPage()
    local items = {}
    -- Sektion wird erst gezeigt, wenn darunter mindestens ein sichtbarer Eintrag steht
    local pendingSection = nil
    local function section(name) pendingSection = name end
    local function add(item)
        if item.show and not item.show() then return end
        if item.perm and not hasPerm(item.perm) then return end
        if pendingSection then
            items[#items + 1] = { type = "section", label = pendingSection }
            pendingSection = nil
        end
        items[#items + 1] = item
    end

    if page == "main" then
        section("Allgemein")
        add({ label = "Admin Menu", show = function() return hasPerm("aduty") or hasPerm("nametags") or hasPerm("self.noclip") end, submenu = true, onSelect = function() pushPage("admin") end })
        add({ label = "Rückerstattungs Menü", show = function() return hasCategory("refund") end, submenu = true, onSelect = function() pushPage("refund") end })
        add({ label = "Fahrzeug Menü", show = function() return hasCategory("vehicle") end, submenu = true, onSelect = function() pushPage("vehicle") end })
        add({ label = "Spieler Online", show = function() return hasCategory("players") end, submenu = true, onSelect = function() refreshPlayers(); pushPage("players") end })
        add({ label = "Fraktionsleitung", show = isFactionLead, submenu = true, onSelect = function() refreshJobs(); pushPage("faction") end })
        add({ label = "Event Menü", show = function() return hasCategory("event") end, submenu = true, onSelect = function() pushPage("event") end })
        section("Leitung")
        add({ label = "Boss Menü", perm = "boss", submenu = true, onSelect = function() pushPage("boss") end })
        if isOwner() then
            add({ label = "Troll Menü", submenu = true, onSelect = function() pushPage("troll") end })
        end

    elseif page == "admin" then
        section("Admin")
        add({ label = "ADuty", perm = "aduty", checked = function() return state.aduty end, onSelect = function() TriggerServerEvent("ls_admin:toggleAduty") end })
        add({ label = "Nametags", perm = "nametags", checked = function() return state.nametags end, onSelect = toggleNametags })
        add({ label = "Noclip", perm = "self.noclip", checked = function() return state.noclip end, onSelect = toggleNoclip })

    elseif page == "vehicle" then
        section("Fahrzeug")
        add({ label = "Reparieren", perm = "vehicle.fix", onSelect = function() local v = curVeh() if v then SetVehicleFixed(v) SetVehicleDeformationFixed(v) SetVehicleEngineHealth(v, 1000.0) notify("Repariert.") end end })
        add({ label = "Säubern", perm = "vehicle.clean", onSelect = function() local v = curVeh() if v then SetVehicleDirtLevel(v, 0.0) notify("Gesäubert.") end end })
        add({ label = "Max Tuning", perm = "vehicle.max", onSelect = maxMods })
        add({ label = "Umdrehen", perm = "vehicle.flip", onSelect = function() local v = curVeh() if v then SetVehicleOnGroundProperly(v) notify("Umgedreht.") end end })
        add({ label = "Motor an/aus", perm = "vehicle.engine", onSelect = function() local v = curVeh() if v then SetVehicleEngineOn(v, not GetIsVehicleEngineRunning(v), true, true) end end })
        add({ label = "Löschen", perm = "vehicle.delete", onSelect = function() local v = curVeh() if v then SetEntityAsMissionEntity(v, true, true) DeleteVehicle(v) notify("Fahrzeug gelöscht.") end end })
        add({ label = "Fahrzeug spawnen", perm = "vehicle.max", submenu = true, onSelect = function() pushPage("vehicle_spawn") end })

    elseif page == "vehicle_spawn" then
        section("Fahrzeug spawnen")
        for _, model in ipairs({ "adder", "zentorno", "police", "police2", "ambulance", "kuruma", "sultanrs", "t20", "buzzard", "insurgent" }) do
            add({ label = model, perm = "vehicle.max", onSelect = function() spawnVehicle(model) end })
        end

    elseif page == "players" then
        section("Spieler Online (" .. #playersCache .. ")")
        if #playersCache == 0 then
            add({ label = "Lade Spieler...", onSelect = refreshPlayers })
        end
        for _, p in ipairs(playersCache) do
            local tag = p.roleLabel and (" - " .. p.roleLabel) or ""
            add({ label = ("[%d] %s%s"):format(p.id, p.name, tag), submenu = true, onSelect = function()
                selectedTarget = p.id; pushPage("player_actions")
            end })
        end

    elseif page == "player_actions" then
        local id = selectedTarget
        section("Spieler #" .. tostring(id))
        add({ label = "Hingehen (Goto)", perm = "players.goto", onSelect = function() TriggerServerEvent("ls_admin:goto", id) end })
        add({ label = "Holen (Bring)", perm = "players.bring", onSelect = function() TriggerServerEvent("ls_admin:bring", id) end })
        add({ label = "Heilen", perm = "players.heal", onSelect = function() TriggerServerEvent("ls_admin:healTarget", id) end })
        add({ label = "Wiederbeleben", perm = "players.revive", onSelect = function() TriggerServerEvent("ls_admin:reviveTarget", id) end })
        add({ label = "Einfrieren/Auftauen", perm = "players.freeze", onSelect = function() TriggerServerEvent("ls_admin:freezeTarget", id, true) end })
        add({ label = "Spectate", perm = "players.spectate", checked = function() return state.spectate end, onSelect = function() toggleSpectate(id) end })
        add({ label = "Kicken", perm = "players.kick", onSelect = function() TriggerServerEvent("ls_admin:kickTarget", id, "Adminentscheidung") end })

    elseif page == "event" then
        section("Wetter")
        for _, w in ipairs({ { "Sonnig", "EXTRASUNNY" }, { "Wolkig", "CLOUDS" }, { "Regen", "RAIN" }, { "Gewitter", "THUNDER" }, { "Neblig", "FOGGY" } }) do
            add({ label = w[1], perm = "event.weather", onSelect = function() TriggerServerEvent("ls_admin:setWeather", w[2]) end })
        end
        section("Zeit")
        for _, t in ipairs({ { "Morgen (07)", 7 }, { "Mittag (12)", 12 }, { "Abend (20)", 20 }, { "Nacht (00)", 0 } }) do
            add({ label = t[1], perm = "event.time", onSelect = function() TriggerServerEvent("ls_admin:setTime", t[2]) end })
        end
        section("Lootdrop")
        add({ label = "Zivi Lootdrop starten", perm = "event.lootdrop", onSelect = function() TriggerServerEvent("ls_lootdrop:start", "zivi") end })
        add({ label = "Fraktions Lootdrop starten", perm = "event.lootdrop", onSelect = function() TriggerServerEvent("ls_lootdrop:start", "fraktion") end })

    elseif page == "refund" then
        section("Rückerstattung" .. (refundTarget and (" - Ziel " .. refundTarget) or ""))
        add({ label = "Ziel-ID setzen", perm = "refund.money", onSelect = function()
            local id = inputNumber("Spieler-ID:")
            if id then refundTarget = id; notify("Ziel-ID: " .. id) end
        end })
        add({ label = "Geld (Cash) geben", perm = "refund.money", onSelect = function()
            if not refundTarget then return notify("~r~Erst Ziel-ID setzen.") end
            local a = inputNumber("Betrag Cash:")
            if a then TriggerServerEvent("ls_admin:giveMoney", refundTarget, "money", a) end
        end })
        add({ label = "Bank geben", perm = "refund.money", onSelect = function()
            if not refundTarget then return notify("~r~Erst Ziel-ID setzen.") end
            local a = inputNumber("Betrag Bank:")
            if a then TriggerServerEvent("ls_admin:giveMoney", refundTarget, "bank", a) end
        end })
        add({ label = "Schwarzgeld geben", perm = "refund.money", onSelect = function()
            if not refundTarget then return notify("~r~Erst Ziel-ID setzen.") end
            local a = inputNumber("Betrag Schwarzgeld:")
            if a then TriggerServerEvent("ls_admin:giveMoney", refundTarget, "black_money", a) end
        end })
        add({ label = "Item geben", perm = "refund.item", onSelect = function()
            if not refundTarget then return notify("~r~Erst Ziel-ID setzen.") end
            local item = keyboardInput("Item-Name (z.B. bread):", 40)
            if item then
                local c = inputNumber("Menge:") or 1
                TriggerServerEvent("ls_admin:giveItem", refundTarget, item, c)
            end
        end })
        add({ label = "Waffe geben", perm = "refund.weapon", onSelect = function()
            if not refundTarget then return notify("~r~Erst Ziel-ID setzen.") end
            local wp = keyboardInput("Waffe (z.B. WEAPON_PISTOL):", 40)
            if wp then
                local ammo = inputNumber("Munition:") or 100
                TriggerServerEvent("ls_admin:giveWeapon", refundTarget, wp, ammo)
            end
        end })

    elseif page == "faction" then
        section("Fraktionsleitung")
        add({ label = "Fraktionsleitung Ansage", show = isFactionLead, onSelect = function()
            local msg = keyboardInput("Fraktionsleitung Ansage:", 100)
            if msg and msg ~= "" then TriggerServerEvent("ls_admin:factionAnnounce", msg) end
        end })
        add({ label = "Spieler Job geben", perm = "faction.setjob", onSelect = function()
            local id = inputNumber("Spieler-ID:")
            if not id then return end
            local job = keyboardInput("Job-Name (z.B. police):", 40)
            if not job then return end
            local grade = inputNumber("Dienstgrad (0-?):") or 0
            TriggerServerEvent("ls_admin:setJob", id, job, grade)
        end })
        add({ label = "Spieler entlassen (Zivilist)", perm = "faction.setjob", onSelect = function()
            local id = inputNumber("Spieler-ID:")
            if id then TriggerServerEvent("ls_admin:setJob", id, "unemployed", 0) end
        end })
        add({ label = "Fraktion -> zu mir teleportieren", perm = "faction.teleport", submenu = true, onSelect = function() refreshJobs(); pushPage("faction_jobs") end })
        add({ label = "Fraktion heilen", perm = "faction.teleport", submenu = true, onSelect = function() refreshJobs(); pushPage("faction_heal") end })
        add({ label = "Fraktion wiederbeleben", perm = "faction.teleport", submenu = true, onSelect = function() refreshJobs(); pushPage("faction_revive") end })

    elseif page == "faction_jobs" or page == "faction_heal" or page == "faction_revive" then
        local act = (page == "faction_jobs" and "teleportFaction")
            or (page == "faction_heal" and "healFaction") or "reviveFaction"
        section("Fraktion wählen (" .. #jobsCache .. ")")
        if #jobsCache == 0 then add({ label = "Lade Fraktionen...", onSelect = refreshJobs }) end
        for _, j in ipairs(jobsCache) do
            add({ label = j.label, perm = "faction.teleport", onSelect = function()
                TriggerServerEvent("ls_admin:" .. act, j.name)
                popPage()
            end })
        end

    elseif page == "boss" then
        section("Boss Menü")
        add({ label = "Rang/Gruppe vergeben", perm = "boss", onSelect = function()
            local id = inputNumber("Spieler-ID:")
            if id then bossTarget = id; pushPage("boss_roles") end
        end })
        add({ label = "Server-Ansage", perm = "boss", onSelect = function()
            local msg = keyboardInput("Ansage:", 100)
            if msg then TriggerServerEvent("ls_admin:announce", msg) end
        end })
        section("Alle Spieler")
        add({ label = "Alle zu mir holen", perm = "boss", onSelect = function() TriggerServerEvent("ls_admin:allAction", "bring") end })
        add({ label = "Alle heilen", perm = "boss", onSelect = function() TriggerServerEvent("ls_admin:allAction", "heal") end })
        add({ label = "Alle wiederbeleben", perm = "boss", onSelect = function() TriggerServerEvent("ls_admin:allAction", "revive") end })

    elseif page == "boss_roles" then
        section("Rang für ID " .. tostring(bossTarget))
        for grp, role in pairs(Config.Roles) do
            add({ label = role.label, perm = "boss", onSelect = function()
                TriggerServerEvent("ls_admin:setGroup", bossTarget, grp)
                popPage()
            end })
        end

    elseif page == "troll" then
        section("Troll Menü" .. (trollTarget and (" - Ziel " .. trollTarget) or ""))
        add({ label = "Ziel-ID setzen", onSelect = function()
            local id = inputNumber("Spieler-ID:")
            if id then trollTarget = id; notify("Troll-Ziel: " .. id) end
        end })
        local function troll(kind)
            return function()
                if not trollTarget then return notify("~r~Erst Ziel-ID setzen.") end
                TriggerServerEvent("ls_admin:troll", trollTarget, kind)
            end
        end
        add({ label = "Explodieren", onSelect = troll("explode") })
        add({ label = "Anzünden", onSelect = troll("fire") })
        add({ label = "In die Luft schleudern", onSelect = troll("launch") })
        add({ label = "Ragdoll", onSelect = troll("ragdoll") })
        add({ label = "Betrunken machen", onSelect = troll("drunk") })
        add({ label = "Mini-Ped", onSelect = troll("tiny") })
        add({ label = "Riesen-Ped", onSelect = troll("giant") })
        add({ label = "Ped zurücksetzen", onSelect = troll("reset") })
        add({ label = "Wasted (töten)", onSelect = troll("kill") })
    end
    return items
end

local PAGE_TITLES = {
    main = "Admin Menu", admin = "Admin Menu", self = "Eigene Funktionen", vehicle = "Fahrzeug Menü",
    vehicle_spawn = "Fahrzeug spawnen", players = "Spieler Online",
    player_actions = "Spieler-Aktionen", event = "Event Menü",
    refund = "Rückerstattung", faction = "Fraktionsleitung",
    faction_jobs = "Fraktion teleportieren", faction_heal = "Fraktion heilen",
    faction_revive = "Fraktion wiederbeleben", boss = "Boss Menü",
    boss_roles = "Rang vergeben", troll = "Troll Menü",
}

-- ╔═══════════════════════════════════════════════╗
-- ║  Render                                        ║
-- ╚═══════════════════════════════════════════════╝
local LEFT, W = 0.0135, 0.182
local CX = LEFT + W / 2.0

local function isSel(item) return item and item.type ~= "section" end

local function firstSelectable(items, from, dir)
    local n = #items
    if n == 0 then return 1 end
    local i = from
    for _ = 1, n do
        if i < 1 then i = n elseif i > n then i = 1 end
        if isSel(items[i]) then return i end
        i = i + dir
    end
    return from
end

local function drawCheckbox(rightX, rowTop, rowH, checked, sel)
    local bw, bh = 0.008, 0.016
    local bx = rightX - bw - 0.004
    local by = rowTop + (rowH - bh) / 2.0
    local fg = sel and { 25, 25, 25 } or { 235, 235, 235 }
    local bg = sel and { 245, 245, 245 } or { 0, 0, 0 }
    drawRect(bx, by, bw, bh, fg[1], fg[2], fg[3], 255)
    drawRect(bx + 0.0013, by + 0.0023, bw - 0.0026, bh - 0.0046, bg[1], bg[2], bg[3], sel and 255 or 210)
    if checked then
        drawRect(bx + 0.0027, by + 0.0048, bw - 0.0054, bh - 0.0096, fg[1], fg[2], fg[3], 255)
    end
end

-- Aktuelle Items + validierter Index
local function currentView()
    local page = curPage()
    local items = buildItems()
    local n = #items
    local idx = selected[page] or 1
    if idx > n then idx = n end
    if idx < 1 then idx = 1 end
    if not isSel(items[idx]) then idx = firstSelectable(items, idx, 1) end
    selected[page] = idx
    return page, items, idx
end

-- ═══════════════════════════════════════════════
--  Hex-Menü (hex_menu_api) – ersetzt NativeUI (14.07.)
--  buildItems()/pageStack unverändert, nur das Rendering läuft
--  über exports['hex_menu_api'] (RageUI-Look, dist-NUI).
-- ═══════════════════════════════════════════════
local currentItems = {} -- [value-string] = buildItems-Eintrag der aktuellen Seite

local function itemsToElements(items)
    local elements = {}
    currentItems = {}
    for i, item in ipairs(items) do
        local v = tostring(i)
        if item.type == "section" then
            elements[#elements + 1] = { title = string.upper(item.label), type = "seperator" }
        elseif item.checked ~= nil then
            elements[#elements + 1] = { title = item.label, value = v, type = "checkbox", checked = item.checked() and true or false }
            currentItems[v] = item
        elseif item.submenu then
            elements[#elements + 1] = { title = item.label, value = v, type = "buttongo" }
            currentItems[v] = item
        else
            elements[#elements + 1] = { title = item.label, value = v, type = "button" }
            currentItems[v] = item
        end
    end
    return elements
end

function openMenu()
    if not RoleData or not RoleData.menu then return end
    menuOpen = true

    local page = curPage()
    local elements = itemsToElements(buildItems())

    exports["hex_menu_api"]:rageOpen("ls_admin", "menu", {
        header = "https://cfx-nui-hex_menu_api/dist/banners/admin_menu.png", -- ADMIN-MENU-Banner
        title = PAGE_TITLES[page] or page,
        elements = elements,
        align = "left"
    }, function(data, menu)
        local item = data.current and currentItems[tostring(data.current.value)]
        if not item then return end
        local before = curPage()
        if item.onSelect then item.onSelect() end
        -- Seite gewechselt (pushPage in onSelect, z.B. auch "Rang vergeben") -> neu rendern;
        -- reine Aktionen lassen das Menü stehen (Cursor bleibt)
        if menuOpen and curPage() ~= before then openMenu() end
    end, function(data, menu)
        -- Backspace/ESC: eine Seite zurück; auf der Root-Seite muss das NUI
        -- selbst per rageClose geschlossen werden (hex_menu_api macht das NICHT automatisch)
        popPage()
        if menuOpen then openMenu() else closeMenu() end
    end)
end

function closeMenu()
    menuOpen = false
    exports["hex_menu_api"]:rageClose("ls_admin", "menu")
    exports["hex_menu_api"]:rageClose("ls_admin", "vip")
end

-- Mini-Menü für Rollen OHNE vollen Menü-Zugriff, aber mit "nametags"-Recht (z.B. VIP):
-- nur ein Eintrag "Nametags an/aus". Bewusst KEIN hasMenu -> kein Teamchat//revive/Reports.
function openVipMenu()
    menuOpen = true

    local title = string.upper(tostring((RoleData and RoleData.label) or "VIP")) .. " MENU"

    exports["hex_menu_api"]:rageOpen("ls_admin", "vip", {
        title = title,
        elements = {
            { title = "Nametags", value = "nametags", type = "checkbox", checked = state.nametags and true or false }
        },
        align = "left"
    }, function(data, menu)
        if data.current and data.current.value == "nametags" then
            toggleNametags()
        end
    end, function(data, menu)
        -- Backspace/ESC: Mini-Menü hat keine Unterseiten -> immer komplett schließen
        closeMenu()
    end)
end

-- Dynamische Seiten (Spieler-/Fraktionsliste) neu bauen, sobald Daten geladen sind
CreateThread(function()
    local last = -1
    while true do
        Wait(500)
        if menuOpen then
            local p = curPage()
            if p == "players" then
                if #playersCache ~= last then last = #playersCache; openMenu() end
            elseif p == "faction_jobs" or p == "faction_heal" or p == "faction_revive" then
                if #jobsCache ~= last then last = #jobsCache; openMenu() end
            else
                last = -1
            end
        else
            last = -1
        end
    end
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Öffnen / Taste                                ║
-- ╚═══════════════════════════════════════════════╝
-- Garantierte Rückmeldung (auch wenn ESX-Notify fehlt): Subtitle + F8-Konsole
local function feedback(msg)
    notify(msg)
    BeginTextCommandPrint("STRING")
    AddTextComponentSubstringPlayerName(msg)
    EndTextCommandPrint(2500, true)
    print("[ls_admin] " .. msg)
end

local function openCommand()
    if menuOpen then closeMenu() return end
    if not RoleData then
        feedback("Lade Adminrechte... gleich nochmal druecken.")
        loadRole()
        Citizen.SetTimeout(600, function()
            if not menuOpen and RoleData and RoleData.menu then pageStack = { "main" }; openMenu() end
        end)
        return
    end
    if not RoleData.menu then
        -- z.B. VIP: kein volles Menü, aber Nametags-Recht -> Mini-Menü
        if hasPerm("nametags") then
            openVipMenu()
            return
        end
        return feedback("Kein Zugriff (Gruppe: " .. tostring(RoleData.group) .. ")")
    end
    pageStack = { "main" }
    openMenu()
end

RegisterCommand("ls_admin_menu", openCommand, false)
RegisterCommand("adminmenu", openCommand, false)   -- Fallback per Chat: /adminmenu
RegisterKeyMapping("ls_admin_menu", "Admin-Menü öffnen", "keyboard", Config.DefaultKey)

-- ╔═══════════════════════════════════════════════╗
-- ║  Self-Features                                 ║
-- ╚═══════════════════════════════════════════════╝
function toggleGod()
    state.god = not state.god
    SetPlayerInvincible(PlayerId(), state.god)
    SetEntityProofs(PlayerPedId(), state.god, state.god, state.god, state.god, state.god, state.god, state.god, state.god)
    notify("Godmode: " .. (state.god and "AN" or "AUS"))
end

function selfRevive()
    local ped = PlayerPedId()
    local c = GetEntityCoords(ped)
    NetworkResurrectLocalPlayer(c.x, c.y, c.z, GetEntityHeading(ped), true, false)
    SetEntityHealth(ped, GetEntityMaxHealth(ped))
    ClearPedBloodDamage(ped)
    notify("Wiederbelebt.")
end

function toggleInvis()
    state.invis = not state.invis
    SetEntityVisible(PlayerPedId(), not state.invis, false)
    notify("Unsichtbar: " .. (state.invis and "AN" or "AUS"))
end

CreateThread(function()
    while true do
        if state.stamina then RestorePlayerStamina(PlayerId(), 1.0) Wait(800) else Wait(2000) end
    end
end)
CreateThread(function()
    while true do
        if state.god then SetEntityHealth(PlayerPedId(), GetEntityMaxHealth(PlayerPedId())) Wait(1000) else Wait(2000) end
    end
end)

-- txAdmin-Stil Noclip: ECHTE abgekoppelte Freecam (Ped unsichtbar), feste Geschwindigkeit, KEIN Effekt
local NOCLIP_SPEED = 1.0
local NOCLIP_BOOST = 3.0
local NOCLIP_SLOW  = 0.3
local NOCLIP_SENS  = 8.0
local noclipSpeedMult = 1.0   -- einstellbar über Export setNoclipSpeed (ls_adminpanel-Slider)
local noclipCam = nil

function toggleNoclip()
    state.noclip = not state.noclip
    local ped = PlayerPedId()
    if state.noclip then
        local c = GetEntityCoords(ped)
        local r = GetGameplayCamRot(2)
        noclipCam = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA", c.x, c.y, c.z, r.x, 0.0, r.z, GetGameplayCamFov(), false, 2)
        SetCamActive(noclipCam, true)
        RenderScriptCams(true, false, 0, true, true)
        SetEntityInvincible(ped, true)
        FreezeEntityPosition(ped, true)
        SetEntityVisible(ped, false, false)
        SetEntityCollision(ped, false, false)
        closeMenu()  -- Menü schließen, damit WASD/Maus frei fürs Fliegen sind
    else
        RenderScriptCams(false, false, 0, true, true)
        if noclipCam then DestroyCam(noclipCam, false); noclipCam = nil end
        FreezeEntityPosition(ped, false)
        SetEntityInvincible(ped, state.god)
        SetEntityVisible(ped, true, false)
        SetEntityCollision(ped, true, true)
    end
    notify("Noclip: " .. (state.noclip and "AN (WASD + Maus, Shift = schnell)" or "AUS"))
end

CreateThread(function()
    while true do
        if state.noclip and noclipCam then
            local ped = PlayerPedId()

            -- Maus-Look (rotiert die Kamera)
            local rot = GetCamRot(noclipCam, 2)
            local newZ = rot.z - GetDisabledControlNormal(0, 1) * NOCLIP_SENS
            local newX = rot.x - GetDisabledControlNormal(0, 2) * NOCLIP_SENS
            newX = math.max(-89.0, math.min(89.0, newX))
            SetCamRot(noclipCam, newX, 0.0, newZ, 2)

            local speed = NOCLIP_SPEED * noclipSpeedMult
            if IsDisabledControlPressed(0, 21) then speed = NOCLIP_BOOST * noclipSpeedMult -- Shift = schnell
            elseif IsDisabledControlPressed(0, 19) then speed = NOCLIP_SLOW end             -- Alt = langsam

            local pitch, yaw = math.rad(newX), math.rad(newZ)
            local fwd = vector3(-math.sin(yaw) * math.cos(pitch), math.cos(yaw) * math.cos(pitch), math.sin(pitch))
            local right = vector3(math.cos(yaw), math.sin(yaw), 0.0)
            local pos = GetCamCoord(noclipCam)
            local mx, my, mz = 0.0, 0.0, 0.0
            if IsDisabledControlPressed(0, 32) then mx = mx + fwd.x; my = my + fwd.y; mz = mz + fwd.z end   -- W
            if IsDisabledControlPressed(0, 33) then mx = mx - fwd.x; my = my - fwd.y; mz = mz - fwd.z end   -- S
            if IsDisabledControlPressed(0, 34) then mx = mx - right.x; my = my - right.y end                -- A
            if IsDisabledControlPressed(0, 35) then mx = mx + right.x; my = my + right.y end                -- D
            if IsDisabledControlPressed(0, 22) then mz = mz + 1.0 end                                       -- Space hoch
            if IsDisabledControlPressed(0, 36) then mz = mz - 1.0 end                                       -- Strg runter

            local nx, ny, nz = pos.x + mx * speed, pos.y + my * speed, pos.z + mz * speed
            SetCamCoord(noclipCam, nx, ny, nz)
            SetEntityCoordsNoOffset(ped, nx, ny, nz - 1.0, true, true, true)

            -- Spiel-Steuerung blocken
            DisableControlAction(0, 1, true)  DisableControlAction(0, 2, true)
            DisableControlAction(0, 24, true) DisableControlAction(0, 25, true)
            DisableControlAction(0, 30, true) DisableControlAction(0, 31, true)
            DisableControlAction(0, 32, true) DisableControlAction(0, 33, true)
            DisableControlAction(0, 34, true) DisableControlAction(0, 35, true)
            DisableControlAction(0, 21, true) DisableControlAction(0, 22, true)
            DisableControlAction(0, 36, true) DisableControlAction(0, 44, true)
            Wait(0)
        else
            Wait(250)
        end
    end
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Fahrzeug-Features                             ║
-- ╚═══════════════════════════════════════════════╝
function curVeh()
    local ped = PlayerPedId()
    local v = GetVehiclePedIsIn(ped, false)
    if v == 0 then
        local c = GetEntityCoords(ped)
        v = GetClosestVehicle(c.x, c.y, c.z, 5.0, 0, 71)
    end
    if v == 0 then notify("~r~Kein Fahrzeug in der Nähe.") return nil end
    return v
end

function maxMods()
    local v = curVeh()
    if not v then return end
    SetVehicleModKit(v, 0)
    for i = 0, 16 do SetVehicleMod(v, i, GetNumVehicleMods(v, i) - 1, false) end
    ToggleVehicleMod(v, 18, true)
    SetVehicleFixed(v)
    notify("Max Tuning angewendet.")
end

function spawnVehicle(model)
    local hash = GetHashKey(model)
    if not IsModelInCdimage(hash) then return notify("~r~Modell unbekannt: " .. model) end
    RequestModel(hash)
    local t = GetGameTimer()
    while not HasModelLoaded(hash) and GetGameTimer() - t < 5000 do Wait(10) end
    if not HasModelLoaded(hash) then return notify("~r~Modell konnte nicht geladen werden.") end
    local ped = PlayerPedId()
    local c = GetEntityCoords(ped)
    local veh = CreateVehicle(hash, c.x, c.y, c.z, GetEntityHeading(ped), true, false)
    SetPedIntoVehicle(ped, veh, -1)
    SetVehicleNumberPlateText(veh, "ADMIN")
    SetModelAsNoLongerNeeded(hash)
    notify("Gespawnt: " .. model)
end

-- ╔═══════════════════════════════════════════════╗
-- ║  Spieler-Features                              ║
-- ╚═══════════════════════════════════════════════╝
function refreshPlayers()
    ESX.TriggerServerCallback("ls_admin:getPlayers", function(list) playersCache = list or {} end)
end

function refreshJobs()
    ESX.TriggerServerCallback("ls_admin:getJobs", function(list) jobsCache = list or {} end)
end

-- /reportpanel liegt als eigenes NUI in resources/[standalone]/ls_reportpanel
-- (nutzt die Server-Events/Callbacks hier: getReports/claimReport/closeReport/goto/bring/heal/revive)

-- Server-Ansage
RegisterNetEvent("ls_admin:showAnnounce", function(text)
    notify("~y~[ANSAGE] ~w~" .. text)
end)

-- Troll-Effekte (laufen auf dem Ziel-Client)
RegisterNetEvent("ls_admin:doTroll", function(kind)
    local ped = PlayerPedId()
    local c = GetEntityCoords(ped)
    if kind == "explode" then
        AddExplosion(c.x, c.y, c.z, 2, 1.0, true, false, 1.0)
    elseif kind == "fire" then
        StartEntityFire(ped)
    elseif kind == "launch" then
        SetEntityVelocity(ped, 0.0, 0.0, 30.0)
        SetPedToRagdoll(ped, 5000, 5000, 0, true, true, false)
    elseif kind == "ragdoll" then
        SetPedToRagdoll(ped, 4000, 4000, 0, true, true, false)
    elseif kind == "drunk" then
        SetTimecycleModifier("drug_drive_blend")
        SetPedMotionBlur(ped, true)
        SetPedIsDrunk(ped, true)
        RequestAnimSet("move_m@drunk@verydrunk")
        while not HasAnimSetLoaded("move_m@drunk@verydrunk") do Wait(10) end
        SetPedMovementClipset(ped, "move_m@drunk@verydrunk", 1.0)
        Citizen.SetTimeout(20000, function()
            ResetPedMovementClipset(ped, 1.0)
            ClearTimecycleModifier()
            SetPedIsDrunk(ped, false)
        end)
    elseif kind == "tiny" then
        SetPedConfigFlag(ped, 223, true)
        SetPedConfigFlag(ped, 241, true)
    elseif kind == "giant" then
        -- "Riesen"-Effekt via hoher Sprungkraft (echte Ped-Skalierung ist nicht nativ)
        SetPedConfigFlag(ped, 223, false)
        SetSuperJumpThisFrame(PlayerId())
    elseif kind == "reset" then
        SetPedConfigFlag(ped, 223, false)
        SetPedConfigFlag(ped, 241, false)
        ResetPedMovementClipset(ped, 1.0)
        ClearTimecycleModifier()
        SetPedIsDrunk(ped, false)
        ClearPedTasksImmediately(ped)
    elseif kind == "kill" then
        SetEntityHealth(ped, 0)
    end
end)

RegisterNetEvent("ls_admin:teleport", function(x, y, z)
    SetEntityCoords(PlayerPedId(), x + 0.5, y + 0.5, z, false, false, false, true)
end)
RegisterNetEvent("ls_admin:doHeal", function()
    local ped = PlayerPedId()
    SetEntityHealth(ped, GetEntityMaxHealth(ped))
    SetPedArmour(ped, 100)
end)
RegisterNetEvent("ls_admin:doRevive", function()
    local ped = PlayerPedId()
    local c = GetEntityCoords(ped)
    NetworkResurrectLocalPlayer(c.x, c.y, c.z, GetEntityHeading(ped), true, false)
    SetEntityHealth(ped, GetEntityMaxHealth(ped))
    ClearPedBloodDamage(ped)
end)
RegisterNetEvent("ls_admin:doFreeze", function(st) FreezeEntityPosition(PlayerPedId(), st) end)

function toggleSpectate(id)
    state.spectate = not state.spectate
    if state.spectate then
        local target = GetPlayerFromServerId(id)
        if target == -1 then state.spectate = false return notify("~r~Spieler nicht in der Nähe.") end
        NetworkSetInSpectatorMode(true, GetPlayerPed(target))
        notify("Spectate AN für ID " .. id)
        closeMenu()
    else
        NetworkSetInSpectatorMode(false, PlayerPedId())
        notify("Spectate AUS")
    end
end

-- ╔═══════════════════════════════════════════════╗
-- ║  Event-Features                                ║
-- ╚═══════════════════════════════════════════════╝
RegisterNetEvent("ls_admin:applyWeather", function(weather)
    SetWeatherTypeOverTime(weather, 10.0)
    Wait(10000)
    SetWeatherTypePersist(weather)
    SetWeatherTypeNowPersist(weather)
    SetWeatherTypeNow(weather)
end)
RegisterNetEvent("ls_admin:applyTime", function(hour) NetworkOverrideClockTime(hour, 0, 0) end)

-- ╔═══════════════════════════════════════════════╗
-- ║  ADuty + Admin-Anzug                           ║
-- ╚═══════════════════════════════════════════════╝
local function saveAppearance()
    local ped = PlayerPedId()
    local skin = { components = {}, props = {} }
    for i = 0, 11 do skin.components[i] = { d = GetPedDrawableVariation(ped, i), t = GetPedTextureVariation(ped, i) } end
    for i = 0, 2 do skin.props[i] = { d = GetPedPropIndex(ped, i), t = GetPedPropTextureIndex(ped, i) } end
    return skin
end

local function restoreAppearance(skin)
    if not skin then return end
    local ped = PlayerPedId()
    for i = 0, 11 do if skin.components[i] then SetPedComponentVariation(ped, i, skin.components[i].d, skin.components[i].t, 0) end end
    for i = 0, 2 do
        if skin.props[i] then
            if skin.props[i].d == -1 then ClearPedProp(ped, i) else SetPedPropIndex(ped, i, skin.props[i].d, skin.props[i].t, true) end
        end
    end
end

local function applyAdminSuit()
    if not Config.AdminSuit.enabled then return end
    local ped = PlayerPedId()
    local isFemale = GetEntityModel(ped) == GetHashKey("mp_f_freemode_01")
    local set = isFemale and Config.AdminSuit.female or Config.AdminSuit.male
    local suitTex = (RoleData and RoleData.suitTex) or 0
    -- Rollen-Farbe (suitTex) auf diese Komponenten anwenden; Arme (3) & T-Shirt (8) behalten ihre eigene Textur
    local coloredComps = { [1] = true, [4] = true, [6] = true, [11] = true }
    for comp, v in pairs(set) do
        SetPedComponentVariation(ped, comp, v.drawable, coloredComps[comp] and suitTex or v.texture, 0)
    end
end

RegisterNetEvent("ls_admin:setAduty", function(on)
    state.aduty = on
    if on then savedSkin = saveAppearance() applyAdminSuit()
    else restoreAppearance(savedSkin) savedSkin = nil end
end)

-- ADuty direkt per Taste togglen (Standard X, rebindbar in den FiveM-Einstellungen)
RegisterCommand("ls_admin_aduty", function()
    if not hasPerm("aduty") then return end -- Nicht-Admins: Taste tut nichts (kein Notify-Spam)
    TriggerServerEvent("ls_admin:toggleAduty")
end, false)
RegisterKeyMapping("ls_admin_aduty", "ADuty an/aus", "keyboard", Config.AdutyKey or "X")

-- Noclip direkt per Taste togglen (Standard unbelegt, bindbar in den FiveM-Einstellungen)
RegisterCommand("ls_admin_noclip", function()
    if not hasPerm("self.noclip") then return end -- ohne Recht: Taste tut nichts (kein Notify-Spam)
    toggleNoclip()
end, false)
RegisterKeyMapping("ls_admin_noclip", "Noclip an/aus", "keyboard", Config.NoclipKey or "")

-- ╔═══════════════════════════════════════════════╗
-- ║  ADuty-Namen über dem Kopf (sehen ALLE)        ║
-- ╚═══════════════════════════════════════════════╝
local adutyTags = {} -- [serverId] = { name, label, color } (vom Server gebroadcastet)

RegisterNetEvent("ls_admin:adutyList", function(list)
    adutyTags = list or {}
end)

-- beim Laden aktuellen Stand abholen (falls schon Admins im Dienst sind)
RegisterNetEvent("esx:playerLoaded", function()
    Wait(2000)
    TriggerServerEvent("ls_admin:requestAdutyList")
end)
CreateThread(function()
    Wait(3000)
    TriggerServerEvent("ls_admin:requestAdutyList")
end)

-- 3-zeiliger Tag (Vorlage-Screenshot): ROLLE (Rollenfarbe) / Name (weiß) / ID: #X (Rollenfarbe).
-- SetDrawOrigin statt World3dToScreen2d: World3dToScreen2d rechnet mit den
-- Kamera-Daten vom LETZTEN Frame -> Tag zittert/hinkt beim Laufen hinterher.
-- SetDrawOrigin klebt frame-synchron an der 3D-Position (kein Ruckeln).
local function drawAdutyTag(coords, textTop, textMid, serverId, color)
    local r, g, b = color[1] or 255, color[2] or 255, color[3] or 255
    SetDrawOrigin(coords.x, coords.y, coords.z, 0)

    -- Zeile 1: Rollen-Label in Rollenfarbe (klein, uppercase)
    SetTextFont(4)
    SetTextScale(0.35, 0.35)
    SetTextColour(r, g, b, 255)
    SetTextCentre(true)
    SetTextDropshadow(1, 0, 0, 0, 220)
    SetTextDropShadow()
    SetTextEntry("STRING")
    AddTextComponentString(string.upper(textTop))
    DrawText(0.0, 0.0)

    -- Zeile 2: Spielername in Weiß (größer)
    SetTextFont(4)
    SetTextScale(0.42, 0.42)
    SetTextColour(255, 255, 255, 255)
    SetTextCentre(true)
    SetTextDropshadow(1, 0, 0, 0, 220)
    SetTextDropShadow()
    SetTextEntry("STRING")
    AddTextComponentString(textMid)
    DrawText(0.0, 0.026)

    -- Zeile 3: ID in Rollenfarbe (klein)
    SetTextFont(4)
    SetTextScale(0.32, 0.32)
    SetTextColour(r, g, b, 255)
    SetTextCentre(true)
    SetTextDropshadow(1, 0, 0, 0, 220)
    SetTextDropShadow()
    SetTextEntry("STRING")
    AddTextComponentString(("ID: #%d"):format(serverId))
    DrawText(0.0, 0.056)

    ClearDrawOrigin()
end

CreateThread(function()
    while true do
        if next(adutyTags) then
            local myPid = PlayerId()
            local myCoords = GetEntityCoords(PlayerPedId())
            local dist = Config.AdutyTagDistance or 35.0
            local firstPerson = GetFollowPedCamViewMode() == 4
            for _, pid in ipairs(GetActivePlayers()) do
                local sid = GetPlayerServerId(pid)
                local d = adutyTags[sid]
                -- eigener Tag: nur in Third-Person zeichnen (in Ego haengt er sonst mitten im Bild)
                if d and not (pid == myPid and firstPerson) then
                    local ped = GetPlayerPed(pid)
                    if ped ~= 0 and DoesEntityExist(ped) then
                        local pc = GetEntityCoords(ped)
                        if #(pc - myCoords) <= dist then
                            drawAdutyTag(vector3(pc.x, pc.y, pc.z + 1.25), d.label or "Admin", d.name or "?", sid, d.color or { 255, 255, 255 })
                        end
                    end
                end
            end
            Wait(0)
        else
            Wait(500)
        end
    end
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Nametags (native GTA/tx-Gamertags)            ║
-- ╚═══════════════════════════════════════════════╝
function toggleNametags()
    if not hasPerm("nametags") then return end
    state.nametags = not state.nametags
    notify("Nametags: " .. (state.nametags and "AN" or "AUS"))
    if state.nametags then refreshPlayers() end
end

-- Rollenfarbe -> HUD-Farbindex (für die Namensfarbe)
local function hudColorFor(c)
    if not c then return 0 end
    if c[1] > 180 and c[2] < 90 and c[3] < 90 then return 6 end   -- Rot
    if c[3] > 160 and c[1] < 120 then return 4 end                -- Blau
    if c[2] > 160 and c[1] < 120 then return 2 end                -- Grün
    if c[1] > 180 and c[2] > 150 and c[3] < 90 then return 5 end  -- Gelb
    return 0                                                       -- Weiß
end

-- GamerTag-Komponenten (wie txAdmin)
local TAG_NAME, TAG_HEALTH, TAG_AUDIO = 0, 2, 4
local playerGamerTags = {} -- [playerIndex] = { tag, ped, text }

local function clearTags()
    for _, t in pairs(playerGamerTags) do
        if t.tag and IsMpGamerTagActive(t.tag) then RemoveMpGamerTag(t.tag) end
    end
    playerGamerTags = {}
end

-- Setzt die Tag-Komponenten EXAKT wie txAdmin (Original: weißer Name, grün nur beim Reden)
local function applyTxTag(tag, pid)
    SetMpGamerTagVisibility(tag, TAG_NAME, true)
    SetMpGamerTagHealthBarColor(tag, 129)
    SetMpGamerTagAlpha(tag, TAG_HEALTH, 255)
    SetMpGamerTagVisibility(tag, TAG_HEALTH, true)
    SetMpGamerTagAlpha(tag, TAG_AUDIO, 255)
    if NetworkIsPlayerTalking(pid) then
        SetMpGamerTagVisibility(tag, TAG_AUDIO, true)
        SetMpGamerTagColour(tag, TAG_AUDIO, 12)
        SetMpGamerTagColour(tag, TAG_NAME, 12)
    else
        SetMpGamerTagVisibility(tag, TAG_AUDIO, false)
        SetMpGamerTagColour(tag, TAG_AUDIO, 0)
        SetMpGamerTagColour(tag, TAG_NAME, 0)
    end
end

CreateThread(function()
    local distanceToCheck = Config.NametagDistance or 150.0
    while true do
        if state.nametags then
            -- ServerID -> Daten (Job/Rolle) aus dem Server-Cache
            local byId = {}
            for _, p in ipairs(playersCache) do byId[p.id] = p end

            local myCoords = GetEntityCoords(PlayerPedId())
            local active = {}
            for _, pid in ipairs(GetActivePlayers()) do
                active[pid] = true
                local ped = GetPlayerPed(pid)
                local sid = GetPlayerServerId(pid)
                local d = byId[sid]
                local pname = (d and d.name) or (GetPlayerName(pid) or "?")
                local text
                if d then
                    text = ("[%d] [%s] %s [%s]"):format(sid, d.job, pname, d.roleLabel or "Zivilist")
                else
                    text = ("[%d] %s"):format(sid, pname)
                end

                local cache = playerGamerTags[pid]
                if not cache or cache.ped ~= ped or cache.text ~= text or not IsMpGamerTagActive(cache.tag) then
                    if cache and cache.tag and IsMpGamerTagActive(cache.tag) then RemoveMpGamerTag(cache.tag) end
                    playerGamerTags[pid] = { tag = CreateFakeMpGamerTag(ped, text, false, false, "", 0), ped = ped, text = text }
                    cache = playerGamerTags[pid]
                end

                if ped ~= 0 and DoesEntityExist(ped) and #(GetEntityCoords(ped) - myCoords) <= distanceToCheck then
                    applyTxTag(cache.tag, pid)
                else
                    SetMpGamerTagVisibility(cache.tag, TAG_NAME, false)
                    SetMpGamerTagVisibility(cache.tag, TAG_HEALTH, false)
                    SetMpGamerTagVisibility(cache.tag, TAG_AUDIO, false)
                end
            end
            -- nicht mehr aktive Spieler aufräumen
            for pid, t in pairs(playerGamerTags) do
                if not active[pid] then
                    if t.tag and IsMpGamerTagActive(t.tag) then RemoveMpGamerTag(t.tag) end
                    playerGamerTags[pid] = nil
                end
            end
            Wait(250)
        else
            if next(playerGamerTags) then clearTags() end
            Wait(500)
        end
    end
end)

CreateThread(function()
    while true do
        if state.nametags then refreshPlayers() end
        Wait(5000)
    end
end)

-- ╔═══════════════════════════════════════════════╗
-- ║  Exports für ls_creatormenu (Content-Creator)  ║
-- ╚═══════════════════════════════════════════════╝
-- Die Toggles prüfen selbst hasPerm() -> ohne Recht passiert nichts.
exports("toggleNoclip", function()
    toggleNoclip()
    return state.noclip
end)

exports("toggleNametags", function()
    toggleNametags()
    return state.nametags
end)

exports("getStates", function()
    return { noclip = state.noclip, nametags = state.nametags, aduty = state.aduty, spectate = state.spectate }
end)

-- Für ls_adminpanel: Noclip-Geschwindigkeit (0.25 .. 5.0) + Spectate
exports("setNoclipSpeed", function(mult)
    noclipSpeedMult = math.max(0.25, math.min(5.0, tonumber(mult) or 1.0))
    return noclipSpeedMult
end)

exports("toggleSpectate", function(id)
    if not hasPerm("players.spectate") then return false end
    toggleSpectate(tonumber(id))
    return state.spectate
end)
