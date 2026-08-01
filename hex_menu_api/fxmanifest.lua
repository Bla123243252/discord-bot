fx_version 'cerulean'
author 'Hexscripts (NUI) / Lua-Bridge neu: LS'
description 'Hexscripts Menu API - offene Lua-Bridge gegen die Original-NUI (Escrow-Teile ersetzt)'
game 'gta5'

lua54 'yes'
version '1.0.6-open'

client_scripts {
    'config/config.lua',
    'client/main.lua',
    'client/example_menu.lua' -- Test: /testHexUI
}

ui_page 'dist/index.html'

files {
    'dist/**/'
}
