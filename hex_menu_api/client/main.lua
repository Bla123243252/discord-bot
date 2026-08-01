-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  hex_menu_api – OFFENE Lua-Bridge (Neuimplementierung)             ║
-- ║  Original-client/main.lua + shared.lua waren FXAP-escrow-          ║
-- ║  verschlüsselt -> komplett neu geschrieben gegen die vorhandene    ║
-- ║  dist/-NUI (Protokoll aus dem JS-Bundle rekonstruiert).            ║
-- ║                                                                    ║
-- ║  NUI -> Lua Callbacks:  rageui/menu_submit|menu_change|menu_cancel ║
-- ║                         input/menu_submit|menu_cancel              ║
-- ║  Lua -> NUI Messages:   {action='rageui/openMenu', data={...}}     ║
-- ║                         rageui/closeMenu, rageui/controlPressed    ║
-- ║                         (TOP/DOWN/LEFT/RIGHT/ENTER/BACKSPACE),     ║
-- ║                         input/openMenu, input/closeMenu            ║
-- ║  WICHTIG: Der Ressourcen-Name MUSS 'hex_menu_api' bleiben          ║
-- ║  (die NUI postet hardcoded an https://hex_menu_api/...).           ║
-- ╚══════════════════════════════════════════════════════════════════╝

local rageMenus = {}   -- [key] = { namespace, name, data, onSubmit, onCancel, onChange }
local rageStack = {}   -- Reihenfolge der offenen Rage-Menüs (letztes = oben)
local inputMenus = {}  -- [key] = { namespace, name, data, onSubmit, onCancel }
local inputStack = {}

local function key(ns, name) return ns .. "/" .. name end

local function stackRemove(stack, k)
    for i = #stack, 1, -1 do
        if stack[i] == k then table.remove(stack, i) end
    end
end

local function playSound(name)
    PlaySoundFrontend(-1, name, "HUD_FRONTEND_DEFAULT_SOUNDSET", true)
end

local function updateFocus()
    -- Nur Input-Dialoge brauchen NUI-Fokus (Tastatur), Rage-Menüs laufen ohne
    SetNuiFocus(#inputStack > 0, #inputStack > 0)
end

-- ── Rage-Menü schließen (Lua-seitig + NUI) ──────────────────────────
local function closeRage(k, silent)
    local m = rageMenus[k]
    if not m then return end
    rageMenus[k] = nil
    stackRemove(rageStack, k)
    SendNUIMessage({ action = "rageui/closeMenu", data = { namespace = m.namespace, name = m.name } })
    if not silent then playSound("BACK") end
end

local function closeInput(k)
    local m = inputMenus[k]
    if not m then return end
    inputMenus[k] = nil
    stackRemove(inputStack, k)
    SendNUIMessage({ action = "input/closeMenu", data = { namespace = m.namespace, name = m.name } })
    updateFocus()
end

-- ── Menü-Objekt, das an die Callbacks übergeben wird ────────────────
-- (API wie im Original: menu.close() / menu.setElement(el, key, val) / menu.refresh())
local function makeRageMenuObj(k, callbackElements)
    local obj = {}
    obj.close = function() closeRage(k, true) end
    obj.setElement = function(element, field, value)
        if element then element[field] = value end
    end
    obj.refresh = function()
        local m = rageMenus[k]
        if not m then return end
        if callbackElements then m.data.elements = callbackElements end
        SendNUIMessage({ action = "rageui/openMenu", data = { namespace = m.namespace, name = m.name, data = m.data } })
    end
    return obj
end

local function makeInputMenuObj(k)
    return { close = function() closeInput(k) end }
end

-- ── Steuerungs-Thread (läuft solange ein Rage-Menü offen ist) ───────
local controlsRunning = false

local function sendControl(ctrl)
    SendNUIMessage({ action = "rageui/controlPressed", data = ctrl })
end

local function startControls()
    if controlsRunning then return end
    controlsRunning = true

    CreateThread(function()
        -- Halten = Wiederholen (350 ms Anlauf, dann alle 130 ms)
        local held = {}
        local function pressedRepeat(control, name)
            if IsDisabledControlJustPressed(0, control) then
                held[control] = GetGameTimer() + 350
                return true
            end
            if IsDisabledControlPressed(0, control) and held[control] and GetGameTimer() > held[control] then
                held[control] = GetGameTimer() + 130
                return true
            end
            if not IsDisabledControlPressed(0, control) then held[control] = nil end
            return false
        end

        while #rageStack > 0 do
            Wait(0)

            -- Menü-Tasten fürs Spiel sperren (Handy/Pause öffnen nicht)
            DisableControlAction(0, 172, true) -- Pfeil hoch
            DisableControlAction(0, 173, true) -- Pfeil runter
            DisableControlAction(0, 174, true) -- Pfeil links
            DisableControlAction(0, 175, true) -- Pfeil rechts
            DisableControlAction(0, 176, true) -- Enter
            DisableControlAction(0, 177, true) -- Backspace
            DisableControlAction(0, 200, true) -- ESC
            DisableControlAction(0, 201, true) -- Enter (Frontend)
            DisableControlAction(0, 202, true) -- ESC/Backspace (Frontend)

            if #inputStack == 0 then -- bei offenem Input-Dialog hat die NUI den Fokus
                if pressedRepeat(172, "TOP") then playSound("NAV_UP_DOWN") sendControl("TOP") end
                if pressedRepeat(173, "DOWN") then playSound("NAV_UP_DOWN") sendControl("DOWN") end
                if pressedRepeat(174, "LEFT") then playSound("NAV_LEFT_RIGHT") sendControl("LEFT") end
                if pressedRepeat(175, "RIGHT") then playSound("NAV_LEFT_RIGHT") sendControl("RIGHT") end

                if IsDisabledControlJustPressed(0, 176) or IsDisabledControlJustPressed(0, 201) then
                    playSound("SELECT")
                    sendControl("ENTER")
                end
                if IsDisabledControlJustPressed(0, 177) or IsDisabledControlJustPressed(0, 200) or IsDisabledControlJustPressed(0, 202) then
                    playSound("BACK")
                    sendControl("BACKSPACE")
                end
                -- Rechtsklick schließt (wie Original-Config)
                if Config.RightClickMenuClose and IsDisabledControlJustPressed(0, 25) then
                    playSound("BACK")
                    sendControl("BACKSPACE")
                end
            end
        end

        controlsRunning = false
    end)
end

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  EXPORTS (API wie das Original, siehe client/example_menu.lua)     ║
-- ╚══════════════════════════════════════════════════════════════════╝
exports("rageOpen", function(namespace, name, data, onSubmit, onCancel, onChange)
    if not namespace or not name or type(data) ~= "table" then return end

    data.header = data.header or Config.DefaultHeader
    data.elements = data.elements or {}
    if #data.elements == 0 then
        -- Leere-Array-Falle (Erkenntnis #18) + NUI erwartet mind. 1 Element
        data.elements = { { title = "Keine Einträge", type = "button", value = "__empty", locked = true } }
    end

    local k = key(namespace, name)
    if rageMenus[k] then
        -- gleiches Menü neu öffnen (z.B. Seitenwechsel) -> NUI-Stack sauber halten
        SendNUIMessage({ action = "rageui/closeMenu", data = { namespace = namespace, name = name } })
    end

    rageMenus[k] = { namespace = namespace, name = name, data = data, onSubmit = onSubmit, onCancel = onCancel, onChange = onChange }
    stackRemove(rageStack, k)
    rageStack[#rageStack + 1] = k

    data._index = #rageStack
    SendNUIMessage({ action = "rageui/openMenu", data = { namespace = namespace, name = name, data = data } })
    startControls()
end)

exports("rageClose", function(namespace, name)
    closeRage(key(namespace, name), true)
end)

exports("rageCloseAll", function()
    for k in pairs(rageMenus) do closeRage(k, true) end
    for k in pairs(inputMenus) do closeInput(k) end
end)

exports("inputOpen", function(namespace, name, data, onSubmit, onCancel)
    if not namespace or not name or type(data) ~= "table" then return end

    local k = key(namespace, name)
    inputMenus[k] = { namespace = namespace, name = name, data = data, onSubmit = onSubmit, onCancel = onCancel }
    stackRemove(inputStack, k)
    inputStack[#inputStack + 1] = k

    data._index = #inputStack
    SendNUIMessage({ action = "input/openMenu", data = { namespace = namespace, name = name, data = data } })
    updateFocus()
end)

exports("inputClose", function(namespace, name)
    closeInput(key(namespace, name))
end)

exports("getElementByValue", function(elements, value)
    if type(elements) ~= "table" then return nil end
    for _, el in pairs(elements) do
        if type(el) == "table" and el.value == value then return el end
    end
    return nil
end)

exports("isAnyMenuOpen", function()
    return #rageStack > 0 or #inputStack > 0
end)

-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  NUI-Callbacks                                                     ║
-- ╚══════════════════════════════════════════════════════════════════╝
RegisterNUICallback("rageui/menu_submit", function(d, cb)
    cb({})
    local k = key(d.namespace or "", d.name or "")
    local m = rageMenus[k]
    if not m then return end
    if d.elements then m.data.elements = d.elements end -- Checkbox-Toggles etc. übernehmen
    if m.onSubmit then m.onSubmit({ current = d.current, elements = d.elements }, makeRageMenuObj(k, d.elements)) end
end)

RegisterNUICallback("rageui/menu_change", function(d, cb)
    cb({})
    local k = key(d.namespace or "", d.name or "")
    local m = rageMenus[k]
    if not m then return end
    if d.elements then m.data.elements = d.elements end
    if m.onChange then m.onChange({ current = d.current, elements = d.elements, type = d.type }, makeRageMenuObj(k, d.elements)) end
end)

RegisterNUICallback("rageui/menu_cancel", function(d, cb)
    cb({})
    local k = key(d.namespace or "", d.name or "")
    local m = rageMenus[k]
    if not m then return end
    -- WICHTIG: anders als beim Input-Dialog entfernt die NUI das Rage-Menü bei
    -- BACKSPACE NICHT selbst aus dem DOM (siehe dist-Bundle: der Cancel-Handler
    -- postet nur "rageui/menu_cancel", ohne lokal zu schließen). Das Schließen
    -- läuft also komplett über onCancel -> menu.close()/rageClose() bzw. ein
    -- erneutes rageOpen() (Seite zurück). Deshalb hier NICHT vorab aufräumen -
    -- sonst findet rageClose() den Eintrag nicht mehr und schickt nie die
    -- nötige rageui/closeMenu-Message (Menü bleibt sichtbar stehen).
    if m.onCancel then m.onCancel({}, makeRageMenuObj(k)) end
end)

RegisterNUICallback("input/menu_submit", function(d, cb)
    cb({})
    local k = key(d.namespace or "", d.name or "")
    local m = inputMenus[k]
    if not m then return end
    if m.onSubmit then m.onSubmit({ value = d.value }, makeInputMenuObj(k)) end
end)

RegisterNUICallback("input/menu_cancel", function(d, cb)
    cb({})
    local k = key(d.namespace or "", d.name or "")
    local m = inputMenus[k]
    if not m then return end
    -- NUI hat den Dialog bei ESC bereits entfernt
    inputMenus[k] = nil
    stackRemove(inputStack, k)
    updateFocus()
    if m.onCancel then m.onCancel({}, makeInputMenuObj(k)) end
end)

-- Nie Fokus zurücklassen
AddEventHandler("onResourceStop", function(res)
    if res ~= GetCurrentResourceName() then return end
    SetNuiFocus(false, false)
end)
