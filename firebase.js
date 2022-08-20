import firebase from "./firebase";
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import {getStorage } from 'firebase/storage';


// Your web app's Firebase configuration
const firebaseConfig = ({
  apiKey: "AIzaSyDFz0ny4pljq8zZxGfNSgQep8rwQtak6V4",
  authDomain: "jasonblog-e9ffa.firebaseapp.com",
  projectId: "jasonblog-e9ffa",
  storageBucket: "jasonblog-e9ffa.appspot.com",
  messagingSenderId: "571420548257",
  appId: "1:571420548257:web:95e6a1d8187ea7b947e4e0"
});

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);
export const db = getFirestore()

export { auth };
export {storage};