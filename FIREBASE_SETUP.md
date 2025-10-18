# Firebase Setup Guide for PDF Library

## 🔥 Setting Up Firebase Cloud Storage

To enable cloud storage for your PDF library, follow these steps:

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name: `pdf-library` (or any name you prefer)
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### 2. Enable Authentication

1. In your Firebase project, go to **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable **"Anonymous"** authentication
5. Click **"Save"**

### 3. Enable Firestore Database

1. Go to **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select a location close to you
5. Click **"Done"**

### 4. Enable Storage

1. Go to **"Storage"** in the left sidebar
2. Click **"Get started"**
3. Choose **"Start in test mode"**
4. Select the same location as Firestore
5. Click **"Done"**

### 5. Get Configuration

1. Go to **"Project settings"** (gear icon)
2. Scroll down to **"Your apps"**
3. Click **"Web"** icon (`</>`)
4. Enter app nickname: `PDF Library Web`
5. Click **"Register app"**
6. Copy the configuration object

### 6. Update Your Website

Replace the Firebase configuration in `index.html` with your actual config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

### 7. Security Rules (Important!)

#### Firestore Rules:
Go to **Firestore Database** → **Rules** and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /pdfs/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Storage Rules:
Go to **Storage** → **Rules** and replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /pdfs/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 Benefits of Cloud Storage

✅ **Access from anywhere**: Your PDFs are stored in the cloud  
✅ **Sync across devices**: Upload on phone, view on laptop  
✅ **No data loss**: PDFs won't disappear if you clear browser data  
✅ **Backup**: Automatic cloud backup of all your PDFs  
✅ **Share**: Easy to share PDFs with others (if needed)  

## 📱 How It Works

1. **Anonymous Authentication**: Users sign in anonymously (no account needed)
2. **Cloud Storage**: PDFs are stored in Firebase Storage
3. **Database**: PDF metadata stored in Firestore
4. **Cross-Device**: Same anonymous user ID across devices (temporary)

## 🔧 Fallback System

If Firebase fails to connect, the app automatically falls back to local browser storage, so your website will always work!

## 💡 Pro Tips

- **Free Tier**: Firebase has generous free limits for personal use
- **Security**: Anonymous auth means no personal data is stored
- **Performance**: PDFs are cached locally for faster access
- **Mobile**: Works perfectly on mobile devices

## 🆘 Troubleshooting

**"Failed to connect to cloud storage"**
- Check your Firebase configuration
- Ensure all services are enabled
- Check browser console for errors

**"Permission denied"**
- Update your Firestore and Storage rules
- Make sure anonymous auth is enabled

**"PDF not loading"**
- Check if the file was uploaded successfully
- Verify Storage rules allow read access
