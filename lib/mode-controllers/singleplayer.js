const { invalidInputMsg } = require('../messages');
const commands = require('../commands').singlePlayerCommands;

const GameFactory = require('../games/GameFactory');
const SPGamesManager = require('../core/SPGamesManager');
const { sendWhatsAppMessage } = require('../utils');

module.exports = async (req, res) => {
  const { Body: userMsg } = req.body;

  if (req.user.gameSessId) {
    const gameId = req.user.gameSessId;
    const game = SPGamesManager.findGame(gameId);
    
    // Check if the game's handleUserResponse method is async (has a then method)
    if (typeof game.handleUserResponse === 'function') {
      try {
        // For AI Adventure game which has async handleUserResponse
        if (game.constructor.name === 'AIAdventure') {
          try {
            // Explicitly await the async response
            console.log('Handling AI Adventure user response for message:', userMsg);
            const responseMsg = await game.handleUserResponse(userMsg);
            console.log('AI Adventure response (length):', responseMsg ? responseMsg.length : 0);
            console.log('AI Adventure response (first 100 chars):', responseMsg ? responseMsg.substring(0, 100) : 'null');
            
            // Save new changes
            SPGamesManager.updateGame(game, gameId);

            if (game.state === 'gameover') {
              // Send gameover message
              SPGamesManager.destroyGame(gameId, req);
            }

            // Make sure we have a valid response
            if (!responseMsg) {
              console.error('AI Adventure returned null or undefined response');
              return res.sendMessage('Sorry, there was an error generating the adventure. Please try again.');
            }
            
            console.log('Sending AI Adventure response to Twilio...');
            
            // Also try to send a direct WhatsApp message
            if (req.body && req.body.From) {
              const userPhone = req.body.From.replace('whatsapp:', '');
              console.log(`Attempting direct WhatsApp message to ${userPhone}`);
              try {
                await sendWhatsAppMessage(userPhone, responseMsg);
              } catch (whatsappError) {
                console.error('Error sending direct WhatsApp message:', whatsappError);
              }
            }
            
            return res.sendMessage(responseMsg);
          } catch (innerError) {
            console.error('Error in AI Adventure response handling:', innerError);
            return res.sendMessage('Sorry, there was an error in the adventure. Please try again.');
          }
        } else {
          // For other games with synchronous handleUserResponse
          const responseMsg = game.handleUserResponse(userMsg);
          
          // Save new changes
          SPGamesManager.updateGame(game, gameId);

          if (game.state === 'gameover') {
            // Send gameover message
            SPGamesManager.destroyGame(gameId, req);
          }

          return res.sendMessage(responseMsg);
        }
      } catch (error) {
        console.error('Error handling game response:', error);
        return res.sendMessage('Sorry, there was an error processing your request. Please try again.');
      }
    } else {
      console.error('Game does not have a handleUserResponse method');
      return res.sendMessage('Sorry, this game is not properly configured.');
    }
  }

  const command = commands.find(c => c.code === userMsg);

  if (command) {
    let responseMsg = command.message;

    if (typeof command.message === 'function') {
      responseMsg = await command.message(req);
    }

    return res.sendMessage(responseMsg);
  }

  const gameNum = Number(userMsg) - 1;
  const isGameNumValid =
    gameNum >= 0 && gameNum < GameFactory.getGames().length;

  if (isGameNumValid) {
    const game = GameFactory.createGame(gameNum);

    if (game.init) await game.init();

    await SPGamesManager.createGame(game, req);

    return res.sendMessage(game.welcomeMessage);
  }

  return res.sendMessage(invalidInputMsg);
};
