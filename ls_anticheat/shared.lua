-- Kleine Helfer, die von client und server genutzt werden.

function AC_GetIdentifiers(src)
    local license, discord = nil, nil
    for _, id in ipairs(GetPlayerIdentifiers(src)) do
        if id:find("license:") then license = id end
        if id:find("discord:") then discord = id end
    end
    return license, discord
end
