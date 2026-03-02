# SMS Risk Analysis System

Olay/tehlike/near-miss raporları, HIRM risk analizi ve aksiyon takibi için web uygulaması.

## Gereksinimler

- Node.js 18+
- PostgreSQL 14+ (veya Docker)
- npm veya pnpm

## Kurulum

### 1. Veritabanı

Docker ile:
```bash
docker-compose up -d postgres
```

Veya yerel PostgreSQL kullanıyorsanız `risk_db` veritabanını oluşturun.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # Gerekirse düzenleyin
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Backend varsayılan olarak http://localhost:3001 adresinde çalışır.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend varsayılan olarak http://localhost:5173 adresinde çalışır.

## Demo Kullanıcılar

| Email | Şifre | Rol |
|-------|-------|-----|
| admin@sms.local | admin123 | Admin |
| safety@sms.local | admin123 | SafetyOfficer |
| reporter@sms.local | admin123 | Reporter |

## API Endpoints

- `POST /api/auth/login` - Giriş
- `GET /api/auth/me` - Mevcut kullanıcı (auth gerekli)
- `GET/POST /api/reports` - Rapor listesi / yeni rapor
- `GET/PUT /api/reports/:id` - Rapor detay / güncelleme
- `POST /api/reports/:id/status` - Durum değişikliği
- `GET /api/lookups/severity` - Severity seviyeleri
- `GET /api/lookups/likelihood` - Likelihood seviyeleri
- `GET /api/lookups/risk-calculate?severity=A&likelihood=4` - Risk hesaplama
