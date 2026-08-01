local function KeyboardInput(title, maxLength, regex)
    local promise = promise.new()

    exports['hex_menu_api']:inputOpen(GetCurrentResourceName(), 'rageui_input', {
        title = title,
        maxLength = maxLength,
        regex = regex -- https://regex101.com/
    }, function(data, menu)
        promise:resolve(data.value)
        menu.close()
    end, function(data, menu)
        promise:resolve(nil)
        menu.close()
    end)

    return Citizen.Await(promise)
end

local checkboxChecked = true
local lockedCheckboxChecked = false
local listValue = 1

RegisterCommand('testHexUI', function()
    exports['hex_menu_api']:rageCloseAll()

    local elements = {}

    elements[#elements + 1] = { title = 'Button', value = 'example_button_value', type = 'button', description = 'Button Description' }
    elements[#elements + 1] = { title = 'Button Go', value = 'example_button_go_value', type = 'buttongo', description = 'Button GO Description' }
    elements[#elements + 1] = { title = 'Locked Bottom Checkbox', value = 'example_checkbox_value', checked = checkboxChecked, type = 'checkbox', description = 'Locked Checkbox Bottom Description' }
    elements[#elements + 1] = { title = 'Checkbox', value = 'example_locked_checkbox_value', checked = lockedCheckboxChecked, type = 'checkbox', description = 'Checkbox Description', locked = true }
    elements[#elements + 1] = { title = 'List', value = 'example_list_value', list = { 'Option 1', 'Option 2', 'Option 3' }, valueList = listValue - 1, type = 'list', description = 'List Description' }
    elements[#elements + 1] = { title = 'Seperator', type = 'seperator' }
    elements[#elements + 1] = { title = 'Input', type = 'button', value = 'example_input_value', description = 'Input Description' }

    exports['hex_menu_api']:rageOpen(GetCurrentResourceName(), 'rageui_main', {
        -- kein header -> Config.DefaultHeader (ZENITH-Banner)
        title = 'Example Menu Title',
        elements = elements,
        align = 'left' -- left, right, top-left, top-right, bottom-left, bottom-right
        -- customAlign = {
        --     top = '20vh',
        --     left = '20vh'
        -- },

    }, function(data, menu)
        if data.current.value == 'example_button_go_value' then
            print('Button Go Pressed')
        elseif data.current.value == 'example_button_value' then
            print('Button Pressed')
        elseif data.current.value == 'example_checkbox_value' then
            checkboxChecked = not checkboxChecked

            print('Checkbox Value: ' .. tostring(checkboxChecked))

            local element = exports['hex_menu_api']:getElementByValue(data.elements, 'example_locked_checkbox_value')

            if element then
                menu.setElement(element, 'locked', checkboxChecked)
                menu.refresh()
            end
        elseif data.current.value == 'example_list_value' then
            listValue = data.current.valueList

            print('List Value: ' .. tostring(listValue))
        elseif data.current.value == 'example_checkbox_value' then
            lockedCheckboxChecked = not lockedCheckboxChecked

            print('Locked Checkbox Value: ' .. tostring(lockedCheckboxChecked))
        elseif data.current.value == 'example_input_value' then
            local input = KeyboardInput('Example Input', 32)

            if input then
                print('Input Value: ' .. input)
            else
                print('Input Cancelled')
            end
        end
    end, function(data, menu)
        menu.close()
    end, function(data, menu) -- onChange
        if data.current.value == 'example_list_value' then
            listValue = data.current.valueList + 1
        end
    end)
end)