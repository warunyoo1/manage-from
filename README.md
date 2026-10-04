# Manage From

โครงเริ่มต้น Next.js App Router + TypeScript + Tailwind CSS โดยใช้ไฟล์ `nextjs-fullstack-vercel-free.md` เป็นแนวทางด้านสถาปัตยกรรม ส่วนฟีเจอร์จริงรอรายละเอียดของระบบจากเจ้าของโปรเจกต์

## เริ่มใช้งาน

ใช้ Node.js 20.9 ขึ้นไป

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

## โครงสร้าง

```text
app/                  หน้าเว็บและ API ในโปรเจกต์เดียวกัน
  api/health/         GET /api/health สำหรับตรวจว่าแอปตอบสนอง
components/ui/        ส่วนประกอบหน้าจอที่ใช้ซ้ำ
lib/db.ts             ตัวเชื่อมต่อ MongoDB พร้อม cache และ retry เมื่อเชื่อมต่อล้มเหลว
lib/validations/      พื้นที่สำหรับตรวจสอบข้อมูลก่อนใช้งาน
models/               พื้นที่สำหรับ Mongoose models
services/             พื้นที่สำหรับ business logic
types/                ชนิดข้อมูลร่วมกัน
```

หน้าเริ่มต้นและ `/api/health` ใช้งานได้โดยไม่ต้องมีฐานข้อมูล Health endpoint ตรวจการตอบสนองของแอปเท่านั้น ไม่ได้ทดสอบการเชื่อมต่อฐานข้อมูล

เมื่อพร้อมใช้ MongoDB ให้คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ `MONGODB_URI` จากนั้นเรียก `connectDB()` เฉพาะฝั่ง server ห้าม commit `.env.local`

## ตรวจสอบ

```bash
npm run lint
npm run typecheck
npm run build
```

## ขั้นตอนถัดไป

กำหนดกลุ่มผู้ใช้ บทบาท ขั้นตอนการทำงาน และข้อมูลที่ต้องจัดเก็บก่อนเพิ่ม models, services และ API จริง รวมถึงเลือกรูปแบบ Auth.js และผู้ให้บริการเข้าสู่ระบบเมื่อทราบความต้องการแล้ว

## Vercel

โครงนี้ใช้ Next.js ในโปรเจกต์เดียว สามารถนำ repository ไป import ใน Vercel และตั้งค่าตัวแปร `MONGODB_URI` เมื่อมีฐานข้อมูลแล้ว ยังไม่ได้สร้าง deployment หรือเชื่อมบัญชีบริการภายนอก

## Inspo MCP

ตั้งค่า hosted endpoint `https://inspomcp.dev/api/mcp` ให้ Codex, Cursor และ VS Code แล้ว ต้องเปิด client ใหม่เพื่อให้โหลดการเชื่อมต่อ การติดตั้งนี้อยู่ในค่าของเครื่อง ไม่ใช่ dependency ของแอป

## สถานะ dependencies ตอนเริ่มต้น

`npm audit` แจ้ง 5 รายการระดับ high ใน dependency chain ของเครื่องมือ ESLint (`braces` → `micromatch` → `fast-glob` → Next ESLint plugin/config) โดยคำแนะนำอัตโนมัติให้ downgrade config ข้าม major จึงยังไม่ได้ใช้ `--force` ควรตรวจอีกครั้งเมื่อมีเวอร์ชันแก้ไข ส่วน `npm audit --omit=dev` ไม่พบช่องโหว่ใน production dependencies ณ วันที่สร้างโครง
