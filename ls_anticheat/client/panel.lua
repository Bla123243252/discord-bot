local ESX = exports["es_extended"]:getSharedObject()
local nuiOpen = false

local function notify(msg)
    TriggerEvent("chat:addMessage", { args = { "^3[Anticheat]", msg } })
end

local function openNui()
    if nuiOpen then return end
    nuiOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({ action = "open" })
end

local function closeNui()
    if not nuiOpen then return end
    nuiOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = "close" })
end

RegisterCommand("acpanel", function()
    ESX.TriggerServerCallback("ls_anticheat:getDashboard", function(data)
        if not data then return notify("Keine Berechtigung.") end
        openNui()
        SendNUIMessage({ action = "dashboard", data = data })
    end)
end, false)

RegisterNUICallback("close", function(_, cb)
    closeNui()
    cb({})
end)

RegisterNUICallback("getDashboard", function(_, cb)
    ESX.TriggerServerCallback("ls_anticheat:getDashboard", function(data) cb(data or {}) end)
end)

RegisterNUICallback("getPlayers", function(_, cb)
    ESX.TriggerServerCallback("ls_anticheat:getPlayers", function(list) cb(list or {}) end)
end)

RegisterNUICallback("getFlags", function(_, cb)
    ESX.TriggerServerCallback("ls_anticheat:getFlags", function(list) cb(list or {}) end)
end)

RegisterNUICallback("getBans", function(_, cb)
    ESX.TriggerServerCallback("ls_anticheat:getBans", function(list) cb(list or {}) end)
end)

RegisterNUICallback("getWhitelist", function(_, cb)
    ESX.TriggerServerCallback("ls_anticheat:getWhitelist", function(list) cb(list or {}) end)
end)

RegisterNUICallback("action", function(data, cb)
    TriggerServerEvent("ls_anticheat:panelAction", data)
    cb({})
end)

RegisterNetEvent("ls_anticheat:doGoto", function(coords)
    SetEntityCoords(PlayerPedId(), coords.x, coords.y, coords.z, false, false, false, true)
end)

RegisterNetEvent("ls_anticheat:doSpectate", function(targetServerId)
    local targetPlayer = GetPlayerFromServerId(targetServerId)
    if targetPlayer == -1 then
        return notify("Zielspieler nicht gefunden.")
    end
    NetworkSetInSpectatorMode(true, GetPlayerPed(targetPlayer))
    notify("Beobachtung aktiv. Mit /acstopspectate beenden.")
end)

RegisterCommand("acstopspectate", function()
    NetworkSetInSpectatorMode(false, PlayerPedId())
    notify("Beobachtung beendet.")
end, false)
