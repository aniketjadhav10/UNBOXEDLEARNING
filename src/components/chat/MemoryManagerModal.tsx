import React, { useState, useEffect } from 'react';
import { X, Trash2, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { memoryService, UserMemory } from '../../services/memoryService';

interface MemoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MemoryManagerModal({ isOpen, onClose }: MemoryManagerModalProps) {
  const [memories, setMemories] = useState<UserMemory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadMemories();
    }
  }, [isOpen]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      const data = await memoryService.getMemories();
      setMemories(data);
    } catch (err) {
      console.error('Failed to load memories', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await memoryService.deleteMemory(id);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete memory', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 flex flex-col max-h-[80vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BrainCircuit size={18} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">AI Memories</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto bg-gray-50/50">
          <p className="text-sm text-gray-500 mb-4">
            The AI learns these facts about you over time to provide better, personalized answers. You can delete any fact you want it to forget.
          </p>

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading memories...</div>
          ) : memories.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No memories recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {memories.map(memory => (
                <div key={memory.id} className="bg-white border border-gray-100 p-4 rounded-xl flex items-start justify-between gap-4 shadow-sm">
                  <p className="text-sm text-gray-700 leading-relaxed">{memory.content}</p>
                  <button 
                    onClick={() => handleDelete(memory.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title="Forget this fact"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
