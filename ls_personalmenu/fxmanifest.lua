fx_version "cerulean"
game "gta5"
lua54 "yes"

author "LS Factory"
description "LS Personal-Menü (F5) - Ausweis/Lizenzen, Geld, Fahrzeuge, Einstellungen, VIP (hex_menu_api)"
version "2.0.0"

shared_scripts {
    "config.lua",
}

client_scripts {
    "client.lua",
}

server_scripts {
    "@oxmysql/lib/MySQL.lua",
    "server.lua",
}

-- KEIN eigenes NUI mehr (14.07.): Menü läuft über exports['hex_menu_api'];
-- der html/-Ordner bleibt nur als Referenz liegen und wird nicht geladen.

dependencies {
    "es_extended",
    "oxmysql",
    "esx_notify",
    "hex_menu_api",
}
