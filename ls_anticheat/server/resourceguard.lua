-- Nimmt die vom Client gemeldete Resource-Liste entgegen und diffed sie
-- gegen Config.ResourceWhitelist. Hinweis: Der Report kommt vom Client-Lua
-- selbst - ein Angreifer, der auch dieses Script patcht, kann ihn faken.
-- Das ist eine zusätzliche Hürde gegen gängige Mod-Menüs, kein Beweis.

local whitelistSet = {}
for _, name in ipairs(Config.ResourceWhitelist) do
    whitelistSet[name] = true
end

RegisterNetEvent("ls_anticheat:reportResources", function(resourceNames)
    local src = source
    if type(resourceNames) ~= "table" or AC_IsBypassed(src) then return end

    local license = AC_GetIdentifiers(src)
    if AC_IsWhitelisted(license, "resource") then return end

    local unknown = {}
    for _, name in ipairs(resourceNames) do
        if not whitelistSet[name] then
            unknown[#unknown + 1] = name
        end
    end

    if #unknown > 0 then
        AC_InsertFlag(license, GetPlayerName(src), "resource", "high",
            { unknown = unknown }, nil, Config.ResourceGuard.enforceKick and "kicked" or "none")
        AC_AlertFlag("Unbekannte Resource erkannt", ("**%s**: %s"):format(GetPlayerName(src), table.concat(unknown, ", ")))

        if Config.ResourceGuard.enforceKick then
            AC_IsolatePlayer(src)
            DropPlayer(src, "Anticheat: nicht erlaubte Resource erkannt (" .. table.concat(unknown, ", ") .. ").")
        end
    end
end)
