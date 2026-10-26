export type AppointmentStatus =
  | "completed"
  | "in_progress"
  | "scheduled"
  | "cancelled";

export interface Appointment {
  id: string;
  patientId?: string;
  employeeId?: string;
  date: string;
  /** Номер пациента в очереди врача на этот день (время записи не назначается). */
  queueNumber: number;
  patient: string;
  complaint: string;
  diagnosis: string | null;
  doctor: string;
  createdBy: string | null;
  status: AppointmentStatus;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  /** Код причины отмены (справочник); текст — только для «other». */
  cancellationReasonCode?: import("@/lib/cancellation").CancellationReasonCode | null;
  /** Кабинет врача. */
  office?: string;
  /** Когда врач начал приём («Начать»; ISO, локальное время БД). */
  startedAt?: string | null;
  /** Когда приём завершён (ISO, локальное время БД). */
  completedAt?: string | null;
}

export interface DoctorBadge {
  label: string;
  variant: "green" | "blue";
}

export interface WorkDaySchedule {
  id: string;
  label: string;
  enabled: boolean;
  start: string;
  end: string;
}

export type PatientCareType = "ambulatory" | "inpatient";

export interface InpatientInfo {
  department: string;
  ward: string;
  bed: string;
  admittedAt: string;
  attendingDoctor: string;
  primaryDiagnosis: string;
}

export type DiseaseTagVariant =
  | "green"
  | "purple"
  | "orange"
  | "red"
  | "blue"
  | "yellow";

export interface PatientDisease {
  label: string;
  variant: DiseaseTagVariant;
}

export interface Patient {
  id: string;
  fullName: string;
  shortName: string;
  iin: string;
  birthDate: string;
  ageLabel: string;
  gender: "М" | "Ж";
  bloodType: string;
  phone: string;
  address: string;
  lastAppointment: string | null;
  dispensary: boolean;
  careType: PatientCareType;
  inpatient?: InpatientInfo;
  allergies: string[];
  chronicDiseases: string[];
  diseases: PatientDisease[];
}

export interface PatientMedicalHistoryEntry {
  id: string;
  patientId: string;
  date: string;
  queueNumber: number;
  startedAt?: string | null;
  completedAt?: string | null;
  doctor: string;
  status: AppointmentStatus;
  complaint: string;
  diagnosis: string | null;
}

export interface HealthMetric {
  label: string;
  value: string;
  date: string;
  note?: string;
}

export interface Vaccination {
  id: string;
  patientId: string;
  date: string;
  name: string;
  drug: string;
  series: string;
  notes: string | null;
}

export interface Diagnosis {
  code: string;
  name: string;
}

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  duration: string;
}

export interface PatientExamination {
  patientId: string;
  appointmentId?: string;
  status: AppointmentStatus;
  complaints: string;
  objectiveStatus: string;
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
  completedAt?: string | null;
}

export interface PatientVisitHistory {
  id: string;
  patientId: string;
  date: string;
  status: AppointmentStatus;
  summary: string;
}
