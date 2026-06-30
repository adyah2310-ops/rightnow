import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDU-QcWYs_77ZuPOk12VPJyzqNZoyEMWnk",
  authDomain: "gen-lang-client-0382660857.firebaseapp.com",
  projectId: "gen-lang-client-0382660857",
  storageBucket: "gen-lang-client-0382660857.firebasestorage.app",
  messagingSenderId: "85712203884",
  appId: "1:85712203884:web:6a7d5863d9bd3ecf1da849"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID
export const db = initializeFirestore(app, {}, "ai-studio-rightnowgarments-776312db-99c0-44f7-8052-e45e8c497fbe");

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
