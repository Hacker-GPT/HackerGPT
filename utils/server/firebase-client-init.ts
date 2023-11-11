import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
import 'firebase/compat/performance';
import 'firebase/compat/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyCQ8QlvMtQvpnj_7sfEIE8-YorcFOGlHCo',
  authDomain: 'hackergpt-6c79e.firebaseapp.com',
  projectId: 'hackergpt-6c79e',
  storageBucket: 'hackergpt-6c79e.appspot.com',
  messagingSenderId: '155863184166',
  appId: '1:155863184166:web:464d3eb4683ba129fe47e7',
  measurementId: 'G-F859ZBGG23',
};

let app: firebase.app.App;

if (typeof window !== 'undefined' && !firebase.apps.length) {
  app = firebase.initializeApp(firebaseConfig);
  firebase.analytics();
  firebase.performance();
} else if (!firebase.apps.length) {
  app = firebase.initializeApp(firebaseConfig);
} else {
  app = firebase.app();
}

export const initFirebaseApp = () => {
  return app;
};

export const db = app.firestore();
export const auth = app.auth();
export const functions = app.functions();
export default firebase;
