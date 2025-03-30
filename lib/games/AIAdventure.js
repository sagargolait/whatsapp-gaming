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
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      });
      
      // Keep context minimal
      let context = "This is an adventure game. The player's last choice was: " + userChoice;
      
      const prompt = `${context}
      
      Generate a very short next part of the adventure (1-2 sentences).
      End with exactly 3 choices labeled as:
      A) [first option]
      B) [second option]
      C) [third option]`;
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      console.log("AI Response:", text);
      
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
      }
      
      // Create a response structure
      return {
        prompt: text.substring(0, text.indexOf('A)') > 0 ? text.indexOf('A)') : text.length).trim(),
        fullText: text,
        choices: extractedChoices,
        isEnding: Math.random() < 0.1
      };
    } catch (error) {
      console.error("Error generating response:", error);
      return {
        prompt: "Your choice leads to an unexpected twist! The path suddenly opens to a clearing with a mysterious chest.",
        fullText: "Your choice leads to an unexpected twist! The path suddenly opens to a clearing with a mysterious chest.",
        choices: ["Open the chest", "Ignore it and continue", "Examine it carefully first"],
        isEnding: false
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
    // Check if user input is valid (1, 2, or 3)
    const choiceIndex = parseInt(userMessage) - 1;
    
    if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= this.choices.length) {
      return `Please choose a valid option (1-${this.choices.length}).\n\n` +
        this.choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n');
    }
    
    const userChoice = this.choices[choiceIndex];
    
    // Add to history
    this.history.push({
      type: 'user',
      content: userChoice
    });
    
    // Show the last AI response if available
    let responseText = '';
    if (this.lastAIResponse && this.lastAIResponse.fullText) {
      const fullText = this.lastAIResponse.fullText;
      const choicesPart = fullText.indexOf('A)') > 0 ? fullText.substring(0, fullText.indexOf('A)')).trim() : fullText;
      responseText = `🤖 AI Response:\n${choicesPart}\n\n`;
    }
    
    // Generate a simple immediate response
    this.currentPrompt = `You chose: ${userChoice}\n\n${responseText}The adventure continues...`;
    
    // Add to history
    this.history.push({
      type: 'system',
      content: this.currentPrompt
    });
    
    // Set temporary choices
    this.choices = ["Wait for the story to continue...", "Consider your next move", "Prepare for what comes next"];
    
    // Trigger async update in the background
    this.updateAdventureAsync(userChoice);
    
    // Return the immediate response
    return `${this.currentPrompt}\n\nYour choices:\n` +
      this.choices.map((choice, index) => `${index + 1}. ${choice}`).join('\n');
  }
  
  async updateAdventureAsync(userChoice) {
    try {
      // Add a timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI response timeout')), 5000);
      });
      
      // Race between the AI response and the timeout
      const response = await Promise.race([
        this.generateResponse(userChoice),
        timeoutPromise
      ]);
      
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
      } else {
        // Update choices for next round
        this.choices = response.choices || ["Continue the adventure", "Take a different path", "Rest and think"];
      }
      
      console.log("Adventure updated asynchronously:", this.currentPrompt);
    } catch (error) {
      console.error("Error in updateAdventureAsync:", error);
      
      // Create a fallback response
      const fallbackResponse = {
        prompt: "The adventure continues as you make your choice...",
        fullText: "The adventure continues as you make your choice...",
        choices: ["Explore further", "Be cautious", "Try something new"]
      };
      
      // Update with fallback
      this.currentPrompt = fallbackResponse.prompt;
      this.lastAIResponse = fallbackResponse;
      this.choices = fallbackResponse.choices;
      
      // Update history
      this.history.push({
        type: 'system',
        content: this.currentPrompt
      });
    }
  }
}

module.exports = AIAdventure;
