import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  LayoutDashboard, UserCircle, Search, BrainCircuit,
  LogOut, Save, Loader2, Sparkles, Mail, CheckCircle2, Globe, Bookmark, FileText, Menu, X
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSaving, setIsSaving] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // NEW: Mobile sidebar state

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Profile State
  const [profile, setProfile] = useState({
    fullName: '',
    researchInterest: '',
    fullCVText: '',
    drafts: []
  });

  // Discovery Search State
  const [searchQuery, setSearchQuery] = useState({ location: '', specificUni: '', topic: '', ranking: 'Top 100' });

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile({ drafts: [], fullCVText: '', ...docSnap.data() });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (error) { alert(error.message); }
  };

  // 2. Draft Email using AI Discovery Engine
  const handleDraftEmail = async () => {
    if (!profile.fullName || !profile.researchInterest) {
      alert("Please save your Full Name and Research Focus in the Researcher Profile first!");
      return;
    }
    if (!searchQuery.location || !searchQuery.topic) {
      alert("Please enter a Target Location and Research Area!");
      return;
    }

    setIsDrafting(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const locationLogic = searchQuery.specificUni
        ? `Crucially, this professor MUST be actively teaching/researching at ${searchQuery.specificUni} in ${searchQuery.location}.`
        : `Crucially, this professor MUST be at a university in ${searchQuery.location} that is globally ranked in the ${searchQuery.ranking} tier.`;

      const promptText = `Act as an expert academic placement advisor. 
      First, identify a real, active university professor. 
      ${locationLogic}
      They must specialize in "${searchQuery.topic}". 
      
      Then, write a highly personalized, professional cold outreach email to them on behalf of ${profile.fullName}. 
      My primary research focus is: ${profile.researchInterest}.
      Here is my full CV data: ${profile.fullCVText || "an active interest in advancing this field."}
      
      The goal of the email is to inquire about PhD opportunities in their lab. Analyze my CV data and seamlessly weave 1 or 2 of my most impressive, relevant achievements into the email to prove my high competence. 
      Start your response by boldly stating the Professor's Name and University on the first line so the user knows who was found, followed by the email body. Keep it persuasive, academic, and strictly under 250 words.`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Unknown API Error");

      setGeneratedEmail(data.candidates[0].content.parts[0].text);
      setActiveTab('draft');
    } catch (error) {
      alert("Raw API Error: " + error.message);
    }
    setIsDrafting(false);
  };

  // 3. Save Draft to Database
  const handleSaveDraftToDB = async () => {
    setIsSaving(true);
    const targetName = searchQuery.specificUni ? searchQuery.specificUni : `Tier ${searchQuery.ranking}`;
    const newDraft = {
      targetDetails: `${searchQuery.topic} in ${searchQuery.location} (${targetName})`,
      content: generatedEmail,
      date: new Date().toLocaleDateString()
    };

    const updatedDrafts = [newDraft, ...(profile.drafts || [])];
    const updatedProfile = { ...profile, drafts: updatedDrafts };

    try {
      await setDoc(doc(db, "users", user.uid), updatedProfile);
      setProfile(updatedProfile);
      alert("Draft Saved to Database!");
      setActiveTab('saved');
    } catch (error) {
      alert("Error saving draft: " + error.message);
    }
    setIsSaving(false);
  };

  // Navigation Helper (Closes sidebar on mobile after clicking)
  const navTo = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-indigo-600">Booting MVP...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-slate-200">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-indigo-600 rounded-2xl text-white mb-4 shadow-lg shadow-indigo-200"><BrainCircuit size={32} /></div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight text-center">ScholarBridge</h1>
            <p className="text-slate-500 font-medium mt-1">AI Outreach Portal</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder="Email Address" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95">{isSignUp ? 'Create Account' : 'Secure Sign In'}</button>
          </form>
          <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-6 text-sm text-indigo-600 font-bold hover:underline">{isSignUp ? 'Switch to Sign In' : 'Switch to Sign Up'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR (Responsive) */}
      <aside className={`w-64 bg-slate-900 text-slate-300 flex flex-col p-6 fixed h-full z-50 shadow-2xl transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between text-white mb-10">
          <div className="flex items-center gap-3">
            <BrainCircuit className="text-indigo-400" size={28} />
            <span className="text-xl md:text-2xl font-bold tracking-tight">ScholarBridge</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => navTo('dashboard')} className={`w-full flex items-center gap-3 p-3.5 rounded-xl font-medium transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => navTo('profile')} className={`w-full flex items-center gap-3 p-3.5 rounded-xl font-medium transition-all ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><UserCircle size={20} /> Researcher Profile</button>
          <button onClick={() => navTo('match')} className={`w-full flex items-center gap-3 p-3.5 rounded-xl font-medium transition-all ${activeTab === 'match' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><Search size={20} /> Discovery Hub</button>
          <button onClick={() => navTo('saved')} className={`w-full flex items-center gap-3 p-3.5 rounded-xl font-medium transition-all ${activeTab === 'saved' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}><Bookmark size={20} /> Saved Drafts</button>
        </nav>
        <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-3.5 text-slate-500 hover:text-red-400 mt-auto border-t border-slate-800 pt-6 font-medium transition-colors"><LogOut size={20} /> Log Out</button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 md:ml-64 w-full h-screen overflow-y-auto p-4 md:p-10 transition-all">

        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center gap-2 text-indigo-600 font-bold">
            <BrainCircuit size={24} /> <span className="text-lg text-slate-800">ScholarBridge</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors">
            <Menu size={24} />
          </button>
        </div>

        <div className="max-w-7xl mx-auto pb-10">

          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">Welcome, {profile.fullName || "Commander"}!</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-wider mb-1">Saved Drafts</p>
                  <p className="text-3xl md:text-4xl font-black text-slate-800">{profile.drafts?.length || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-wider mb-1">Targeted Universities</p>
                  <p className="text-3xl md:text-4xl font-black text-indigo-600">Global</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 md:col-span-1">
                  <p className="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-wider mb-1">Profile Strength</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl md:text-4xl font-black text-green-500">{profile.fullCVText ? '100%' : '50%'}</p>
                    {profile.fullCVText && <CheckCircle2 className="text-green-500" size={24} />}
                  </div>
                </div>
              </div>

              <div className="bg-indigo-600 rounded-3xl p-6 md:p-10 text-white shadow-xl shadow-indigo-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-indigo-500">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2">Ready to discover advisors?</h3>
                  <p className="text-indigo-100 text-sm md:text-lg flex flex-wrap gap-2 items-center">Your AI is tuned for: <span className="font-bold text-white bg-indigo-500 px-3 py-1 rounded-lg">{profile.researchInterest || "General Research"}</span></p>
                </div>
                <button onClick={() => navTo('match')} className="w-full md:w-auto bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform active:scale-95 text-base md:text-lg">Open Discovery Hub</button>
              </div>
            </div>
          )}

          {/* RESEARCHER PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Researcher Profile</h2>
                  <p className="text-slate-500 mt-1 text-sm md:text-base">Provide your background context so Gemini can personalize emails.</p>
                </div>
                <button onClick={async () => { setIsSaving(true); await setDoc(doc(db, "users", user.uid), profile); setIsSaving(false); alert("Profile Synced to Cloud!"); }} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 md:px-8 py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Profile
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-bold text-slate-700 ml-1 block uppercase tracking-wide">Full Legal Name</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-base md:text-lg" placeholder="e.g., Jarif Angon" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs md:text-sm font-bold text-slate-700 ml-1 block uppercase tracking-wide">Primary Research Interest</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-base md:text-lg" placeholder="e.g., AI Agents & Decentralization" value={profile.researchInterest} onChange={(e) => setProfile({ ...profile, researchInterest: e.target.value })} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs md:text-sm font-bold text-slate-700 ml-1 uppercase tracking-wide flex items-center gap-2"><FileText size={16} /> Raw CV Text Dump (For Deep Personalization)</label>
                  <p className="text-slate-500 text-xs md:text-sm mb-2 ml-1">Open your actual CV document, copy everything, and paste it all right here. The AI will read the whole thing instantly.</p>
                  <textarea
                    className="w-full h-48 md:h-64 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm resize-none"
                    placeholder="Paste your entire CV text here..."
                    value={profile.fullCVText || ''}
                    onChange={(e) => setProfile({ ...profile, fullCVText: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* AI DISCOVERY HUB */}
          {activeTab === 'match' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
              <div className="text-center px-4">
                <div className="inline-flex p-3 md:p-4 bg-indigo-100 text-indigo-600 rounded-full mb-3 md:mb-4"><Globe size={28} className="md:w-8 md:h-8" /></div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">AI Discovery Hub</h2>
                <p className="text-slate-500 mt-2 text-sm md:text-lg">Tell Gemini where you want to go and what you want to study. It will find a top-tier professor and draft an email.</p>
              </div>

              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl">
                <div className="space-y-5 md:space-y-6">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-bold text-slate-700 ml-1 block uppercase tracking-wide">Target Location</label>
                      <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-base md:text-lg" placeholder="e.g., Canada or USA" value={searchQuery.location} onChange={(e) => setSearchQuery({ ...searchQuery, location: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-bold text-slate-700 ml-1 block uppercase tracking-wide">University Ranking</label>
                      <select
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-base md:text-lg cursor-pointer text-slate-700 font-medium"
                        value={searchQuery.ranking}
                        onChange={(e) => setSearchQuery({ ...searchQuery, ranking: e.target.value })}
                      >
                        <option value="Top 100">Top 100 Globally</option>
                        <option value="Top 400">Top 400 Globally</option>
                        <option value="Top 800">Top 800 Globally</option>
                        <option value="Top 1200">Top 1200 Globally</option>
                        <option value="1200+">1200+ Globally</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-bold text-slate-700 ml-1 block uppercase tracking-wide">Specific University (Optional)</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-base md:text-lg" placeholder="e.g., Stanford (Leave blank if open)" value={searchQuery.specificUni} onChange={(e) => setSearchQuery({ ...searchQuery, specificUni: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-bold text-slate-700 ml-1 block uppercase tracking-wide">Specific Research Area</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all text-base md:text-lg" placeholder="e.g., LLMs & Robotics" value={searchQuery.topic} onChange={(e) => setSearchQuery({ ...searchQuery, topic: e.target.value })} />
                  </div>

                  <button
                    onClick={handleDraftEmail}
                    disabled={isDrafting}
                    className="w-full bg-slate-900 text-white py-4 md:py-5 rounded-xl font-bold flex justify-center items-center gap-3 hover:bg-indigo-600 transition-colors disabled:opacity-50 shadow-lg mt-6 md:mt-8 text-base md:text-lg"
                  >
                    {isDrafting ? <Loader2 size={20} className="animate-spin md:w-6 md:h-6" /> : <Sparkles size={20} className="md:w-6 md:h-6" />}
                    {isDrafting ? 'Gemini is searching...' : 'Discover & Draft Email'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI GENERATED EMAIL VIEWER */}
          {activeTab === 'draft' && (
            <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-200 shadow-xl animate-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 border-b border-slate-100 pb-6 gap-4">
                <div className="flex items-center gap-3 md:gap-4 text-indigo-600">
                  <div className="bg-indigo-100 p-2 md:p-3 rounded-xl"><Mail size={24} className="md:w-7 md:h-7" /></div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800">AI Discovery Match</h2>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-3 w-full sm:w-auto">
                  <button onClick={() => navigator.clipboard.writeText(generatedEmail)} className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold transition-colors text-sm md:text-base">Copy</button>
                  <button onClick={handleSaveDraftToDB} disabled={isSaving} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm md:text-base">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Draft
                  </button>
                </div>
              </div>
              <textarea readOnly className="w-full h-72 md:h-[400px] p-4 md:p-8 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-slate-700 text-base md:text-lg leading-relaxed resize-none focus:ring-2 focus:ring-indigo-500 transition-all" value={generatedEmail} />
              <button onClick={() => navTo('match')} className="mt-6 md:mt-8 text-slate-500 hover:text-slate-800 font-bold flex items-center gap-2 transition-colors text-sm md:text-base">← Start New Search</button>
            </div>
          )}

          {/* SAVED DRAFTS VIEWER */}
          {activeTab === 'saved' && (
            <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="px-2">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Saved Drafts</h2>
                <p className="text-slate-500 mt-1 text-sm md:text-lg">Your repository of discovered professors and outreach emails.</p>
              </div>

              {(!profile.drafts || profile.drafts.length === 0) ? (
                <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 text-center">
                  <Bookmark size={40} className="mx-auto text-slate-300 mb-4 md:w-12 md:h-12" />
                  <h3 className="text-lg md:text-xl font-bold text-slate-700">No saved drafts yet</h3>
                  <p className="text-slate-500 mt-2 text-sm md:text-base">Generate and save an email in the Discovery Hub to see it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:gap-6">
                  {profile.drafts.map((draft, i) => (
                    <div key={i} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <div>
                          <h4 className="font-bold text-lg md:text-xl text-slate-800 uppercase">{draft.targetDetails}</h4>
                        </div>
                        <span className="text-xs md:text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg self-start sm:self-auto">{draft.date}</span>
                      </div>
                      <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 mt-2 md:mt-4">
                        <p className="text-slate-700 whitespace-pre-wrap text-sm md:text-base">{draft.content}</p>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(draft.content)} className="mt-4 text-indigo-600 font-bold hover:text-indigo-800 transition-colors text-sm md:text-base">Copy to Clipboard</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}