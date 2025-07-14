import React, { useState, useEffect, useMemo } from 'react';
import { UserFile, UserFileManagementService, FileShareOptions } from '@/services/userFileManagementService';
import { useAuth } from '@/auth/AuthContext';
import { Link, Lock, Copy, Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: UserFile | null;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, file }) => {
  const [isPublic, setIsPublic] = useState(false);
  const [password, setPassword] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { currentUser } = useAuth();
  const fileService = useMemo(() => new UserFileManagementService(), []);

  useEffect(() => {
    if (file) {
      setIsPublic(file.access_level === 'public' || file.access_level === 'shared');
      setPassword('');
      setShareUrl(file.share_token ? `${window.location.origin}/share/${file.share_token}` : null);
    }
  }, [file]);

  const handleSaveChanges = async () => {
    if (!file || !currentUser) return;
    setIsLoading(true);
    setError(null);

    const options: FileShareOptions = {
      share_type: isPublic ? 'public' : 'private',
      password: password || undefined,
    };

    const res = await fileService.shareFile(file.id, currentUser.id, options);

    if (res.success && res.shareUrl) {
      setShareUrl(res.shareUrl);
    } else {
      setError(res.error || 'Failed to update sharing settings.');
    }
    setIsLoading(false);
  };
  
  const copyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold truncate pr-4">Share "{file.original_filename}"</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">&times;</button>
        </div>
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link className="w-5 h-5 text-gray-500"/>
                    <div>
                        <p className="font-medium">Public Link</p>
                        <p className="text-sm text-gray-500">{isPublic ? 'Anyone with the link can view' : 'Only you can access'}</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {isPublic && (
                <div className="pl-8 space-y-4">
                    <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-gray-500"/>
                        <Input 
                            type="password"
                            placeholder="Add a password (optional)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {shareUrl && (
                        <div className="relative">
                            <Input value={shareUrl} readOnly className="pr-10"/>
                            <button onClick={copyToClipboard} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800">
                                {copied ? <Check className="w-5 h-5 text-green-500"/> : <Copy className="w-5 h-5"/>}
                            </button>
                        </div>
                    )}
                </div>
            )}
             {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        </div>
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-gray-100">Cancel</button>
          <Button onClick={handleSaveChanges} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal; 