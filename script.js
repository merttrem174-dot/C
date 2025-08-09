// === App Check DEBUG Helper + Uploader ===
// 1) Open the page with this script. Look in DevTools Console.
// 2) Copy the printed DEBUG TOKEN and add it in Firebase Console → App Check → Web app → Debug tokens → Add → Save
// 3) Replace true below with the copied token string and keep this script (or move the token into your main script).
// 4) Ensure reCAPTCHA v3 is enabled for your Web app in App Check; copy the Site Key below.

// Step A: show debug token in console on first load
self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

// === Your Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyD1W9RlNSjsUzCmfu4AiBWjTQScvxFa7_w",
  authDomain: "anilar-50b86.firebaseapp.com",
  projectId: "anilar-50b86",
  storageBucket: "anilar-50b86.appspot.com",
  messagingSenderId: "152365816749",
  appId: "1:152365816749:web:d9c9b4b646e9e580cb5f24"
};
const EVENT_CODE = "MERT-MEMNUNE-2025";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app-check.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getStorage, ref, uploadBytesResumable, uploadBytes } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";
import { getFirestore, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const app = initializeApp(firebaseConfig);

// TODO: Paste your reCAPTCHA v3 Site Key below after enabling in App Check (Web)
const RECAPTCHA_V3_SITE_KEY = "PASTE_YOUR_RECAPTCHA_V3_SITE_KEY_HERE";

// Initialize App Check (debug mode prints a token in the console on first load)
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(RECAPTCHA_V3_SITE_KEY),
  isTokenAutoRefreshEnabled: true
});

const auth = getAuth(app);
// Force bucket
const storage = getStorage(app, "gs://anilar-50b86.appspot.com");
const db = getFirestore(app);

console.log("[INIT] Using bucket:", "gs://anilar-50b86.appspot.com");

const $ = (id)=>document.getElementById(id);
const statusEl = $("status");
const progressEl = $("progress");

onAuthStateChanged(auth, user => {
  if (user) console.log("[AUTH] Anonymous uid:", user.uid);
});
signInAnonymously(auth).catch(err => {
  console.error("[AUTH ERROR]", err.code, err.message);
  if (statusEl) statusEl.textContent = "Giriş hatası: " + err.message;
});

(function ensureDebugButton(){
  if (!document.getElementById("debugTest")) {
    const btn = document.createElement("button");
    btn.id = "debugTest";
    btn.textContent = "🧪 Hızlı Test (1KB)";
    btn.style.marginLeft = "8px";
    const row = document.querySelector(".row") || document.body;
    row.appendChild(btn);
    btn.addEventListener("click", testTinyUpload);
  }
})();

document.getElementById("uploadBtn").addEventListener("click", async () => {
  const files = document.getElementById("file").files;
  if (!files || files.length === 0) { if (statusEl) statusEl.textContent = "Lütfen dosya seçin."; return; }
  for (const file of files) { await uploadOne(file); }
});

async function testTinyUpload(){
  try {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const id = Math.random().toString(36).slice(2);
    const path = `events/${EVENT_CODE}/debug-${id}.txt`;
    const storageRef = ref(storage, path);
    console.log("[TEST] uploadBytes start →", path);
    await uploadBytes(storageRef, blob);
    console.log("[TEST] uploadBytes DONE");
    if (statusEl) statusEl.textContent = "Hızlı test OK (debug txt yüklendi). Storage çalışıyor.";
  } catch (e) {
    console.error("[TEST ERROR]", e.code || "", e.message);
    if (statusEl) statusEl.textContent = "Hızlı test hatası: " + (e.code || e.message);
  }
}

async function uploadOne(file) {
  const MAX = 200 * 1024 * 1024;
  if (file.size > MAX) { if (statusEl) statusEl.textContent = "Dosya çok büyük (200 MB sınırı)."; return; }

  const id = Math.random().toString(36).slice(2);
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `events/${EVENT_CODE}/${id}.${ext}`;

  let resolved = false;
  try {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

    if (progressEl) { progressEl.hidden = false; progressEl.value = 0; }
    if (statusEl) statusEl.textContent = `Yükleniyor: ${file.name}`;

    const guard = setTimeout(() => {
      if (!resolved) {
        console.warn("[GUARD] Upload seems stuck >60s. Check App Check/Rules/Network.");
        if (statusEl) statusEl.textContent = "Yükleme 60sn'dir ilerlemiyor. App Check/kurallar kontrol edin.";
      }
    }, 60000);

    await new Promise((resolve, reject) => {
      task.on("state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          if (progressEl) progressEl.value = pct;
          if (statusEl) statusEl.textContent = `Yükleniyor: ${file.name} (%${pct})`;
          console.log("[UPLOAD]", pct + "%", snap.state, snap.bytesTransferred, "/", snap.totalBytes);
        },
        (error) => {
          console.error("[UPLOAD ERROR]", error.code, error.message);
          if (statusEl) statusEl.textContent = "Yükleme hatası: " + error.code;
          if (progressEl) progressEl.hidden = true;
          clearTimeout(guard);
          reject(error);
        },
        () => {
          resolved = true;
          clearTimeout(guard);
          console.log("[UPLOAD] Completed:", path);
          resolve();
        }
      );
    });

  } catch (err) {
    console.error("[STORAGE TRY/CATCH ERROR]", err);
    if (statusEl) statusEl.textContent = "Yükleme sırasında beklenmeyen hata: " + err.message;
    if (progressEl) progressEl.hidden = true;
    return;
  }

  try {
    console.log("[FIRESTORE] addDoc start → media");
    await addDoc(collection(db, "media"), {
      eventCode: EVENT_CODE,
      type: file.type.startsWith("video") ? "video" : "image",
      path,
      createdAt: serverTimestamp()
    });
    console.log("[FIRESTORE] addDoc DONE");
    if (statusEl) statusEl.textContent = `Tamamlandı: ${file.name}`;
  } catch (err) {
    console.error("[FIRESTORE ERROR]", err.code || "", err.message);
    if (statusEl) statusEl.textContent = "Meta kaydetme hatası: " + (err.code || err.message);
  } finally {
    setTimeout(() => { if (progressEl) progressEl.hidden = true; }, 600);
  }
}
