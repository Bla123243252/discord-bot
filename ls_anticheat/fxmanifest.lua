fx_version "cerulean"
game "gta5"
lua54 "yes"

author "LS Factory"
description "LS Anticheat - serverautoritative Erkennung + Ban-/Flag-Verwaltung"
version "0.1.0"

shared_scripts {
    "config.lua",
    "shared.lua",
}

server_scripts {
    "@oxmysql/lib/MySQL.lua",
    "server/db.lua",
    "server/webhook.lua",
    "server/perms.lua",
    "server/bans.lua",
    "server/movement.lua",
    "server/eventguard.lua",
    "server/resourceguard.lua",
    "server/heartbeat.lua",
    "server/panel.lua",
    "server/commands.lua",
    "server/main.lua",
}

client_scripts {
    "client/heartbeat.lua",
    "client/resource_report.lua",
    "client/panel.lua",
    "client/main.lua",
}

ui_page "html/index.html"
files {
    "html/index.html",
    "html/style.css",
    "html/app.js",
}

dependencies {
    "es_extended",
    "oxmysql",
}
