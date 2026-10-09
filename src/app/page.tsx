"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Copy,
  Sparkles,
  Wand2,
  LayoutDashboard,
  Settings,
  UserCircle,
  PenTool,
  LogOut,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Send,
  Paperclip,
  X,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import type { GrabbedLinkedInPost } from "@/lib/linkedin-post-grabber";

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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // LinkedIn Post Grabber states
  const [grabInput, setGrabInput] = useState("");
  const [grabLoading, setGrabLoading] = useState(false);
  const [grabError, setGrabError] = useState<string | null>(null);
  const [grabbedPost, setGrabbedPost] = useState<GrabbedLinkedInPost | null>(null);
  const [grabCopied, setGrabCopied] = useState(false);
  const [importedMessage, setImportedMessage] = useState<string | null>(null);

  const generateDraft = async () => {
    if (!idea) return;
    setLoadingDraft(true);
    try {
      const response = await fetch("/api/groq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", text: idea }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Groq API returned ${response.status}`);
      }
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Failed to parse JSON response from Groq API");
      }
      setDraft(data.result);
    } catch (error) {
      console.error("generateDraft error:", error);
    } finally {
      setLoadingDraft(false);
    }
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
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Groq API returned ${response.status}`);
      }
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Failed to parse JSON response from Groq API");
      }
      setFinalPost(data.result);
    } catch (error) {
      console.error("humanizeDraft error:", error);
    } finally {
      setLoadingFinal(false);
    }
  };


  const postToLinkedIn = async () => {
    setPosting(true);
    setPostStatus(null);
    try {
      const form = new FormData();
      form.append("text", finalPost);
      attachments.forEach((f) => form.append("files", f));
      const res = await fetch("/api/linkedin/share", { method: "POST", body: form });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPostStatus("Posted to LinkedIn!");
      setAttachments([]);
    } catch (err) {
      setPostStatus(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(finalPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Grab post from LinkedIn URL or ID
  const handleGrabPost = async (queryOverride?: string) => {
    const inputVal = (queryOverride !== undefined ? queryOverride : grabInput).trim();
    if (!inputVal) {
      setGrabError("Please enter a LinkedIn post URL or numeric post ID.");
      return;
    }

    setGrabLoading(true);
    setGrabError(null);
    setImportedMessage(null);

    try {
      const response = await fetch("/api/linkedin/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputVal }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to grab post from LinkedIn.");
      }

      setGrabbedPost(data.post);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to grab LinkedIn post";
      setGrabError(msg);
    } finally {
      setGrabLoading(false);
    }
  };

  const handleImportToIdea = () => {
    if (!grabbedPost) return;
    const authorLine = grabbedPost.authorName ? `[Inspired by ${grabbedPost.authorName} on LinkedIn]\n` : "";
    setIdea(`${authorLine}${grabbedPost.content}`);
    setImportedMessage("Imported into Post Idea (Stage 1)!");
    setTimeout(() => setImportedMessage(null), 3000);
  };

  const handleLoadToDraft = () => {
    if (!grabbedPost) return;
    setDraft(grabbedPost.content);
    setImportedMessage("Loaded directly into Draft (Stage 2)!");
    setTimeout(() => setImportedMessage(null), 3000);
  };

  const handleCopyGrabbed = () => {
    if (!grabbedPost) return;
    navigator.clipboard.writeText(grabbedPost.content);
    setGrabCopied(true);
    setTimeout(() => setGrabCopied(false), 2000);
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
          <a
            href="#post-grabber-section"
            className="skeuo-button w-full justify-start px-4 py-3 gap-3 text-gray-600 font-medium"
          >
            <Download size={18} />
            Post Grabber
          </a>
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
          <div>
            <h2 className="text-2xl font-bold text-gray-700">Post Creator & Polisher</h2>
            <p className="text-xs text-gray-500">Grab posts from LinkedIn or write and humanize your own</p>
          </div>
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

        {/* Feature 2: LinkedIn Post Grabber Section */}
        <section id="post-grabber-section" className="skeuo-panel p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="skeuo-inset px-2.5 py-1 rounded text-xs font-bold text-blue-600 flex items-center gap-1.5">
                <Download size={14} />
                GRAB
              </span>
              <h3 className="font-bold text-gray-700">Grab Post from LinkedIn URL or ID</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const sampleUrl = "https://www.linkedin.com/feed/update/urn:li:activity:7219434359085252608/";
                  setGrabInput(sampleUrl);
                  handleGrabPost(sampleUrl);
                }}
                className="skeuo-button px-3 py-1.5 text-xs font-medium text-gray-600 gap-1"
              >
                <Sparkles size={12} className="text-blue-500" />
                Try Sample
              </button>
              {grabbedPost && (
                <button
                  type="button"
                  onClick={() => {
                    setGrabbedPost(null);
                    setGrabInput("");
                    setGrabError(null);
                  }}
                  className="skeuo-button px-3 py-1.5 text-xs font-medium text-gray-500"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Paste any LinkedIn URL (feed update, post slug, activity link) or numeric activity ID to grab post content, author details, and media.
          </p>

          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1">
              <input
                type="text"
                value={grabInput}
                onChange={(e) => setGrabInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleGrabPost();
                  }
                }}
                placeholder="Paste URL or Post ID (e.g. https://www.linkedin.com/feed/update/urn:li:activity:... or 7219434359085252608)"
                className="skeuo-inset w-full py-3 px-4 outline-none text-sm text-gray-700 placeholder-gray-400 font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => handleGrabPost()}
              disabled={grabLoading || !grabInput.trim()}
              className="skeuo-button px-6 py-3 font-bold text-blue-600 gap-2 shrink-0 disabled:opacity-50"
            >
              {grabLoading ? (
                <>
                  <RefreshCw size={16} className="animate-spin text-blue-600" />
                  Grabbing...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Grab Post
                </>
              )}
            </button>
          </div>

          {/* Error display */}
          {grabError && (
            <div className="skeuo-inset p-3 rounded flex items-center gap-2 text-xs text-red-600">
              <AlertCircle size={16} className="shrink-0" />
              <span>{grabError}</span>
            </div>
          )}

          {/* Imported Success notification */}
          {importedMessage && (
            <div className="skeuo-inset p-3 rounded flex items-center gap-2 text-xs text-green-700 font-medium">
              <CheckCircle2 size={16} className="shrink-0 text-green-600" />
              <span>{importedMessage}</span>
            </div>
          )}

          {/* Grabbed Post Preview Card */}
          {grabbedPost && (
            <div className="skeuo-inset p-5 flex flex-col gap-4 mt-2">
              <div className="flex items-start justify-between gap-4 border-b border-gray-300 pb-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full skeuo-panel bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {grabbedPost.authorImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={grabbedPost.authorImage}
                        alt={grabbedPost.authorName || "Author"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCircle size={24} className="text-gray-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                      {grabbedPost.authorName || "LinkedIn Author"}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {grabbedPost.source.toUpperCase()}
                      </span>
                    </h4>
                    {grabbedPost.authorHeadline && (
                      <p className="text-xs text-gray-500 line-clamp-1">{grabbedPost.authorHeadline}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={grabbedPost.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="skeuo-button px-3 py-1.5 text-xs font-semibold text-blue-600 gap-1.5"
                    title="View original on LinkedIn"
                  >
                    <ExternalLink size={13} />
                    View on LinkedIn
                  </a>
                </div>
              </div>

              {/* Grabbed Content (Editable) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px] text-gray-400 font-medium">
                  <span>POST CONTENT (YOU CAN EDIT BEFORE IMPORTING)</span>
                  <span>{grabbedPost.content.length} characters</span>
                </div>
                <textarea
                  value={grabbedPost.content}
                  onChange={(e) => setGrabbedPost({ ...grabbedPost, content: e.target.value })}
                  className="w-full min-h-[90px] max-h-64 p-3 skeuo-inset bg-transparent outline-none resize-y text-sm text-gray-800 leading-relaxed font-sans"
                  placeholder="Post content will appear here..."
                />
              </div>

              {/* Media preview if available */}
              {grabbedPost.mediaUrl && (
                <div className="relative w-full rounded overflow-hidden skeuo-inset bg-gray-100 flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={grabbedPost.mediaUrl}
                    alt="LinkedIn post media"
                    className="max-h-64 max-w-full rounded object-contain"
                  />
                </div>
              )}

              {/* Quick Actions for Grabbed Post */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-300 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleImportToIdea}
                    className="skeuo-button px-3.5 py-2 text-xs font-bold text-gray-700 gap-1.5"
                  >
                    <ArrowDownRight size={14} className="text-blue-500" />
                    Import to Idea (Stage 1)
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadToDraft}
                    className="skeuo-button px-3.5 py-2 text-xs font-bold text-gray-700 gap-1.5"
                  >
                    <Wand2 size={14} className="text-purple-500" />
                    Direct to Draft (Stage 2)
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyGrabbed}
                    className="skeuo-button px-3 py-2 text-xs font-medium text-gray-600 gap-1.5"
                  >
                    <Copy size={13} />
                    {grabCopied ? "Copied!" : "Copy Post Text"}
                  </button>
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  ID: {grabbedPost.id}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Existing Post Creator Workflow */}
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
                placeholder="What do you want to talk about? e.g., 'Scaling B2B AI tool to $1M ARR...' (Or import a grabbed LinkedIn post from above)"
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
                <button
                  type="button"
                  onClick={() => setDraft((prev) => `${prev}\n\nTo be completely honest, I used to struggle with this...`)}
                  className="skeuo-inset px-3 py-1 text-xs font-medium text-gray-600 rounded cursor-pointer"
                >
                  Add Vulnerability
                </button>
                <button
                  type="button"
                  onClick={() => setDraft((prev) => `Most people get this completely wrong.\n\n${prev}`)}
                  className="skeuo-inset px-3 py-1 text-xs font-medium text-gray-600 rounded cursor-pointer"
                >
                  Contrarian Hook
                </button>
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
                      <Image
                        src={user.picture}
                        alt={user.name || "LinkedIn profile"}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserCircle size={28} className="text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">
                      {user?.name || "LinkedIn profile not connected"}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {user ? "LinkedIn Member • Now" : "LinkedIn disconnected"}
                    </p>
                  </div>
                </div>
                <textarea
                  value={finalPost}
                  onChange={(e) => setFinalPost(e.target.value)}
                  placeholder="Final polished post ready for LinkedIn..."
                  className="w-full flex-1 bg-transparent outline-none resize-none text-gray-800 text-sm leading-relaxed"
                />
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <label className="cursor-pointer flex items-center gap-1 font-semibold text-blue-600">
                    <Paperclip size={14} /> Attach images / video
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        setAttachments((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {attachments.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 bg-gray-200 rounded px-2 py-1">
                      {f.name}
                      <button onClick={() => setAttachments(attachments.filter((_, j) => j !== i))} aria-label="Remove attachment">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={copyToClipboard}
                disabled={!finalPost}
                className="skeuo-button w-full py-4 text-lg font-bold text-blue-600 gap-2 mt-auto disabled:opacity-50"
              >
                <Copy size={24} />
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
              <button
                onClick={postToLinkedIn}
                disabled={!user || posting || (!finalPost && !attachments.length)}
                className="skeuo-button w-full py-4 text-lg font-bold text-blue-600 gap-2 disabled:opacity-50"
              >
                <Send size={24} />
                {posting ? "Posting..." : "Post to LinkedIn"}
              </button>
              {postStatus && <p className="text-xs text-gray-600 text-center">{postStatus}</p>}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
