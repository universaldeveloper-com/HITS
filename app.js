import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// 🔴 REPLACE THIS WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
apiKey: "AIzaSyCHWu-s-crmNm56ZiybaY2m6cw8EwGSYw4",
authDomain: "collage-social-app.firebaseapp.com",
projectId: "collage-social-app",
storageBucket: "collage-social-app.firebasestorage.app",
messagingSenderId: "881595097403",
appId: "1:881595097403:web:c31202b24643109168d71e",
measurementId: "G-4FWQ1YRCTL"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ==========================================
// 🔴 ADMIN & MODERATION CONFIGURATION
// ==========================================
const ADMIN_EMAIL = "cryptomail769@gmail.com"; 
const ILLUMINATI_PASSWORD = "3697"; 

// ADD ALL THE WORDS YOU WANT TO BAN IN THIS LIST:
const BANNED_WORDS = [
    "badword1", 
    "badword2", 
    "hate", 
    "stupid", 
    "idiot"
];

// Profanity Filter Function
function filterProfanity(text) {
    if (!text) return text;
    // Creates a case-insensitive regex for exact words in the banned list
    const regex = new RegExp('\\b(' + BANNED_WORDS.join('|') + ')\\b', 'gi');
    return text.replace(regex, '🚫[BANNED]');
}
// ==========================================

let currentUser = null;
let isAdmin = false;
let currentTab = 'posts'; 
let isIlluminatiUnlocked = false;

// DOM Elements
const screens = {
    auth: document.getElementById('auth-screen'),
    welcome: document.getElementById('welcome-screen'),
    main: document.getElementById('main-app')
};
const tcModal = document.getElementById('tc-modal');
const passcodeModal = document.getElementById('passcode-modal');
const createModal = document.getElementById('create-modal');
const feedContainer = document.getElementById('feed-container');
const profileContainer = document.getElementById('profile-container');
const fabCreate = document.getElementById('fab-create');

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// 1. AUTHENTICATION
document.getElementById('login-btn').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Login Failed: " + err.message));
});

document.getElementById('signup-btn').addEventListener('click', () => {
    const email = document.getElementById('email-input').value;
    const pass = document.getElementById('password-input').value;
    createUserWithEmailAndPassword(auth, email, pass).catch(err => alert("Signup Failed: " + err.message));
});

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth);
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        isAdmin = (user.email === ADMIN_EMAIL);
        
        // Setup Profile Page
        document.getElementById('profile-name').innerText = isAdmin ? "Administrator" : user.email.split('@')[0];
        document.getElementById('profile-email').innerText = user.email;
        if(isAdmin) document.getElementById('admin-badge-profile').classList.remove('hidden');

        showScreen('welcome');
    } else {
        currentUser = null;
        isAdmin = false;
        showScreen('auth');
    }
});

// 2. WELCOME FLOW
document.getElementById('get-started-btn').addEventListener('click', () => {
    tcModal.style.display = 'flex';
});

document.getElementById('accept-tc-btn').addEventListener('click', () => {
    tcModal.style.display = 'none';
    showScreen('main');
    loadFeed();
});

// 3. NAVIGATION (TABS)
const tabTitles = { posts: "Feed", confessions: "Chat", library: "Library", illuminati: "Illuminati", profile: "Profile" };

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const selectedTab = e.currentTarget.getAttribute('data-tab');

        if (selectedTab === 'illuminati' && !isIlluminatiUnlocked) {
            passcodeModal.style.display = 'flex';
            return;
        }

        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentTab = selectedTab;
        
        document.getElementById('header-title').innerText = tabTitles[selectedTab];

        if (selectedTab === 'profile') {
            feedContainer.classList.add('hidden');
            profileContainer.classList.remove('hidden');
            fabCreate.classList.add('hidden');
        } else {
            profileContainer.classList.add('hidden');
            feedContainer.classList.remove('hidden');
            
            if (selectedTab === 'library' && !isAdmin) fabCreate.classList.add('hidden');
            else fabCreate.classList.remove('hidden');

            loadFeed();
        }
    });
});

// Passcode Logic
document.getElementById('submit-passcode').addEventListener('click', () => {
    const input = document.getElementById('secret-pass-input').value;
    if (input === ILLUMINATI_PASSWORD) {
        isIlluminatiUnlocked = true;
        passcodeModal.style.display = 'none';
        document.querySelector('[data-tab="illuminati"]').click();
    } else {
        alert("Incorrect Passcode.");
    }
});
document.getElementById('cancel-passcode').addEventListener('click', () => passcodeModal.style.display = 'none');

// 4. CREATE MODAL
fabCreate.addEventListener('click', () => {
    createModal.style.display = 'flex';
    document.getElementById('post-content').value = '';
    document.getElementById('image-upload').value = '';

    const stdInputs = document.getElementById('standard-inputs');
    const libInputs = document.getElementById('library-inputs');
    const adminUpload = document.getElementById('admin-media-upload');
    const anonOptions = document.getElementById('confession-options');

    if (currentTab === 'library') {
        document.getElementById('create-type-text').innerText = "Resource";
        stdInputs.classList.add('hidden');
        libInputs.classList.remove('hidden');
    } else {
        document.getElementById('create-type-text').innerText = currentTab === 'posts' ? "Post" : currentTab === 'illuminati' ? "Secret" : "Confession";
        libInputs.classList.add('hidden');
        stdInputs.classList.remove('hidden');
        
        if (isAdmin && (currentTab === 'posts' || currentTab === 'illuminati')) adminUpload.classList.remove('hidden');
        else adminUpload.classList.add('hidden');

        if (currentTab === 'confessions') anonOptions.classList.remove('hidden');
        else anonOptions.classList.add('hidden');
    }
});

document.getElementById('cancel-create').addEventListener('click', () => createModal.style.display = 'none');

document.getElementById('submit-post').addEventListener('click', async () => {
    const btn = document.getElementById('submit-post');
    btn.innerText = "Posting...";

    try {
        if (currentTab === 'library') {
            const title = filterProfanity(document.getElementById('lib-title').value);
            const url = document.getElementById('lib-url').value;
            if (!title || !url) return alert("Fill all fields!");
            await addDoc(collection(db, 'library'), { title, url, timestamp: serverTimestamp() });
        } else {
            // Apply Profanity Filter to Content
            const rawContent = document.getElementById('post-content').value;
            const content = filterProfanity(rawContent); 

            const isAnon = document.getElementById('anon-checkbox').checked;
            const fileInput = document.getElementById('image-upload');
            
            if (!content.trim() && fileInput.files.length === 0) return alert("Write something!");

            let imageUrl = null;
            if (isAdmin && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const storageRef = ref(storage, `media/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                imageUrl = await getDownloadURL(storageRef);
            }

            let authorName = currentUser.email.split('@')[0];
            if (currentTab === 'confessions' && isAnon) authorName = "Anonymous";
            if (isAdmin && !isAnon) authorName = "Admin"; 

            await addDoc(collection(db, 'posts'), {
                type: currentTab,
                content: content,
                imageUrl: imageUrl,
                authorId: currentUser.uid,
                authorName: authorName,
                likes: [],
                timestamp: serverTimestamp()
            });
        }
        createModal.style.display = 'none';
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        btn.innerText = "Post";
    }
});

// 5. LOAD FEED
function loadFeed() {
    feedContainer.innerHTML = '';
    
    if (currentTab === 'library') {
        const q = query(collection(db, "library"), orderBy("timestamp", "desc"));
        onSnapshot(q, (snapshot) => {
            feedContainer.innerHTML = '';
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                feedContainer.innerHTML += `
                    <div class="post-card">
                        <div class="post-header"><span class="post-author"><ion-icon name="document-text"></ion-icon> Library Resource</span></div>
                        <div class="post-content">${data.title}</div>
                        <div class="post-actions" style="margin-top: 10px;">
                            <a href="${data.url}" target="_blank" class="action-btn" style="color:var(--ios-blue);"><ion-icon name="open-outline"></ion-icon> Open Link</a>
                            ${isAdmin ? `<button class="action-btn delete-btn" onclick="window.deleteDocItem('library', '${docSnap.id}')"><ion-icon name="trash"></ion-icon></button>` : ''}
                        </div>
                    </div>
                `;
            });
        });
    } else {
        const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
        onSnapshot(q, (snapshot) => {
            feedContainer.innerHTML = '';
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.type !== currentTab) return;

                const isLiked = data.likes && data.likes.includes(currentUser.uid);
                const canDelete = isAdmin || currentUser.uid === data.authorId;
                const isAdminPost = data.authorName === "Admin";

                // Admin Special Badge HTML
                const authorHTML = isAdminPost 
                    ? `<span class="post-author"><span class="admin-badge-ui"><ion-icon name="shield-checkmark"></ion-icon> ADMIN</span></span>` 
                    : `<span class="post-author">${data.authorName}</span>`;

                let html = `
                    <div class="post-card ${isAdminPost ? 'admin-post' : ''}">
                        <div class="post-header">${authorHTML}</div>
                        <div class="post-content">${data.content}</div>
                        ${data.imageUrl ? `<img src="${data.imageUrl}" class="post-image">` : ''}
                        <div class="post-actions">
                            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="window.toggleLike('${docSnap.id}', ${isLiked})">
                                <ion-icon name="${isLiked ? 'heart' : 'heart-outline'}"></ion-icon> ${data.likes ? data.likes.length : 0}
                            </button>
                            ${canDelete ? `<button class="action-btn delete-btn" onclick="window.deleteDocItem('posts', '${docSnap.id}')"><ion-icon name="trash-outline"></ion-icon></button>` : ''}
                        </div>
                    </div>
                `;
                feedContainer.innerHTML += html;
            });
        });
    }
}

// 6. GLOBAL FUNCTIONS
window.toggleLike = async (docId, isLiked) => {
    const postRef = doc(db, 'posts', docId);
    if (isLiked) await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
    else await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
};

window.deleteDocItem = async (collectionName, docId) => {
    if (confirm("Are you sure you want to delete this?")) {
        await deleteDoc(doc(db, collectionName, docId));
    }
};
