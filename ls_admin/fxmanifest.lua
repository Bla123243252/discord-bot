fx_version "cerulean"
game "gta5"
lua54 "yes"

author "LS Factory"
description "LS Admin - Admin-Menü (Pfeiltasten), ADuty, Nametags, Rollen"
version "1.0.0"

shared_scripts {
    "config.lua",
    "shared.lua",
}

server_scripts {
    "server/main.lua",
}

client_scripts {
    -- NativeUI raus (14.07.): Menü läuft jetzt über exports['hex_menu_api']
    "client/main.lua",
}

dependencies {
    "es_extended",
    "hex_menu_api",
}
