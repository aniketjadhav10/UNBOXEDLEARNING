import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Maximize2, Minimize2, Menu, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatWindow } from './ChatWindow';
import { chatService, ChatSession } from '../../services/chatService';
import { usePathname } from 'next/navigation';

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Don't show floating chat on the dedicated chat page
  const pathname = usePathname();
  if (pathname === '/chat') {
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
    setShowMenu(false);
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this chat?')) return;
    
    try {
      await chatService.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  return (
    <>
      <div className={`fixed z-50 transition-all duration-300 ${isMaximized ? 'bottom-6 right-6 opacity-0 pointer-events-none' : 'bottom-6 right-6 opacity-100'}`}>
        <button
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              setIsMaximized(false);
            } else {
              setIsOpen(true);
            }
          }}
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
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              width: isMaximized ? '100vw' : '400px',
              height: isMaximized ? '100vh' : '600px',
              bottom: isMaximized ? 0 : '6rem',
              right: isMaximized ? 0 : '1.5rem',
              maxHeight: isMaximized ? '100vh' : '80vh',
              maxWidth: isMaximized ? '100vw' : 'calc(100vw - 3rem)',
              borderRadius: isMaximized ? '0' : '1rem'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed z-40 bg-white shadow-2xl overflow-hidden border border-gray-100 flex flex-col"
          >
            {/* Minimal Header for floating view */}
            <div className="p-3 bg-indigo-600 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setShowMenu(!showMenu)}
                   className="p-1 hover:bg-white/20 rounded transition-colors"
                   title="Toggle Menu"
                 >
                   <Menu className="w-4 h-4" />
                 </button>
                 <span className="font-medium flex items-center gap-2">
                   <MessageSquare className="w-4 h-4" /> AI Assistant
                 </span>
               </div>
               <div className="flex gap-2 items-center">
                 <button onClick={handleNewSession} className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded">
                   New
                 </button>
                 <button 
                   onClick={() => setIsMaximized(!isMaximized)}
                   className="p-1 hover:bg-white/20 rounded transition-colors ml-1"
                   title={isMaximized ? "Restore down" : "Maximize"}
                 >
                   {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                 </button>
                 {isMaximized && (
                   <button 
                     onClick={() => {
                       setIsOpen(false);
                       setIsMaximized(false);
                     }}
                     className="p-1 hover:bg-white/20 rounded transition-colors ml-1"
                     title="Close"
                   >
                     <X className="w-5 h-5" />
                   </button>
                 )}
               </div>
            </div>
            
            <div className="flex-1 overflow-hidden relative flex">
              {/* Sessions Menu */}
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 250, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="border-r border-gray-100 bg-gray-50 overflow-hidden flex flex-col shrink-0"
                  >
                    <div className="p-3 font-semibold text-gray-700 border-b border-gray-100 shrink-0">
                      Recent Chats
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {sessions.length === 0 ? (
                        <div className="text-center py-4 text-gray-400 text-sm">No recent chats</div>
                      ) : (
                        sessions.map(session => (
                          <button
                            key={session.id}
                            onClick={() => {
                              setActiveSessionId(session.id);
                              if (!isMaximized) setShowMenu(false); // auto-close on mobile/small view
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-lg transition-all group text-left ${
                              activeSessionId === session.id 
                                ? 'bg-indigo-100 text-indigo-700 font-medium' 
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <span className="truncate pr-2 text-sm flex-1">
                              {session.title || 'New Chat'}
                            </span>
                            <Trash2 
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              className={`w-3.5 h-3.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                                 activeSessionId === session.id ? 'opacity-100' : ''
                              }`} 
                            />
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex-1 min-w-0">
                <ChatWindow
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onSessionSelect={setActiveSessionId}
                  onNewSession={handleNewSession}
                  className="rounded-none border-none shadow-none"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
