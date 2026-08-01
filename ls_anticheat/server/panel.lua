local ESX = exports["es_extended"]:getSharedObject()

local function findSrcByLicense(license)
    for _, p in ipairs(GetPlayers()) do
        local src = tonumber(p)
        if AC_GetIdentifiers(src) == license then return src end
    end
    return nil
end

ESX.RegisterServerCallback("ls_anticheat:getDashboard", function(src, cb)
    if not AC_CanDo(src, "anticheat.view") then return cb(nil) end
    cb({
        onlinePlayers = #GetPlayers(),
        openFlags = #AC_ListOpenFlags(9999),
        activeBans = #AC_ListActiveBans(),
    })
end)

ESX.RegisterServerCallback("ls_anticheat:getPlayers", function(src, cb)
    if not AC_CanDo(src, "anticheat.view") then return cb(nil) end
    local list = {}
    for _, p in ipairs(GetPlayers()) do
        local pSrc = tonumber(p)
        list[#list + 1] = { id = pSrc, name = GetPlayerName(pSrc), license = AC_GetIdentifiers(pSrc) }
    end
    cb(list)
end)

ESX.RegisterServerCallback("ls_anticheat:getFlags", function(src, cb)
    if not AC_CanDo(src, "anticheat.view") then return cb(nil) end
    cb(AC_ListOpenFlags(50))
end)

ESX.RegisterServerCallback("ls_anticheat:getBans", function(src, cb)
    if not AC_CanDo(src, "anticheat.view") then return cb(nil) end
    cb(AC_ListActiveBans())
end)

ESX.RegisterServerCallback("ls_anticheat:getWhitelist", function(src, cb)
    if not AC_CanDo(src, "anticheat.view") then return cb(nil) end
    cb(AC_ListWhitelist())
end)

RegisterNetEvent("ls_anticheat:panelAction", function(payload)
    local src = source
    if type(payload) ~= "table" then return end
    local action, license = payload.action, payload.license

    if action == "review" then
        if not AC_CanDo(src, "anticheat.view") then return end
        AC_MarkFlagReviewed(payload.flagId, GetPlayerName(src))

    elseif action == "whitelist" then
        if not AC_CanDo(src, "anticheat.ban") then return end
        AC_AddWhitelist(license, payload.module, payload.reason or "Panel-Whitelist", GetPlayerName(src), nil)

    elseif action == "removeWhitelist" then
        if not AC_CanDo(src, "anticheat.ban") then return end
        AC_RemoveWhitelist(payload.whitelistId)

    elseif action == "unban" then
        if not AC_CanDo(src, "anticheat.ban") then return end
        AC_UnbanPlayer(license, GetPlayerName(src))

    elseif action == "kick" then
        if not AC_CanDo(src, "anticheat.kick") then return end
        local target = findSrcByLicense(license)
        if target then AC_KickPlayer(target, payload.reason or "Kein Grund", GetPlayerName(src)) end

    elseif action == "ban" then
        if not AC_CanDo(src, "anticheat.ban") then return end
        local target = findSrcByLicense(license)
        if target then
            AC_BanPlayer(target, payload.duration or "permanent", payload.reason or "Kein Grund", GetPlayerName(src))
        else
            AC_BanByLicense(license, payload.duration or "permanent", payload.reason or "Kein Grund", GetPlayerName(src))
        end

    elseif action == "goto" then
        if not AC_CanDo(src, "anticheat.goto") then return end
        local target = findSrcByLicense(license)
        if target then
            local ped = GetPlayerPed(target)
            if ped and ped ~= 0 then
                local c = GetEntityCoords(ped)
                TriggerClientEvent("ls_anticheat:doGoto", src, { x = c.x, y = c.y, z = c.z })
            end
        end

    elseif action == "bring" then
        if not AC_CanDo(src, "anticheat.goto") then return end
        local target = findSrcByLicense(license)
        local ped = GetPlayerPed(src)
        if target and ped and ped ~= 0 then
            local c = GetEntityCoords(ped)
            TriggerClientEvent("ls_anticheat:doGoto", target, { x = c.x, y = c.y, z = c.z })
        end

    elseif action == "spectate" then
        if not AC_CanDo(src, "anticheat.goto") then return end
        local target = findSrcByLicense(license)
        if target then
            TriggerClientEvent("ls_anticheat:doSpectate", src, target)
        end
    end
end)
