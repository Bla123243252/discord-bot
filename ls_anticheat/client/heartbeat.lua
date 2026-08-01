CreateThread(function()
    while true do
        Wait(Config.Heartbeat.intervalMs)
        TriggerServerEvent("ls_anticheat:heartbeat")
    end
end)
