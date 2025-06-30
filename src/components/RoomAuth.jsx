import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import styles from '../styles/RoomAuth.module.css';

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
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Whisper Box</h1>
        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button onClick={() => setMode('create')}>Create Room</button>
            <button onClick={() => setMode('join')}>Join Room</button>
          </div>
        )}
        {mode === 'create' && (
          <form onSubmit={handleCreate}>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name"
              required
              maxLength={20}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Set a password"
              required
            />
            <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Room'}</button>
            <button type="button" onClick={() => setMode('')}>Back</button>
          </form>
        )}
        {mode === 'join' && (
          <form onSubmit={handleJoin}>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Display name"
              required
              maxLength={20}
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
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
            <button type="submit" disabled={loading}>{loading ? 'Joining...' : 'Join Room'}</button>
            <button type="button" onClick={() => setMode('')}>Back</button>
          </form>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
};

export default RoomAuth; 