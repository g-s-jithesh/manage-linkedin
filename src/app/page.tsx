"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Copy, Sparkles, Wand2, LayoutDashboard, Settings, UserCircle, PenTool, LogOut } from "lucide-react";

type SessionUser = {
  sub?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  email?: string;
  emailVerified?: boolean;
};

export default function Home() {
  const [idea, setIdea] = useState("");
  const [draft, setDraft] = useState("");
  const [finalPost, setFinalPost] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [loadingFinal, setLoadingFinal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  const generateDraft = async () => {
    if (!idea) return;
    setLoadingDraft(true);
    try {
      const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", text: idea }),
      });
      const data = await response.json();
      setDraft(data.result);
    } catch (error) {
      console.error(error);
    }
    setLoadingDraft(false);
  };

  const humanizeDraft = async () => {
    if (!draft) return;
    setLoadingFinal(true);
    try {
      const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "humanize", text: draft }),
      });
      const data = await response.json();
      setFinalPost(data.result);
    } catch (error) {
      console.error(error);
    }
    setLoadingFinal(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(finalPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const loadSession = async () => {
      setSessionLoading(true);
      try {
        const response = await fetch("/api/auth/session", { method: "GET" });
        if (!response.ok) {
          setUser(null);
          return;
        }
        const data = await response.json();
        setUser(data.authenticated ? data.user : null);
      } catch {
        setUser(null);
      } finally {
        setSessionLoading(false);
      }
    };

    loadSession();
  }, []);

  const logout = async () => {
    setSessionLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch {
      // Non-blocking: logout error remains user-friendly locally.
    } finally {
      setSessionLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#E0E5EC] p-6 gap-6 text-skeuo-text">
      {/* Sidebar */}
      <aside className="w-64 skeuo-panel p-6 flex flex-col gap-6 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 skeuo-inset flex items-center justify-center rounded-full text-blue-600">
            <UserCircle size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-gray-700">AI Studio</h1>
            <p className="text-xs text-gray-500 font-medium">Pro Status Active</p>
          </div>
        </div>

        <nav className="flex flex-col gap-3">
          <button className="skeuo-button w-full justify-start px-4 py-3 gap-3 text-gray-600 font-medium">
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          <button className="skeuo-inset w-full flex items-center justify-start px-4 py-3 gap-3 text-blue-600 font-semibold shadow-inner">
            <PenTool size={18} />
            Post Creator
          </button>
          <button className="skeuo-button w-full justify-start px-4 py-3 gap-3 text-gray-600 font-medium">
            <UserCircle size={18} />
            Profile Analyzer
          </button>
          <button className="skeuo-button w-full justify-start px-4 py-3 gap-3 text-gray-600 font-medium mt-auto">
            <Settings size={18} />
            Settings
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
        <header className="flex justify-between items-center px-2">
          <h2 className="text-2xl font-bold text-gray-700">Post Creator & Polisher</h2>
          <div className="flex items-center gap-3">
            <div className="skeuo-inset px-4 py-2 flex items-center gap-2 rounded-full text-sm font-medium text-green-700">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>
              {user ? "LinkedIn Connected" : "LinkedIn Disconnected"}
            </div>
            {user ? (
              <button
                onClick={logout}
                className="skeuo-button px-4 py-2 gap-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
                disabled={sessionLoading}
              >
                <LogOut size={16} />
                {sessionLoading ? "Logging out..." : "Logout"}
              </button>
            ) : (
              <a
                href="/api/auth/linkedin"
                className="skeuo-button px-4 py-2 gap-2 text-sm font-semibold text-gray-700"
              >
                <UserCircle size={16} />
                Continue with LinkedIn
              </a>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
          {/* Left Column: Idea & Draft */}
          <div className="flex flex-col gap-6">
            {/* Stage 1: Idea */}
            <section className="skeuo-panel p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="skeuo-inset px-2 py-1 rounded text-xs font-bold text-gray-500">01</span>
                <h3 className="font-bold text-gray-700">Post Idea & Raw Thoughts</h3>
              </div>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="What do you want to talk about? e.g., 'Scaling B2B AI tool to $1M ARR...'"
                className="skeuo-inset w-full h-32 p-4 outline-none resize-none text-gray-700 placeholder-gray-400"
              />
              <button
                onClick={generateDraft}
                disabled={loadingDraft || !idea}
                className="skeuo-button w-full py-3 font-bold text-gray-700 gap-2 disabled:opacity-50"
              >
                <Sparkles size={18} className="text-blue-500" />
                {loadingDraft ? "Generating..." : "Generate AI Draft"}
              </button>
            </section>

            {/* Stage 2: Draft */}
            <section className="skeuo-panel p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="skeuo-inset px-2 py-1 rounded text-xs font-bold text-gray-500">02</span>
                <h3 className="font-bold text-gray-700">Generated AI Draft</h3>
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="AI draft will appear here..."
                className="skeuo-inset w-full h-64 p-4 outline-none resize-none text-gray-700 placeholder-gray-400"
              />
              <div className="flex gap-2">
                <button className="skeuo-inset px-3 py-1 text-xs font-medium text-gray-600 rounded">Add Vulnerability</button>
                <button className="skeuo-inset px-3 py-1 text-xs font-medium text-gray-600 rounded">Contrarian Hook</button>
              </div>
              <button
                onClick={humanizeDraft}
                disabled={loadingFinal || !draft}
                className="skeuo-button w-full py-3 font-bold text-gray-700 gap-2 disabled:opacity-50"
              >
                <Wand2 size={18} className="text-purple-500" />
                {loadingFinal ? "Humanizing..." : "Humanize & Re-Score"}
              </button>
            </section>
          </div>

          {/* Right Column: Final Polish */}
          <div className="flex flex-col gap-6">
            <section className="skeuo-panel p-6 flex flex-col gap-4 h-full">
              <div className="flex items-center gap-2">
                <span className="skeuo-inset px-2 py-1 rounded text-xs font-bold text-gray-500">03</span>
                <h3 className="font-bold text-gray-700">Final Polish & Live Preview</h3>
              </div>
              
              <div className="skeuo-inset flex-1 p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-gray-300 pb-4">
                  <div className="w-12 h-12 rounded-full skeuo-panel bg-gray-200 overflow-hidden">
                    {user?.picture ? (
                      <Image src={user.picture} alt={user.name || "LinkedIn profile"} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserCircle size={28} className="text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">{user?.name || "LinkedIn profile not connected"}</h4>
                    <p className="text-xs text-gray-500">{user ? "LinkedIn Member • Now" : "LinkedIn disconnected"}</p>
                  </div>
                </div>
                <textarea
                  value={finalPost}
                  onChange={(e) => setFinalPost(e.target.value)}
                  placeholder="Final polished post ready for LinkedIn..."
                  className="w-full flex-1 bg-transparent outline-none resize-none text-gray-800 text-sm leading-relaxed"
                />
              </div>

              <button
                onClick={copyToClipboard}
                disabled={!finalPost}
                className="skeuo-button w-full py-4 text-lg font-bold text-blue-600 gap-2 mt-auto disabled:opacity-50"
              >
                <Copy size={24} />
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
