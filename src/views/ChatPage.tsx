import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, MessageSquare, Trash2, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { ChatWindow } from '../components/chat/ChatWindow';
import { chatService, ChatSession } from '../services/chatService';

export function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await chatService.getSessions();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    setActiveSessionId(null); // The ChatWindow will create it on first message
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            AI Chat
          </h1>
          <Link href="/" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <LayoutDashboard className="w-5 h-5" />
          </Link>
        </div>
        
        <div className="p-4">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium"
          >
            <MessageSquarePlus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">
            Recent Chats
          </div>
          {loading ? (
            <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">No recent chats</div>
          ) : (
            sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                  activeSessionId === session.id 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="truncate pr-4 text-sm">
                  {session.title || 'New Chat'}
                </span>
                <Trash2 
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  className={`w-4 h-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${
                     activeSessionId === session.id ? 'opacity-100' : ''
                  }`} 
                />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="h-full max-w-4xl mx-auto">
          <ChatWindow
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSessionSelect={setActiveSessionId}
            onNewSession={handleNewSession}
            className="h-full shadow-lg border border-gray-100"
          />
        </div>
      </div>
    </div>
  );
}
