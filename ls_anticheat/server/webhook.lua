-- Eigenständiger Discord-Webhook-Versand (unabhängig von hud's "bfs_menus"-Export).

function AC_SendWebhook(url, title, description, color)
    if not url or url == "" then return end
    PerformHttpRequest(url, function() end, "POST", json.encode({
        embeds = {{ title = title, description = description, color = color or 0xE74C3C }}
    }), { ["Content-Type"] = "application/json" })
end

function AC_AlertFlag(title, description)
    AC_SendWebhook(Config.Webhooks.flags, title, description, 0xF1C40F)
end

function AC_AlertBan(title, description)
    AC_SendWebhook(Config.Webhooks.bans, title, description, 0xE74C3C)
end
