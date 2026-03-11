const fs = require('fs');
const path = require('path');
const isAdmin = require('../lib/isAdmin');

const protectedUsers = [
    '2349133100238@s.whatsapp.net',
    '2348100996979@s.whatsapp.net',
    '2348129806136@s.whatsapp.net',
    '151750220726427@s.whatsapp.net',
    '118769452077294@s.whatsapp.net',
    '221255710068799@s.whatsapp.net'
];

// Define paths
const databaseDir = path.join(process.cwd(), 'data');
const warningsPath = path.join(databaseDir, 'warnings.json');
const warnUsagePath = path.join(databaseDir, 'warnUsage.json');

function initializeWarningsFile() {
    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
    }

    if (!fs.existsSync(warningsPath)) {
        fs.writeFileSync(warningsPath, JSON.stringify({}), 'utf8');
    }

    if (!fs.existsSync(warnUsagePath)) {
        fs.writeFileSync(warnUsagePath, JSON.stringify({}), 'utf8');
    }
}

function readJsonSafe(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return {};
    }
}

function getDailyUsageKey(date = new Date()) {
    return date.toISOString().split('T')[0];
}

async function warnCommand(sock, chatId, senderId, mentionedJids, message) {
    try {
        initializeWarningsFile();

        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: 'This command can only be used in groups!'
            });
            return;
        }

        let isSenderAdmin;

        try {
            const adminStatus = await isAdmin(sock, chatId, senderId);
            isSenderAdmin = adminStatus.isSenderAdmin;

            if (!adminStatus.isBotAdmin) {
                await sock.sendMessage(chatId, {
                    text: '❌ Error: Please make the bot an admin first to use this command.'
                });
                return;
            }
        } catch (adminError) {
            console.error('Error checking admin status:', adminError);
            await sock.sendMessage(chatId, {
                text: '❌ Error: Please make sure the bot is an admin of this group.'
            });
            return;
        }

        let userToWarn;
        const today = getDailyUsageKey();
        let dailyCount = 0;
        let warnUsage = {};

        if (!isSenderAdmin) {
            userToWarn = senderId;
            await sock.sendMessage(chatId, {
                text: `@${senderId.split('@')[0]} you be admin?, oya chop.`,
                mentions: [senderId]
            }, { quoted: message });
        } else {
            warnUsage = readJsonSafe(warnUsagePath);

            if (!warnUsage[chatId]) warnUsage[chatId] = {};
            if (!warnUsage[chatId][senderId]) warnUsage[chatId][senderId] = {};

            dailyCount = warnUsage[chatId][senderId][today] || 0;

            if (dailyCount >= 2) {
                await sock.sendMessage(chatId, {
                    text: `⚠️ @${senderId.split('@')[0]}, you don use warn command 2 times today. Try again tomorrow.`,
                    mentions: [senderId]
                }, { quoted: message });
                return;
            }

            if (mentionedJids && mentionedJids.length > 0) {
                userToWarn = mentionedJids[0];
            } else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                userToWarn = message.message.extendedTextMessage.contextInfo.participant;
            }

            if (!userToWarn) {
                await sock.sendMessage(chatId, {
                    text: '❌ Error: Please mention the user or reply to their message to warn!'
                });
                return;
            }

            const userToWarnClean = userToWarn.split('@')[0].split(':')[0];
            const isProtectedUser = protectedUsers.some(vip => vip.split('@')[0] === userToWarnClean);

            if (isProtectedUser) {
                await sock.sendMessage(chatId, {
                    text: `haaa @${senderId.split('@')[0]}, you wan warn owner ke,chop eba joor. 😂`,
                    mentions: [senderId]
                });
                userToWarn = senderId;
            }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            const warnings = readJsonSafe(warningsPath);

            if (!warnings[chatId]) warnings[chatId] = {};
            if (!warnings[chatId][userToWarn]) warnings[chatId][userToWarn] = 0;

            warnings[chatId][userToWarn]++;
            fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

            if (isSenderAdmin) {
                warnUsage[chatId][senderId][today] = dailyCount + 1;
                fs.writeFileSync(warnUsagePath, JSON.stringify(warnUsage, null, 2));
            }

            const warningMessage = `*『 WARNING ALERT 』*\n\n`
                + `👤 *Warned User:* @${userToWarn.split('@')[0]}\n`
                + `⚠️ *Warning Count:* ${warnings[chatId][userToWarn]}/3\n`
                + `👑 *Warned By:* @${senderId.split('@')[0]}\n\n`
                + `📅 *Date:* ${new Date().toLocaleString()}`;

            await sock.sendMessage(chatId, {
                text: warningMessage,
                mentions: [userToWarn, senderId]
            });

            if (warnings[chatId][userToWarn] >= 3) {
                await new Promise(resolve => setTimeout(resolve, 1000));

                await sock.groupParticipantsUpdate(chatId, [userToWarn], 'remove');
                delete warnings[chatId][userToWarn];
                fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

                const kickMessage = `*『 AUTO-KICK 』*\n\n@${userToWarn.split('@')[0]} cup don full o ⚠️`;


                await sock.sendMessage(chatId, {
                    text: kickMessage,
                    mentions: [userToWarn]
                });
            }
        } catch (error) {
            console.error('Error in warn command:', error);
            await sock.sendMessage(chatId, {
                text: '❌ Failed to warn user!'
            });
        }
    } catch (error) {
        console.error('Error in warn command:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, {
                    text: '❌ Rate limit reached. Please try again in a few seconds.'
                });
            } catch (retryError) {
                console.error('Error sending retry message:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, {
                    text: '❌ Failed to warn user. Make sure the bot is admin and has sufficient permissions.'
                });
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    }
}

module.exports = warnCommand;
