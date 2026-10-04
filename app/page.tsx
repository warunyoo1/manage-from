import { StatusBadge } from "@/components/ui/status-badge";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 sm:px-10">
      <header className="flex items-center justify-between border-b border-slate-200 py-6">
        <span className="text-sm font-semibold tracking-widest text-slate-900">MANAGE FROM</span>
        <StatusBadge>โครงโปรเจกต์พร้อมแล้ว</StatusBadge>
      </header>
      <main className="flex flex-1 flex-col justify-center py-20">
        <p className="mb-5 text-sm font-medium text-teal-700">เริ่มต้นจากพื้นที่เดียวกัน</p>
        <h1 className="max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-slate-900 sm:text-6xl">
          พื้นที่สำหรับระบบ<br />ที่คุณกำลังสร้าง
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
          โครงสร้างเบื้องต้นพร้อมต่อยอด หน้าจอและฟังก์ชันการทำงานจะค่อย ๆ เติมตามรายละเอียดของระบบ
        </p>
        <section aria-label="ขั้นตอนถัดไป" className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            { step: "01", title: "กำหนดภาพรวม", detail: "ระบบนี้ช่วยใคร และแก้ปัญหาอะไร" },
            { step: "02", title: "วางขั้นตอนการใช้งาน", detail: "ผู้ใช้เริ่มจากตรงไหน และทำอะไรได้บ้าง" },
            { step: "03", title: "เติมฟังก์ชันหลัก", detail: "จัดลำดับสิ่งที่ต้องใช้งานก่อน" },
          ].map((item) => (
            <article key={item.step} className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="text-xs font-medium text-teal-700">{item.step}</span>
              <h2 className="mt-4 font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
            </article>
          ))}
        </section>
      </main>
      <footer className="border-t border-slate-200 py-6 text-xs text-slate-500">Manage From · พื้นที่เริ่มต้นของโปรเจกต์</footer>
    </div>
  );
}
