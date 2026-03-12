const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin');

const databaseDir = path.join(process.cwd(), 'data');
const warningsPath = path.join(databaseDir, 'warnings.json');

function normalizeJid(jid = '') {
    const [userPart, domainPart = ''] = jid.split('@');
    const cleanUserPart = userPart.split(':')[0];
    return `${cleanUserPart}@${domainPart}`;
}

function initializeWarningsFile() {
    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
    }

    if (!fs.existsSync(warningsPath)) {
        fs.writeFileSync(warningsPath, JSON.stringify({}), 'utf8');
    }
}

async function resetWarnCommand(sock, chatId, senderId, mentionedJids, message) {
    try {
        initializeWarningsFile();

        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, { text: 'This command can only be used in groups!' });
            return;
        }

        let adminStatus;
        try {
            adminStatus = await isAdmin(sock, chatId, senderId);
        } catch (error) {
            console.error('Error checking admin status for resetwarn:', error);
            await sock.sendMessage(chatId, { text: '❌ Error: Please make sure the bot is an admin of this group.' });
            return;
        }

        if (!adminStatus.isBotAdmin) {
            await sock.sendMessage(chatId, { text: '❌ Error: Please make the bot an admin first to use this command.' });
            return;
        }

        if (!adminStatus.isSenderAdmin) {
            await sock.sendMessage(chatId, { text: 'who give you power ni?' }, { quoted: message });
            return;
        }

        let userToReset;
        if (mentionedJids && mentionedJids.length > 0) {
            userToReset = mentionedJids[0];
        } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToReset = message.message.extendedTextMessage.contextInfo.participant;
        }

        if (!userToReset) {
            await sock.sendMessage(chatId, {
                text: 'una no sabi read instruction ni.'
            }, { quoted: message });
            return;
        }

        if (normalizeJid(userToReset) === normalizeJid(senderId)) {
            await sock.sendMessage(chatId, {
                text: 'The boy wan be superstar😂😂😂.'
            }, { quoted: message });
            return;
        }

        let warnings = {};
        try {
            warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
        } catch (error) {
            warnings = {};
        }

        if (!warnings[chatId]) warnings[chatId] = {};
        const previousCount = warnings[chatId][userToReset] || 0;
        warnings[chatId][userToReset] = 0;

        fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

        await sock.sendMessage(chatId, {
            text: `Go and sin no more @${userToReset.split('@')[0]}\nPrevious warnings: ${previousCount}`, 
            mentions: [userToReset]
        }, { quoted: message });
    } catch (error) {
        console.error('Error in resetwarn command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to reset warning count.'
        }, { quoted: message });
    }
}

module.exports = resetWarnCommand;
