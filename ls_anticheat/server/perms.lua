-- Rechteprüfung: nutzt ls_admin's "canDo"-Export falls verfügbar, sonst
-- Fallback auf Config.AdminGroups (reine ESX-Gruppenprüfung).

local ESX = exports["es_extended"]:getSharedObject()

function AC_CanDo(src, perm)
    local ok, result = pcall(function()
        return exports["ls_admin"]:canDo(src, perm)
    end)
    if ok then return result end

    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return false end
    return Config.AdminGroups[xPlayer.getGroup()] == true
end

-- true = Spieler gehört zu einer in Config.BypassGroups gelisteten Gruppe
-- und wird von JEDEM Detection-Modul komplett ignoriert.
function AC_IsBypassed(src)
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return false end
    return Config.BypassGroups[xPlayer.getGroup()] == true
end
