# 📱 Migracja na Telegram - TODO

## Status: ✅ LOKALNE DZIAŁA!

Koło Fortuny aktualnie działa na **localhost:8080** z in-memory storage.

---

## 🚀 Kroki migracji na Telegrama:

### 1. **Zmień URL endpoint'u** (indeks.html)
```javascript
// ❌ TERAZ:
fetch('http://localhost:8080/spin'

// ✅ NA TELEGRAMA:
fetch('https://wheelblondii.onrender.com/spin'
//       lub twój URL gdzie hostujesz backend
```

### 2. **Włacz MongoDB** (production)
W `.env` dodaj:
```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/wheelblondii
PORT=8080
```

### 3. **Usuń in-memory storage** (opcjonalne)
Kod automatycznie użyje MongoDB jeśli `MONGO_URI` jest ustawiony.
In-memory storage jest fallback - możesz go zostawić.

### 4. **Deploy na Render.com** (lub inny host)
- Push do GitHub
- Połącz z Render.com
- Render czyta `render.yaml` (już masz!)
- Dodaj zmienną `MONGO_URI` w Render dashboard

### 5. **Testuj w Telegramie**
- `@BotFather` → Botów Web App URL
- Powinno działać bez `Fallback mode` w console

---

## 📝 Kod do zmiany:

### `indeks.html` - linia ~56
```javascript
const res = await fetch('http://localhost:8080/spin', {  // ← ZMIEŃ NA PRODUKCYJNY URL
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: tg.initDataUnsafe.user?.id })
});
```

### Fallback Mode (będzie OFF w Telegramie)
```javascript
// Gdy jesteś w Telegramie - `window.Telegram.WebApp` będzie dostępne
// Fallback będzie pominięty automatycznie
```

---

## ✅ Co już działa:

- ✅ Responsywny wheel (`clamp()`)
- ✅ Rate limiting (2s między spinami)
- ✅ Validacja prize'ów
- ✅ Logging (F12 console)
- ✅ Cache HTTP headers
- ✅ In-memory + MongoDB support

## ⚠️ Możliwe problemy:

1. **CORS** - jeśli frontend i backend na różnych domenach
   - Socket już ustawiony w `server.js` ✅

2. **Mixed content** - HTTPS frontend → HTTP backend
   - Zawsze używaj HTTPS na produkcji!

3. **Telegram UserID** - `tg.initDataUnsafe.user.id` musi być verify'owany na backendzie (security!)
   - Teraz działa bez weryfikacji (OK dla testów)

---

## 🎯 Szybki checklist:

- [ ] Zmień URL na Render/produkcję
- [ ] Odpal MongoDB Atlas (free tier OK)
- [ ] Dodaj MONGO_URI do `.env`
- [ ] Deploy na Render.com
- [ ] Testuj w Telegramie (@BotFather)
- [ ] Sprawdź console (F12) - bez fallback mode?

---

**Pytania?** Jestem gotowy zrobić migrację! 🚀
