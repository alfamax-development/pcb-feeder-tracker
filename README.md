# PCB Feeder Takip – Hızlı Komutlar

```bash
cd ~/pcb-feeder-tracker
docker compose up -d --build app db      # app + db başlat (build dahil)
docker compose exec app npx prisma migrate deploy # gerekiyorsa
docker compose exec app npx prisma db seed   # gerekiyorsa
# Kod değiştiyse yeniden deploy: docker compose up -d --build app
# Durdur: docker compose down
# Loglar: docker compose logs -f app
```

# Detaylı Bilgi
# PCB Feeder Takip – Kurulum ve Kullanım

Basit arayüzlü bir Next.js (App Router) uygulaması; Prisma/PostgreSQL, JWT kimlik doğrulama ve Tailwind kullanır.

## Gereksinimler
- Docker + Docker Compose
- Node.js 20+ ve npm

## Ortam değişkenleri (`.env`)
Kök klasörde `.env` dosyasında olması gerekenler:
```
DATABASE_URL="postgresql://dev:devpass@localhost:5433/feederdb?schema=public"
JWT_SECRET="local-dev-secret-change-if-needed"
JWT_EXPIRES_IN="30m"
```
Portu değiştirirsen hem `DATABASE_URL` hem `docker-compose.yml` içindeki `ports` satırını uyumlu yap.

## İlk kurulum
```bash
# proje klasöründe
docker compose up -d db              # Postgres 5433->5432 yayında
npx prisma migrate dev               # şema
npx prisma db seed                   # örnek kullanıcı ve feeder tipleri
npm install                          # bağımlılıklar (ilk sefer)
```

## Geliştirme sunucusunu çalıştırma
LAN’dan erişim için 0.0.0.0/3000’de dinlet:
```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```
Tarayıcı: `http://<sunucu-ip>:3000`

VS Code/terminal kapanırsa yukarıdaki adımları tekrar terminal açıp çalıştırman yeterli (gerekirse `docker compose up -d db`).

## Docker ile arka planda çalıştırma
```bash
# app + db'yi build ve başlat
docker compose up -d --build app db
# migrasyon
docker compose exec app npx prisma migrate deploy
# seed (gerekirse)
docker compose exec app npx prisma db seed
```
Kodu değiştirdikten sonra güncellemek için: `docker compose up -d --build app`
Dur-dur/başlat: `docker compose down` ve tekrar `docker compose up -d --build app db`
Loglar: `docker compose logs -f app`

## Giriş bilgileri (seed)
- admin / admin123 (ADMIN)
- op / operator123 (OPERATOR)

## Notlar
- Tüm kritik işlemler (login, logout, feeder tak/çıkar, stok ekle, makine/kullanıcı CRUD) audit tablosuna kaydedilir; loglar sadece admin görür.
- Feeder stokları, “boşta” olanlar (machineId null) ve makinelere takılı olanlar olarak listelenir.
