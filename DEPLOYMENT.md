# Vercel + Supabase Deployment Rehberi

Bu proje **frontend** ve **backend** ayrı deploy edilir. Supabase veritabanı, Vercel frontend, backend için Railway kullanılır (ücretsiz).

---

## 1. Supabase Kurulumu

### 1.1 Proje oluştur
1. [supabase.com](https://supabase.com) → Sign up / Login
2. **New Project** → Organization seç → Proje adı: `risk-sms`
3. Database password belirle (kaydet)
4. Region seç (örn. Frankfurt)
5. **Create project** (2-3 dk sürer)

### 1.2 Bağlantı bilgisi al
1. Supabase Dashboard → **Project Settings** (sol alt) → **Database**
2. **Connection string** → **URI** seç
3. **Transaction** (pooler, port 6543) veya **Session** (direct, port 5432) kopyala
4. `[YOUR-PASSWORD]` kısmını proje oluştururken belirlediğin şifreyle değiştir

**Transaction pooler (uygulama / Railway için `DATABASE_URL`):**
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Doğrudan bağlantı (`DIRECT_URL`, Prisma migrate için zorunlu):**  
Supabase → **Project Settings** → **Database** → **Connection string** → **URI**, host `db.[PROJECT-REF].supabase.co`, port **5432** (Session / direct).  
`.env` ve Railway’de hem `DATABASE_URL` (pooler) hem `DIRECT_URL` (5432) tanımlı olmalı. Yerel PostgreSQL kullanıyorsan `DIRECT_URL`’i `DATABASE_URL` ile **aynı** yap.

**Not:** `npx prisma migrate deploy` pooler üzerinde takılabilir; mutlaka `DIRECT_URL` (5432) kullanılır (`schema.prisma` içinde tanımlı).

### 1.3 Bilgisayarımdan migrate olmuyor (IPv6 / 5432)

Kendi PC’nizden Supabase **direct** host’a bağlanamıyorsanız migration’ı **GitHub Actions** ile çalıştırın (`.github/workflows/prisma-migrate-supabase.yml`):

1. Bu repoyu GitHub’a push edin.
2. Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Name: `SUPABASE_PRISMA_URL`
   - Value: Önce Supabase **Direct** URI (port **5432**), sonuna `?sslmode=require`.  
     **GitHub Actions’ta `P1001` / Can’t reach database** alırsanız aynı secret’ı **Session pooler** bağlantısı ile değiştirin (Supabase → Database → *Session pooler*, host `aws-*.pooler.supabase.com`, port **5432**; kullanıcı adı genelde `postgres.[PROJECT-REF]`). Bu adres IPv4 üzerinden çalışır.
3. **Actions** → **Prisma migrate (Supabase)** → **Run workflow** → **Run workflow**.

---

## 2. Backend (Railway) Deploy

Express backend’i Railway’de çalıştır. Supabase PostgreSQL kullanır.

### 2.1 Railway hesabı
1. [railway.app](https://railway.app) → GitHub ile giriş
2. **New Project** → **Deploy from GitHub repo**
3. Repo’yu bağla (risk projesi)

### 2.2 Backend deploy ayarları
1. **Add Service** → **GitHub Repo** → `risk` seç
2. **Root Directory:** `backend` (zorunlu)
3. **Build Command:** `npm install && npm run build` (package.json build = prisma generate + tsc)
4. **Start Command:** `node dist/index.js`
5. **Target Port:** Railway otomatik algılar (genelde 3000 veya 8080)
5. **Environment Variables** ekle:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Supabase **pooler** (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase **direct** (port 5432, host `db.*.supabase.co`) — migrate için |
| `JWT_SECRET` | Güçlü rastgele string (örn. `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://your-app.vercel.app` (Vercel URL’i, sonra güncelle) |
| `NODE_ENV` | `production` |

### 2.3 Prisma migration
Railway’de `startCommand` artık `npx prisma migrate deploy && node dist/index.js` (bkz. `railway.json`); her deploy’da migration uygulanır. **Railway’de `DIRECT_URL` (5432) tanımlı olmalı.**

Lokalden (`.env` içinde `DATABASE_URL` + `DIRECT_URL`):

```bash
cd backend
npx prisma migrate deploy
```

**Sadece pooler URL’in varsa:** `migrate deploy` takılabilir — Supabase’den **Direct connection** (port 5432) kopyalayıp `DIRECT_URL` olarak ekle.

### 2.4 Seed (ilk veri)
```bash
DATABASE_URL="supabase-url" npm run db:seed
```

### 2.5 Railway URL
Deploy sonrası **Settings** → **Networking** → **Generate Domain** → URL’i kopyala (örn. `https://risk-backend-xxx.up.railway.app`)

---

## 3. Frontend (Vercel) Deploy

### 3.1 Vercel hesabı
1. [vercel.com](https://vercel.com) → GitHub ile giriş
2. **Add New** → **Project**
3. Repo seç

### 3.2 Proje ayarları
1. **Root Directory:** `frontend`
2. **Framework Preset:** Vite
3. **Build Command:** `npm run build` (varsayılan)
4. **Output Directory:** `dist` (varsayılan)
5. **Environment Variables** ekle:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://risk-backend-xxx.up.railway.app/api` |

### 3.3 Deploy
**Deploy** tıkla. Birkaç dakika sonra `https://risk-xxx.vercel.app` gibi bir URL alırsın.

---

## 4. Son Ayarlar

### 4.1 CORS güncelle
Railway backend’de `CORS_ORIGIN` değişkenini Vercel URL’inle güncelle:
```
CORS_ORIGIN=https://risk-xxx.vercel.app
```

### 4.2 Supabase Storage (opsiyonel – dosya yükleme)
Dosya yükleme şu an backend’de `./uploads` kullanıyor. Railway’de bu kalıcı değildir. İleride:
- Supabase Storage kullanılabilir
- Veya upload’ları geçici devre dışı bırakılabilir

---

## Özet

| Servis | Platform | Ücretsiz limit |
|--------|----------|----------------|
| Veritabanı | Supabase | 500 MB, 2 proje |
| Backend | Railway | $5 kredi/ay (yaklaşık 500 saat) |
| Frontend | Vercel | 100 GB bandwidth, sınırsız proje |

---

## Alternatif: Backend için Render.com

Railway sorun yaşarsan [render.com](https://render.com) kullan:

1. **New** → **Web Service** → Repo bağla
2. **Root Directory:** `backend`
3. **Build:** `npm install && npm run build`
4. **Start:** `node dist/index.js`
5. **Environment:** DATABASE_URL, JWT_SECRET, NODE_ENV=production
6. Deploy sonrası URL'i Vercel'de `VITE_API_URL` olarak ayarla

---

## Alternatif: Sadece Vercel (Backend Serverless)

Backend’i Vercel Serverless Functions’a taşımak daha fazla kod değişikliği gerektirir. Yukarıdaki Railway yöntemi daha az işle çalışır.
