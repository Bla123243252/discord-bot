fx_version "cerulean"
game "gta5"
lua54 "yes"

author "LS Factory"
description "LS Shops - 24/7 / Liquor / LTD Shops (Schwarz-Theme NUI), ersetzt esx_shops"
version "1.0.0"

shared_scripts {
    "config.lua",
}

server_scripts {
    "server.lua",
}

client_scripts {
    "client.lua",
}

ui_page "html/index.html"

files {
    "html/index.html",
    "html/style.css",
    "html/app.js",
}

dependencies {
    "es_extended",
}
