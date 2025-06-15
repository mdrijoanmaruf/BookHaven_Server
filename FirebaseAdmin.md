## Fetch All User Data From Firebase

### 1️⃣ **Install Firebase Admin**

```bash
npm install firebase-admin
```

---

### 2️⃣ **At the top of your backend file**

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./firebaseServiceAccount.json'); // your service account file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

---

### 3️⃣ **Add this simple route**

```javascript
app.get('/api/users', async (req, res) => {
  const result = await admin.auth().listUsers(1000);
  const users = result.users.map(u => ({
    uid: u.uid,
    email: u.email,
    displayName: u.displayName
  }));
  res.send(users);
});
```

---

## 💻 **React fetch**

```javascript
useEffect(() => {
  fetch('http://localhost:5000/api/users')
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.error(err));
}, []);
```

