fx_version 'cerulean'
game 'gta5'
lua54 'yes'

author 'Zenith Roleplay'
description 'Zenith Medic Dispatch System - Nur für LSMD'
version '1.0.0'

shared_scripts {
    '@es_extended/imports.lua',
    'config.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server.lua',
}

client_scripts {
    'client.lua',
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js',
}

dependencies {
    'es_extended',
    'oxmysql',
}
