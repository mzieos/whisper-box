// src/components/PasswordAuth.jsx
import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import styles from '../styles/PasswordAuth.module.css';

const PasswordAuth = ({ setIsAuthenticated, isCreator }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSettingUp, setIsSettingUp] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const email = `${password}@whisperbox.app`;

            if (isCreator && isSettingUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }

            setIsAuthenticated(true);
        } catch (err) {
            setError(isCreator && !isSettingUp ?
                'Incorrect password or chat not set up yet. Try setting up as creator.' :
                'Authentication failed. Please try again.');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>Whisper Box</h1>
                <p>{isCreator ? 'Create or access your private chat' : 'Enter the secret password'}</p>

                <form onSubmit={handleAuth}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                    />

                    {isCreator && (
                        <div className={styles.setupOption}>
                            <input
                                type="checkbox"
                                id="setup"
                                checked={isSettingUp}
                                onChange={() => setIsSettingUp(!isSettingUp)}
                            />
                            <label htmlFor="setup">Set up new chat</label>
                        </div>
                    )}

                    <button type="submit">{isCreator && isSettingUp ? 'Create Chat' : 'Enter'}</button>
                </form>

                {error && <p className={styles.error}>{error}</p>}
            </div>
        </div>
    );
};

export default PasswordAuth;