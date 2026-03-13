require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const { handleGetCommand } = require('./commands/get');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
  {
    name: 'get',
    description: 'Get detailed Roblox player info',
    options: [
      {
        name: 'username',
        type: 3, // STRING
        description: 'The Roblox username to look up',
        required: true,
      },
    ],
  },
];

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('🔄 Registering slash commands globally...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'get') {
    await handleGetCommand(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
