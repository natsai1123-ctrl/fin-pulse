import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseVariables = [
	["VITE_FIREBASE_API_KEY", firebaseConfig.apiKey],
	["VITE_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
	["VITE_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
	["VITE_FIREBASE_STORAGE_BUCKET", firebaseConfig.storageBucket],
	[
		"VITE_FIREBASE_MESSAGING_SENDER_ID",
		firebaseConfig.messagingSenderId,
	],
	["VITE_FIREBASE_APP_ID", firebaseConfig.appId],
];
const missingVariables = requiredFirebaseVariables
	.filter(([, value]) => typeof value !== "string" || !value.trim())
	.map(([name]) => name);
const hasFirebaseConfig = missingVariables.length === 0;

if (!hasFirebaseConfig) {
	console.error(
		`Firebase initialization skipped. Missing Render environment variables: ${missingVariables.join(", ")}. Using local preview mode.`,
	);
}

let app = null;
let firebaseAuth = null;
let firestore = null;

if (hasFirebaseConfig) {
	try {
		app = initializeApp(firebaseConfig);
		firebaseAuth = getAuth(app);
		firestore = getFirestore(app);
	} catch (error) {
		console.warn("Firebase is unavailable; using local preview mode.", error);
	}
}

export const auth = firebaseAuth;
export const googleProvider = new GoogleAuthProvider();
export const db = firestore;