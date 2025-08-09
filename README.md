# Anılar Bulutta – GitHub Pages Template (anilar-50b86)

Bu repo, GitHub Pages üzerinde çalışan **upload-only** düğün albümüdür.

## 0) Firebase’de ilk kurulum
- **Authentication → Sign-in method → Anonymous = Enable**
- **Storage → Get started → Enable**
- **Firestore → Create database (Production)**
- **(App Check)**: KAPALI bırak. (Açıksa, reCAPTCHA v3 + debug token gerekir.)

## 1) Kurallar (admin okur, misafir yükler)
**Storage Rules**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /events/{eventCode}/{fileId} {
      allow read: if request.auth != null && request.auth.token.email == "merttrem174@gmail.com";
      allow write: if request.auth != null
        && (request.resource.contentType.matches('image/.*') || request.resource.contentType.matches('video/.*'));
    }
  }
}
```

**Firestore Rules**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /media/{docId} {
      allow read: if request.auth != null && request.auth.token.email == "merttrem174@gmail.com";
      allow create: if request.auth != null
        && request.resource.data.eventCode is string
        && request.resource.data.type in ['image','video']
        && request.resource.data.path is string
        && request.resource.data.createdAt != null;
    }
  }
}
```

## 2) script.js içeriği
- `script.js` dosyası bu repoda var ve bucket **gs://anilar-50b86.appspot.com** olarak sabit.  
- Etkinlik kodu: **MERT-MEMNUNE-2025**.

## 3) GitHub Pages’e yayınlama
- Bu klasörü yeni bir repo olarak yükle:
  ```bash
  git init
  git add .
  git commit -m "anilar bulutta init"
  git branch -M main
  git remote add origin https://github.com/<kullanici-adi>/<repo-adi>.git
  git push -u origin main
  ```
- Repo’da **Settings → Pages** → **Branch: main** / **Folder: /** → **Save**.  
- 30–120 sn içinde site yayında olur: `https://<kullanici-adi>.github.io/<repo-adi>/`

## 4) API Key güvenliği (önerilir)
- GCP Console → **APIs & Services → Credentials → Web API Key**  
- **Application restrictions**: **HTTP referrers (web sites)** →
  - `http://localhost:*`
  - `http://127.0.0.1:*`
  - `https://*.github.io/*` (ve kendi domainin belli olunca spesifik domain)
- **API restrictions**: **Identity Toolkit API**, **Firebase Installations API** ile sınırla.

## 5) Test
1) Sayfayı aç → “🧪 Hızlı Test (1KB)” butonuna bas: Storage’a `debug-*.txt` düşmeli.  
2) Küçük bir foto yükle. Yükleme ilerlemesi görünüp “Tamamlandı” mesajını vermeli.  
3) Dosyalar **Firebase Console → Storage → Files** altında `events/MERT-MEMNUNE-2025/…` dizinine düşer.
