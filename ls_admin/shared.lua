-- Geteilte Helfer (Client + Server)

--- Holt die Rollen-Definition zu einer ESX-Gruppe.
function GetRole(group)
    if not group then return nil end
    return Config.Roles[string.lower(group)]
end

--- Prüft, ob eine Rechte-Liste ein bestimmtes Recht enthält.
--- Unterstützt "*" (alles) und "kategorie.*" (ganze Kategorie).
function PermsHave(perms, perm)
    if not perms then return false end
    for _, p in ipairs(perms) do
        if p == "*" then
            return true
        elseif p == perm then
            return true
        elseif string.sub(p, -2) == ".*" then
            local prefix = string.sub(p, 1, #p - 1) -- "self."
            if string.sub(perm, 1, #prefix) == prefix then
                return true
            end
        end
    end
    return false
end

--- Prüft direkt anhand der Gruppe.
function GroupHasPerm(group, perm)
    local role = GetRole(group)
    if not role then return false end
    return PermsHave(role.perms, perm)
end
