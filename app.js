import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBesZPbgZcJi6QW3BPlsFYaz39BrzAMkk4",
  authDomain: "koda-planner.firebaseapp.com",
  projectId: "koda-planner",
  storageBucket: "koda-planner.firebasestorage.app",
  messagingSenderId: "968322910649",
  appId: "1:968322910649:web:2eeb39e30297bddca10e68"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const authView = document.getElementById('auth-view');
const switchView = document.getElementById('switch-view');
const appView = document.getElementById('app-view');
const displayUsername = document.getElementById('display-username');
const accountsList = document.getElementById('accounts-list');
const searchInput = document.getElementById('search-input');
const tabChecklists = document.getElementById('tab-checklists');
const tabNotes = document.getElementById('tab-notes');
const checklistSection = document.getElementById('checklist-section');
const notesSection = document.getElementById('notes-section');
const checklistContainer = document.getElementById('checklist-container');
const notesContainer = document.getElementById('notes-container');
const imageUpload = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');

// State
let currentUser = null;
let searchQuery = '';
let compressedImageBase64 = null;
let savedAccounts = JSON.parse(localStorage.getItem('koda_accounts') || '[]');

// --- Navigation ---
const showView = (view) => {
    authView.classList.add('hidden');
    switchView.classList.add('hidden');
    appView.classList.add('hidden');
    if (view === 'auth') authView.classList.remove('hidden');
    if (view === 'switch') {
        switchView.classList.remove('hidden');
        renderAccounts();
    }
    if (view === 'app') appView.classList.remove('hidden');
};

// --- Auth Logic ---
const handleLogin = async () => {
    const email = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
        saveAccount(email, pass);
    } catch (error) {
        alert(error.message);
    }
};

const handleRegister = async () => {
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    try {
        await createUserWithEmailAndPassword(auth, email, pass);
        saveAccount(email, pass);
    } catch (error) {
        alert(error.message);
    }
};

const handleLogout = async () => {
    if (currentUser) {
        savedAccounts = savedAccounts.filter(acc => acc.email !== currentUser.email);
        localStorage.setItem('koda_accounts', JSON.stringify(savedAccounts));
    }
    await signOut(auth);
};

const saveAccount = (email, pass) => {
    savedAccounts = savedAccounts.filter(acc => acc.email !== email);
    savedAccounts.unshift({ email, pass });
    localStorage.setItem('koda_accounts', JSON.stringify(savedAccounts));
};

const autoLogin = async (email, pass) => {
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        alert("Auto-login failed: " + error.message);
    }
};

// --- Image Compression Logic ---
const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000; // Limit resolution for safety
                const MAX_HEIGHT = 1000;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG with 0.6 quality (60%)
                // This usually brings a 5MB photo down to 100-300KB
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(dataUrl);
            };
        };
    });
};

// --- Data Operations ---
const fetchChecklists = async () => {
    if (!currentUser) return;
    const q = query(collection(db, "checklists"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const items = [];
    querySnapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
    renderChecklist(items);
};

const addChecklistItem = async () => {
    const title = document.getElementById('new-item-title').value.trim();
    const notes = document.getElementById('new-item-notes').value.trim();
    if (!title) return;
    await addDoc(collection(db, "checklists"), {
        userId: currentUser.uid,
        title,
        notes,
        isCompleted: false,
        createdAt: new Date().toISOString()
    });
    document.getElementById('new-item-title').value = '';
    document.getElementById('new-item-notes').value = '';
    fetchChecklists();
};

const fetchNotes = async () => {
    if (!currentUser) return;
    const q = query(collection(db, "notes"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const items = [];
    querySnapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
    renderNotes(items);
};

const addNoteItem = async () => {
    const content = document.getElementById('new-note-content').value.trim();
    if (!content && !compressedImageBase64) return;
    
    await addDoc(collection(db, "notes"), {
        userId: currentUser.uid,
        content,
        imageUrl: compressedImageBase64, // Stored directly as Base64 in Firestore
        createdAt: new Date().toISOString()
    });
    
    document.getElementById('new-note-content').value = '';
    clearImagePreview();
    fetchNotes();
};

// --- Rendering ---
const renderChecklist = (items) => {
    checklistContainer.innerHTML = '';
    const filtered = items.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filtered.length === 0) { checklistContainer.innerHTML = '<p class="message">No items found.</p>'; return; }
    
    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'checklist-item glass';
        div.innerHTML = `
            <div class="checkbox ${item.isCompleted ? 'checked' : ''}" onclick="window.toggleItem('${item.id}', ${item.isCompleted})"></div>
            <div class="item-content">
                <span class="item-title ${item.isCompleted ? 'completed' : ''}">${item.title}</span>
                ${item.notes ? `<p class="item-notes">${item.notes}</p>` : ''}
            </div>
            <button class="btn-delete" onclick="window.deleteItem('${item.id}', 'checklists')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        checklistContainer.appendChild(div);
    });
};

const renderNotes = (items) => {
    notesContainer.innerHTML = '';
    const filtered = items.filter(i => i.content.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filtered.length === 0) { notesContainer.innerHTML = '<p class="message">No notes found.</p>'; return; }

    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = 'note-item glass';
        const dateObj = new Date(item.createdAt);
        div.innerHTML = `
            ${item.imageUrl ? `<img src="${item.imageUrl}" class="note-image">` : ''}
            <div class="note-content">${item.content}</div>
            <div class="note-footer">
                <span>${dateObj.toLocaleDateString()} • ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <button class="btn-delete" onclick="window.deleteItem('${item.id}', 'notes')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        notesContainer.appendChild(div);
    });
};

const renderAccounts = () => {
    accountsList.innerHTML = '';
    savedAccounts.forEach(acc => {
        const div = document.createElement('div');
        div.className = 'account-item glass';
        div.innerHTML = `
            <div class="account-info">
                <div class="account-avatar">${acc.email[0].toUpperCase()}</div>
                <span class="account-name">${acc.email}</span>
            </div>
            <div class="account-actions">
                <button class="btn-login-small" onclick="window.switchAccount('${acc.email}', '${acc.pass}')">Login</button>
                <button class="btn-delete" onclick="window.removeAccount('${acc.email}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        accountsList.appendChild(div);
    });
};

const clearImagePreview = () => {
    compressedImageBase64 = null;
    imagePreview.src = '';
    imagePreviewContainer.classList.add('hidden');
    imageUpload.value = '';
};

// --- Window Bindings ---
window.toggleItem = async (id, current) => {
    await updateDoc(doc(db, "checklists", id), { isCompleted: !current });
    fetchChecklists();
};
window.deleteItem = async (id, col) => {
    await deleteDoc(doc(db, col, id));
    col === 'checklists' ? fetchChecklists() : fetchNotes();
};
window.switchAccount = autoLogin;
window.removeAccount = (email) => {
    savedAccounts = savedAccounts.filter(a => a.email !== email);
    localStorage.setItem('koda_accounts', JSON.stringify(savedAccounts));
    renderAccounts();
};

// --- Initialization & Event Listeners ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        displayUsername.innerText = user.email.split('@')[0];
        showView('app');
        fetchChecklists();
        fetchNotes();
    } else {
        currentUser = null;
        showView('auth');
    }
});

document.getElementById('login-btn').onclick = handleLogin;
document.getElementById('register-btn').onclick = handleRegister;
document.getElementById('logout-btn').onclick = handleLogout;
document.getElementById('switch-user-btn').onclick = () => showView('switch');
document.getElementById('add-account-btn').onclick = () => showView('auth');
document.getElementById('add-item-btn').onclick = addChecklistItem;
document.getElementById('add-note-btn').onclick = addNoteItem;

tabChecklists.onclick = () => {
    tabChecklists.classList.add('active'); tabNotes.classList.remove('active');
    checklistSection.classList.remove('hidden'); notesSection.classList.add('hidden');
};
tabNotes.onclick = () => {
    tabNotes.classList.add('active'); tabChecklists.classList.remove('active');
    notesSection.classList.remove('hidden'); checklistSection.classList.add('hidden');
};

searchInput.oninput = (e) => {
    searchQuery = e.target.value;
    fetchChecklists(); fetchNotes();
};

imageUpload.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
        compressedImageBase64 = await compressImage(file);
        imagePreview.src = compressedImageBase64;
        imagePreviewContainer.classList.remove('hidden');
    }
};
document.getElementById('remove-image-btn').onclick = clearImagePreview;

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
themeToggle.onclick = () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
};
