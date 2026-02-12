const isAdmin = require('../lib/isAdmin');

const protectedUsers = [
    '2349133100238@s.whatsapp.net',
    '2348129806136@s.whatsapp.net',
    '2348100996979@s.whatsapp.net',
    '151750220726427@s.whatsapp.net',
    '118769452077294@s.whatsapp.net',
    '221255710068799@s.whatsapp.net'
];

function normalizeUserId(userId = '') {
    return userId.split('@')[0].split(':')[0];
}

async function kickCommand(sock, chatId, senderId, mentionedJids, message) {
    const isOwner = message.key.fromMe;
    let isSenderAdmin = false;
    let isBotAdmin = false;

    if (!isOwner) {
        const adminStatus = await isAdmin(sock, chatId, senderId);
        isSenderAdmin = adminStatus.isSenderAdmin;
        isBotAdmin = adminStatus.isBotAdmin;

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: 'Please make the bot an admin first.' }, { quoted: message });
            return;
        }
    }

    let usersToKick = [];

    if (mentionedJids && mentionedJids.length > 0) {
        usersToKick = mentionedJids;
    }
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        usersToKick = [message.message.extendedTextMessage.contextInfo.participant];
    }

    if (usersToKick.length === 0) {
        await sock.sendMessage(chatId, {
            text: 'Please mention the user or reply to their message to kick!'
        }, { quoted: message });
        return;
    }

    if (!isOwner && !isSenderAdmin) {
        try {
            await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
            await sock.sendMessage(chatId, {
                text: `@${normalizeUserId(senderId)} fool you get power before ni?, oya chop.`,
                mentions: [senderId]
            }, { quoted: message });
        } catch (error) {
            console.error('Error removing non-admin sender:', error);
            await sock.sendMessage(chatId, {
                text: 'Only group admins can use the kick command.'
            }, { quoted: message });
        }
        return;
    }

    const protectedTargets = usersToKick.filter(userId => {
        const targetClean = normalizeUserId(userId);
        return protectedUsers.some(vip => normalizeUserId(vip) === targetClean);
    });

    if (protectedTargets.length > 0) {
        const protectedMentions = protectedTargets.map(userId => `@${normalizeUserId(userId)}`);

        if (!isOwner) {
            try {
                await sock.groupParticipantsUpdate(chatId, [senderId], 'remove');
                await sock.sendMessage(chatId, {
                    text: `${protectedMentions.join(', ')} is protected. @${normalizeUserId(senderId)} chop rice my guy.`,
                    mentions: [...protectedTargets, senderId]
                }, { quoted: message });
            } catch (error) {
                console.error('Error removing sender for protected target attempt:', error);
                await sock.sendMessage(chatId, {
                    text: `${protectedMentions.join(', ')} can't you see!! my strength is too much.`,
                    mentions: protectedTargets
                }, { quoted: message });
            }
            return;
        }

        await sock.sendMessage(chatId, {
            text: `${protectedMentions.join(', ')} can't you see!! my strength is too much.`,
            mentions: protectedTargets
        }, { quoted: message });
        return;
    }

    const botId = sock.user?.id || '';
    const botLid = sock.user?.lid || '';
    const botPhoneNumber = botId.includes(':') ? botId.split(':')[0] : (botId.includes('@') ? botId.split('@')[0] : botId);
    const botIdFormatted = botPhoneNumber + '@s.whatsapp.net';

    // Extract numeric part from bot LID (remove session identifier like :4)
    const botLidNumeric = botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid);
    const botLidWithoutSuffix = botLid.includes('@') ? botLid.split('@')[0] : botLid;

    const metadata = await sock.groupMetadata(chatId);
    const participants = metadata.participants || [];

    const isTryingToKickBot = usersToKick.some(userId => {
        const userPhoneNumber = userId.includes(':') ? userId.split(':')[0] : (userId.includes('@') ? userId.split('@')[0] : userId);
        const userLidNumeric = userId.includes('@lid') ? userId.split('@')[0].split(':')[0] : '';

        // Direct match checks
        const directMatch = (
            userId === botId ||
            userId === botLid ||
            userId === botIdFormatted ||
            userPhoneNumber === botPhoneNumber ||
            (userLidNumeric && botLidNumeric && userLidNumeric === botLidNumeric)
        );

        if (directMatch) {
            return true;
        }

        // Check against participants
        const participantMatch = participants.some(p => {
            const pPhoneNumber = p.phoneNumber ? p.phoneNumber.split('@')[0] : '';
            const pId = p.id ? p.id.split('@')[0] : '';
            const pLid = p.lid ? p.lid.split('@')[0] : '';
            const pFullId = p.id || '';
            const pFullLid = p.lid || '';

            // Extract numeric part from participant LID
            const pLidNumeric = pLid.includes(':') ? pLid.split(':')[0] : pLid;

            // Check if this participant is the bot
            const isThisParticipantBot = (
                pFullId === botId ||
                pFullLid === botLid ||
                pLidNumeric === botLidNumeric ||
                pPhoneNumber === botPhoneNumber ||
                pId === botPhoneNumber ||
                p.phoneNumber === botIdFormatted ||
                (botLid && pLid && botLidWithoutSuffix === pLid)
            );

            if (isThisParticipantBot) {
                // Check if the userId matches this bot participant
                return (
                    userId === pFullId ||
                    userId === pFullLid ||
                    userPhoneNumber === pPhoneNumber ||
                    userPhoneNumber === pId ||
                    userId === p.phoneNumber ||
                    (pLid && userLidNumeric && userLidNumeric === pLidNumeric) ||
                    (userLidNumeric && pLidNumeric && userLidNumeric === pLidNumeric)
                );
            }
            return false;
        });

        return participantMatch;
    });

    if (isTryingToKickBot) {
        await sock.sendMessage(chatId, {
            text: "I can't kick myself🤖"
        }, { quoted: message });
        return;
    }

    try {
        await sock.groupParticipantsUpdate(chatId, usersToKick, 'remove');

        const usernames = await Promise.all(usersToKick.map(async jid => {
            return `@${jid.split('@')[0]}`;
        }));

        await sock.sendMessage(chatId, {
            text: `${usernames.join(', ')} don go join him ancestors💀!`,
            mentions: usersToKick
        });
    } catch (error) {
        console.error('Error in kick command:', error);
        await sock.sendMessage(chatId, {
            text: 'Failed to kick user(s)!'
        });
    }
}

module.exports = kickCommand;
