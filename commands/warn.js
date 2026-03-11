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

// Initialize warnings file if it doesn't exist
function initializeWarningsFile() {
    // Create database directory if it doesn't exist
    if (!fs.existsSync(databaseDir)) {
        fs.mkdirSync(databaseDir, { recursive: true });
    }

    // Create warnings.json if it doesn't exist
    if (!fs.existsSync(warningsPath)) {
        fs.writeFileSync(warningsPath, JSON.stringify({}), 'utf8');
    }

    // Create warnUsage.json if it doesn't exist
    if (!fs.existsSync(warnUsagePath)) {
        fs.writeFileSync(warnUsagePath, JSON.stringify({}), 'utf8');
    }
}

function getDailyUsageKey(date = new Date()) {
    return date.toISOString().split('T')[0];
}

async function warnCommand(sock, chatId, senderId, mentionedJids, message) {
    try {
        // Initialize files first
        initializeWarningsFile();

        // First check if it's a group
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: 'This command can only be used in groups!'
            });
            return;
        }

        let isSenderAdmin;

        // Check admin status first
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

        // If a non-admin tries to use warn, reverse the warning back to the sender
        if (!isSenderAdmin) {
            userToWarn = senderId;
            await sock.sendMessage(chatId, {
                text: `@${senderId.split('@')[0]} you be admin?, oya chop.`,
                mentions: [senderId]
            }, { quoted: message });
        } else {
            const today = getDailyUsageKey();
            let warnUsage = {};

            try {
                warnUsage = JSON.parse(fs.readFileSync(warnUsagePath, 'utf8'));
            } catch (error) {
                warnUsage = {};
            }

            if (!warnUsage[chatId]) warnUsage[chatId] = {};
            if (!warnUsage[chatId][senderId]) warnUsage[chatId][senderId] = {};

            const dailyCount = warnUsage[chatId][senderId][today] || 0;

            if (dailyCount >= 2) {
                await sock.sendMessage(chatId, {
                    text: `⚠️ @${senderId.split('@')[0]}, omo you wicked o, you sef chop small and rest.`,
                    mentions: [senderId]
                }, { quoted: message });
                return;
            }

            // Check for mentioned users
            if (mentionedJids && mentionedJids.length > 0) {
                userToWarn = mentionedJids[0];
            }
            // Check for replied message
            else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
                userToWarn = message.message.extendedTextMessage.contextInfo.participant;
            }

            if (!userToWarn) {
                await sock.sendMessage(chatId, {
                    text: '❌ Error: Oga tag who you wan warn!'
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
                // Switch the target to the person who sent the command
                userToWarn = senderId;
            }

            warnUsage[chatId][senderId][today] = dailyCount + 1;
            fs.writeFileSync(warnUsagePath, JSON.stringify(warnUsage, null, 2));
        }

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // Read warnings, create empty object if file is empty
            let warnings = {};
            try {
                warnings = JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
            } catch (error) {
                warnings = {};
            }

            // Initialize nested objects if they don't exist
            if (!warnings[chatId]) warnings[chatId] = {};
            if (!warnings[chatId][userToWarn]) warnings[chatId][userToWarn] = 0;

            warnings[chatId][userToWarn]++;
            fs.writeFileSync(warningsPath, JSON.stringify(warnings, null, 2));

            const warningMessage = `*『 WARNING ALERT 』*\n\n` +
                `👤 *Warned User:* @${userToWarn.split('@')[0]}\n` +
                `⚠️ *Warning Count:* ${warnings[chatId][userToWarn]}/3\n` +
                `👑 *Warned By:* @${senderId.split('@')[0]}\n\n` +
