const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

module.exports = (client) => {
  client.commands = new Collection();

  function loadCommands(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        loadCommands(fullPath);
      } else if (file.name.endsWith('.js')) {
        const command = require(fullPath);
        if (command.data && command.execute) {
          client.commands.set(command.data.name, command);
          console.log(`  📦 Command geladen: /${command.data.name}`);
        }
      }
    }
  }

  const commandsPath = path.join(__dirname, '../commands');
  loadCommands(commandsPath);
  console.log(`✅ ${client.commands.size} Commands geladen`);
};
