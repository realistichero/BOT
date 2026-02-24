const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const MEDIA_TYPES = [
    { key: 'imageMessage', streamType: 'image', sendKey: 'image', fallbackName: 'image.jpg' },
    { key: 'videoMessage', streamType: 'video', sendKey: 'video', fallbackName: 'video.mp4' },
    { key: 'audioMessage', streamType: 'audio', sendKey: 'audio', fallbackName: 'audio.mp3' },
    { key: 'documentMessage', streamType: 'document', sendKey: 'document', fallbackName: 'file' },
    { key: 'stickerMessage', streamType: 'sticker', sendKey: 'sticker', fallbackName: 'sticker.webp' }
];

async function messageToBuffer(message, streamType) {
    const stream = await downloadContentFromMessage(message, streamType);
    let buffer = Buffer.from([]);

    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }

    return buffer;
}

async function hmmCommand(sock, chatId, message) {
    const requesterJid = message.key.participant || message.key.remoteJid;
    const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quotedMessage) {
        await sock.sendMessage(chatId, { text: '❌ Reply to a media message (image/video/audio/document/sticker).' }, { quoted: message });
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

    await sock.sendMessage(requesterJid, outgoingMessage);

    if (chatId !== requesterJid) {
        await sock.sendMessage(chatId, { text: '✅ Media sent to your private chat.' }, { quoted: message });
    }
}

module.exports = hmmCommand;
