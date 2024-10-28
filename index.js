import dotenv from 'dotenv';
import express from 'express';
import { createLeaderboardByContestId, createLeaderboardByRatings, createSemesterWiseLeaderboards, loadHandleMappingFromDB } from './leaderboards.js';
const PORT = process.env.PORT || 3000;
dotenv.config();


const app = express();

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

import {
    Client, 
    GatewayIntentBits,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder,
    ActionRowBuilder, 
    Events, 
    ModalBuilder,
    TextInputBuilder, TextInputStyle 
  } from 'discord.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
})


const ratingbtn = new ButtonBuilder().setCustomId('ratings').setLabel('Ratings').setStyle(ButtonStyle.Primary)
    

const cntstbtn = new ButtonBuilder().setCustomId('contests').setLabel('Contests').setStyle(ButtonStyle.Primary)
    

const yearwisebtn = new ButtonBuilder().setCustomId('yearwise').setLabel('Yearwise').setStyle(ButtonStyle.Primary)


const row = new ActionRowBuilder().addComponents(ratingbtn, cntstbtn, yearwisebtn)




client.login(process.env.DISCORD_TOKEN);

client.on('ready', () => {
    console.log('Bot is ready');
})

client.on('messageCreate', (message) => {
    
    // else{
    if (message.author.bot) return;
    else if (message.mentions.has(client.user)) {
        if (message.content.startsWith('!leaderboard')) {
            message.reply({
                content: 'Choose the type of leaderboard',
                components: [
                    new ActionRowBuilder().addComponents(ratingbtn, cntstbtn, yearwisebtn)
                ]
            })
        }
        else{
            message.reply({
                content: 'Hello There :wave: ' ,
            });
        }
    }
})

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'ratings') {
        const leaderboard = await createLeaderboardByRatings();

        let Top10 = [];
        if (leaderboard.length < 11 && leaderboard.length > 0) {
            Top10 = leaderboard.slice(0, leaderboard.length);
        }
        else Top10 = leaderboard.slice(1, 11);
        const guild = await client.guilds.fetch(interaction.guildId);
        let message = `LeaderBoard For Rating is\n`;
        await guild.members.fetch();
        for (let i=0; i<Top10.length; i++){
            const member = guild.members.cache.find(user => user.user.username === Top10[i]['discordUsername']);
            
            // const mention = await mentionUserByUsername(Top10[i]['discordUsername']);
            message += `${i+1}. ${Top10[i]['name']} <${member}> Rating - ${Top10[i]['rating']}\n`;
        }
        await interaction.update({ content: message, components: [],  });
    } else if (interaction.customId === 'contests') {
        //show modal for contest id
        const modal = new ModalBuilder()
			.setCustomId('contestid')
			.setTitle('Contest ID');
        
        const contestIDInput = new TextInputBuilder()
        .setCustomId('contestid')
        .setLabel("Enter the Contest ID")
        // Paragraph means multiple lines of text.
        .setStyle(TextInputStyle.Short);
        const firstActionRow = new ActionRowBuilder().addComponents(contestIDInput);
        modal.addComponents(firstActionRow);
        await interaction.showModal(modal);


    } else if (interaction.customId === 'yearwise') {
        const leaderboards = await createSemesterWiseLeaderboards();
        const guild = await client.guilds.fetch(interaction.guildId);
        let message = 'Yearwise Leaderboard\n';
        for (const semester in leaderboards) {
            message += `\nLeaderboard for Sem ${semester}\n`;
            const semleaderboard = leaderboards[semester];
            let Top10 = [];
            if (semleaderboard.length < 11 && semleaderboard.length > 0) {
                Top10 = semleaderboard.slice(0, semleaderboard.length);
            }
            else Top10 = semleaderboard.slice(0, 10);
            await guild.members.fetch();
            for (let i=0; i<Top10.length; i++){
                const member = guild.members.cache.find(user => user.user.username === Top10[i]['discordUsername']);
                message += `${i+1}. ${Top10[i]['name']} <${member}> Rating - ${Top10[i]['rating']}\n`;
            }
        }
        interaction.update({
            content: message,
            components:[]
        })
    }
})

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isModalSubmit()) return;
    const contestID = interaction.fields.getTextInputValue('contestid');
    const leaderboard = await createLeaderboardByContestId(contestID);
    let Top10 = [];
    if (leaderboard.length < 11 && leaderboard.length > 0) {
        Top10 = leaderboard.slice(0, leaderboard.length);
    }
    else Top10 = leaderboard.slice(1, 11);
    const guild = await client.guilds.fetch(interaction.guildId);

    let message = `LeaderBoard For ${leaderboard[0]['contestName']}\n`;
    await guild.members.fetch();
    for (let i=0; i<Top10.length; i++){
        const member = guild.members.cache.find(user => user.user.username === Top10[i]['discordUsername']);
        
        // const mention = await mentionUserByUsername(Top10[i]['discordUsername']);
        message += `${i+1}. ${Top10[i]['name']} <${member}> Rank - ${Top10[i]['rank']}\n`;
    }
    await interaction.update({ content: message, components: [],  });
    
});


client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'leaderboard') {
        await interaction.reply( { content: 'Choose the type of leaderboard',components: [row] });
    }
});


