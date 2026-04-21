// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBesZPbgZcJi6QW3BPlsFYaz39BrzAMkk4",
  authDomain: "koda-planner.firebaseapp.com",
  projectId: "koda-planner",
  storageBucket: "koda-planner.firebasestorage.app",
  messagingSenderId: "968322910649",
  appId: "1:968322910649:web:2eeb39e30297bddca10e68"
};

// Initialize Firebase (Compat Version)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Auth State Observer
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('app-view').classList.remove('hidden');
        document.getElementById('auth-view').classList.add('hidden');
        document.getElementById('display-username').innerText = user.email.split('@')[0];
    } else {
        document.getElementById('app-view').classList.add('hidden');
        document.getElementById('auth-view').classList.remove('hidden');
    }
});

// Login Logic
document.getElementById('login-btn').onclick = function() {
    const email = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    auth.signInWithEmailAndPassword(email, pass).catch((e) => alert(e.message));
};

// Register Logic
document.getElementById('register-btn').onclick = function() {
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    auth.createUserWithEmailAndPassword(email, pass).catch((e) => alert(e.message));
};

// Logout Logic
document.getElementById('logout-btn').onclick = function() {
    auth.signOut();
};

// Toggle UI
document.getElementById('show-register').onclick = function() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
};
document.getElementById('show-login').onclick = function() {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
};
