import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
// import styles from '../styles/RoomAuth.module.css';

function hashPassword(password) {
  // Simple hash for demo (replace with a real hash in production)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = ((hash << 5) - hash) + password.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

const generateRoomId = async () => {
  let roomId;
  let exists = true;
  while (exists) {
    roomId = Math.floor(1000 + Math.random() * 9000).toString();
    const roomDoc = await getDoc(doc(db, 'rooms', roomId));
    exists = roomDoc.exists();
  }
  return roomId;
};

const RoomAuth = ({ setIsAuthenticated, setRoomId }) => {
  const [mode, setMode] = useState(''); // 'create' or 'join'
  const [roomIdInput, setRoomIdInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(localStorage.getItem('displayName') || '');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!displayName.trim()) {
        setError('Display name required.');
        setLoading(false);
        return;
      }
      localStorage.setItem('displayName', displayName);
      const roomId = await generateRoomId();
      await setDoc(doc(db, 'rooms', roomId), {
        passwordHash: hashPassword(password),
        hold: { active: false, by: '', displayName: '' },
        closed: false,
        createdAt: serverTimestamp()
      });
      setRoomId(roomId);
      setIsAuthenticated(true);
    } catch (err) {
      setError('Failed to create room.');
    }
    setLoading(false);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!displayName.trim()) {
        setError('Display name required.');
        setLoading(false);
        return;
      }
      localStorage.setItem('displayName', displayName);
      const roomDoc = await getDoc(doc(db, 'rooms', roomIdInput));
      if (!roomDoc.exists()) {
        setError('Room ID not found.');
        setLoading(false);
        return;
      }
      const { passwordHash } = roomDoc.data();
      if (passwordHash !== hashPassword(password)) {
        setError('Incorrect password.');
        setLoading(false);
        return;
      }
      setRoomId(roomIdInput);
      setIsAuthenticated(true);
    } catch (err) {
      setError('Failed to join room.');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="glass w-full max-w-md p-8 rounded-xl shadow-2xl border border-white/10">
        <h1 className="text-3xl font-bold text-center text-white mb-8">Whisper Box</h1>

        {!mode && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setMode('create')}
              className="glass-button hover:bg-white/10 text-white py-3 px-4 rounded-lg transition-all duration-300 font-medium border border-white/20 backdrop-blur-md"
            >
              Create Room
            </button>
            <button
              onClick={() => setMode('join')}
              className="glass-button hover:bg-white/10 text-white py-3 px-4 rounded-lg transition-all duration-300 font-medium border border-white/20 backdrop-blur-md"
            >
              Join Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name"
              required
              maxLength={20}
              className="w-full px-4 py-3 bg-gray-800/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/20 backdrop-blur-sm"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Set a password"
              required
              className="w-full px-4 py-3 bg-gray-800/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/20 backdrop-blur-sm"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 glass-button hover:bg-white/10 text-white py-3 px-4 rounded-lg transition-all duration-300 font-medium border border-white/20 backdrop-blur-md disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
              <button
                type="button"
                onClick={() => setMode('')}
                className="flex-1 glass-button hover:bg-white/10 text-white py-3 px-4 rounded-lg transition-all duration-300 font-medium border border-white/20 backdrop-blur-md"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name"
              required
              maxLength={20}
              className="w-full px-4 py-3 bg-gray-800/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/20 backdrop-blur-sm"
            />
            <input
              type="text"
              value={roomIdInput}
              onChange={e => setRoomIdInput(e.target.value)}
              placeholder="Enter Room ID"
              required
              maxLength={4}
              minLength={4}
              pattern="[0-9]{4}"
              className="w-full px-4 py-3 bg-gray-800/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/20 backdrop-blur-sm"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full px-4 py-3 bg-gray-800/50 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/20 backdrop-blur-sm"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 glass-button hover:bg-white/10 text-white py-3 px-4 rounded-lg transition-all duration-300 font-medium border border-white/20 backdrop-blur-md disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
              <button
                type="button"
                onClick={() => setMode('')}
                className="flex-1 glass-button hover:bg-white/10 text-white py-3 px-4 rounded-lg transition-all duration-300 font-medium border border-white/20 backdrop-blur-md"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {error && (
          <p className="mt-4 p-3 bg-red-900/30 text-red-100 rounded-lg text-sm border border-red-900/50 backdrop-blur-sm">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default RoomAuth;