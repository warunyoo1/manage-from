export type ProjectColor = "blue" | "amber" | "purple" | "cyan" | "rose";
export type PaymentStatus =
  "จ่ายแล้ว" | "ค้างจ่าย" | "หน้างานถูกชะลอ" | "ตรวจสอบเพิ่มเติม";
export type Project = {
  id: string;
  name: string;
  description: string;
  color: ProjectColor;
  favorite: boolean;
};

export type Creditor = {
  id: string;
  name: string;
  description: string;
  color: ProjectColor;
  favorite: boolean;
};

export type PaymentDocument = {
  installmentGroupId?: string;
  installmentBaseClaimed?: number;
  installments?: {
    id: string;
    amount: number;
    date: string;
    paymentId?: string;
  }[];
  title: string;
  siteAddress: string;
  contractorName: string;
  nationalId: string;
  phone: string;
  address: string;
  workCategory: string;
  totalWorkAmount: number;
  requestedAmount: number;
  previousClaimed: number;
  vatMode: "none" | "exclusive" | "inclusive";
  withholdingRate: number;
  retentionEnabled: boolean;
  retentionRate: number;
  installmentNumber: number;
  totalInstallments: number;
  supervisor: string;
  approver: string;
};

export type Payment = {
  id: string;
  projectId: string;
  creditorId: string;
  requestedDate: string;
  creditor: string;
  description: string;
  installment: string;
  nationality: string;
  category: string;
  status: PaymentStatus;
  bank: string;
  branch: string;
  accountNumber: string;
  accountName: string;
  paidDate: string;
  amount: number;
  note: string;
  flow: boolean;
  document?: PaymentDocument;
};

export type Workspace = {
  creditors: Creditor[];
  projects: Project[];
  payments: Payment[];
};
