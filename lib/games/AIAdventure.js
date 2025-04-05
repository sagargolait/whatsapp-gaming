const superb = require('superb');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyDdu7lnNmxhLgFNI7L7jP9JKQggT4spYLI'); // Fallback to free API key if env var not set

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

  async generateResponse(userChoice) {
    try {
      console.log("Attempting to generate AI response for choice:", userChoice);
      
      // Check if API key is available
      const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDdu7lnNmxhLgFNI7L7jP9JKQggT4spYLI';
      console.log("Using API key:", apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5));
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      });
      
      // Increment turn count
      this.turnCount++;
      
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
      
      // Create a hardcoded story segment instead of just a fallback message
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
      
      // Select a random fallback story based on turn count
      const fallbackIndex = this.turnCount % fallbackStories.length;
      const fallbackStory = fallbackStories[fallbackIndex];
      
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

  handleUserResponse(userMessage) {
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
    
    // Check if we have a pending AI response that hasn't been shown to the user yet
    if (this.lastAIResponse && this.lastAIResponse.choices && 
        this.choices[0] === "Wait for the story to continue...") {
      console.log("Using pending AI response that wasn't shown yet");
      // We have a pending response, so show it now
      this.currentPrompt = this.lastAIResponse.prompt;
      this.choices = this.lastAIResponse.choices;
      
      // Check if this is an ending
      if (this.lastAIResponse.isEnding) {
        this.state = 'gameover';
        return `🏆 ${this.currentPrompt}\n\nTHE END\n\nYour adventure has concluded! Reply with 1 to start a new adventure, or exit to play a different game.`;
      }
      
      // Return the updated choices
      return `🤖 ${this.currentPrompt}\n\nYour choices:\n` +
        this.choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n');
    }
    
    // Generate a simple immediate response
    this.currentPrompt = `You chose: ${userChoice}\n\nThe adventure continues...`;
    
    // Add to history
    this.history.push({
      type: 'system',
      content: this.currentPrompt
    });
    
    // Set temporary choices
    this.choices = ["Wait for the story to continue...", "Consider your next move", "Prepare for what comes next"];
    
    // Trigger async update in the background
    console.log("Triggering async story update for choice:", userChoice);
    this.updateAdventureAsync(userChoice);
    
    // Return the immediate response
    return `${this.currentPrompt}\n\nYour choices:\n` +
      this.choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n') + 
      '\n\n(The story is being generated. Reply with any number to continue when ready.)';
  }
  
  async updateAdventureAsync(userChoice) {
    try {
      console.log("Starting updateAdventureAsync for choice:", userChoice);
      
      // Add a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI response timeout')), 8000); // Increase timeout to 8 seconds
      });
      
      // Race between the AI response and the timeout
      console.log("Waiting for AI response or timeout...");
      const response = await Promise.race([
        this.generateResponse(userChoice),
        timeoutPromise
      ]);
      
      console.log("Received response in updateAdventureAsync:", response.prompt.substring(0, 50) + "...");
      
      // Update current state
      this.currentPrompt = response.prompt;
      
      // Update history
      this.history.push({
        type: 'system',
        content: this.currentPrompt
      });
      
      // Store the full AI response
      this.lastAIResponse = response;
      
      // Check if this is an ending
      if (response.isEnding) {
        this.state = 'gameover';
        console.log("Game ending triggered");
      } else {
        // Update choices for next round
        this.choices = response.choices || ["Continue the adventure", "Take a different path", "Rest and think"];
        console.log("Updated choices:", this.choices);
      }
      
      console.log("Adventure updated asynchronously:", this.currentPrompt);
    } catch (error) {
      console.error("Error in updateAdventureAsync:", error);
      console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Create a hardcoded story segment instead of just a fallback message
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
      
      // Select a random fallback story based on turn count
      const fallbackIndex = this.turnCount % fallbackStories.length;
      const fallbackStory = fallbackStories[fallbackIndex];
      
      // Update with fallback
      this.currentPrompt = fallbackStory.prompt;
      this.lastAIResponse = {
        prompt: fallbackStory.prompt,
        fullText: fallbackStory.prompt,
        choices: fallbackStory.choices,
        isEnding: this.turnCount >= this.maxTurns
      };
      this.choices = fallbackStory.choices;
      
      // Update history
      this.history.push({
        type: 'system',
        content: this.currentPrompt
      });
      
      console.log("Using fallback story:", this.currentPrompt);
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
