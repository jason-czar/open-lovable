import { ConversationMessage, ConversationState, ConversationContext } from '@/types/conversation';

export class ConversationManager {
  private static instance: ConversationManager;
  private conversations: Map<string, ConversationState> = new Map();

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  /**
   * Create a new conversation
   */
  createConversation(): ConversationState {
    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const conversation: ConversationState = {
      conversationId,
      startedAt: Date.now(),
      lastUpdated: Date.now(),
      context: {
        messages: [],
        edits: [],
        projectEvolution: { majorChanges: [] },
        userPreferences: {}
      }
    };

    this.conversations.set(conversationId, conversation);
    return conversation;
  }

  /**
   * Add a message to the conversation
   */
  addMessage(
    conversationId: string, 
    message: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): ConversationMessage {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const newMessage: ConversationMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    conversation.context.messages.push(newMessage);
    conversation.lastUpdated = Date.now();

    // Keep only last 50 messages to prevent memory issues
    if (conversation.context.messages.length > 50) {
      conversation.context.messages = conversation.context.messages.slice(-50);
    }

    return newMessage;
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): ConversationState | null {
    return this.conversations.get(conversationId) || null;
  }

  /**
   * Get recent messages for AI context
   */
  getRecentContext(conversationId: string, maxMessages: number = 10): ConversationMessage[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];

    return conversation.context.messages.slice(-maxMessages);
  }

  /**
   * Build context prompt for AI
   */
  buildContextPrompt(conversationId: string): string {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return '';

    const recentMessages = this.getRecentContext(conversationId, 5);
    if (recentMessages.length === 0) return '';

    const contextSections: string[] = [];

    // Add conversation context
    contextSections.push('## Conversation Context');
    contextSections.push('Previous interactions in this session:\n');

    for (const message of recentMessages) {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      const content = message.content.length > 200 
        ? message.content.substring(0, 200) + '...'
        : message.content;
      
      contextSections.push(`**${role}**: ${content}`);
      
      if (message.metadata?.editedFiles?.length) {
        contextSections.push(`  → Modified: ${message.metadata.editedFiles.join(', ')}`);
      }
    }

    // Add project evolution
    if (conversation.context.projectEvolution.majorChanges.length > 0) {
      contextSections.push('\n## Project Evolution');
      const recentChanges = conversation.context.projectEvolution.majorChanges.slice(-3);
      
      for (const change of recentChanges) {
        contextSections.push(`- ${change.description} (${change.filesAffected.join(', ')})`);
      }
    }

    // Add user preferences
    if (Object.keys(conversation.context.userPreferences).length > 0) {
      contextSections.push('\n## User Preferences');
      const prefs = conversation.context.userPreferences;
      
      if (prefs.editStyle) {
        contextSections.push(`- Edit style: ${prefs.editStyle}`);
      }
      if (prefs.packagePreferences?.length) {
        contextSections.push(`- Preferred packages: ${prefs.packagePreferences.join(', ')}`);
      }
    }

    return contextSections.join('\n');
  }

  /**
   * Track a major change in the project
   */
  trackMajorChange(
    conversationId: string,
    description: string,
    filesAffected: string[]
  ): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    conversation.context.projectEvolution.majorChanges.push({
      timestamp: Date.now(),
      description,
      filesAffected
    });

    // Keep only last 10 major changes
    if (conversation.context.projectEvolution.majorChanges.length > 10) {
      conversation.context.projectEvolution.majorChanges = 
        conversation.context.projectEvolution.majorChanges.slice(-10);
    }

    conversation.lastUpdated = Date.now();
  }

  /**
   * Update user preferences based on behavior
   */
  updateUserPreferences(
    conversationId: string,
    preferences: Partial<ConversationContext['userPreferences']>
  ): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    conversation.context.userPreferences = {
      ...conversation.context.userPreferences,
      ...preferences
    };

    conversation.lastUpdated = Date.now();
  }

  /**
   * Clean up old conversations
   */
  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    
    for (const [id, conversation] of this.conversations.entries()) {
      if (now - conversation.lastUpdated > maxAge) {
        this.conversations.delete(id);
      }
    }
  }

  /**
   * Get conversation statistics
   */
  getStats(conversationId: string) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    const messages = conversation.context.messages;
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;
    const followUps = messages.filter(m => m.metadata?.isFollowUp).length;
    const totalEdits = conversation.context.edits.length;

    return {
      totalMessages: messages.length,
      userMessages,
      assistantMessages,
      followUps,
      totalEdits,
      duration: Date.now() - conversation.startedAt,
      lastActivity: conversation.lastUpdated
    };
  }
}