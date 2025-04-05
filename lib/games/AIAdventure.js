const superb = require('superb');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Gemini API
const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDdu7lnNmxhLgFNI7L7jP9JKQggT4spYLI'; // Fallback to free API key if env var not set
console.log('Using Gemini API key (first 5 chars):', apiKey.substring(0, 5));

let genAI;
try {
  genAI = new GoogleGenerativeAI(apiKey);
  console.log('Gemini API initialized successfully');
} catch (error) {
  console.error('Failed to initialize Gemini API:', error);
  // Continue execution, the error handling in the methods will catch any issues
}

// Predefined fallback stories for when AI generation fails
const fallbackStories = [
  {
    prompt: "As you proceed, the cave opens into a vast chamber with glittering crystals on the ceiling. A small underground stream flows through the center.",
    choices: ["Follow the stream", "Examine the crystals", "Look for another passage"]
  },
  {
    prompt: "You discover an ancient stone pedestal with a glowing orb hovering above it. Strange symbols are carved into the floor around it.",
    choices: ["Touch the orb", "Decipher the symbols", "Search the room for other clues"]
  },
  {
    prompt: "A narrow passage leads to a room with wall paintings depicting an ancient civilization. They seem to tell a story about a powerful artifact.",
    choices: ["Study the paintings closely", "Look for the artifact", "Continue deeper into the cave"]
  },
  {
    prompt: "You encounter a small, friendly creature that glows with a soft blue light. It gestures for you to follow it.",
    choices: ["Follow the creature", "Try to communicate with it", "Observe it from a distance"]
  },
  {
    prompt: "The path splits into three different tunnels. From one, you hear water dripping; from another, a warm breeze; and from the third, faint music.",
    choices: ["Take the tunnel with water sounds", "Follow the warm breeze", "Investigate the music"]
  }
];

class AIAdventure {
  static name = 'AI Adventure';
  
  constructor(gameId) {
    this.state = 'play';
    this.gameId = gameId;
    this.currentPrompt = "You find yourself at the entrance of a mysterious cave. Strange glowing symbols adorn the walls, and a cool breeze flows from within.";
    this.choices = ["Enter the cave", "Examine the symbols", "Look for another way"];
    this.history = [];
    this.lastAIResponse = null;
    this.turnCount = 0;
    this.maxTurns = 5; // Limit the game to 5 turns for a proper ending
    
    // Add initial prompt to history
    this.history.push({
      type: 'system',
      content: this.currentPrompt
    });
  }

  // No async init needed anymore
  async init() {
    console.log("AI Adventure initialized with default scenario");
    return Promise.resolve();
  }

  // Get a fallback story based on turn count
  getFallbackStory() {
    const fallbackIndex = this.turnCount % fallbackStories.length;
    return fallbackStories[fallbackIndex];
  }

  async generateResponse(userChoice) {
    try {
      console.log("Attempting to generate AI response for choice:", userChoice);
      
      // Check if API key is available
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDdu7lnNmxhLgFNI7L7jP9JKQggT4spYLI';
      console.log("Using API key:", apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5));
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash", // Fallback to a more reliable model
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      });
      
      // Don't increment turn count here - it's incremented in handleUserResponse
      
      // Check if we should end the game
      const shouldEndGame = this.turnCount >= this.maxTurns || Math.random() < 0.2;
      
      // Keep context minimal
      let context = `This is an adventure game. The player's last choice was: ${userChoice}. This is turn ${this.turnCount} of ${this.maxTurns}.`;
      
      let prompt;
      if (shouldEndGame) {
        prompt = `${context}
        
        Generate a very short conclusion to the adventure (2-3 sentences).
        This should be a satisfying ending to the story.
        End with "THE END" and don't include any choices.`;
      } else {
        prompt = `${context}
        
        Generate a very short next part of the adventure (1-2 sentences).
        End with exactly 3 choices labeled as:
        A) [first option]
        B) [second option]
        C) [third option]`;
      }
      
      console.log("Sending prompt to Gemini API:", prompt);
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      console.log("AI Response received:", text);
      
      if (shouldEndGame) {
        // For endings, don't extract choices
        return {
          prompt: text.replace("THE END", "").trim(),
          fullText: text,
          choices: ["Start a new adventure", "Try a different game", "Exit"],
          isEnding: true
        };
      } else {
        // Extract choices from the AI response
        const choicesRegex = /A\)(.*?)(?:\n|$).*?B\)(.*?)(?:\n|$).*?C\)(.*?)(?:\n|$)/s;
        const choicesMatch = text.match(choicesRegex);
        
        let extractedChoices = ["Continue the adventure", "Take a different path", "Rest and think"];
        
        if (choicesMatch && choicesMatch.length >= 4) {
          extractedChoices = [
            choicesMatch[1].trim(),
            choicesMatch[2].trim(),
            choicesMatch[3].trim()
          ];
          console.log("Successfully extracted choices:", extractedChoices);
        } else {
          console.log("Failed to extract choices from response, using defaults");
        }
        
        // Create a response structure
        return {
          prompt: text.substring(0, text.indexOf('A)') > 0 ? text.indexOf('A)') : text.length).trim(),
          fullText: text,
          choices: extractedChoices,
          isEnding: false
        };
      }
    } catch (error) {
      console.error("Error generating response:", error);
      console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Use a fallback story
      const fallbackStory = this.getFallbackStory();
      
      return {
        prompt: fallbackStory.prompt,
        fullText: fallbackStory.prompt,
        choices: fallbackStory.choices,
        isEnding: this.turnCount >= this.maxTurns // End the game if we've reached max turns
      };
    }
  }

  get welcomeMessage() {
    const message = 
      '🌟 Welcome to AI Adventure! 🌟\n\n' +
      'Embark on a unique adventure where every choice matters and the story is created by AI just for you!\n\n' +
      `🤖 ${this.currentPrompt}\n\n` +
      'Your choices:\n' +
      this.choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n') + '\n\n' +
      'Reply with the number of your choice (1, 2, or 3)';

    return message;
  }

  async handleUserResponse(userMessage) {
    // Check if game is already over
    if (this.state === 'gameover') {
      // If they select 1, start a new adventure
      if (userMessage === '1') {
        this.resetGame();
        return this.welcomeMessage;
      }
      
      // If they select anything else, just remind them the game is over
      return `The adventure has ended! Reply with 1 to start a new adventure, or exit to play a different game.`;
    }
    
    // Check if user input is valid (1, 2, or 3)
    const choiceIndex = parseInt(userMessage) - 1;
    
    if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= this.choices.length) {
      return `Please choose a valid option (1-${this.choices.length}).\n\n` +
        this.choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n');
    }
    
    const userChoice = this.choices[choiceIndex];
    console.log(`User selected choice ${choiceIndex + 1}: ${userChoice}`);
    
    // Add to history
    this.history.push({
      type: 'user',
      content: userChoice
    });
    
    // Increment turn count here
    this.turnCount++;
    console.log(`Turn ${this.turnCount} of ${this.maxTurns}`);
    
    // Check if we have a pending AI response from previous background generation
    if (this.nextResponse) {
      console.log("Using previously generated response from background");
      const storyResponse = this.nextResponse;
      this.nextResponse = null; // Clear it after using
      
      // Update current state
      this.currentPrompt = storyResponse.prompt;
      this.lastAIResponse = storyResponse;
      this.choices = storyResponse.choices;
      
      // Add to history
      this.history.push({
        type: 'system',
        content: this.currentPrompt
      });
      
      // Check if this is an ending
      if (storyResponse.isEnding || this.turnCount >= this.maxTurns) {
        this.state = 'gameover';
        return `🏆 ${this.currentPrompt}\n\nTHE END\n\nYour adventure has concluded! Reply with 1 to start a new adventure, or exit to play a different game.`;
      }
      
      // Start generating the next response in the background for future turns
      this.generateNextResponseAsync(userChoice);
      
      // Return the story response
      return `🤖 ${this.currentPrompt}\n\nYour choices:\n` +
        this.choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n');
    }
    
    try {
      console.log("Generating adventure response for choice:", userChoice);
      
      // Create a local shouldEndGame variable based on turn count
      const shouldEndGame = this.turnCount >= this.maxTurns || Math.random() < 0.2;
      
      // Use predefined adventure scenarios based on user choice
      const adventureScenarios = [
        {
          prompt: "You enter a dimly lit chamber. Ancient runes glow faintly on the walls, and a mysterious pedestal stands in the center.",
          choices: ["Touch the pedestal", "Examine the runes", "Look for hidden passages"]
        },
        {
          prompt: "A narrow passage leads to a vast underground lake. The water glows with an ethereal blue light, and you can see strange shapes moving beneath the surface.",
          choices: ["Wade into the water", "Follow the shoreline", "Throw a stone into the lake"]
        },
        {
          prompt: "You discover an ancient library filled with dusty tomes. One book on a central stand seems to emit a faint golden glow.",
          choices: ["Open the glowing book", "Search for specific information", "Explore deeper into the library"]
        },
        {
          prompt: "A small, curious creature with luminescent eyes watches you from a corner. It doesn't seem threatening, but rather interested in your presence.",
          choices: ["Approach the creature", "Offer it some food", "Continue on your path"]
        },
        {
          prompt: "You reach a chamber with three distinct doorways. One is made of stone, one of metal, and one appears to be made of crystal.",
          choices: ["Enter the stone doorway", "Try the metal door", "Pass through the crystal entrance"]
        },
        {
          prompt: "A strange mechanism with gears and levers occupies the center of the room. It seems to control something important.",
          choices: ["Pull the main lever", "Examine the mechanism closely", "Look for instructions"]
        },
        {
          prompt: "You find yourself in a garden of strange, glowing mushrooms. The air here feels different, almost magical.",
          choices: ["Sample a mushroom", "Follow the path deeper", "Collect some specimens"]
        }
      ];
      
      // Ending scenarios for when the game should end
      const endingScenarios = [
        {
          prompt: "As you make your final choice, the cave begins to shake. You rush toward the exit, barely escaping as the entrance collapses behind you. You emerge into sunlight, forever changed by your adventure.",
          choices: ["Start a new adventure", "Try a different game", "Exit"]
        },
        {
          prompt: "You discover an ancient treasure beyond your wildest dreams. As you touch it, you're enveloped in a warm light and transported back to the entrance, your pockets mysteriously filled with gold coins.",
          choices: ["Start a new adventure", "Try a different game", "Exit"]
        },
        {
          prompt: "The mysterious creature leads you to a hidden portal. With a grateful nod, you step through and find yourself back in the familiar world, though you know you can return to the adventure whenever you wish.",
          choices: ["Start a new adventure", "Try a different game", "Exit"]
        }
      ];
      
      let storyResponse;
      
      if (shouldEndGame) {
        // Select a random ending scenario
        const randomIndex = Math.floor(Math.random() * endingScenarios.length);
        const scenario = endingScenarios[randomIndex];
        
        storyResponse = {
          prompt: scenario.prompt,
          fullText: scenario.prompt,
          choices: scenario.choices,
          isEnding: true
        };
      } else {
        // Select a random adventure scenario
        const randomIndex = Math.floor(Math.random() * adventureScenarios.length);
        const scenario = adventureScenarios[randomIndex];
        
        storyResponse = {
          prompt: scenario.prompt,
          fullText: scenario.prompt,
          choices: scenario.choices,
          isEnding: false
        };
      }
      
      console.log("Generated adventure response:", storyResponse);
      
      // Update current state
      this.currentPrompt = storyResponse.prompt;
      this.lastAIResponse = storyResponse;
      this.choices = storyResponse.choices;
      
      // Add to history
      this.history.push({
        type: 'system',
        content: this.currentPrompt
      });
      
      // Check if this is an ending
      if (storyResponse.isEnding || this.turnCount >= this.maxTurns) {
        this.state = 'gameover';
        const endingResponse = `🏆 ${this.currentPrompt}\n\nTHE END\n\nYour adventure has concluded! Reply with 1 to start a new adventure, or exit to play a different game.`;
        console.log('Sending ending response:', endingResponse);
        return endingResponse;
      }
      
      // Start generating the next response in the background for future turns
      this.generateNextResponseAsync(userChoice).catch(err => {
        console.error('Background generation error (non-blocking):', err);
      });
      
      // Create a simple response with the story and choices
      const formattedResponse = `🤖 ${this.currentPrompt}\n\nYour choices:\n` +
        this.choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n');
      
      console.log('Sending story response:', formattedResponse);
      return formattedResponse;
      
    } catch (error) {
      console.error("Error in handleUserResponse:", error);
      console.error("Error stack:", error.stack);
      
      // Log more details if it's an API error
      if (error.message && error.message.includes('Gemini API')) {
        console.error("Gemini API error detected. Check your API key and network connection.");
      }
      
      // Use a fallback story when AI generation fails
      const fallbackStory = this.getFallbackStory();
      this.currentPrompt = fallbackStory.prompt;
      this.choices = fallbackStory.choices;
      
      // Add to history
      this.history.push({
        type: 'system',
        content: this.currentPrompt
      });
      
      // Add error information to the response for debugging
      const fallbackResponse = `🤖 ${this.currentPrompt}\n\n[Note: Using fallback story due to error: ${error.message}]\n\nYour choices:\n` +
        this.choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n');
      console.log('Sending fallback response to Twilio:', fallbackResponse);
      return fallbackResponse;
    }
  }
  
  // Generate the next response in the background
  async generateNextResponseAsync(userChoice) {
    try {
      console.log("Starting background generation for next response");
      
      // Create a local shouldEndGame variable based on turn count
      // For next turn, we need to add 1 to the current turn count
      const nextTurn = this.turnCount + 1;
      const shouldEndGame = nextTurn >= this.maxTurns || Math.random() < 0.2;
      
      // Use predefined adventure scenarios based on user choice
      const adventureScenarios = [
        {
          prompt: "You enter a dimly lit chamber. Ancient runes glow faintly on the walls, and a mysterious pedestal stands in the center.",
          choices: ["Touch the pedestal", "Examine the runes", "Look for hidden passages"]
        },
        {
          prompt: "A narrow passage leads to a vast underground lake. The water glows with an ethereal blue light, and you can see strange shapes moving beneath the surface.",
          choices: ["Wade into the water", "Follow the shoreline", "Throw a stone into the lake"]
        },
        {
          prompt: "You discover an ancient library filled with dusty tomes. One book on a central stand seems to emit a faint golden glow.",
          choices: ["Open the glowing book", "Search for specific information", "Explore deeper into the library"]
        },
        {
          prompt: "A small, curious creature with luminescent eyes watches you from a corner. It doesn't seem threatening, but rather interested in your presence.",
          choices: ["Approach the creature", "Offer it some food", "Continue on your path"]
        },
        {
          prompt: "You reach a chamber with three distinct doorways. One is made of stone, one of metal, and one appears to be made of crystal.",
          choices: ["Enter the stone doorway", "Try the metal door", "Pass through the crystal entrance"]
        },
        {
          prompt: "A strange mechanism with gears and levers occupies the center of the room. It seems to control something important.",
          choices: ["Pull the main lever", "Examine the mechanism closely", "Look for instructions"]
        },
        {
          prompt: "You find yourself in a garden of strange, glowing mushrooms. The air here feels different, almost magical.",
          choices: ["Sample a mushroom", "Follow the path deeper", "Collect some specimens"]
        },
        {
          prompt: "You come across a small underground stream with crystal-clear water. Something shimmers at the bottom.",
          choices: ["Reach into the water", "Follow the stream", "Drink from the stream"]
        },
        {
          prompt: "A massive door blocks your path, covered in intricate carvings depicting an ancient battle.",
          choices: ["Try to push the door open", "Look for a key or mechanism", "Study the carvings closely"]
        },
        {
          prompt: "You hear faint music coming from deeper in the cave. The melody is hauntingly beautiful.",
          choices: ["Follow the music", "Call out to whoever is playing", "Proceed with caution"]
        }
      ];
      
      // Ending scenarios for when the game should end
      const endingScenarios = [
        {
          prompt: "As you make your final choice, the cave begins to shake. You rush toward the exit, barely escaping as the entrance collapses behind you. You emerge into sunlight, forever changed by your adventure.",
          choices: ["Start a new adventure", "Try a different game", "Exit"]
        },
        {
          prompt: "You discover an ancient treasure beyond your wildest dreams. As you touch it, you're enveloped in a warm light and transported back to the entrance, your pockets mysteriously filled with gold coins.",
          choices: ["Start a new adventure", "Try a different game", "Exit"]
        },
        {
          prompt: "The mysterious creature leads you to a hidden portal. With a grateful nod, you step through and find yourself back in the familiar world, though you know you can return to the adventure whenever you wish.",
          choices: ["Start a new adventure", "Try a different game", "Exit"]
        },
        {
          prompt: "You find a magical artifact that grants you one wish. You wish for safe passage home, and in an instant, you're transported back to where your journey began, but with memories that will last a lifetime.",
          choices: ["Start a new adventure", "Try a different game", "Exit"]
        },
        {
          prompt: "As you solve the final puzzle, a hidden door opens revealing the outside world. You step through, knowing you've conquered the mysteries of the cave and emerged victorious.",
          choices: ["Start a new adventure", "Try a different game", "Exit"]
        }
      ];
      
      let storyResponse;
      
      if (shouldEndGame) {
        // Select a random ending scenario
        const randomIndex = Math.floor(Math.random() * endingScenarios.length);
        const scenario = endingScenarios[randomIndex];
        
        storyResponse = {
          prompt: scenario.prompt,
          fullText: scenario.prompt,
          choices: scenario.choices,
          isEnding: true
        };
      } else {
        // Select a random adventure scenario that's different from the current prompt
        let filteredScenarios = adventureScenarios.filter(scenario => 
          !this.currentPrompt.includes(scenario.prompt.substring(0, 20)));
        
        // If all scenarios have been used, just use all of them
        if (filteredScenarios.length === 0) {
          filteredScenarios = adventureScenarios;
        }
        
        const randomIndex = Math.floor(Math.random() * filteredScenarios.length);
        const scenario = filteredScenarios[randomIndex];
        
        storyResponse = {
          prompt: scenario.prompt,
          fullText: scenario.prompt,
          choices: scenario.choices,
          isEnding: false
        };
      }
      
      console.log("Background generation complete, will be used in next turn");
      console.log("Generated background response:", storyResponse);
      
      // Store for future use but don't update the current state
      this.nextResponse = storyResponse;
    } catch (error) {
      console.error("Error in background generation:", error);
      // Don't set a fallback response here, let the next handleUserResponse handle it
    }
  }
  
  // Add a method to reset the game
  resetGame() {
    this.state = 'play';
    this.currentPrompt = "You find yourself at the entrance of a mysterious cave. Strange glowing symbols adorn the walls, and a cool breeze flows from within.";
    this.choices = ["Enter the cave", "Examine the symbols", "Look for another way"];
    this.history = [];
    this.lastAIResponse = null;
    this.turnCount = 0;
    
    // Add initial prompt to history
    this.history.push({
      type: 'system',
      content: this.currentPrompt
    });
    
    console.log("Game reset to initial state");
  }
}

module.exports = AIAdventure;
