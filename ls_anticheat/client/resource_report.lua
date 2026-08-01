-- Meldet periodisch die Liste geladener Resources an den Server.

CreateThread(function()
    while true do
        Wait(Config.ResourceGuard.reportIntervalMs)
        local list = {}
        local n = GetNumResources()
        for i = 0, n - 1 do
            local name = GetResourceByFindIndex(i)
            if name then list[#list + 1] = name end
        end
        TriggerServerEvent("ls_anticheat:reportResources", list)
    end
end)
