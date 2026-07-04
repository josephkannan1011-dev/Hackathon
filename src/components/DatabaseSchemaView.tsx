import React, { useState } from "react";
import { 
  Folder, FileCode, Check, Copy, Terminal, Shield, ListCollapse,
  ChevronRight, HardDrive, FileText, Settings, Cloud
} from "lucide-react";

const CODEBASE_STRUCTURE = [
  {
    name: "backend/ (FastAPI + SQLAlchemy)",
    type: "folder",
    children: [
      { name: "app/database/models.py", path: "/codebase_files/backend_models.py", lang: "python" },
      { name: "app/main.py", path: "/codebase_files/backend_main.py", lang: "python" }
    ]
  },
  {
    name: "mobile/ (Flutter + Riverpod)",
    type: "folder",
    children: [
      { name: "lib/core/config/app_router.dart", path: "/codebase_files/flutter_riverpod.dart", lang: "dart" }
    ]
  },
  {
    name: "devops_configurations/",
    type: "folder",
    children: [
      { name: "docker_and_readme.md", path: "/codebase_files/docker_and_readme.md", lang: "markdown" }
    ]
  }
];

// Pre-packaged content maps in case of direct render to guarantee seamless offline functionality!
import { backendModelsCode } from "../data/backend_models_code";
import { backendMainCode } from "../data/backend_main_code";
import { flutterRiverpodCode } from "../data/flutter_riverpod_code";
import { dockerReadmeCode } from "../data/docker_readme_code";

export default function DatabaseSchemaView({
  onShowToast
}: {
  onShowToast: (msg: string, type: "success" | "warning" | "info" | "error") => void;
}) {
  const [selectedFile, setSelectedFile] = useState<string>("app/database/models.py");
  const [selectedLang, setSelectedLang] = useState<string>("python");
  const [copied, setCopied] = useState(false);

  // Map files to pre-seeded static strings to guarantee 100% response speeds without I/O errors!
  const getCodeContent = (file: string) => {
    if (file.includes("models.py")) return backendModelsCode;
    if (file.includes("main.py")) return backendMainCode;
    if (file.includes("app_router.dart")) return flutterRiverpodCode;
    return dockerReadmeCode;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeContent(selectedFile));
    setCopied(true);
    onShowToast("Code copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-12 font-sans">
      
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold font-display text-white flex items-center gap-2">
          <Terminal className="w-7 h-7 text-sky-400" />
          Enterprise Codebase Navigator
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Explore production SQLAlchemy schemas, FastAPI routers, Flutter MVVM flows, and Docker configurations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: FOLDER TREE (4/12) */}
        <div className="lg:col-span-4 rounded-2xl p-4 space-y-4 glass-panel border border-white/5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 border-b border-white/10 pb-2.5">
            <HardDrive className="w-4 h-4 text-sky-400" />
            CivicLens AI Repository Tree
          </div>

          <div className="space-y-3">
            {CODEBASE_STRUCTURE.map((folder, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white select-none">
                  <Folder className="w-4 h-4 text-sky-400" />
                  <span>{folder.name}</span>
                </div>
                
                <div className="pl-4 border-l border-white/10 space-y-1.5">
                  {folder.children.map((child, cIdx) => {
                    const isSelected = selectedFile === child.name;
                    return (
                      <button
                        key={cIdx}
                        onClick={() => {
                          setSelectedFile(child.name);
                          setSelectedLang(child.lang);
                        }}
                        className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-sky-500/10 text-sky-300 font-bold border-l-4 border-sky-400 pl-2" 
                            : "hover:bg-white/5 text-slate-300"
                        }`}
                      >
                        <FileCode className={`w-3.5 h-3.5 ${isSelected ? "text-sky-400" : "text-slate-500"}`} />
                        <span className="truncate">{child.name.split("/").pop()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 text-[10px] leading-normal text-slate-400 space-y-2">
            <div className="font-bold text-white flex items-center gap-1">
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              CLOUD RUN COMPATIBLE
            </div>
            <p>
              These files are engineered for high-performance scale-to-zero container deployment. Download or copy them to compile your mobile app.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: CODE VIEWER (8/12) */}
        <div className="lg:col-span-8 rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col h-[550px] bg-slate-950/40 backdrop-blur-md">
          
          {/* Viewer Controls */}
          <div className="bg-white/5 px-5 py-3 flex justify-between items-center border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
              <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
              <span className="text-[11px] font-mono font-medium text-slate-400 ml-2">
                {selectedFile} ({selectedLang})
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy File
                </>
              )}
            </button>
          </div>

          {/* Actual Code Panel scrollable */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-normal bg-[#030712]/80 backdrop-blur-sm scrollbar-thin scrollbar-thumb-slate-800">
            <pre className="text-[11px] text-slate-300">
              <code>
                {getCodeContent(selectedFile).split("\n").map((line, idx) => (
                  <div key={idx} className="table-row">
                    <span className="table-cell text-slate-600 text-right pr-4 select-none w-8 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="table-cell whitespace-pre-wrap">{line}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
}
