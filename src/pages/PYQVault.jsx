import { useState, useEffect, useRef } from 'react';
import { Download, Star, FileText, Upload, Eye, Check, Inbox, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { branches, semesters } from '../data/mockData';
import { uploadToCloudinary } from '../services/cloudinary';
import { uploadToGofile } from '../services/gofile';
import { createPaper, getAllPapers, incrementPaperDownloads, deletePaper } from '../services/data';
import CustomSelect from '../components/CustomSelect';
import ProfessionalSearch from '../components/ProfessionalSearch';

function PaperCard({ paper, onDownload, downloaded, onDelete, onView, currentUserId }) {
  const isOwner = paper.uploadedBy?.id === currentUserId;
  return (
    <div className="card p-4 sm:p-5 card-hover animate-fade-in">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="w-12 h-14 sm:w-14 sm:h-16 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center flex-shrink-0"><FileText className="w-6 h-6 sm:w-7 sm:h-7 text-slate-500 dark:text-slate-400" /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1 truncate text-sm sm:text-base">{paper.title}</h3>
            {isOwner && <button onClick={() => onDelete(paper.id)} className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors group flex-shrink-0"><Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-500" /></button>}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-2">{paper.subject} · {paper.semester} · {paper.year}</p>
          <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" />{paper.downloads}</span>
            {paper.rating > 0 && <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{paper.rating}</span>}
            {paper.fileSize && <span>{paper.fileSize}</span>}
          </div>
          {paper.uploadedBy && (
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <img src={paper.uploadedBy.avatar} alt="" className="w-5 h-5 rounded-full" />
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{paper.uploadedBy.name}{paper.college ? ` · ${paper.college}` : ''}</span>
            </div>
          )}
          {paper.tags && paper.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4">{paper.tags.map(tag => <span key={tag} className="badge text-[10px]">{tag}</span>)}</div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => onDownload(paper.id)} className={`btn-primary text-xs sm:text-sm flex items-center gap-2 flex-1 ${downloaded ? 'opacity-70' : ''}`}>
              {downloaded ? <><Check className="w-4 h-4" />Downloaded</> : <><Download className="w-4 h-4" />Download</>}
            </button>
            <button onClick={() => onView(paper)} className="btn-secondary text-xs sm:text-sm p-2 sm:p-2.5"><Eye className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaperViewer({ paper, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto animate-scale-in shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{paper.title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="space-y-3">
          <div><span className="text-xs text-slate-500 dark:text-slate-400">Subject</span><p className="text-sm font-semibold text-slate-900 dark:text-white">{paper.subject}</p></div>
          <div><span className="text-xs text-slate-500 dark:text-slate-400">Semester</span><p className="text-sm font-semibold text-slate-900 dark:text-white">{paper.semester}</p></div>
          <div><span className="text-xs text-slate-500 dark:text-slate-400">Year</span><p className="text-sm font-semibold text-slate-900 dark:text-white">{paper.year}</p></div>
          <div><span className="text-xs text-slate-500 dark:text-slate-400">Downloads</span><p className="text-sm font-semibold text-slate-900 dark:text-white">{paper.downloads}</p></div>
          {paper.fileUrl && (
            <div className="mt-4">
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-2">File Preview</span>
              {paper.fileType?.startsWith('image/') ? (
                <img src={paper.fileUrl} alt={paper.title} className="w-full rounded-xl" />
              ) : paper.fileType?.startsWith('video/') ? (
                <video src={paper.fileUrl} controls className="w-full rounded-xl" />
              ) : (
                <a href={paper.fileUrl} download={paper.fileName || paper.title} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2 text-sm"><Download className="w-4 h-4" />Download {paper.fileName || 'file'}</a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyVault() {
  return (
    <div className="card p-8 sm:p-12 text-center animate-slide-up">
      <div className="w-16 h-16 rounded-2xl bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center mx-auto mb-4 animate-float"><Inbox className="w-8 h-8 text-slate-400" /></div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No papers yet</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">Be the first to share question papers with your fellow students!</p>
    </div>
  );
}

export default function PYQVault() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [papers, setPapers] = useState([]);
  const [downloaded, setDownloaded] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', branch: '', semester: '', year: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [viewingPaper, setViewingPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    try {
      const p = await getAllPapers();
      setPapers(p);
    } catch (e) { console.warn('Failed to load papers:', e); }
    finally { setLoading(false); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target.result);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setFilePreview(URL.createObjectURL(file));
    } else { setFilePreview(null); }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = async (paperId) => {
    setDownloaded(prev => ({ ...prev, [paperId]: true }));
    try { await incrementPaperDownloads(paperId); } catch { /* Ignore download counter errors */ }
    setPapers(prev => prev.map(p => p.id === paperId ? { ...p, downloads: p.downloads + 1 } : p));
    const paper = papers.find(p => p.id === paperId);
    if (paper?.fileUrl) {
      const link = document.createElement('a');
      link.href = paper.fileUrl;
      link.download = paper.fileName || paper.title;
      link.target = '_blank';
      link.click();
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.title.trim()) return;
    setUploading(true);
    let fileUrl = null, fileType = '', fileName = '', fileSize = '';
    if (selectedFile) {
      try {
        if (selectedFile.type.startsWith('video/')) fileUrl = await uploadToGofile(selectedFile);
        else fileUrl = await uploadToCloudinary(selectedFile, 'stugrow/papers');
        fileType = selectedFile.type; fileName = selectedFile.name; fileSize = `${(selectedFile.size / 1024).toFixed(1)} KB`;
        addToast('File uploaded to cloud!', 'success');
      } catch { addToast('Failed to upload file. Check config.', 'error'); setUploading(false); return; }
    }
    try {
      await createPaper({
        title: uploadForm.title, subject: uploadForm.branch || 'General', semester: uploadForm.semester || 'N/A',
        year: uploadForm.year || new Date().getFullYear().toString(), college: user?.college || '',
        uploadedBy: user.id, fileSize, fileName, fileType, fileUrl, tags: [uploadForm.branch, uploadForm.semester].filter(Boolean),
      });
      await loadPapers();
    } catch (e) { console.error('Failed to create paper:', e); }
    setUploadForm({ title: '', branch: '', semester: '', year: '' }); setSelectedFile(null); setFilePreview(null); setShowUpload(false); setUploading(false);
  };

  const handleDelete = async (paperId) => {
    try { await deletePaper(paperId); setPapers(prev => prev.filter(p => p.id !== paperId)); } catch (e) { console.error('Failed to delete paper:', e); }
  };

  const handleView = (paper) => setViewingPaper(paper);
  const filteredPapers = papers.filter(paper => {
    if (searchQuery && !paper.title.toLowerCase().includes(searchQuery.toLowerCase()) && !paper.subject?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedBranch !== 'All' && paper.subject !== selectedBranch) return false;
    if (selectedSemester !== 'All' && paper.semester !== selectedSemester) return false;
    return true;
  });

  if (loading) return <div className="p-4 sm:p-8"><div className="card p-6 animate-pulse"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" /></div></div>;

  return (
    <div className="p-4 sm:p-8 overflow-x-hidden">
      {viewingPaper && <PaperViewer paper={viewingPaper} onClose={() => setViewingPaper(null)} />}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="card p-2.5 sm:p-5 flex items-center gap-2.5 sm:gap-4"><div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center flex-shrink-0"><FileText className="w-4 h-4 sm:w-6 sm:h-6 text-slate-500" /></div><div><p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{papers.length}</p><p className="text-[10px] sm:text-sm text-slate-500">Papers</p></div></div>
        <div className="card p-2.5 sm:p-5 flex items-center gap-2.5 sm:gap-4"><div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center flex-shrink-0"><Download className="w-4 h-4 sm:w-6 sm:h-6 text-slate-500" /></div><div><p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{Object.keys(downloaded).length}</p><p className="text-[10px] sm:text-sm text-slate-500">Saved</p></div></div>
        <div className="card p-2.5 sm:p-5 flex items-center gap-2.5 sm:gap-4"><div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center flex-shrink-0"><Star className="w-4 h-4 sm:w-6 sm:h-6 text-slate-500" /></div><div><p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">0</p><p className="text-[10px] sm:text-sm text-slate-500">Shared</p></div></div>
      </div>

      <div className="card p-4 sm:p-6 mb-6">
        <div className="border-2 border-dashed rounded-xl p-6 sm:p-8 text-center" style={{ borderColor: '#e8e5e0' }}>
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#f3f1ed] dark:bg-[#0e1322] flex items-center justify-center mx-auto mb-4"><Upload className="w-6 h-6 sm:w-7 sm:h-7 text-slate-500" /></div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Share Your Question Papers</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">Help your fellow students by uploading previous year papers</p>
          <button onClick={() => setShowUpload(!showUpload)} className="btn-primary text-sm sm:text-base">{showUpload ? 'Cancel' : 'Upload Paper'}</button>
          {showUpload && (
            <div className="mt-6 space-y-4 text-left animate-fade-in">
              <input type="text" placeholder="Paper title" className="input-field" value={uploadForm.title} onChange={(e) => setUploadForm(p => ({ ...p, title: e.target.value }))} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomSelect
                  value={uploadForm.branch}
                  onChange={(val) => setUploadForm(p => ({ ...p, branch: val }))}
                  options={branches}
                  placeholder="Select Branch"
                />
                <CustomSelect
                  value={uploadForm.semester}
                  onChange={(val) => setUploadForm(p => ({ ...p, semester: val }))}
                  options={semesters}
                  placeholder="Select Semester"
                />
              </div>
              <input type="text" placeholder="Year (e.g., 2025)" className="input-field" value={uploadForm.year} onChange={(e) => setUploadForm(p => ({ ...p, year: e.target.value }))} />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upload File</label>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,image/*,video/*" className="hidden" onChange={handleFileChange} />
                <button onClick={openFilePicker} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"><Upload className="w-4 h-4" />{selectedFile ? selectedFile.name : 'Choose file from device'}</button>
                {filePreview && selectedFile?.type?.startsWith('image/') && <div className="relative mt-3"><img src={filePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" /><button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"><X className="w-4 h-4" /></button></div>}
                {filePreview && selectedFile?.type?.startsWith('video/') && <div className="relative mt-3"><video src={filePreview} controls className="w-full max-h-48 rounded-xl" /><button onClick={() => { setSelectedFile(null); setFilePreview(null); }} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70"><X className="w-4 h-4" /></button></div>}
              </div>
              <button onClick={handleUpload} disabled={!uploadForm.title.trim() || uploading} className="btn-primary w-full disabled:opacity-50">{uploading ? 'Uploading...' : 'Submit Paper'}</button>
            </div>
          )}
        </div>
      </div>

      <div className="card p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <ProfessionalSearch
              placeholder="Search papers..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="input-field text-xs sm:text-sm sm:flex-1"><option value="All">All Branches</option>{branches.map(b => <option key={b} value={b}>{b}</option>)}</select>
            <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className="input-field text-xs sm:text-sm sm:flex-1"><option value="All">All Semesters</option>{semesters.map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
        </div>
      </div>

      {filteredPapers.length === 0 ? <EmptyVault /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPapers.map(paper => <PaperCard key={paper.id} paper={paper} onDownload={handleDownload} downloaded={downloaded[paper.id]} onDelete={handleDelete} onView={handleView} currentUserId={user?.id} />)}
        </div>
      )}
    </div>
  );
}