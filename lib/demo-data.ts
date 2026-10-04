import type {
  Creditor,
  Payment,
  Project,
  ProjectColor,
  Workspace,
} from "@/types/workspace";

const projects: Project[] = [
  {
    id: "tig-cafe",
    name: "Tig คาเฟ่แม่ริม",
    description: "งานก่อสร้างและตกแต่งคาเฟ่",
    color: "blue",
    favorite: true,
  },
  {
    id: "river-view",
    name: "River View Bar",
    description: "งานปรับปรุงร้านและระบบภายใน",
    color: "amber",
    favorite: false,
  },
  {
    id: "home-lang-mor",
    name: "บ้านพัก หลังมอ",
    description: "งานก่อสร้างและระบบบ้านพัก",
    color: "purple",
    favorite: false,
  },
  {
    id: "home-mae",
    name: "บ้านแม่พี่มิ้ง",
    description: "งานปรับปรุงและต่อเติมบ้าน",
    color: "cyan",
    favorite: true,
  },
  {
    id: "home-88",
    name: "บ้าน 88/77",
    description: "งานตกแต่งและเก็บรายละเอียด",
    color: "rose",
    favorite: false,
  },
  {
    id: "coffee-wine",
    name: "Coffee and wine",
    description: "งานตกแต่งร้านและพื้นที่บริการ",
    color: "blue",
    favorite: false,
  },
];

const rows: [string, string, string, number, boolean][] = [
  [
    "tig-cafe",
    "ทีมช่างโครงสร้าง",
    "งานฐานรากและโครงสร้างอาคาร",
    14856.52,
    false,
  ],
  [
    "tig-cafe",
    "ทีมช่างอลูมิเนียม",
    "งานติดตั้งโครงอลูมิเนียมและบานประตู",
    53500,
    true,
  ],
  [
    "tig-cafe",
    "ทีมช่างอลูมิเนียม",
    "งานติดตั้งกระจกและเก็บรายละเอียด",
    76832,
    false,
  ],
  ["tig-cafe", "ทีมช่างไฟฟ้า", "งานติดตั้งระบบไฟฟ้าภายในร้าน", 4268, true],
  [
    "river-view",
    "ทีมช่างตกแต่ง",
    "งานตกแต่งพื้นที่ภายในและเคาน์เตอร์",
    32836.44,
    false,
  ],
  [
    "river-view",
    "ทีมช่างอลูมิเนียม",
    "งานผลิตและติดตั้งหน้าต่างอลูมิเนียม 4 ชุด",
    9971.6,
    true,
  ],
  [
    "river-view",
    "ทีมช่างอลูมิเนียม",
    "งานติดตั้งประตูห้องน้ำชายและหญิง",
    2037,
    false,
  ],
  [
    "river-view",
    "ทีมช่างอลูมิเนียม",
    "งานเก็บรายละเอียดหน้าร้าน",
    5716.94,
    false,
  ],
  [
    "home-lang-mor",
    "ทีมช่างหลังคา",
    "งานต่อเติมหลังคาและกันสาด",
    4559.74,
    true,
  ],
  [
    "home-lang-mor",
    "ทีมช่างหลังคา",
    "งานติดตั้งรางน้ำและเชิงชาย",
    11399.34,
    true,
  ],
  ["home-lang-mor", "ทีมช่างสี", "งานซ่อมแซมผนังและทาสีภายนอก", 4892.49, false],
  ["home-lang-mor", "ทีมช่างอลูมิเนียม", "งานประตูและหน้าต่าง", 50000, false],
  ["home-lang-mor", "ทีมช่างหลังคา", "งานปรับปรุงพื้นที่ซักล้าง", 1940, true],
  ["home-mae", "ทีมช่างประปา", "งานติดตั้งปั๊มน้ำและระบบประปา", 20370, false],
  ["home-mae", "ทีมช่างสวน", "งานปรับพื้นที่สวนและทางเดิน", 7275, true],
  ["home-mae", "ทีมช่างประปา", "งานปรับปรุงระบบท่อภายใน", 4850, false],
  ["home-mae", "ทีมช่างไฟฟ้า", "งานติดตั้งชุดไฟและปลั๊กไฟ", 2004.99, true],
  ["home-88", "ทีมช่างตกแต่ง", "งานตกแต่งภายในและเฟอร์นิเจอร์", 25000, true],
  ["home-88", "ทีมช่างสี", "งานทาสีและเก็บรายละเอียด", 12000, true],
  [
    "coffee-wine",
    "ทีมช่างตกแต่ง",
    "งานเพิ่มเคาน์เตอร์และชั้นวาง",
    6547.5,
    false,
  ],
  ["coffee-wine", "ทีมช่างระบบ", "งานติดตั้งระบบน้ำและไฟฟ้า", 4850, false],
];

const creditorNames = [...new Set(rows.map((row) => row[1]))];
const colors: ProjectColor[] = ["blue", "amber", "purple", "cyan", "rose"];
const creditors: Creditor[] = creditorNames.map((name, index) => ({
  id: `creditor-${index + 1}`,
  name,
  description: "ช่าง / ผู้รับเหมาประจำพื้นที่เชียงใหม่",
  color: colors[index % colors.length],
  favorite: index === 1 || index === 4,
}));

const payments: Payment[] = rows.map(
  ([projectId, creditor, description, amount, paid], index) => ({
    id: `demo-${index + 1}`,
    projectId,
    creditorId: creditors.find((item) => item.name === creditor)!.id,
    requestedDate: `2026-09-${String(14 + (index % 9)).padStart(2, "0")}`,
    creditor,
    description,
    installment: ["1/2", "2/3", "3/3", "1/1"][index % 4],
    nationality: index % 5 === 0 ? "ต่างด้าว" : "ไทย",
    category: index % 3 === 0 ? "ค่าแรง+ของ" : "ค่าแรง",
    status: paid ? "จ่ายแล้ว" : "ค้างจ่าย",
    bank: ["กสิกรไทย", "กรุงไทย", "ไทยพาณิชย์", "ออมสิน"][index % 4],
    branch: ["เชียงใหม่", "แม่ริม", "สันทราย"][index % 3],
    accountNumber: `000-${String(index + 1).padStart(3, "0")}-0000`,
    accountName: `ผู้รับเงินตัวอย่าง ${index + 1}`,
    paidDate: paid ? "2026-09-25" : "",
    amount,
    note: index === 17 ? "รอตรวจรับงานงวดสุดท้าย" : "",
    flow: paid && index % 2 === 0,
  }),
);

export const initialWorkspace: Workspace = { creditors, projects, payments };

export const money = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function paymentSummary(payments: Payment[]) {
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paid = payments
    .filter((payment) => payment.status === "จ่ายแล้ว")
    .reduce((sum, payment) => sum + payment.amount, 0);
  return {
    total,
    paid,
    pending: total - paid,
    progress: total ? Math.round((paid / total) * 100) : 0,
  };
}
