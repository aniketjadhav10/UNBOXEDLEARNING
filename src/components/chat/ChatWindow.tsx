import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatService, ChatSession, ChatMessage } from '../../services/chatService';

interface ChatWindowProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onNewSession: () => void;
  className?: string;
}

export function ChatWindow({ sessions, activeSessionId, onSessionSelect, onNewSession, className = '' }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  const loadMessages = async (sessionId: string) => {
    try {
      setLoading(true);
      const data = await chatService.getMessages(sessionId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      // Create new session if none active
      try {
        const newSession = await chatService.createSession(input.slice(0, 30) + '...');
        sessionId = newSession.id;
        onSessionSelect(newSession.id);
      } catch (err) {
        console.error('Failed to create session:', err);
        return;
      }
    }

    const userMessageContent = input.trim();
    setInput('');
    
    // Optimistic UI update
    const tempUserMsg: ChatMessage = {
      id: Date.now().toString(),
      session_id: sessionId,
      role: 'user',
      content: userMessageContent,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      // Send to AI
      const aiResponseText = await chatService.sendMessage(
        sessionId,
        [...messages, tempUserMsg].map(m => ({ role: m.role, content: m.content })),
        true // enable curriculum context
      );

      // Add AI response to UI
      const tempAiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        session_id: sessionId,
        role: 'model',
        content: aiResponseText,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempAiMsg]);

    } catch (err) {
      console.error('Failed to send message:', err);
      // We could add an error message to the UI here
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
            <Bot className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-xs text-gray-500">I remember your preferences</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        <AnimatePresence initial={false}>
          {messages.length === 0 && !loading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
                <Bot className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-800">How can I help you today?</h3>
              <p className="text-gray-500 max-w-sm">
                Ask me about your curriculum, topics, or tasks. I also learn from our conversations over time!
              </p>
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-100'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-sm'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-4"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-gray-600" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm rounded-tl-none">
                <div className="flex gap-1.5 items-center h-6">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="w-full pl-6 pr-14 py-4 bg-gray-50 border-transparent rounded-full focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
