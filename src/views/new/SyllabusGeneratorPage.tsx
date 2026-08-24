import { useState } from 'react';
import { Camera, FileText, Upload, Sparkles, Loader2, BrainCircuit, ListTree, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../store/useToastStore';
import { useData } from '../../context/DataContext';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { SyllabusReviewPanel } from '../../components/curriculum/SyllabusReviewPanel';
import { clearCache } from '../../services/cacheService';

type InputType = 'text' | 'file' | 'camera' | 'url';
type GenerationStatus = 'idle' | 'planning' | 'chunking' | 'writing' | 'linking' | 'complete' | 'error';

export function SyllabusGeneratorPage() {
  const [inputType, setInputType] = useState<InputType>('text');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [age, setAge] = useState<number>(10);
  const [skillLevel, setSkillLevel] = useState<string>('Beginner');
  const [targetGrade, setTargetGrade] = useState<string>('None');
  const isGlobal = false; // curated model: generation is private; admins promote to the shared library
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [topicsCount, setTopicsCount] = useState<number>(5);
  const [tasksPerTopic, setTasksPerTopic] = useState<number>(3);

  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [generationMessage, setGenerationMessage] = useState('');

  // Review-before-save
  const [reviewMode, setReviewMode] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [draft, setDraft] = useState<any | null>(null);
  const [commitMeta, setCommitMeta] = useState<{ childId?: string; isGlobal: boolean }>({ isGlobal });
  const [committing, setCommitting] = useState(false);

  const router = useRouter();
  const toast = useToast();
  const { kids } = useData();

  // Multimodal source extraction (PDF/photo → Gemini, URL → fetch+strip).
  const extractSource = async (payload: { file?: File; url?: string }): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headers: any = { 'Authorization': session ? `Bearer ${session.access_token}` : '' };
    let res: Response;
    if (payload.file) {
      const fd = new FormData();
      fd.append('file', payload.file);
      res = await fetch('/api/ai/extract-source', { method: 'POST', headers, body: fd });
    } else {
      headers['Content-Type'] = 'application/json';
      res = await fetch('/api/ai/extract-source', { method: 'POST', headers, body: JSON.stringify({ url: payload.url }) });
    }
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to read source material');
    return json.sourceText as string;
  };

  const handleGenerate = async () => {
    setDraft(null);
    setGenerationStatus('planning');
    setGenerationMessage('Initializing AI agents...');

    try {
      let sourceText = textInput;

      // Multimodal ingestion: turn a PDF/photo/URL into source text first.
      if (inputType === 'file' || inputType === 'camera') {
        if (!file) { toast.error('Please choose a file first.'); setGenerationStatus('idle'); return; }
        setGenerationMessage('Reading your document with AI…');
        sourceText = await extractSource({ file });
      } else if (inputType === 'url') {
        if (!urlInput) { toast.error('Enter a URL first.'); setGenerationStatus('idle'); return; }
        setGenerationMessage('Fetching and reading the page…');
        sourceText = await extractSource({ url: urlInput });
      }

      const activeChildId = selectedChildId || kids[0]?.id;
      const selectedKid = kids.find((k) => k.id === activeChildId);

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/ai/generate-syllabus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          sourceText, age, skillLevel,
          targetGrade: targetGrade === 'None' ? null : targetGrade,
          isGlobal, topicsCount, tasksPerTopic,
          preview: reviewMode,
          childId: activeChildId || undefined,
          interests: selectedKid?.interests ?? [],
        }),
      });

      if (!response.ok) throw new Error('Failed to generate syllabus');
      if (!response.body) throw new Error('No response body from stream');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          let lineEndIndex;

          while ((lineEndIndex = buffer.indexOf('\n\n')) >= 0) {
            const eventStr = buffer.slice(0, lineEndIndex);
            buffer = buffer.slice(lineEndIndex + 2);

            if (eventStr.startsWith('data: ')) {
              try {
                const data = JSON.parse(eventStr.replace('data: ', ''));
                setGenerationMessage(data.message || '');

                if (data.status === 'draft') {
                  // Review-before-save: show the editable tree, persist nothing yet.
                  setDraft(data.draft);
                  setCommitMeta({ childId: activeChildId || undefined, isGlobal });
                  setGenerationStatus('idle');
                  return;
                } else if (data.status === 'complete') {
                  setGenerationStatus('complete');
                  await clearCache();
                  toast.success('Syllabus generated successfully!');
                  router.push(data.subjectId ? `/subjects/${data.subjectId}/topics` : '/subjects');
                  return;
                } else if (data.status === 'error') {
                  throw new Error(data.message);
                } else {
                  setGenerationStatus(data.status);
                }
              } catch (e) {
                console.error("Error parsing stream chunk", e);
              }
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Error generating syllabus:', error);
      toast.error(error.message || 'An error occurred while generating the syllabus.');
      setGenerationStatus('error');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCommit = async (edited: any) => {
    try {
      setCommitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/commit-syllabus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({ draft: edited, childId: commitMeta.childId, isGlobal: commitMeta.isGlobal }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save curriculum');
      await clearCache();
      toast.success('Curriculum saved!');
      setDraft(null);
      router.push(json.subjectId ? `/subjects/${json.subjectId}/topics` : '/subjects');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save curriculum');
    } finally {
      setCommitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0]);
  };

  const isGenerating = generationStatus !== 'idle' && generationStatus !== 'error' && generationStatus !== 'complete';

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
          Generate a comprehensive syllabus (subjects, topics, and tasks) using our multi-agent AI framework.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 relative overflow-hidden">

        {draft ? (
          <SyllabusReviewPanel
            draft={draft}
            saving={committing}
            onSave={handleCommit}
            onDiscard={() => setDraft(null)}
          />
        ) : (
        <>
        {/* Progress Overlay */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8"
            >
              <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-violet-100 p-8 flex flex-col items-center text-center">

                {generationStatus === 'planning' && <BrainCircuit className="w-16 h-16 text-violet-500 animate-pulse mb-4" />}
                {generationStatus === 'chunking' && <ListTree className="w-16 h-16 text-blue-500 animate-bounce mb-4" />}
                {generationStatus === 'writing' && <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mb-4" />}

                <h3 className="text-xl font-bold text-gray-900 mb-2">Generating Curriculum</h3>

                <div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full"
                    initial={{ width: "10%" }}
                    animate={{ width: generationStatus === 'planning' ? '30%' : generationStatus === 'chunking' ? '50%' : '85%' }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                <p className="text-gray-600 font-medium">{generationMessage}</p>
                <p className="text-xs text-gray-400 mt-4">This usually takes 15-30 seconds depending on the number of topics.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Type Selector */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Source Material</label>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setInputType('text')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-medium transition-all ${inputType === 'text'
                  ? 'border-violet-600 bg-violet-50 text-violet-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300'
                }`}
            >
              <FileText className="w-5 h-5" /> Raw Text
            </button>
            <button
              onClick={() => setInputType('file')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-medium transition-all ${inputType === 'file'
                  ? 'border-violet-600 bg-violet-50 text-violet-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300'
                }`}
            >
              <Upload className="w-5 h-5" /> Upload PDF/Photo
            </button>
            <button
              onClick={() => setInputType('camera')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-medium transition-all ${inputType === 'camera'
                  ? 'border-violet-600 bg-violet-50 text-violet-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300'
                }`}
            >
              <Camera className="w-5 h-5" /> Camera Photo
            </button>
            <button
              onClick={() => setInputType('url')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 font-medium transition-all ${inputType === 'url'
                  ? 'border-violet-600 bg-violet-50 text-violet-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300'
                }`}
            >
              <Globe className="w-5 h-5" /> Website URL
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
              <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">{file ? file.name : "Click or drag to upload PDF / Photo"}</p>
            </motion.div>
          )}
          {inputType === 'camera' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors relative cursor-pointer">
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <Camera className="w-8 h-8 text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-600">{file ? file.name : 'Tap to photograph the material'}</p>
            </motion.div>
          )}
          {inputType === 'url' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Curriculum / article URL</label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/curriculum"
                className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
              />
              <p className="text-xs text-gray-400 mt-2">We&apos;ll fetch the page and extract its readable text.</p>
            </motion.div>
          )}
        </div>

        {kids.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Generate for child</label>
            <select
              value={selectedChildId || kids[0]?.id || ''}
              onChange={(e) => {
                setSelectedChildId(e.target.value);
                const k = kids.find((x) => x.id === e.target.value);
                if (k) setAge(k.age);
              }}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
            >
              {kids.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}{k.interests.length ? ` · interests: ${k.interests.join(', ')}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Age and interests are taken from this child to personalize the curriculum.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Target Age</label>
            <input type="number" min={3} max={18} value={age} onChange={(e) => setAge(parseInt(e.target.value) || 3)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Topics Count</label>
            <input type="number" min={1} max={50} value={topicsCount} onChange={(e) => setTopicsCount(parseInt(e.target.value) || 1)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tasks per Topic</label>
            <input type="number" min={1} max={10} value={tasksPerTopic} onChange={(e) => setTasksPerTopic(parseInt(e.target.value) || 1)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Skill Level</label>
            <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all">
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Align with Standard Grade?</label>
            <select value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all">
              <option value="None">No standard alignment</option>
              <option value="Preschool">Preschool</option>
              <option value="Grade 1">Grade 1</option>
              <option value="Grade 5">Grade 5</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>
        </div>

        <div className="mb-8 p-4 bg-violet-50 border border-violet-100 rounded-xl">
          <p className="text-sm font-bold text-violet-900">Private draft</p>
          <p className="text-xs text-violet-700 mt-1">Generated curriculum is created privately for this child. An admin can later promote vetted content to the shared library.</p>
        </div>

        <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reviewMode}
            onChange={(e) => setReviewMode(e.target.checked)}
            className="w-4 h-4 accent-violet-600"
          />
          <span className="text-sm font-medium text-gray-700">Review before saving</span>
          <span className="text-xs text-gray-400">— preview &amp; edit the skill tree, then save</span>
        </label>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || (inputType === 'text' && !textInput) || ((inputType === 'file' || inputType === 'camera') && !file) || (inputType === 'url' && !urlInput)}
          className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
        >
          {isGenerating ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              {reviewMode ? 'Generate & Review' : 'Generate Syllabus'}
            </>
          )}
        </button>
        </>
        )}

      </div>
    </div>
  );
}
