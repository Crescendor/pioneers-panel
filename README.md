# Pioneers - Şirket Yönetim Paneli

Modern, mobil uyumlu şirket yönetim paneli. Vardiya, mola, raporlama ve talep yönetimi.

## 🚀 Özellikler

- **Vardiya Yönetimi**: Günlük, haftalık, aylık vardiya görünümleri
- **Mola Sistemi**: Takım bazlı timeline, çakışma kontrolü
- **Raporlama**: Kategorili raporlar, Excel export
- **Talep Sistemi**: İzin, geç kalma, erken çıkma talepleri
- **Admin Panel**: Kullanıcı, takım, vardiya yönetimi

## 🛠️ Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme modunda çalıştır
npm run dev

# Production build
npm run build
npm start
```

## 🔐 Giriş Bilgileri

**Super Admin:**
- Agent No: `pioneersADMIN`
- Şifre: `354406`

**Yeni Kullanıcılar:**
- Varsayılan şifre = Agent numarası

## 📦 Teknolojiler

- React + Vite
- Express.js
- SQLite (better-sqlite3)
- JWT Authentication

## 🚂 Railway Deploy

1. GitHub'a push et.
2. Railway'de **New Project** > **Deploy from GitHub** seçeneğini kullan.
3. **Environment Variables** (Değişkenler) kısmına şunları ekle:
   - `JWT_SECRET`: Rastgele, güvenli bir anahtar (örn: `pioneers-secret-7788`).
   - `NODE_ENV`: `production`
   - `DATABASE_PATH`: `/data/pioneers.db` (Kalıcı veri için).
4. **Volume Settings** (Cilt Ayarları):
   - Railway panelinde projenize bir **Volume** ekleyin.
   - Mount path (bağlama yolu) olarak `/data` kullanın. Bu, veritabanınızın silinmesini engeller.

## 📁 Proje Yapısı

```
├── server/           # Backend API
│   ├── routes/       # API routes
│   ├── config/       # Database config
│   └── middleware/   # Auth middleware
├── src/              # Frontend React
│   ├── pages/        # Sayfa componentleri
│   ├── components/   # UI componentleri
│   └── context/      # React context
└── public/           # Static assets
```

## 📝 Lisans

MIT License - Nothelle Pioneers
