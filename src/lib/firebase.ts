import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, collection, query, orderBy, limit, getDocs, where, getDocFromServer, initializeFirestore, or } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Initialize Firestore with long polling to bypass potential proxy/iframe issues
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, collection, query, orderBy, limit, getDocs, where, getDocFromServer, or };
