const { downloadContentFromMessage, jidNormalizedUser } = require('@whiskeysockets/baileys');
const MEDIA_TYPES = [
    { key: 'imageMessage', streamType: 'image', sendKey: 'image', fallbackName: 'image.jpg' },
    { key: 'videoMessage', streamType: 'video', sendKey: 'video', fallbackName: 'video.mp4' },
    { key: 'audioMessage', streamType: 'audio', sendKey: 'audio', fallbackName: 'audio.mp3' },
    { key: 'documentMessage', streamType: 'document', sendKey: 'document', fallbackName: 'file' },
    { key: 'stickerMessage', streamType: 'sticker', sendKey: 'sticker', fallbackName: 'sticker.webp' }
];

const VIEW_ONCE_ALLOWED_USERS = new Set([
    '2349133100238@s.whatsapp.net',
    '2348100996979@s.whatsapp.net',
    '2348129806136@s.whatsapp.net',
    '151750220726427@s.whatsapp.net',
    '118769452077294@s.whatsapp.net',
    '221255710068799@s.whatsapp.net'
]);


function normalizeUserJid(jid) {
    if (!jid) return '';

    if (typeof jidNormalizedUser === 'function') {
        return jidNormalizedUser(jid);
    }

    return jid.replace(/:\d+@/, '@');
}

function getSenderCandidates(message) {
    const key = message?.key || {};

    return [
        key.participant,
        key.participantAlt,
        key.remoteJid,
        key.remoteJidAlt
    ]
        .filter(Boolean)
        .map(normalizeUserJid);
}


async function messageToBuffer(message, streamType) {
    const stream = await downloadContentFromMessage(message, streamType);
    let buffer = Buffer.from([]);

    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }

    return buffer;
}
 
async function viewonceCommand(sock, chatId, message) {
      const key = message?.key || {};
    const senderJidRaw = key.participantAlt || key.participant || key.remoteJidAlt || key.remoteJid;
    const senderJid = normalizeUserJid(senderJidRaw);
    const senderCandidates = getSenderCandidates(message);
    const isAllowedUser = senderCandidates.some(jid => VIEW_ONCE_ALLOWED_USERS.has(jid));

    if (!isAllowedUser) {
        await sock.sendMessage(chatId, { text: '❌ You are not allowed to use this command.' }, { quoted: message });
        return;
    }


    const selectedType = MEDIA_TYPES.find(({ key }) => quotedMessage[key]);

    if (!selectedType) {
        await sock.sendMessage(chatId, { text: '❌ Unsupported media type. Reply to image, video, audio, document, or sticker.' }, { quoted: message });
        return;
    }

    const mediaMessage = quotedMessage[selectedType.key];


    const mediaBuffer = await messageToBuffer(mediaMessage, selectedType.streamType);
    const outgoingMessage = {
        [selectedType.sendKey]: mediaBuffer,
        mimetype: mediaMessage.mimetype,
        fileName: mediaMessage.fileName || selectedType.fallbackName
    };

    if (mediaMessage.caption && (selectedType.sendKey === 'image' || selectedType.sendKey === 'video' || selectedType.sendKey === 'document')) {
        outgoingMessage.caption = mediaMessage.caption;
    }

    await sock.sendMessage(senderJid, outgoingMessage);

    if (chatId !== senderJidRaw && chatId !== senderJid) {
        await sock.sendMessage(chatId, { text: '✅ Media sent to your private chat.' }, { quoted: message });
    }
}

module.exports = viewonceCommand;
