import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Code, Package, Clock, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { ConversationMessage } from '@/types/conversation';
import { cn } from '@/utils/cn';

interface ConversationHistoryProps {
  messages: ConversationMessage[];
  onFollowUp: (messageId: string, instruction: string) => void;
  className?: string;
}

export default function ConversationHistory({ 
  messages, 
  onFollowUp, 
  className 
}: ConversationHistoryProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [followUpInputs, setFollowUpInputs] = useState<Record<string, string>>({});
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const toggleExpanded = (messageId: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedMessages(newExpanded);
  };

  const handleFollowUp = (messageId: string) => {
    const instruction = followUpInputs[messageId]?.trim();
    if (instruction) {
      onFollowUp(messageId, instruction);
      setFollowUpInputs(prev => ({ ...prev, [messageId]: '' }));
    }
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [messageId]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [messageId]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={cn("space-y-12", className)}>
      <div className="flex items-center gap-8 mb-16">
        <MessageSquare className="w-16 h-16 text-heat-100" />
        <h3 className="text-label-large text-accent-black font-medium">
          Conversation History
        </h3>
        <div className="text-body-small text-black-alpha-56">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-8">
        {messages.map((message, index) => {
          const isExpanded = expandedMessages.has(message.id);
          const isAssistant = message.role === 'assistant';
          const hasMetadata = message.metadata && (
            message.metadata.editedFiles?.length || 
            message.metadata.addedPackages?.length
          );

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "border border-border-faint rounded-12 bg-white overflow-hidden",
                isAssistant && "border-heat-100/20 bg-heat-4/30"
              )}
            >
              {/* Message Header */}
              <div className="p-16 border-b border-border-faint">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-12">
                    <div className={cn(
                      "w-32 h-32 rounded-full flex items-center justify-center",
                      isAssistant ? "bg-heat-100 text-white" : "bg-black-alpha-8 text-black-alpha-64"
                    )}>
                      {isAssistant ? (
                        <Code className="w-16 h-16" />
                      ) : (
                        <MessageSquare className="w-16 h-16" />
                      )}
                    </div>
                    
                    <div>
                      <div className="text-label-medium text-accent-black font-medium">
                        {isAssistant ? 'AI Assistant' : 'You'}
                      </div>
                      <div className="flex items-center gap-8 text-body-small text-black-alpha-56">
                        <Clock className="w-12 h-12" />
                        {formatTimestamp(message.timestamp)}
                        {message.metadata?.isFollowUp && (
                          <span className="px-6 py-2 bg-blue-100 text-blue-800 rounded-6 text-xs">
                            Follow-up
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    {/* Copy button */}
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="p-6 hover:bg-black-alpha-4 rounded-6 transition-colors"
                      title="Copy message"
                    >
                      {copiedStates[message.id] ? (
                        <Check className="w-14 h-14 text-green-600" />
                      ) : (
                        <Copy className="w-14 h-14 text-black-alpha-48" />
                      )}
                    </button>

                    {/* Expand/collapse button */}
                    <button
                      onClick={() => toggleExpanded(message.id)}
                      className="p-6 hover:bg-black-alpha-4 rounded-6 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-16 h-16 text-black-alpha-48" />
                      ) : (
                        <ChevronDown className="w-16 h-16 text-black-alpha-48" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Metadata badges */}
                {hasMetadata && (
                  <div className="flex items-center gap-8 mt-12">
                    {message.metadata?.editedFiles?.length && (
                      <div className="flex items-center gap-4 px-8 py-4 bg-green-50 text-green-800 rounded-6 text-xs">
                        <Code className="w-12 h-12" />
                        {message.metadata.editedFiles.length} file{message.metadata.editedFiles.length !== 1 ? 's' : ''} edited
                      </div>
                    )}
                    {message.metadata?.addedPackages?.length && (
                      <div className="flex items-center gap-4 px-8 py-4 bg-blue-50 text-blue-800 rounded-6 text-xs">
                        <Package className="w-12 h-12" />
                        {message.metadata.addedPackages.length} package{message.metadata.addedPackages.length !== 1 ? 's' : ''} added
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="p-16">
                <div className={cn(
                  "text-body-medium text-accent-black",
                  !isExpanded && "line-clamp-3"
                )}>
                  {message.content.length > 200 && !isExpanded ? (
                    <>
                      {message.content.substring(0, 200)}...
                      <button
                        onClick={() => toggleExpanded(message.id)}
                        className="text-heat-100 hover:text-heat-200 ml-4 text-body-small"
                      >
                        Show more
                      </button>
                    </>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                  )}
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      {/* Detailed metadata */}
                      {message.metadata && (
                        <div className="mt-16 pt-16 border-t border-border-faint space-y-8">
                          {message.metadata.editedFiles?.length && (
                            <div>
                              <div className="text-label-small text-black-alpha-64 mb-4">Files Modified:</div>
                              <div className="space-y-2">
                                {message.metadata.editedFiles.map((file: string) => (
                                  <div key={file} className="text-body-small font-mono bg-black-alpha-4 px-8 py-4 rounded-6">
                                    {file}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {message.metadata.addedPackages?.length && (
                            <div>
                              <div className="text-label-small text-black-alpha-64 mb-4">Packages Added:</div>
                              <div className="flex flex-wrap gap-6">
                                {message.metadata.addedPackages.map((pkg: string) => (
                                  <span key={pkg} className="px-8 py-4 bg-blue-50 text-blue-800 rounded-6 text-body-small font-mono">
                                    {pkg}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Follow-up input for assistant messages */}
                      {isAssistant && (
                        <div className="mt-16 pt-16 border-t border-border-faint">
                          <div className="text-label-small text-black-alpha-64 mb-8">
                            Refine this result:
                          </div>
                          <div className="flex gap-8">
                            <input
                              type="text"
                              value={followUpInputs[message.id] || ''}
                              onChange={(e) => setFollowUpInputs(prev => ({
                                ...prev,
                                [message.id]: e.target.value
                              }))}
                              placeholder="e.g., 'make the header blue', 'add a search bar', 'fix the mobile layout'"
                              className="flex-1 px-12 py-8 border border-black-alpha-8 rounded-8 text-body-medium focus:border-heat-100 focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && followUpInputs[message.id]?.trim()) {
                                  handleFollowUp(message.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleFollowUp(message.id)}
                              disabled={!followUpInputs[message.id]?.trim()}
                              className={cn(
                                "px-16 py-8 rounded-8 text-label-medium font-medium transition-all",
                                followUpInputs[message.id]?.trim()
                                  ? "bg-heat-100 text-white hover:bg-heat-200"
                                  : "bg-black-alpha-4 text-black-alpha-32 cursor-not-allowed"
                              )}
                            >
                              Refine
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}