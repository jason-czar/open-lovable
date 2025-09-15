import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MessageSquare, Code, Package, TrendingUp } from 'lucide-react';
import { ConversationMessage } from '@/types/conversation';
import { cn } from '@/utils/cn';

interface ConversationSummaryProps {
  messages: ConversationMessage[];
  className?: string;
}

export default function ConversationSummary({ messages, className }: ConversationSummaryProps) {
  if (messages.length === 0) return null;

  const stats = {
    totalMessages: messages.length,
    userMessages: messages.filter(m => m.role === 'user').length,
    assistantMessages: messages.filter(m => m.role === 'assistant').length,
    followUps: messages.filter(m => m.metadata?.isFollowUp).length,
    filesEdited: new Set(
      messages.flatMap(m => m.metadata?.editedFiles || [])
    ).size,
    packagesAdded: new Set(
      messages.flatMap(m => m.metadata?.addedPackages || [])
    ).size,
    duration: messages.length > 0 ? Date.now() - messages[0].timestamp : 0
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-r from-heat-4 to-heat-8 border border-heat-100/20 rounded-12 p-16",
        className
      )}
    >
      <div className="flex items-center gap-8 mb-12">
        <TrendingUp className="w-16 h-16 text-heat-100" />
        <h4 className="text-label-medium text-accent-black font-medium">
          Session Summary
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="flex items-center gap-8">
            <MessageSquare className="w-14 h-14 text-black-alpha-48" />
            <div>
              <div className="text-label-small text-accent-black font-medium">
                {stats.totalMessages}
              </div>
              <div className="text-body-small text-black-alpha-56">
                Total messages
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <Code className="w-14 h-14 text-black-alpha-48" />
            <div>
              <div className="text-label-small text-accent-black font-medium">
                {stats.filesEdited}
              </div>
              <div className="text-body-small text-black-alpha-56">
                Files modified
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-8">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600">↻</span>
            </div>
            <div>
              <div className="text-label-small text-accent-black font-medium">
                {stats.followUps}
              </div>
              <div className="text-body-small text-black-alpha-56">
                Refinements
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <Clock className="w-14 h-14 text-black-alpha-48" />
            <div>
              <div className="text-label-small text-accent-black font-medium">
                {formatDuration(stats.duration)}
              </div>
              <div className="text-body-small text-black-alpha-56">
                Session time
              </div>
            </div>
          </div>
        </div>
      </div>

      {stats.packagesAdded > 0 && (
        <div className="mt-12 pt-12 border-t border-heat-100/20">
          <div className="flex items-center gap-8">
            <Package className="w-14 h-14 text-black-alpha-48" />
            <div className="text-body-small text-black-alpha-64">
              {stats.packagesAdded} package{stats.packagesAdded !== 1 ? 's' : ''} added during this session
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}