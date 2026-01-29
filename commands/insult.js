const insults = [
    "You be one big mistake wey God want press delete!",
    " You no sabi talk, na just noise wey dey come out!",
    "Your face na advertisement for abortion!",
    "If sense na shoe, you go dey waka barefoot.",
    " You sabi talk like radio wey no get station.",
    "If mumu get ranking, you go be chairman.",
    "Your brain dey sleep you come dey here with us.",
    "If mumu na business, you go be CEO.",
    "- If common sense na app, you go still need update.",
    "You be like sample size; God just use you check if the mud remain before He create real human being.",
    "You ugly reach say your mama had to tie meat for your neck make dog for play with you.",
    "If person look your life, e go see say your village people don win the league, carry cup join.",
    "The way you move, e be like say your shadow even dey shame to follow you.",
    "Your sense be like public holiday; e no dey ever show up when work dey.",
    "If dem put your face for calendar, the year no go ever end.",
    "Your face be like when person try to draw map of Nigeria with charcoal.",
    "You're like a Wi-Fi signal—always weak when needed most.",
   "You be like unfinished project; God start to create you, come forget the remaining part.",
   "Your mouth smell reach say if you talk for inside church, pastor go start to bind devil.",
   "Your head be like where dem dey practice how to carve stone, just rough for nothing.",
    "You ugly reach say even darkness dey find light whenever you show face.",
    "Your mouth smell reach say if you yawn, the flies for the area go start to wear nose mask.",
    "dem dey share sense, na that time you go go find who you go borrow slippers from.",
    "You ugly reach say if you enter forest, even the lions go start to beg God for protection.",
    "If dem put your face for bottle, even poison no go gree enter inside.",
    "If dem use your face do emoji, na only people wey dey find trouble go dey use am.",
    "If person look your brain, e go see say na 'Under Construction' sign dey there since you small.",
    "You ugly reach say even your shadow dey walk 20 meters behind you make people no think say una related.",
    "If dem use your face do 'Keep Off' sign, even ghost no go gree pass that area.",
    "Your face be like when person try to draw circle come end up with triangle.",
    "You ugly reach say even mosquito dey close eye before e bite you.",
    "You ugly reach say if you snap selfie, your phone go ask you 'Are you sure?'",
    "Your life be like when person buy data come use am update 'Terms and Conditions'—just waste.",
    "Your face be like when person try to draw map of the world with left hand for inside keke napep.",
    "You be like person wey God create for Friday 4:59 PM when He wan go weekend."
];
const protectedUsers = [
    '2349133100238@s.whatsapp.net', 
    '2348100996979@s.whatsapp.net',
    '151750220726427@s.whatsapp.net',
    '118769452077294@s.whatsapp.net'
];
async function insultCommand(sock, chatId, message) {
    try {
        if (!message || !chatId) {
            console.log('Invalid message or chatId:', { message, chatId });
            return;
        }

        let userToInsult;

        const sender = message.key.participant || message.key.remoteJid;
        // Check for mentioned users
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToInsult = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Check for replied message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToInsult = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToInsult) {
            await sock.sendMessage(chatId, { 
                text: 'you be fool o, i say mention person wey i go insult'
            });
            return;
        }

        const insult = insults[Math.floor(Math.random() * insults.length)];
        // protected
    const isProtected = protectedUsers.some(vip => {
            const vipClean = vip.split('@')[0]; 
            const targetClean = userToInsult.split('@')[0].split(':')[0]; 
            return targetClean === vipClean;
        });

        if (isProtected) {
            await sock.sendMessage(chatId, { 
                text: `back to sender😂 @${sender.split('@')[0]}, ${insult}`,
                mentions: [sender]
            });
            return;
        }
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.sendMessage(chatId, { 
            text: `Hey @${userToInsult.split('@')[0]}, ${insult}`,
            mentions: [userToInsult]
        });
    } catch (error) {
        console.error('Error in insult command:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: 'Please try again in a few seconds.'
                });
            } catch (retryError) {
                console.error('Error sending retry message:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: 'An error occurred while sending the insult.'
                });
            } catch (sendError) {
                console.error('Error sending error message:', sendError);
            }
        }
    }
}

module.exports = { insultCommand };
