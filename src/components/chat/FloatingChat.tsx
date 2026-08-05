import React, { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatWindow } from './ChatWindow';
import { chatService, ChatSession } from '../../services/chatService';
import { useLocation } from 'react-router-dom';

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Don't show floating chat on the dedicated chat page
  const location = useLocation();
  if (location.pathname === '/chat') {
    return null;
  }

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    try {
      const data = await chatService.getSessions();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };

  const handleNewSession = () => {
    setActiveSessionId(null);
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-4 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${
            isOpen ? 'bg-gray-800 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-[400px] h-[600px] max-h-[80vh] max-w-[calc(100vw-3rem)] z-40 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col"
          >
            {/* Minimal Header for floating view */}
            <div className="p-3 bg-indigo-600 text-white flex justify-between items-center shrink-0">
               <span className="font-medium flex items-center gap-2">
                 <MessageSquare className="w-4 h-4" /> AI Assistant
               </span>
               <div className="flex gap-2">
                 <button onClick={handleNewSession} className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded">
                   New
                 </button>
               </div>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
              <ChatWindow
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSessionSelect={setActiveSessionId}
                onNewSession={handleNewSession}
                className="rounded-none border-none shadow-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
