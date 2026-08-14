import { useState } from 'react';
import { Camera, FileText, Upload, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../store/useToastStore';
import { useData } from '../../context/DataContext';
import { supabase } from '../../services/supabase';
import { motion } from 'framer-motion';

type InputType = 'text' | 'file' | 'camera';

export function SyllabusGeneratorPage() {
  const [inputType, setInputType] = useState<InputType>('text');
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [age, setAge] = useState<number>(10);
  const [skillLevel, setSkillLevel] = useState<string>('Beginner');
  const [targetGrade, setTargetGrade] = useState<string>('None');
  const [isGlobal, setIsGlobal] = useState<boolean>(true);
  const [topicsCount, setTopicsCount] = useState<number>(5);
  const [tasksPerTopic, setTasksPerTopic] = useState<number>(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { kids } = useData();

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    try {
      let sourceText = textInput;

      if (inputType === 'file') {
        // Placeholder for future file parsing
        toast.info('File parsing not fully implemented yet. Please use text for now.');
        setIsGenerating(false);
        return;
      }

      if (inputType === 'camera') {
        // Placeholder for future camera parsing
        toast.info('Camera integration not fully implemented yet.');
        setIsGenerating(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/ai/generateSyllabus', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          sourceText,
          age,
          skillLevel,
          targetGrade: targetGrade === 'None' ? null : targetGrade,
          isGlobal,
          topicsCount,
          tasksPerTopic,
          childId: kids[0]?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate syllabus');
      }

      const data = await response.json();
      
      toast.success('Syllabus generated successfully!');
      
      // Navigate to the newly created subject or subjects list
      if (data.subjectId) {
        navigate(`/subjects/${data.subjectId}/topics`);
      } else {
        navigate('/subjects');
      }

    } catch (error) {
      console.error('Error generating syllabus:', error);
      toast.error('An error occurred while generating the syllabus.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-violet-100 rounded-xl">
            <Sparkles className="w-8 h-8 text-violet-600" />
          </div>
          AI Syllabus Generator
        </h1>
        <p className="mt-2 text-gray-600">
          Generate a comprehensive syllabus (subjects, topics, and tasks) from various sources using AI.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
        
        {/* Input Type Selector */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Source Material
          </label>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setInputType('text')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                inputType === 'text' 
                  ? 'border-violet-600 bg-violet-50 text-violet-700' 
                  : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300'
              }`}
            >
              <FileText className="w-5 h-5" />
              Raw Text
            </button>
            <button
              onClick={() => setInputType('file')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                inputType === 'file' 
                  ? 'border-violet-600 bg-violet-50 text-violet-700' 
                  : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300'
              }`}
            >
              <Upload className="w-5 h-5" />
              Upload PDF/Photo
            </button>
            <button
              onClick={() => setInputType('camera')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-medium transition-all ${
                inputType === 'camera' 
                  ? 'border-violet-600 bg-violet-50 text-violet-700' 
                  : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300'
              }`}
            >
              <Camera className="w-5 h-5" />
              Camera Photo
            </button>
          </div>
        </div>

        {/* Dynamic Input Area */}
        <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-100 min-h-[200px]">
          {inputType === 'text' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste Syllabus / Curriculum Text
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste the educational content or curriculum outline here..."
                className="w-full h-40 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-none"
              />
            </motion.div>
          )}

          {inputType === 'file' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors relative cursor-pointer">
              <input 
                type="file" 
                accept="image/*,.pdf" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">
                {file ? file.name : "Click or drag to upload PDF / Photo"}
              </p>
              <p className="text-xs text-gray-400 mt-1">Supports PDF, JPG, PNG</p>
            </motion.div>
          )}

          {inputType === 'camera' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-xl bg-white">
              <Camera className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">Camera placeholder</p>
              <p className="text-xs text-gray-400 mt-1">Camera integration logic to be implemented</p>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Target Age
            </label>
            <input
              type="number"
              min={3}
              max={18}
              value={age}
              onChange={(e) => setAge(parseInt(e.target.value) || 3)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Topics Count
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={topicsCount}
              onChange={(e) => setTopicsCount(parseInt(e.target.value) || 1)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tasks per Topic
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={tasksPerTopic}
              onChange={(e) => setTasksPerTopic(parseInt(e.target.value) || 1)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Skill Level
            </label>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Align with Standard Grade? (Optional)
            </label>
            <select
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
            >
              <option value="None">No standard alignment</option>
              <option value="Preschool">Preschool</option>
              <option value="JKG">JKG</option>
              <option value="LKG">LKG</option>
              <option value="UKG">UKG</option>
              <option value="Grade 1">Grade 1</option>
              <option value="Grade 2">Grade 2</option>
              <option value="Grade 3">Grade 3</option>
              <option value="Grade 4">Grade 4</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 6">Grade 6</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>
        </div>

        <div className="mb-8 p-4 bg-violet-50 border border-violet-100 rounded-xl flex items-start gap-3">
          <input
            type="checkbox"
            id="isGlobal"
            checked={isGlobal}
            onChange={(e) => setIsGlobal(e.target.checked)}
            className="mt-1 w-4 h-4 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
          />
          <div>
            <label htmlFor="isGlobal" className="block text-sm font-bold text-violet-900 cursor-pointer">
              Share this syllabus with the community?
            </label>
            <p className="text-xs text-violet-700 mt-1">
              If checked, this syllabus will be added to the Global Library so other homeschooling families can benefit from it.
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || (inputType === 'text' && !textInput) || (inputType === 'file' && !file)}
          className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
        >
          {isGenerating ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Syllabus
            </>
          )}
        </button>

      </div>
    </div>
  );
}
