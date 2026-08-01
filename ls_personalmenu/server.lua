-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  LS PERSONAL-MENÜ - Server                                         ║
-- ║  Liefert Geld/Gruppe/Fahrzeuge/Lizenzen (server-frisch);          ║
-- ║  Identity kommt client-seitig aus ESX.PlayerData.                 ║
-- ╚══════════════════════════════════════════════════════════════════╝
local ESX = exports["es_extended"]:getSharedObject()

ESX.RegisterServerCallback("ls_personalmenu:getData", function(src, cb)
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return cb(nil) end

    local job = xPlayer.getJob() or {}

    -- Visum laden
    local visumLevel = 0
    if GetResourceState("zenith_visum") == "started" then
        visumLevel = exports["zenith_visum"]:GetPlayerVisum(src) or 0
    end

    local data = {
        name  = xPlayer.getName(),
        group = xPlayer.getGroup(),
        vip   = Config.VipGroups[xPlayer.getGroup()] == true,
        job   = job.label or "Arbeitslos",
        grade = job.grade_label or "",
        money = xPlayer.getMoney() or 0,
        bank  = (xPlayer.getAccount("bank") or {}).money or 0,
        black = (xPlayer.getAccount("black_money") or {}).money or 0,
        visum = visumLevel,
        vehicles = {},
        licenses = {},
    }

    local rows = MySQL.query.await(
        "SELECT plate, vehicle, stored FROM owned_vehicles WHERE owner = ?",
        { xPlayer.identifier }
    ) or {}
    for _, r in ipairs(rows) do
        local v = json.decode(r.vehicle or "{}") or {}
        data.vehicles[#data.vehicles + 1] = {
            plate = r.plate,
            model = v.model, -- Hash; Anzeigename löst der Client auf
            stored = (r.stored == 1 or r.stored == true),
        }
    end

    -- Lizenzen über esx_license (async-Callback)
    if GetResourceState("esx_license") == "started" then
        TriggerEvent("esx_license:getLicenses", src, function(licenses)
            data.licenses = licenses or {}
            cb(data)
        end)
    else
        cb(data)
    end
end)
