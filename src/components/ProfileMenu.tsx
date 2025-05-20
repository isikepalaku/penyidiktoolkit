import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentUser, logOut } = useAuth();
  const navigate = useNavigate();

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    try {
      await logOut();
      navigate('/login');
    } catch (error) {
      console.error('Error saat logout:', error);
    }
  };

  // Reset avatar error saat user berubah
  useEffect(() => {
    setAvatarError(false);
  }, [currentUser]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Mendapatkan nama tampilan pengguna dari Supabase
  const getDisplayName = () => {
    if (currentUser?.user_metadata?.full_name) {
      return currentUser.user_metadata.full_name;
    }
    if (currentUser?.user_metadata?.name) {
      return currentUser.user_metadata.name;
    }
    return 'Pengguna';
  };

  // User avatar or initials
  const getInitials = () => {
    const displayName = getDisplayName();
    if (displayName === 'Pengguna') return 'P';
    
    return displayName
      .split(' ')
      .map((name: string) => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Mendapatkan URL avatar dari Supabase
  const getAvatarUrl = () => {
    // Cek avatar dari user_metadata
    if (currentUser?.user_metadata?.avatar_url) {
      return currentUser.user_metadata.avatar_url;
    }
    // Cek identities untuk avatar dari provider (Google, dll)
    const identities = currentUser?.identities;
    if (identities && identities.length > 0) {
      // Cek provider identity untuk avatar (biasanya Google)
      const providerIdentity = identities.find(identity => 
        identity.provider === 'google' || identity.provider === 'github'
      );
      
      if (providerIdentity?.identity_data?.avatar_url) {
        return providerIdentity.identity_data.avatar_url;
      }
    }
    return null;
  };

  // Cek apakah user memiliki avatar dan tidak ada error
  const avatarUrl = getAvatarUrl();
  const shouldShowPhoto = Boolean(avatarUrl) && !avatarError;

  // Handler untuk error loading gambar
  const handleImageError = () => {
    console.log('Avatar image failed to load:', avatarUrl);
    setAvatarError(true);
  };

  const displayName = getDisplayName();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center space-x-2 focus:outline-none"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {shouldShowPhoto ? (
          <img 
            src={avatarUrl!} 
            alt="Profile" 
            className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 object-cover"
            onError={handleImageError}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
            {getInitials()}
          </div>
        )}
        <span className="text-sm font-medium text-white hidden md:block">
          {displayName}
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-[200] ring-1 ring-black ring-opacity-5">
          <div className="px-4 py-3 border-b dark:border-gray-700">
            <div className="flex items-center mb-2">
              {shouldShowPhoto ? (
                <img 
                  src={avatarUrl!} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-600 mr-3 object-cover"
                  onError={handleImageError}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium mr-3">
                  {getInitials()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {currentUser?.email}
                </p>
              </div>
            </div>
          </div>
          
          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Profil
          </Link>
          
          <Link
            to="/settings"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Pengaturan
          </Link>
          
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  );
} 