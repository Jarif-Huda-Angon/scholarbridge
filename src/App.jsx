import React, { useState, useEffect } from 'react';
import {
  Search, BookOpen, User, CheckCircle, AlertTriangle,
  Copy, X, GraduationCap, BarChart3, LayoutDashboard,
  Briefcase, Globe, FileText, Plus, Send, Calendar,
  Building2, BrainCircuit, MessageSquare, PenTool, UploadCloud,
  Loader2, Sparkles, Menu, UserPlus, GitBranch, Save, ChevronRight,
  PieChart, TrendingUp, Clock, Award, Eye, EyeOff, Link as LinkIcon,
  Mail, Lock, LogOut
} from 'lucide-react';

// --- FIREBASE AUTHENTICATION & FIRESTORE ---
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyDSv4XfQmpZvCouylmrVRHFksV55VR3_Ow",
  authDomain: "scholarbridge-7f62c.firebaseapp.com",
  projectId: "scholarbridge-7f62c",
  storageBucket: "scholarbridge-7f62c.firebasestorage.app",
  messagingSenderId: "1037288700484",
  appId: "1:1037288700484:web:2cb903f7075115aee59a11"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- SECURE API ENGINE (Routed to Vercel Backend) ---
const fetchFromGemini = async (prompt, systemPrompt = "You are a helpful AI.") => {
  const user = auth.currentUser;

  if (!user) {
    alert("Commander, authentication error. Please log in again.");
    return "Error: User not authenticated.";
  }

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        systemPrompt,
        uid: user.uid
      })
    });

    const data = await response.json();

    if (response.status === 403 && data.error === 'LIMIT_REACHED') {
      alert("Weekly limit reached! Please upgrade to Scholar Pro on the website for unlimited access and advanced reasoning models.");
      return "⚠️ Limit Reached. Please upgrade to Pro.";
    }

    if (!response.ok) throw new Error(data.error || 'Server Error');

    return data.text;
  } catch (error) {
    console.error("Secure Relay Error:", error);
    return "Sorry, the secure backend encountered an error. Please try again.";
  }
};

const extractJSON = (text) => {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const key in parsed) if (Array.isArray(parsed[key])) return parsed[key];
    }
    return parsed;
  } catch (e) { return null; }
};

// --- INITIAL DATABASE SCHEMA (Fallbacks for new users) ---
const initialProfessors = [
  { id: 'p1', name: 'Dr. Alan Turing', university: 'MIT', department: 'CSAIL', country: 'US', researchTags: ['LLM', 'Multi-Agent'], matchScore: 95, statusPhase: 'Draft Ready', lastContactedDate: Date.now() - (2 * 24 * 60 * 60 * 1000), latestPaper: 'Scalable LLM Orchestration in Edge Environments' }
];
const initialUniversities = [{ id: 'u1', name: 'MIT', country: 'US' }];
const initialCountries = [{ id: 'c1', name: 'US' }];
const initialScholarships = [
  { id: 's1', name: 'MEXT University Recommendation', provider: 'MEXT Japan', country: 'Japan', portalUrl: 'studyinjapan.go.jp', username: 'jarif_mext', password: 'encrypted_pass_123', resultDate: '2026-08-15', amount: 'Full Tuition + Stipend', status: 'Applied' }
];

const KANBAN_COLUMNS = ['Lead', 'Draft Ready', 'Contacted', 'Follow-up 1', 'Replied', 'Accepted', 'Rejected'];
const SCHOLARSHIP_STATUSES = ['Discovery', 'Drafting', 'Applied', 'Interview', 'Won', 'Rejected'];

// ==========================================
// 1. THE GATEKEEPER UI (LOGIN/SIGNUP)
// ==========================================
const AuthScreen = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', '')); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0A10] flex flex-col items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute top-8 left-8 flex items-center space-x-2">
        <GraduationCap className="text-white" size={28} />
        <span className="text-xl font-bold text-white tracking-wide">ScholarBridge</span>
      </div>

      <div className="bg-[#13111C] border border-slate-800 rounded-2xl p-8 w-full max-w-[420px] relative shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-t-2xl"></div>

        <h2 className="text-3xl font-bold text-white mb-2 mt-2">
          {isSignUp ? 'Create account' : 'Welcome back'}
        </h2>
        <p className="text-slate-400 text-sm mb-8">
          {isSignUp ? 'Sign up to build your academic pipeline.' : 'Enter your details to access your workspace.'}
        </p>

        {error && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 text-xs p-3 rounded-lg mb-6">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="email" required placeholder="name@university.edu"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1C1A27] border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password" required placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1C1A27] border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#A855F7] hover:bg-[#9333EA] text-white font-bold py-3.5 rounded-xl mt-2 transition-colors flex justify-center items-center">
            {loading ? <Loader2 size={18} className="animate-spin" /> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="text-[#A855F7] font-bold hover:underline">
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. MAIN APPLICATION (THE SOFTWARE)
// ==========================================
export default function App() {
  // --- AUTHENTICATION STATE ---
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- PERSISTENT CLOUD STATE ---
  const [professors, setProfessors] = useState([]);
  const [targetUniversities, setTargetUniversities] = useState([]);
  const [targetCountries, setTargetCountries] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [vaultData, setVaultData] = useState({ cvText: '', sopText: '', proposalText: '', ongoingResearch: 'Agentic Orchestration Layer (AOL)', googleScholar: '', github: '', customLinks: [] });

  // UI Selection State
  const [selectedProf, setSelectedProf] = useState(null);
  const [selectedUni, setSelectedUni] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [draggedProfId, setDraggedProfId] = useState(null);
  const [showPasswordMap, setShowPasswordMap] = useState({});
  const [filterCountry, setFilterCountry] = useState('All');
  const [filterUni, setFilterUni] = useState('');
  const [crmModal, setCrmModal] = useState(null);

  // Form State
  const [newProfForm, setNewProfForm] = useState({ name: '', university: '', department: '', country: '', researchTags: '', latestPaper: '', statusPhase: 'Lead' });
  const [newUniName, setNewUniName] = useState('');
  const [newUniCountry, setNewUniCountry] = useState('');
  const [newCountryName, setNewCountryName] = useState('');
  const [newScholarshipForm, setNewScholarshipForm] = useState({ name: '', provider: '', country: '', amount: '', portalUrl: '', username: '', password: '', resultDate: '', status: 'Discovery' });

  // AI State
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResults, setAiSearchResults] = useState(null);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', text: "Commander, Dashboard and Cloud Sync are active. Awaiting your command." }]);

  // ==========================================
  // CLOUD SYNC LOGIC (Firestore)
  // ==========================================

  // 1. Listen for Auth & Load Data
  useEffect(() => {
    const loadData = async (uid) => {
      try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.professors) setProfessors(data.professors);
          else setProfessors(initialProfessors);

          if (data.targetUniversities) setTargetUniversities(data.targetUniversities);
          else setTargetUniversities(initialUniversities);

          if (data.targetCountries) setTargetCountries(data.targetCountries);
          else setTargetCountries(initialCountries);

          if (data.scholarships) setScholarships(data.scholarships);
          else setScholarships(initialScholarships);

          if (data.vaultData) setVaultData(data.vaultData);
        } else {
          // Brand new user
          setProfessors(initialProfessors);
          setTargetUniversities(initialUniversities);
          setTargetCountries(initialCountries);
          setScholarships(initialScholarships);
        }
      } catch (error) {
        console.error("Error loading data from cloud:", error);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        loadData(user.uid);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Auto-Save to Cloud (Debounced)
  useEffect(() => {
    if (currentUser && !isAuthLoading) {
      const syncData = async () => {
        try {
          await setDoc(doc(db, "users", currentUser.uid), {
            professors,
            targetUniversities,
            targetCountries,
            scholarships,
            vaultData,
            lastSync: Date.now()
          }, { merge: true });
        } catch (error) {
          console.error("Cloud Sync Error:", error);
        }
      };

      const timeoutId = setTimeout(syncData, 2000); // Wait 2s after typing stops to save
      return () => clearTimeout(timeoutId);
    }
  }, [professors, targetUniversities, targetCountries, scholarships, vaultData, currentUser, isAuthLoading]);


  // ==========================================
  // GATEKEEPER RENDERING
  // ==========================================
  if (isAuthLoading) {
    return <div className="min-h-screen bg-[#0B0A10] flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></div>;
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  const handleLogout = () => {
    signOut(auth);
  };

  // --- HELPERS ---
  const isNeedsFollowUp = (prof) => {
    if (prof.statusPhase !== 'Contacted' && prof.statusPhase !== 'Follow-up 1') return false;
    if (!prof.lastContactedDate) return false;
    return ((Date.now() - prof.lastContactedDate) / (1000 * 60 * 60 * 24)) > 7;
  };
  const togglePasswordVisibility = (id) => setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));

  // --- DATA MODIFICATION (EDITABLE FIELDS) ---
  const handleProfUpdate = (profId, field, value) => {
    setProfessors(prev => prev.map(p => {
      if (p.id === profId) {
        const requiresDateUpdate = (field === 'statusPhase') && (value === 'Contacted' || value === 'Follow-up 1') && p.statusPhase !== value;
        return { ...p, [field]: value, lastContactedDate: requiresDateUpdate ? Date.now() : p.lastContactedDate };
      }
      return p;
    }));
    if (selectedProf?.id === profId) setSelectedProf(prev => ({ ...prev, [field]: value }));
  };

  const handleScholarshipUpdate = (schId, field, value) => {
    setScholarships(prev => prev.map(s => s.id === schId ? { ...s, [field]: value } : s));
    if (selectedScholarship?.id === schId) setSelectedScholarship(prev => ({ ...prev, [field]: value }));
  };

  const handleVaultChange = (field, value) => {
    setVaultData(prev => ({ ...prev, [field]: value }));
  };

  const executeAddProf = (profData) => {
    const newProf = {
      ...profData,
      id: `p${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      researchTags: Array.isArray(profData.researchTags) ? profData.researchTags : (profData.researchTags || '').split(',').map(t => t.trim()),
      matchScore: profData.matchScore || Math.floor(Math.random() * (99 - 75 + 1) + 75),
      lastContactedDate: profData.statusPhase === 'Contacted' ? Date.now() : null
    };
    setProfessors(prev => [...prev, newProf]);

    if (newProf.country && !targetCountries.find(c => c.name.toLowerCase() === newProf.country.toLowerCase())) {
      setTargetCountries(prev => [...prev, { id: `c${Date.now()}`, name: newProf.country }]);
    }
    if (newProf.university && !targetUniversities.find(u => u.name.toLowerCase() === newProf.university.toLowerCase())) {
      setTargetUniversities(prev => [...prev, { id: `u${Date.now()}`, name: newProf.university, country: newProf.country }]);
    }
  };

  const handleManualAddProf = (e) => {
    e.preventDefault();
    executeAddProf(newProfForm);
    setNewProfForm({ name: '', university: '', department: '', country: '', researchTags: '', latestPaper: '', statusPhase: 'Lead' });
    setCrmModal(null);
  };

  const executeAddScholarship = (schData) => {
    const newSch = {
      ...schData,
      id: `s${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };
    setScholarships(prev => [...prev, newSch]);
  };

  const handleManualAddScholarship = (e) => {
    e.preventDefault();
    executeAddScholarship(newScholarshipForm);
    setNewScholarshipForm({ name: '', provider: '', country: '', amount: '', portalUrl: '', username: '', password: '', resultDate: '', status: 'Discovery' });
    setCrmModal(null);
  };

  // --- AI DISCOVERY ENGINES ---
  const runProfDiscovery = async (universityName = null) => {
    if (!universityName && !aiSearchQuery.trim()) return;
    setIsSearchingAI(true);
    setAiSearchResults(null);

    const systemPrompt = "You are a JSON API. Respond ONLY with a valid JSON array of objects. No markdown, no introductory text.";
    let prompt = `I am a prospective PhD student researching ${vaultData.ongoingResearch}. Suggest 3 highly relevant professors. 
    Format STRICTLY as a JSON array with these exact keys: "name", "university", "department", "country", "latestPaper", "matchReason", "researchTags" (this must be an array of strings). `;

    if (universityName) {
      const existingProfs = professors.filter(p => p.university.toLowerCase() === universityName.toLowerCase());
      const excludedNames = existingProfs.map(p => p.name).join(', ');
      prompt += `Search ONLY at ${universityName}. `;
      if (excludedNames.length > 0) prompt += `DO NOT suggest these professors as I already have them: [${excludedNames}]. `;
    } else {
      prompt += `Base the search on this query: "${aiSearchQuery}". `;
    }

    const result = await fetchFromGemini(prompt, systemPrompt);
    const parsed = extractJSON(result);
    setAiSearchResults(parsed || result);
    setIsSearchingAI(false);
  };

  const runScholarshipDiscovery = async () => {
    if (!aiSearchQuery.trim()) return;
    setIsSearchingAI(true);
    setAiSearchResults(null);

    const systemPrompt = "You are a JSON API. Respond ONLY with a valid JSON array of objects. No markdown, no introductory text.";
    const prompt = `I am researching ${vaultData.ongoingResearch}. My query is: "${aiSearchQuery}". 
    Suggest 3 highly relevant academic scholarships, grants, or fellowships.
    Format STRICTLY as a JSON array with these exact keys: "name", "provider", "country", "amount", "deadline" (approximate date string), "matchReason".`;

    const result = await fetchFromGemini(prompt, systemPrompt);
    const parsed = extractJSON(result);
    setAiSearchResults(parsed || result);
    setIsSearchingAI(false);
  };

  const handleGenerateDraft = async (profId) => {
    const prof = professors.find(p => p.id === profId);
    if (!prof) return;
    setIsDraftingEmail(true);
    const systemPrompt = "You are an elite academic outreach AI. Keep it under 150 words. Use no brackets or placeholders. Write the final email ready to send.";

    let prompt = `Write a cold email to Professor ${prof.name} at ${prof.university}. Mention their recent paper: '${prof.latestPaper}'. My core focus is: ${vaultData.ongoingResearch} & ${(prof.researchTags || []).join(', ')}. Use context from my CV if relevant: ${vaultData.cvText.substring(0, 300)}. `;

    if (prof.country === 'Japan') prompt += " Mention my interest in the MEXT University Recommendation pathway.";
    else if (prof.country === 'China') prompt += " Mention I am applying for the CSC Type B Scholarship.";
    else if (prof.country === 'US') prompt += " Mention my interest in securing a Graduate Research Assistantship (GRA).";

    prompt += " Conclude by asking for a brief 10-minute virtual chat next week. Sign off as 'Commander Jarif'.";

    const draftText = await fetchFromGemini(prompt, systemPrompt);
    setDrafts(prev => ({ ...prev, [profId]: draftText }));
    if (prof.statusPhase === 'Lead') handleProfUpdate(profId, 'statusPhase', 'Draft Ready');
    setIsDraftingEmail(false);
  };

  const handleDrop = (e, targetColumn) => {
    e.preventDefault();
    if (draggedProfId) handleProfUpdate(draggedProfId, 'statusPhase', targetColumn);
    setDraggedProfId(null);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopyNotice('Copied!');
    setTimeout(() => setCopyNotice(''), 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput }]);
    setChatInput('');
    setIsTyping(true);
    const context = chatMessages.map(m => `${m.role === 'user' ? 'Jarif' : 'AI'}: ${m.text}`).join('\n');
    const aiResponse = await fetchFromGemini(`History:\n${context}\n\nJarif: ${chatInput}\nAI:`, "You are ScholarBridge AI CRM. Act as an academic advisor.");
    setChatMessages(prev => [...prev, { role: 'assistant', text: aiResponse }]);
    setIsTyping(false);
  };

  // --- VIEWS ---
  const renderDashboard = () => {
    const totalLeads = professors.length;
    const contacted = professors.filter(p => ['Contacted', 'Follow-up 1', 'Replied', 'Accepted', 'Rejected'].includes(p.statusPhase)).length;
    const replied = professors.filter(p => ['Replied', 'Accepted'].includes(p.statusPhase)).length;
    const followUps = professors.filter(p => isNeedsFollowUp(p)).length;
    const awaiting = contacted - replied - followUps;
    const activeSchols = scholarships.filter(s => ['Drafting', 'Applied', 'Interview'].includes(s.status)).length;

    const replyPct = contacted > 0 ? ((replied / contacted) * 100) : 0;
    const followUpPct = contacted > 0 ? ((followUps / contacted) * 100) : 0;
    const pieGradient = `conic-gradient(#10b981 0% ${replyPct}%, #f59e0b ${replyPct}% ${replyPct + followUpPct}%, #334155 ${replyPct + followUpPct}% 100%)`;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <h2 className="text-2xl font-bold text-slate-100">Command Center</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-lg flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg shrink-0"><Send size={24} /></div>
            <div><p className="text-sm text-slate-400 font-medium">Emails Sent</p><p className="text-2xl font-bold text-slate-100">{contacted}</p></div>
          </div>
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-lg flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0"><CheckCircle size={24} /></div>
            <div><p className="text-sm text-slate-400 font-medium">Replies</p><p className="text-2xl font-bold text-slate-100">{replied}</p></div>
          </div>
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-lg flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg shrink-0"><Clock size={24} /></div>
            <div><p className="text-sm text-slate-400 font-medium">Follow-ups Needed</p><p className="text-2xl font-bold text-slate-100">{followUps}</p></div>
          </div>
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-lg flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg shrink-0"><TrendingUp size={24} /></div>
            <div><p className="text-sm text-slate-400 font-medium">Reply Rate</p><p className="text-2xl font-bold text-slate-100">{replyPct.toFixed(1)}%</p></div>
          </div>
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-lg flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0"><User size={24} /></div>
            <div><p className="text-sm text-slate-400 font-medium">Total Prof Leads</p><p className="text-2xl font-bold text-slate-100">{totalLeads}</p></div>
          </div>
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-lg flex items-center space-x-4">
            <div className="p-3 bg-pink-500/10 text-pink-400 rounded-lg shrink-0"><GraduationCap size={24} /></div>
            <div><p className="text-sm text-slate-400 font-medium">Active Scholarships</p><p className="text-2xl font-bold text-slate-100">{activeSchols}</p></div>
          </div>
        </div>

        <div className="bg-slate-900 p-6 md:p-8 rounded-xl border border-slate-800 shadow-lg mt-8 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="w-full md:w-1/2">
            <h3 className="text-lg font-bold text-slate-100 flex items-center mb-2"><PieChart size={20} className="mr-2 text-indigo-400" />Outreach Pipeline</h3>
            <p className="text-sm text-slate-400 mb-6">A visual breakdown of your sent emails and current conversion status.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-500 mr-2 shrink-0"></div><span className="text-sm font-medium text-slate-300">Replies Received</span></div><span className="text-sm font-bold text-slate-100">{replied}</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-500 mr-2 shrink-0"></div><span className="text-sm font-medium text-slate-300">Follow-up Needed</span></div><span className="text-sm font-bold text-slate-100">{followUps}</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center"><div className="w-3 h-3 rounded-full bg-slate-600 mr-2 shrink-0"></div><span className="text-sm font-medium text-slate-300">Awaiting Response</span></div><span className="text-sm font-bold text-slate-100">{awaiting > 0 ? awaiting : 0}</span></div>
            </div>
          </div>
          <div className="w-full md:w-1/2 flex justify-center">
            <div className="w-48 h-48 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-300 relative" style={{ background: pieGradient }}>
              <div className="w-24 h-24 bg-slate-950 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 shadow-inner flex items-center justify-center flex-col border border-slate-800"><span className="text-2xl font-bold text-slate-100">{contacted}</span><span className="text-[10px] uppercase font-bold text-slate-500">Sent</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderKanban = () => {
    const filteredProfessors = professors.filter(p =>
      (filterCountry === 'All' || p.country === filterCountry) &&
      (filterUni === '' || p.university?.toLowerCase().includes(filterUni.toLowerCase()))
    );

    return (
      <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
          <div><h2 className="text-2xl font-bold text-slate-100">Professors CRM Pipeline</h2><p className="text-sm text-slate-400">Master Kanban Board for Outreach</p></div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setCrmModal('addProf'); setAiSearchResults(null); }} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center transition-colors"><UserPlus size={16} className="mr-2 text-emerald-400" /> Add Prof (Manual)</button>
            <button onClick={() => { setCrmModal('findProf'); setAiSearchResults(null); setAiSearchQuery(''); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center transition-colors shadow-lg shadow-indigo-500/20"><Search size={16} className="mr-2" /> Find Prof (AI)</button>
          </div>
        </div>

        <div className="flex space-x-3 mb-6 w-full sm:w-auto">
          <select value={filterCountry || ''} onChange={(e) => setFilterCountry(e.target.value)} className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 outline-none focus:border-indigo-500 cursor-pointer">
            {['All', ...new Set(professors.map(p => p.country).filter(Boolean))].map(c => <option key={c} value={c}>{c === 'All' ? 'All Countries' : c}</option>)}
          </select>
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={16} />
            <input type="text" placeholder="Filter by University..." value={filterUni || ''} onChange={(e) => setFilterUni(e.target.value)} className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg block w-full pl-9 p-2.5 outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="flex-1 flex overflow-x-auto space-x-4 pb-4 snap-x">
          {KANBAN_COLUMNS.map(column => (
            <div key={column} className="flex-shrink-0 w-80 bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col snap-start" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={(e) => handleDrop(e, column)}>
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-xl"><h3 className="font-bold text-sm text-slate-300 uppercase">{column}</h3><span className="bg-slate-800 text-slate-400 text-xs font-bold px-2 py-1 rounded-full">{filteredProfessors.filter(p => p.statusPhase === column).length}</span></div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px]">
                {filteredProfessors.filter(p => p.statusPhase === column).map(prof => {
                  const needsFollowUp = isNeedsFollowUp(prof);
                  return (
                    <div key={prof.id} draggable onDragStart={(e) => { setDraggedProfId(prof.id); e.dataTransfer.effectAllowed = 'move'; }} onClick={() => setSelectedProf(prof)} className="bg-slate-800 p-4 rounded-lg border border-slate-700 cursor-pointer hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all">
                      <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-slate-200 text-sm">{prof.name}</h4><span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">{prof.matchScore}%</span></div>
                      <div className="space-y-1 mb-3"><p className="text-xs text-slate-400 flex items-center"><Building2 size={12} className="mr-1" /> {prof.university}</p><p className="text-xs text-slate-400 flex items-center"><Globe size={12} className="mr-1" /> {prof.country}</p></div>
                      {needsFollowUp && <div className="mt-2 pt-2 border-t border-slate-700 flex items-center text-xs font-bold text-rose-400"><AlertTriangle size={12} className="mr-1" /> Needs Follow-up</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderScholarships = () => (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
        <div><h2 className="text-2xl font-bold text-slate-100">Scholarship Vault</h2><p className="text-sm text-slate-400">Track grants, credentials, and portals.</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setCrmModal('addScholarship'); setAiSearchResults(null); }} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center transition-colors"><Plus size={16} className="mr-2 text-emerald-400" /> Add Scholarship (Manual)</button>
          <button onClick={() => { setCrmModal('findScholarship'); setAiSearchResults(null); setAiSearchQuery(''); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center transition-colors shadow-lg shadow-indigo-500/20"><Search size={16} className="mr-2" /> Find Scholarship (AI)</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {scholarships.map(s => (
          <div key={s.id} onClick={() => setSelectedScholarship(s)} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col cursor-pointer hover:border-indigo-500 transition-all">
            <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
              <div>
                <h3 className="font-bold text-lg text-slate-100 mb-1">{s.name}</h3>
                <p className="text-sm text-slate-400">{s.provider}</p>
                <span className="inline-flex items-center text-xs font-medium bg-slate-800 text-slate-300 px-2 py-1 rounded mt-3"><Globe size={12} className="mr-1" /> {s.country}</span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.status === 'Won' ? 'bg-emerald-500/20 text-emerald-400' : s.status === 'Rejected' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{s.status}</span>
                <p className="text-sm font-bold text-slate-300 flex items-center mt-3 justify-end"><Calendar size={14} className="mr-1" /> {s.resultDate || 'TBD'}</p>
              </div>
            </div>
            <div className="p-5 bg-slate-950 flex-1 flex justify-between items-center">
              <div><p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Amount</p><p className="text-sm text-emerald-400 font-bold">{s.amount || 'Variable'}</p></div>
              <div className="text-indigo-400 text-xs font-bold flex items-center">Edit / View Credentials <ChevronRight size={14} className="ml-1" /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTargetUniversities = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold text-slate-100">Target Universities</h2><p className="text-sm text-slate-400">Drill down into specific institutions.</p></div></div>

      {!selectedUni ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-500 transition-colors">
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-indigo-400"><Building2 size={24} /></div>
            <h3 className="font-bold text-slate-200">Track New University</h3>
            <input type="text" placeholder="e.g. Stanford" value={newUniName || ''} onChange={(e) => setNewUniName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-indigo-500 outline-none text-center" />
            <input type="text" placeholder="Country (e.g. US)" value={newUniCountry || ''} onChange={(e) => setNewUniCountry(e.target.value)} list="existing-countries" className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-indigo-500 outline-none text-center" />
            <datalist id="existing-countries">{targetCountries.map(c => <option key={c.id} value={c.name} />)}</datalist>
            <button onClick={() => { if (newUniName && newUniCountry) { setTargetUniversities([...targetUniversities, { id: `u${Date.now()}`, name: newUniName, country: newUniCountry }]); if (!targetCountries.find(c => c.name.toLowerCase() === newUniCountry.toLowerCase())) setTargetCountries([...targetCountries, { id: `c${Date.now()}`, name: newUniCountry }]); setNewUniName(''); setNewUniCountry(''); } }} className="bg-indigo-600 text-white w-full py-2 rounded-lg font-bold text-sm hover:bg-indigo-500">Add to Tracking</button>
          </div>
          {targetUniversities.map(uni => {
            const profsAtUni = professors.filter(p => p.university === uni.name);
            return (
              <div key={uni.id} onClick={() => { setSelectedUni(uni); setAiSearchResults(null); }} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:shadow-lg hover:border-indigo-500 cursor-pointer transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4"><div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><Building2 size={24} /></div><span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded font-bold">{uni.country}</span></div>
                <h3 className="text-xl font-bold text-slate-100 mb-2">{uni.name}</h3><p className="text-sm text-slate-400 flex-1">{profsAtUni.length} Professors Tracked</p>
                <div className="mt-4 flex items-center text-indigo-400 text-sm font-bold">Open Hub <ChevronRight size={16} className="ml-1" /></div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-in slide-in-from-right">
          <button onClick={() => setSelectedUni(null)} className="text-slate-400 hover:text-white mb-6 flex items-center text-sm font-bold"><ChevronRight size={16} className="mr-1 rotate-180" /> Back to Universities</button>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div><h2 className="text-3xl font-bold text-slate-100 flex items-center"><Building2 className="mr-3 text-emerald-400" /> {selectedUni.name}</h2><p className="text-slate-400 mt-2 flex items-center"><Globe size={14} className="mr-2" /> Located in {selectedUni.country}</p></div>
            <button onClick={() => runProfDiscovery(selectedUni.name)} disabled={isSearchingAI} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg flex items-center font-bold text-sm shadow-lg disabled:opacity-50 transition-colors">
              {isSearchingAI ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Sparkles size={16} className="mr-2" />} Find New Leads via AI
            </button>
          </div>

          {aiSearchResults && (
            <div className="bg-slate-950 border border-indigo-500/30 p-5 rounded-lg mb-8">
              <h3 className="text-indigo-400 font-bold mb-4 flex items-center"><BrainCircuit size={18} className="mr-2" /> AI Lead Generation (Duplicates Excluded)</h3>
              {Array.isArray(aiSearchResults) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiSearchResults.map((res, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col">
                      <h4 className="font-bold text-slate-200">{res.name}</h4>
                      <p className="text-xs text-slate-400 mb-2">{res.department}</p>
                      <p className="text-xs text-slate-300 italic mb-4 leading-relaxed">"{res.matchReason}"</p>
                      <button onClick={() => { executeAddProf({ ...res, statusPhase: 'Lead' }); setAiSearchResults(prev => Array.isArray(prev) ? prev.filter((_, idx) => idx !== i) : prev); }} className="mt-auto w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded transition-colors flex items-center justify-center">
                        <Plus size={14} className="mr-1" /> Quick Add to CRM
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-300 text-sm whitespace-pre-wrap font-mono">
                  {typeof aiSearchResults === 'object' ? JSON.stringify(aiSearchResults, null, 2) : String(aiSearchResults)}
                </div>
              )}
            </div>
          )}

          <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2">Currently Tracking at {selectedUni.name}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {professors.filter(p => p.university === selectedUni.name).map(prof => (
              <div key={prof.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col">
                <h4 className="font-bold text-slate-200">{prof.name}</h4><p className="text-xs text-slate-400 mb-3">{prof.department}</p>
                <div className="mt-auto flex justify-between items-center"><span className={`text-[10px] font-bold px-2 py-1 rounded-full bg-slate-800 text-slate-300`}>{prof.statusPhase}</span><button onClick={() => { setSelectedProf(prof); setActiveTab('outreach') }} className="text-indigo-400 hover:text-indigo-300 text-xs font-bold">Open CRM</button></div>
              </div>
            ))}
            {professors.filter(p => p.university === selectedUni.name).length === 0 && <p className="text-slate-500 text-sm col-span-full">No professors tracked here yet.</p>}
          </div>
        </div>
      )}
    </div>
  );

  const renderTargetCountries = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold text-slate-100">Target Countries</h2><p className="text-sm text-slate-400">Macro-level regional pipeline tracking.</p></div></div>

      {!selectedCountry ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-500 transition-colors">
            <Globe size={24} className="text-purple-400" /><h3 className="font-bold text-slate-200">Track New Region</h3>
            <input type="text" placeholder="e.g. Germany" value={newCountryName || ''} onChange={(e) => setNewCountryName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-indigo-500 outline-none text-center" />
            <button onClick={() => { if (newCountryName) { setTargetCountries([...targetCountries, { id: `c${Date.now()}`, name: newCountryName }]); setNewCountryName(''); } }} className="bg-indigo-600 text-white w-full py-2 rounded-lg font-bold text-sm hover:bg-indigo-500">Track Country</button>
          </div>

          {targetCountries.map(country => {
            const unisInCountry = targetUniversities.filter(u => u.country === country.name);
            const profsInCountry = professors.filter(p => p.country === country.name);
            return (
              <div key={country.id} onClick={() => setSelectedCountry(country)} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:shadow-lg hover:border-indigo-500 cursor-pointer flex flex-col">
                <Globe size={32} className="text-purple-400 mb-4" /><h3 className="text-xl font-bold text-slate-100 mb-2">{country.name}</h3>
                <p className="text-xs text-slate-400"><strong className="text-slate-300">{unisInCountry.length}</strong> Universities</p>
                <p className="text-xs text-slate-400"><strong className="text-slate-300">{profsInCountry.length}</strong> Professors</p>
                <div className="mt-4 flex items-center text-indigo-400 text-sm font-bold mt-auto">View Region <ChevronRight size={16} className="ml-1" /></div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 animate-in slide-in-from-right">
          <button onClick={() => setSelectedCountry(null)} className="text-slate-400 hover:text-white mb-6 flex items-center text-sm font-bold"><ChevronRight size={16} className="mr-1 rotate-180" /> Back to Regions</button>
          <h2 className="text-3xl font-bold text-slate-100 mb-6 flex items-center"><Globe className="mr-3 text-purple-400" /> {selectedCountry.name} Hub</h2>

          <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2 flex items-center"><Building2 size={18} className="mr-2" /> Tracked Universities</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {targetUniversities.filter(u => u.country === selectedCountry.name).map(uni => (
              <div key={uni.id} onClick={() => { setActiveTab('universities'); setSelectedUni(uni) }} className="bg-slate-950 border border-slate-800 p-4 rounded-lg cursor-pointer hover:border-indigo-500 flex justify-between items-center">
                <span className="font-bold text-sm text-slate-200">{uni.name}</span> <ChevronRight size={14} className="text-slate-500" />
              </div>
            ))}
            {targetUniversities.filter(u => u.country === selectedCountry.name).length === 0 && <p className="text-slate-500 text-sm col-span-2">No universities tracked here yet.</p>}
          </div>

          <h3 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-800 pb-2 flex items-center"><User size={18} className="mr-2" /> Overall Outreach Pipeline</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {professors.filter(p => p.country === selectedCountry.name).map(prof => (
              <div key={prof.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg">
                <h4 className="font-bold text-slate-200 text-sm">{prof.name}</h4><p className="text-xs text-slate-400">{prof.university}</p>
                <div className="mt-2 flex justify-between items-center"><span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-slate-300">{prof.statusPhase}</span><button onClick={() => { setSelectedProf(prof); setActiveTab('outreach') }} className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase">Open CRM</button></div>
              </div>
            ))}
            {professors.filter(p => p.country === selectedCountry.name).length === 0 && <p className="text-slate-500 text-sm col-span-full">No professors tracked in this region.</p>}
          </div>
        </div>
      )}
    </div>
  );

  const renderVault = () => (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl pb-12">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
        <div><h2 className="text-2xl font-bold text-slate-100">Document Vault</h2><p className="text-slate-400 mt-1">Provide your context. Gemini uses this secure vault to deeply personalize drafts.</p></div>
        <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center"><Save size={18} className="mr-2" /> Synced to Cloud</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="font-bold text-slate-200 mb-4 flex items-center"><FileText size={18} className="mr-2 text-indigo-400" /> Raw CV Text Dump</h3>
            <textarea value={vaultData.cvText || ''} onChange={(e) => handleVaultChange('cvText', e.target.value)} placeholder="Paste your entire CV text here. The AI will parse it instantly..." className="w-full h-40 bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 resize-none font-mono" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="font-bold text-slate-200 mb-4 flex items-center"><PenTool size={18} className="mr-2 text-indigo-400" /> Statement of Purpose (SOP)</h3>
            <textarea value={vaultData.sopText || ''} onChange={(e) => handleVaultChange('sopText', e.target.value)} placeholder="Paste your SOP draft here..." className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 resize-none font-mono" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg"><h3 className="font-bold text-slate-200 mb-4 text-sm flex items-center"><BrainCircuit size={16} className="mr-2 text-indigo-400" /> Research Proposal</h3><textarea value={vaultData.proposalText || ''} onChange={(e) => handleVaultChange('proposalText', e.target.value)} placeholder="Core thesis abstract..." className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 resize-none font-mono" /></div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg"><h3 className="font-bold text-slate-200 mb-4 text-sm flex items-center"><UploadCloud size={16} className="mr-2 text-indigo-400" /> Ongoing Research</h3><textarea value={vaultData.ongoingResearch || ''} onChange={(e) => handleVaultChange('ongoingResearch', e.target.value)} placeholder="e.g. Agentic Orchestration Layer (AOL)..." className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 resize-none font-mono" /></div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="font-bold text-slate-200 mb-4 flex items-center"><Globe size={18} className="mr-2 text-indigo-400" /> Academic Links</h3>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 mb-1 flex items-center"><GraduationCap size={14} className="mr-1" /> Google Scholar</label><input type="text" value={vaultData.googleScholar || ''} onChange={(e) => handleVaultChange('googleScholar', e.target.value)} placeholder="https://scholar.google.com/..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" /></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 flex items-center"><GitBranch size={14} className="mr-1" /> GitHub Profile</label><input type="text" value={vaultData.github || ''} onChange={(e) => handleVaultChange('github', e.target.value)} placeholder="https://github.com/..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden">

      {/* Mobile Header */}
      <div className="md:hidden h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 fixed top-0 w-full z-40">
        <div className="flex items-center space-x-2"><BrainCircuit className="text-indigo-500" size={24} /><span className="text-lg font-bold text-white">ScholarBridge</span></div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-400">{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button>
      </div>

      {/* Sidebar */}
      <aside className={`w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-40 top-0 left-0 transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:z-10`}>
        <div className="p-6 hidden md:flex items-center space-x-3"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"><GraduationCap className="text-white" size={24} /></div><span className="text-xl font-bold text-white">ScholarBridge</span></div>
        <div className="flex-1 overflow-y-auto px-4 mt-8 md:mt-4 space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">Command Center</p>
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800'}`}><LayoutDashboard size={18} /><span className="font-medium text-sm">Dashboard</span></button>

          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-6 mb-2 px-2">Pipeline Architecture</p>
          <button onClick={() => { setActiveTab('countries'); setSelectedCountry(null); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'countries' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800'}`}><Globe size={18} /><span className="font-medium text-sm">Target Countries</span></button>
          <button onClick={() => { setActiveTab('universities'); setSelectedUni(null); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'universities' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800'}`}><Building2 size={18} /><span className="font-medium text-sm">Target Universities</span></button>
          <button onClick={() => { setActiveTab('outreach'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'outreach' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800'}`}><Briefcase size={18} /><span className="font-medium text-sm">Professors CRM</span></button>
          <button onClick={() => { setActiveTab('scholarships'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'scholarships' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800'}`}><Award size={18} /><span className="font-medium text-sm">Scholarships</span></button>

          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-6 mb-2 px-2">Intelligence</p>
          <button onClick={() => { setActiveTab('vault'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'vault' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800'}`}><FileText size={18} /><span className="font-medium text-sm">Document Vault</span></button>
          <button onClick={() => { setActiveTab('assistant'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'assistant' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800'}`}><MessageSquare size={18} /><span className="font-medium text-sm">AI Co-Pilot</span></button>
        </div>
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-200 truncate w-32">{currentUser.email}</p>
              <p className="text-[10px] text-emerald-500 font-bold">Data Synced to Cloud</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-rose-400 transition-colors p-2 bg-slate-800 rounded-lg">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 mt-16 md:mt-0 overflow-y-auto">
        <div className="mx-auto max-w-7xl">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'outreach' && renderKanban()}
          {activeTab === 'scholarships' && renderScholarships()}
          {activeTab === 'universities' && renderTargetUniversities()}
          {activeTab === 'countries' && renderTargetCountries()}
          {activeTab === 'vault' && renderVault()}
          {activeTab === 'assistant' && (
            <div className="h-[calc(100vh-8rem)] flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in"><div className="p-4 border-b border-slate-800 bg-slate-950 flex"><BrainCircuit className="text-indigo-400 mr-2" size={20} /><h3 className="font-bold text-slate-200">AI Strategy Co-Pilot</h3></div><div className="flex-1 p-4 space-y-4 overflow-y-auto bg-slate-900/50">{chatMessages.map((msg, i) => <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 border border-slate-700 text-slate-300 rounded-bl-none shadow-sm'}`}><p className="whitespace-pre-wrap">{msg.text}</p></div></div>)}{isTyping && <div className="flex justify-start"><div className="max-w-[85%] rounded-2xl p-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-bl-none flex items-center space-x-2"><Loader2 size={16} className="animate-spin text-indigo-400" /><span className="text-xs text-slate-400">Analyzing architecture...</span></div></div>}</div><div className="p-4 border-t border-slate-800 bg-slate-950"><form onSubmit={handleSendMessage} className="flex space-x-2"><input value={chatInput || ''} onChange={e => setChatInput(e.target.value)} placeholder="Ask Gemini for academic strategy..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:border-indigo-500 outline-none" /><button type="submit" disabled={isTyping || !chatInput} className="bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-500 disabled:opacity-50"><Send size={18} /></button></form></div></div>
          )}
        </div>
      </main>

      {/* GLOBAL: Editable Professor Side Panel */}
      {selectedProf && (
        <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-slate-900 shadow-2xl border-l border-slate-700 z-50 flex flex-col animate-in slide-in-from-right">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <div><h2 className="text-lg font-bold text-slate-100">{selectedProf.name}</h2><p className="text-xs text-indigo-400">{selectedProf.university}</p></div>
            <button onClick={() => setSelectedProf(null)} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-lg"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700"><p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Editable Status</p>
                <select value={selectedProf.statusPhase || 'Lead'} onChange={(e) => handleProfUpdate(selectedProf.id, 'statusPhase', e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-600 text-slate-200 text-xs font-bold rounded p-1.5 outline-none cursor-pointer focus:border-indigo-500 transition-colors">
                  {KANBAN_COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700"><p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Match Score</p><p className="text-lg font-bold text-emerald-400">{selectedProf.matchScore}%</p></div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase flex items-center"><PenTool size={12} className="mr-1 text-indigo-400" /> Editable: Latest Publication</h3>
              <textarea value={selectedProf.latestPaper || ''} onChange={(e) => handleProfUpdate(selectedProf.id, 'latestPaper', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-indigo-300 font-medium focus:outline-none focus:border-indigo-500 resize-none h-20 transition-colors" />
            </div>
            <div>
              <button onClick={() => handleGenerateDraft(selectedProf.id)} disabled={isDraftingEmail} className="w-full mb-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-3 rounded-lg flex items-center justify-center font-bold transition-all shadow-lg disabled:opacity-50">
                {isDraftingEmail ? <Loader2 size={14} className="animate-spin mr-2" /> : <Sparkles size={14} className="mr-2" />}
                {isDraftingEmail ? "Analyzing Vault Context..." : "Generate Custom AI Draft"}
              </button>
              <div className="relative group">
                <textarea className="w-full h-72 bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 focus:outline-none resize-none font-mono leading-relaxed" value={drafts[selectedProf.id] || "Ready to draft email. Uses Document Vault context automatically."} onChange={(e) => setDrafts({ ...drafts, [selectedProf.id]: e.target.value })} />
                {drafts[selectedProf.id] && (
                  <button onClick={() => handleCopy(drafts[selectedProf.id])} className="absolute bottom-3 right-3 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center transition-colors">
                    {copyNotice ? <CheckCircle size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />} {copyNotice || "Copy"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL: Editable Scholarship Side Panel */}
      {selectedScholarship && (
        <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-slate-900 shadow-2xl border-l border-slate-700 z-50 flex flex-col animate-in slide-in-from-right">
          <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-950">
            <div>
              <h2 className="text-lg font-bold text-slate-100 mb-1">{selectedScholarship.name}</h2>
              <span className="inline-flex items-center text-[10px] font-medium bg-slate-800 text-slate-300 px-2 py-0.5 rounded"><Globe size={10} className="mr-1" /> {selectedScholarship.country}</span>
            </div>
            <button onClick={() => setSelectedScholarship(null)} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-lg"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
              <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Editable Status</label>
              <select value={selectedScholarship.status || 'Discovery'} onChange={(e) => handleScholarshipUpdate(selectedScholarship.id, 'status', e.target.value)} className="w-full bg-slate-950 border border-slate-600 text-slate-200 text-xs font-bold rounded p-1.5 outline-none cursor-pointer focus:border-indigo-500 transition-colors">
                {SCHOLARSHIP_STATUSES.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Provider</label><input type="text" value={selectedScholarship.provider || ''} onChange={(e) => handleScholarshipUpdate(selectedScholarship.id, 'provider', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-indigo-500 outline-none" /></div>
              <div><label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Amount</label><input type="text" value={selectedScholarship.amount || ''} onChange={(e) => handleScholarshipUpdate(selectedScholarship.id, 'amount', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-emerald-400 font-bold focus:border-indigo-500 outline-none" /></div>
            </div>

            <div><label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Result / Deadline Date</label><input type="date" value={selectedScholarship.resultDate || ''} onChange={(e) => handleScholarshipUpdate(selectedScholarship.id, 'resultDate', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-indigo-500 outline-none" /></div>

            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase flex items-center"><LinkIcon size={12} className="mr-1 text-indigo-400" /> Portal Credentials</h3>
              <div className="space-y-3">
                <div><label className="text-[10px] text-slate-500 font-bold mb-1 block">Portal URL</label><input type="text" value={selectedScholarship.portalUrl || ''} onChange={(e) => handleScholarshipUpdate(selectedScholarship.id, 'portalUrl', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-indigo-400 focus:border-indigo-500 outline-none" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold mb-1 block">Username</label><input type="text" value={selectedScholarship.username || ''} onChange={(e) => handleScholarshipUpdate(selectedScholarship.id, 'username', e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-indigo-500 outline-none font-mono" /></div>
                <div><label className="text-[10px] text-slate-500 font-bold mb-1 block">Password</label>
                  <div className="flex items-center bg-slate-950 rounded border border-slate-700 overflow-hidden focus-within:border-indigo-500">
                    <input type={showPasswordMap[selectedScholarship.id] ? "text" : "password"} value={selectedScholarship.password || ''} onChange={(e) => handleScholarshipUpdate(selectedScholarship.id, 'password', e.target.value)} className="w-full bg-transparent p-2 text-sm text-slate-200 outline-none font-mono" />
                    <button onClick={() => togglePasswordVisibility(selectedScholarship.id)} className="px-3 text-slate-400 hover:text-white">{showPasswordMap[selectedScholarship.id] ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRM Modals (Add / Find - Professors & Scholarships) */}
      {crmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h3 className="font-bold text-lg text-slate-100 flex items-center">
                {crmModal === 'addProf' && <><UserPlus className="mr-2 text-emerald-400" /> Add Professor Manually</>}
                {crmModal === 'findProf' && <><Search className="mr-2 text-indigo-400" /> AI Professor Discovery</>}
                {crmModal === 'addScholarship' && <><Plus className="mr-2 text-emerald-400" /> Add Scholarship Manually</>}
                {crmModal === 'findScholarship' && <><Search className="mr-2 text-indigo-400" /> AI Scholarship Discovery</>}
              </h3>
              <button onClick={() => setCrmModal(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto">

              {/* PROFESSOR: Manual Add */}
              {crmModal === 'addProf' && (
                <form onSubmit={handleManualAddProf} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-400">Name</label><input required value={newProfForm.name || ''} onChange={e => setNewProfForm({ ...newProfForm, name: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded p-2 text-sm outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-400">University</label><input required value={newProfForm.university || ''} onChange={e => setNewProfForm({ ...newProfForm, university: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded p-2 text-sm outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-400">Country</label><input required value={newProfForm.country || ''} onChange={e => setNewProfForm({ ...newProfForm, country: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded p-2 text-sm outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-400">Status</label><select value={newProfForm.statusPhase || 'Lead'} onChange={e => setNewProfForm({ ...newProfForm, statusPhase: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded p-2 text-sm outline-none">{KANBAN_COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}</select></div>
                  </div>
                  <div><label className="text-xs font-bold text-slate-400">Latest Paper</label><input value={newProfForm.latestPaper || ''} onChange={e => setNewProfForm({ ...newProfForm, latestPaper: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded p-2 text-sm outline-none" /></div>
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg mt-4 shadow-lg transition-colors">Save to CRM Pipeline</button>
                </form>
              )}

              {/* PROFESSOR: AI Find */}
              {crmModal === 'findProf' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">Enter a topic, university, or region. Gemini will hunt down top professors and format them as interactive cards.</p>
                  <div className="flex space-x-2">
                    <input type="text" placeholder="e.g. Stanford Generative AI" value={aiSearchQuery || ''} onChange={e => setAiSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runProfDiscovery()} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 outline-none" />
                    <button onClick={() => runProfDiscovery()} disabled={isSearchingAI || !aiSearchQuery} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors">
                      {isSearchingAI ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    </button>
                  </div>
                  {aiSearchResults && (
                    <div className="mt-6">
                      <h3 className="text-indigo-400 font-bold mb-4 flex items-center"><BrainCircuit size={18} className="mr-2" /> AI Lead Generation Engine</h3>
                      {Array.isArray(aiSearchResults) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {aiSearchResults.map((res, i) => (
                            <div key={i} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col hover:border-indigo-500 transition-colors">
                              <h4 className="font-bold text-slate-200">{res.name}</h4>
                              <p className="text-xs text-slate-400 mb-2">{res.university} • {res.department}</p>
                              <p className="text-xs text-slate-300 italic mb-4 leading-relaxed">"{res.matchReason}"</p>
                              <button onClick={() => { executeAddProf({ ...res, statusPhase: 'Lead' }); setAiSearchResults(prev => Array.isArray(prev) ? prev.filter((_, idx) => idx !== i) : prev); }} className="mt-auto w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded transition-colors flex items-center justify-center">
                                <Plus size={14} className="mr-1" /> Quick Add to CRM
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg text-sm text-slate-300 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                          {typeof aiSearchResults === 'object' ? JSON.stringify(aiSearchResults, null, 2) : String(aiSearchResults)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SCHOLARSHIP: Manual Add */}
              {crmModal === 'addScholarship' && (
                <form onSubmit={handleManualAddScholarship} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-400">Scholarship Name</label><input required value={newScholarshipForm.name || ''} onChange={e => setNewScholarshipForm({ ...newScholarshipForm, name: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded p-2 text-sm outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-400">Provider</label><input value={newScholarshipForm.provider || ''} onChange={e => setNewScholarshipForm({ ...newScholarshipForm, provider: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded p-2 text-sm outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-400">Target Country</label><input required value={newScholarshipForm.country || ''} onChange={e => setNewScholarshipForm({ ...newScholarshipForm, country: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded p-2 text-sm outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-400">Amount / Value</label><input value={newScholarshipForm.amount || ''} onChange={e => setNewScholarshipForm({ ...newScholarshipForm, amount: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded p-2 text-sm outline-none" placeholder="e.g. $50,000" /></div>
                    <div><label className="text-xs font-bold text-slate-400">Result / Deadline Date</label><input type="date" value={newScholarshipForm.resultDate || ''} onChange={e => setNewScholarshipForm({ ...newScholarshipForm, resultDate: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded p-2 text-sm outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-400">Status</label><select value={newScholarshipForm.status || 'Discovery'} onChange={e => setNewScholarshipForm({ ...newScholarshipForm, status: e.target.value })} className="w-full mt-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded p-2 text-sm outline-none">{SCHOLARSHIP_STATUSES.map(col => <option key={col} value={col}>{col}</option>)}</select></div>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg mt-4 shadow-lg transition-colors">Save to Vault</button>
                </form>
              )}

              {/* SCHOLARSHIP: AI Find */}
              {crmModal === 'findScholarship' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">Tell Gemini what kind of funding you need (e.g. "PhD Grants for Generative AI in Japan").</p>
                  <div className="flex space-x-2">
                    <input type="text" placeholder="Search parameters..." value={aiSearchQuery || ''} onChange={e => setAiSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runScholarshipDiscovery()} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-indigo-500 outline-none" />
                    <button onClick={runScholarshipDiscovery} disabled={isSearchingAI || !aiSearchQuery} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors">
                      {isSearchingAI ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    </button>
                  </div>
                  {aiSearchResults && (
                    <div className="mt-6">
                      <h3 className="text-indigo-400 font-bold mb-4 flex items-center"><Award size={18} className="mr-2" /> AI Scholarship Matchmaker</h3>
                      {Array.isArray(aiSearchResults) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {aiSearchResults.map((res, i) => (
                            <div key={i} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col hover:border-indigo-500 transition-colors">
                              <h4 className="font-bold text-slate-200">{res.name}</h4>
                              <p className="text-xs text-slate-400 mb-2">{res.provider} • {res.country} • {res.amount}</p>
                              <p className="text-xs text-slate-300 italic mb-4 leading-relaxed">"{res.matchReason}"</p>
                              <button onClick={() => { executeAddScholarship({ ...res, status: 'Discovery' }); setAiSearchResults(prev => prev.filter((_, idx) => idx !== i)); }} className="mt-auto w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded transition-colors flex items-center justify-center">
                                <Plus size={14} className="mr-1" /> Quick Add to Vault
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg text-sm text-slate-300 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                          {typeof aiSearchResults === 'object' ? JSON.stringify(aiSearchResults, null, 2) : String(aiSearchResults)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}