// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBesZPbgZcJi6QW3BPlsFYaz39BrzAMkk4",
  authDomain: "koda-planner.firebaseapp.com",
  projectId: "koda-planner",
  storageBucket: "koda-planner.firebasestorage.app",
  messagingSenderId: "968322910649",
  appId: "1:968322910649:web:2eeb39e30297bddca10e68"
};

// Initialize
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// State
let currentUser = null;
let searchQuery = '';
let compressedImageBase64 = null;

// Auth State Observer
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('app-view').classList.remove('hidden');
        document.getElementById('auth-view').classList.add('hidden');
        document.getElementById('display-username').innerText = user.email.split('@')[0];
        fetchChecklists();
        fetchNotes();
    } else {
        currentUser = null;
        document.getElementById('app-view').classList.add('hidden');
        document.getElementById('auth-view').classList.remove('hidden');
    }
});

// Image Compressor
const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1000;
                let width = img.width, height = img.height;
                if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
                else { if (height > MAX_WIDTH) { width *= MAX_WIDTH / height; height = MAX_WIDTH; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
};

// Data Operations
async function fetchChecklists() {
    if (!currentUser) return;
    const snap = await db.collection('checklists').where('userId', '==', currentUser.uid).orderBy('createdAt', 'desc').get();
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderChecklist(items);
}

async function fetchNotes() {
    if (!currentUser) return;
    const snap = await db.collection('notes').where('userId', '==', currentUser.uid).orderBy('createdAt', 'desc').get();
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderNotes(items);
}

// Event Listeners
document.getElementById('add-item-btn').onclick = async () => {
    const title = document.getElementById('new-item-title').value.trim();
    const notes = document.getElementById('new-item-notes').value.trim();
    if (!title) return;
    await db.collection('checklists').add({ userId: currentUser.uid, title, notes, isCompleted: false, createdAt: new Date().toISOString() });
    document.getElementById('new-item-title').value = '';
    document.getElementById('new-item-notes').value = '';
    fetchChecklists();
};

document.getElementById('add-note-btn').onclick = async () => {
    const content = document.getElementById('new-note-content').value.trim();
    if (!content && !compressedImageBase64) return;
    await db.collection('notes').add({ userId: currentUser.uid, content, imageUrl: compressedImageBase64, createdAt: new Date().toISOString() });
    document.getElementById('new-note-content').value = '';
    compressedImageBase64 = null;
    document.getElementById('image-preview-container').classList.add('hidden');
    fetchNotes();
};

// UI Functions
function renderChecklist(items) {
    const container = document.getElementById('checklist-container');
    container.innerHTML = '';
    items.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase())).forEach(item => {
        const div = document.createElement('div');
        div.className = 'checklist-item glass';
        div.innerHTML = `<div class="checkbox ${item.isCompleted ? 'checked' : ''}" onclick="toggleItem('${item.id}', ${item.isCompleted})"></div><div class="item-content"><span class="item-title ${item.isCompleted ? 'completed' : ''}">${item.title}</span>${item.notes ? `<p class="item-notes">${item.notes}</p>` : ''}</div><button class="btn-delete" onclick="deleteItem('${item.id}', 'checklists')">🗑️</button>`;
        container.appendChild(div);
    });
}

function renderNotes(items) {
    const container = document.getElementById('notes-container');
    container.innerHTML = '';
    items.filter(i => i.content.toLowerCase().includes(searchQuery.toLowerCase())).forEach(item => {
        const div = document.createElement('div');
        div.className = 'note-item glass';
        div.innerHTML = `${item.imageUrl ? `<img src="${item.imageUrl}" class="note-image">` : ''}<div class="note-content">${item.content}</div><div class="note-footer"><span>${new Date(item.createdAt).toLocaleString()}</span><button class="btn-delete" onclick="deleteItem('${item.id}', 'notes')">🗑️</button></div>`;
        container.appendChild(div);
    });
}

// Window Bindings for HTML onclicks
window.toggleItem = async (id, cur) => { await db.collection('checklists').doc(id).update({ isCompleted: !cur }); fetchChecklists(); };
window.deleteItem = async (id, col) => { await db.collection(col).doc(id).delete(); col === 'checklists' ? fetchChecklists() : fetchNotes(); };

// Tabs & Search & Theme
document.getElementById('tab-checklists').onclick = () => { document.getElementById('checklist-section').classList.remove('hidden'); document.getElementById('notes-section').classList.add('hidden'); document.getElementById('tab-checklists').classList.add('active'); document.getElementById('tab-notes').classList.remove('active'); };
document.getElementById('tab-notes').onclick = () => { document.getElementById('notes-section').classList.remove('hidden'); document.getElementById('checklist-section').classList.add('hidden'); document.getElementById('tab-notes').classList.add('active'); document.getElementById('tab-checklists').classList.remove('active'); };
document.getElementById('search-input').oninput = (e) => { searchQuery = e.target.value; fetchChecklists(); fetchNotes(); };
document.getElementById('image-upload').onchange = async (e) => { if (e.target.files[0]) { compressedImageBase64 = await compressImage(e.target.files[0]); document.getElementById('image-preview').src = compressedImageBase64; document.getElementById('image-preview-container').classList.remove('hidden'); } };
document.getElementById('remove-image-btn').onclick = () => { compressedImageBase64 = null; document.getElementById('image-preview-container').classList.add('hidden'); };

// Login/Reg Toggles
document.getElementById('login-btn').onclick = () => auth.signInWithEmailAndPassword(document.getElementById('login-username').value, document.getElementById('login-password').value).catch(e => alert(e.message));
document.getElementById('register-btn').onclick = () => auth.createUserWithEmailAndPassword(document.getElementById('reg-email').value, document.getElementById('reg-password').value).catch(e => alert(e.message));
document.getElementById('logout-btn').onclick = () => auth.signOut();
document.getElementById('show-register').onclick = () => { document.getElementById('login-form').classList.add('hidden'); document.getElementById('register-form').classList.remove('hidden'); };
document.getElementById('show-login').onclick = () => { document.getElementById('register-form').classList.add('hidden'); document.getElementById('login-form').classList.remove('hidden'); };

const themeToggle = document.getElementById('theme-toggle');
if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
themeToggle.onclick = () => { document.body.classList.toggle('light-mode'); localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark'); };
