# MemoAI — Biên bản họp thành hành động

MemoAI ghi âm hoặc nhận transcript cuộc họp, dùng Google Gemini để tạo tóm tắt điều hành, các quyết định quan trọng và danh sách đầu việc. Sản phẩm được thiết kế theo mô hình frontend cloud + backend AI tự host + Supabase.

## Trạng thái production

| Thành phần | Công nghệ | Địa chỉ đề xuất |
| --- | --- | --- |
| Frontend | Next.js 15, Vercel | `https://meeting.locaith.com` |
| Vercel mặc định | Vercel project | `https://bao-cao-ghi-am-cuoc-hop-agent.vercel.app` |
| Backend AI | FastAPI, máy Locaith | `https://meeting-api.locaith.com` |
| Backend local | Uvicorn | `http://127.0.0.1:18771` |
| Database/Auth | Supabase PostgreSQL + Google OAuth | Supabase Cloud |

> `meeting.locaith.com` phải trỏ tới Vercel. Chỉ `meeting-api.locaith.com` đi qua Cloudflare Tunnel về máy local.

## Tính năng

- Ghi âm cuộc họp trực tiếp trong trình duyệt hoặc dán transcript.
- Gemini structured output tạo tiêu đề, tóm tắt, điểm chính, đề xuất và đầu việc.
- Thư viện biên bản, tìm kiếm, trạng thái công việc và xuất PDF.
- Google OAuth qua Supabase.
- Row Level Security: mỗi người chỉ đọc/ghi dữ liệu của chính mình.
- Quota atomic theo tháng: Free 5, Pro 100, Team 500 lượt.
- Quy trình yêu cầu nâng cấp tài khoản, sẵn sàng nối PayOS/Stripe sau này.
- Backend giữ Google API key và Supabase service role; secret không nằm trong bundle Vercel.
- UTF-8 tiếng Việt, responsive desktop/mobile và accessibility cơ bản.

## Kiến trúc

```text
Người dùng
   │
   ├── meeting.locaith.com / Vercel
   │        ├── Supabase Auth
   │        └── Supabase REST/RLS ── PostgreSQL
   │
   └── meeting-api.locaith.com
            │ Cloudflare Tunnel
            ▼
       127.0.0.1:18771 / FastAPI
            ├── xác thực Supabase JWT
            ├── quota PostgreSQL atomic
            └── Google Gemini API
```

Frontend Vercel không thể gọi `127.0.0.1` trên máy chủ. Biến production `NEXT_PUBLIC_API_BASE_URL` bắt buộc phải là URL HTTPS của tunnel.

## Yêu cầu

- Node.js 20+
- Python 3.11
- Supabase project
- Google AI Studio API key
- Cloudflare Tunnel đang chạy trên máy backend
- Vercel account kết nối GitHub

## 1. Supabase

1. Tạo Supabase project.
2. Mở **SQL Editor** và chạy toàn bộ [`supabase/schema.sql`](supabase/schema.sql).
3. Vào **Authentication → Providers → Google** và bật Google provider.
4. Trong **Authentication → URL Configuration**:
   - Site URL: `https://meeting.locaith.com`
   - Redirect URLs:
     - `http://localhost:3000/**`
     - `https://bao-cao-ghi-am-cuoc-hop-agent.vercel.app/**`
     - `https://meeting.locaith.com/**`
5. Lấy Project URL, anon key và service role key trong **Project Settings → API**.

Không đưa service role key vào frontend hoặc Vercel.

## 2. Biến môi trường local

Frontend — `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18771
```

Backend — `backend/.env`:

```dotenv
GOOGLE_API_KEY=YOUR_GOOGLE_AI_STUDIO_KEY
GOOGLE_MODEL=gemini-2.5-flash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://bao-cao-ghi-am-cuoc-hop-agent.vercel.app,https://meeting.locaith.com
PORT=18771
ALLOW_DEMO_MODE=false
```

Hai file thật đã được `.gitignore`; chỉ các file `*.example` được commit.

## 3. Chạy local

Khởi tạo một lần:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\setup.ps1"
```

Mở hai PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\start-backend.ps1"
```

```powershell
npm run dev
```

Địa chỉ kiểm tra:

- Frontend: http://127.0.0.1:3000
- Backend health: http://127.0.0.1:18771/health
- OpenAPI docs: http://127.0.0.1:18771/docs

## 4. Deploy frontend lên Vercel

1. Mở `https://vercel.com/new` và import repository `locaith/bao-cao-ghi-am-cuoc-hop-agent`.
2. Framework: **Next.js**; Root Directory để mặc định; không cấu hình Output Directory.
3. Thêm ba Environment Variables cho Production, Preview và Development:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_BASE_URL=https://meeting-api.locaith.com
```

4. Deploy và ghi nhận URL `*.vercel.app` thực tế.
5. Trong Vercel **Project → Settings → Domains**, thêm `meeting.locaith.com`.
6. Tại Cloudflare DNS, tạo CNAME `meeting` theo đúng target Vercel hiển thị khi Inspect Domain. Target phổ biến hiện tại là `cname.vercel-dns-0.com`; ưu tiên giá trị Vercel cấp cho project.
7. Không thêm `meeting.locaith.com` vào file ingress tunnel.

## 5. Backend production trên máy Locaith

Production chạy từ SSD tại:

```text
C:\locaith\bao-cao-ghi-am-cuoc-hop-agent
```

Cài hoặc cập nhật checkout production:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\install-production-backend.ps1"
```

Sau lần đầu, điền secret tại:

```text
C:\locaith\bao-cao-ghi-am-cuoc-hop-agent\backend\.env
```

Backend MemoAI đã được thiết kế để watchdog chung giám sát. Lệnh tổng:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\locaith\locaith-ai-v2\backend\restart_all.ps1"
```

Lệnh này restart các backend hiện có, MemoAI `:18771` và Cloudflare Tunnel. Watchdog sẽ tự dựng lại MemoAI khi process chết.

## 6. Cloudflare Tunnel

Ingress production:

```yaml
- hostname: meeting-api.locaith.com
  service: http://127.0.0.1:18771
```

Rule phải đứng trước `*.locaith.com` vì cloudflared khớp ingress từ trên xuống.

Kiểm tra config và rule:

```powershell
cd C:\locaith\pdf_ocr_backend
.\cloudflared.exe tunnel --config .\cloudflared.convert.config.yml ingress validate
.\cloudflared.exe tunnel --config .\cloudflared.convert.config.yml ingress rule https://meeting-api.locaith.com/health
```

DNS wildcard hiện tại đã phủ `meeting-api.locaith.com`; không cần chạy thêm lệnh
`cloudflared tunnel route dns`. Nếu thay đổi zone hoặc bỏ wildcard, hãy tạo bản ghi
DNS trực tiếp trong Cloudflare Dashboard đúng zone `locaith.com`, rồi kiểm tra lại
hostname trước khi restart tunnel.

## 7. Kiểm tra trước khi release

```powershell
npm ci
npm run lint
npm run typecheck
npm run build
backend\.venv\Scripts\python.exe -m pytest backend\tests -q
.\scripts\verify-utf8.ps1
npm audit --audit-level=moderate
```

Smoke test production:

```powershell
Invoke-RestMethod https://meeting-api.locaith.com/health
Invoke-WebRequest https://meeting.locaith.com -UseBasicParsing
```

## 8. Vận hành và giới hạn

- Supabase RLS, index và quota transaction-safe là nền tảng phù hợp cho hàng nghìn tài khoản.
- Khả năng tải thực tế phụ thuộc Google API quota, Supabase plan, băng thông audio và tài nguyên máy chạy backend.
- Máy local là single point of failure; cần uptime monitor bên ngoài trước khi tăng ngân sách quảng cáo.
- Gói nâng cấp hiện tạo `upgrade_requests` để xử lý thủ công. Thu tiền tự động cần PayOS/Stripe webhook.
- Audio được gửi đến backend để phân tích và không được lưu mặc định.
- Không commit `.env`, API key, service role, file credentials Cloudflare hoặc dữ liệu cuộc họp.

## Cấu trúc chính

```text
src/app/               Next.js application
src/lib/               Supabase client, API client, types
backend/app/           FastAPI, Gemini, auth/quota gateway
backend/tests/         Backend smoke tests
supabase/schema.sql    Database schema, RLS, RPC quota/save
scripts/               Setup, verify và production installer
vercel.json            Vercel build configuration
android/               Android scaffold cũ, không tham gia web production
```

## License

Private commercial project — Locaith.
