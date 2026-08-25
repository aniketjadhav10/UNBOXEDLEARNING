'use client';
import { GraduationCap } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full py-12">
      {/* Outer spinning ring with logo inside */}
      <div className="relative flex items-center justify-center">
        {/* Animated outer ring */}
        <div className="w-20 h-20 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
        
        {/* Pulsing inner logo icon */}
        <div className="absolute w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse">
          <GraduationCap className="text-white w-6 h-6" />
        </div>
      </div>
      
      {/* Loading description text */}
      <h3 className="mt-6 text-gray-900 font-bold text-base leading-tight">
        Loading Lesson Hub...
      </h3>
      <p className="mt-1 text-gray-400 text-xs font-medium">
        Unboxing your personalized curriculum
      </p>
    </div>
  );
}
