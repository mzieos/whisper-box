// src/App.jsx
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase/config';
import Chat from './components/Chat';
import RoomAuth from './components/RoomAuth';

const App = () => {
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const displayName = localStorage.getItem('displayName') || '';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).then(() => setAuthReady(true));
      } else {
        setAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!authReady) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl font-light">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black opacity-90"></div>
      <div className="relative h-full w-full flex items-center justify-center p-4 backdrop-blur-sm">
        {!isAuthenticated ? (
          <div className="w-full max-w-md">
            <RoomAuth setIsAuthenticated={setIsAuthenticated} setRoomId={setRoomId} />
          </div>
        ) : (
          <div className="h-full w-full max-w-6xl">
            <Chat roomId={roomId} displayName={displayName} />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;