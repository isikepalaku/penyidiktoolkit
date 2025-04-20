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

  // User avatar or initials
  const getInitials = () => {
    if (!currentUser?.displayName) return 'U';
    return currentUser.displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Cek apakah user memiliki photoURL (dari Google) dan tidak ada error
  const shouldShowPhoto = Boolean(currentUser?.photoURL) && !avatarError;

  // Handler untuk error loading gambar
  const handleImageError = () => {
    console.log('Avatar image failed to load:', currentUser?.photoURL);
    setAvatarError(true);
  };

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
            src={currentUser?.photoURL!} 
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden md:block">
          {currentUser?.displayName || 'User'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-[200] ring-1 ring-black ring-opacity-5">
          <div className="px-4 py-3 border-b dark:border-gray-700">
            <div className="flex items-center mb-2">
              {shouldShowPhoto ? (
                <img 
                  src={currentUser?.photoURL!} 
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
                  {currentUser?.displayName || 'User'}
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