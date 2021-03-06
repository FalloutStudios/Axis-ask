const { SlashCommandBuilder } = require('@discordjs/builders');
const safeMessage = require('../scripts/safeMessage');
const { makeSentence, replaceAll } = require('fallout-utility');
const AI = require("./ask/");

module.exports = new create();

let chatbot = null;
let askConfig = require('./ask/config.js');

function create(){
    let config = {};
    let language = {};
    this.versions = ['1.1.0', '1.1.1', '1.1.2'];
    this.arguments = {
        question: {
            required: true,
            values: ""
        }
    };

    // Create the chatbot
    this.start = (client, action, conf, lang) => {
        config = conf;
        language = lang;

        chatbot = new AI({name: client.user.username, gender: "Male"});

        client.on('messageCreate', async (message) => {
            if(typeof askConfig.chatbotChannels.find(ch => ch.toString() === message.channelId) === "undefined") return;
            if(!message.content || message.content == '') return;
            if(message.author.id === client.user.id || message.author.bot || message.author.system) return;

            message.channel.sendTyping();

            const reply = await ask(message.content, message.author.username, config.owner);

            if(!reply) { await safeMessage.reply(message, action.get(language.error)); return; }

            await safeMessage.reply(message, reply);
        });

        return true;
    }
    this.execute = async (args, message, client, action) => {
        let sentence = makeSentence(args).toString().trim();
        if(sentence.length == 0) { await message.reply(action.get(language.empty)); return; }

        message.channel.sendTyping();

        const reply = await ask(sentence, message.author.username, config.owner);

        if(!reply) { await safeMessage.reply(message, action.get(language.error)); return; }

        await safeMessage.reply(message, reply);
    }

    this.slash = {
        command: new SlashCommandBuilder()
            .setName("ask")
            .setDescription(`Ask me something`)
            .addStringOption(option => option.setName('question')
                .setDescription("Question")
                .setRequired(true)
            ),
        async execute(interaction, client, action) {
            await interaction.deferReply();

            const reply = await ask(interaction.options.getString('question'), interaction.member.user.username, config.owner);

            if(!reply) { await interaction.editReply({ content: action.get(language.error), ephemeral: true }); return; }

            await interaction.editReply(reply);
        }
    }

    async function ask(message, username, owner) {
        let reply = false;

        try {
            await chatbot.chat(message, removeChars(username)).then(async (response) => {
                response = replaceAll(response, 'Udit', owner);

                reply = response;
            }).catch(async (err) => {
                console.error(err);
            });
        } catch(err) {
            console.error(err);
        }

        return reply;
    }
    function removeChars(string) {
        return string.toString().replace(/[^\w\s]/gi, '');
    }
}