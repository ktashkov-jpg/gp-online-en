import { Appointment, Doctor, Patient } from '../types';

export const DEMO_DOCTOR_UID = 'demo_doctor_id';
export const DEMO_PATIENT_UID = 'demo_patient_id';

export const DEMO_DOCTOR: Doctor = {
  uid: DEMO_DOCTOR_UID,
  name: 'Dr. Sarah Jenkins',
  email: 'sarah.jenkins@gponline.com',
  specialty: 'Family Medicine (GP)',
  workingHours: { start: '09:00', end: '17:00' },
  calendarSync: { googleEnabled: true }
};

export const DEMO_PATIENT: Patient = {
  uid: DEMO_PATIENT_UID,
  name: 'John Doe',
  email: 'john.doe@gmail.com',
  phone: '+1 (555) 019-2831',
  assignedDoctorId: DEMO_DOCTOR_UID
};

const defaultAppointments = (): Appointment[] => {
  const today = new Date();
  
  const getTodayAt = (hours: number, minutes: number) => {
    const d = new Date(today);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  const getDaysFromTodayAt = (days: number, hours: number, minutes: number) => {
    const d = new Date(today);
    d.setDate(today.getDate() + days);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  const todayStr = (hours: number, minutes: number) => getTodayAt(hours, minutes);
  const tomorrowStr = (hours: number, minutes: number) => getDaysFromTodayAt(1, hours, minutes);

  return [
    {
      id: 'demo_app_1',
      patientId: DEMO_PATIENT_UID,
      doctorId: DEMO_DOCTOR_UID,
      startTime: todayStr(9, 30),
      endTime: todayStr(10, 0),
      status: 'confirmed',
      reason: 'Routine general health checkup and blood pressure review',
      createdAt: getDaysFromTodayAt(-1, 14, 0)
    },
    {
      id: 'demo_app_2',
      patientId: 'other_patient_1', // Simulated other patient
      doctorId: DEMO_DOCTOR_UID,
      startTime: todayStr(11, 0),
      endTime: todayStr(11, 30),
      status: 'pending',
      reason: 'Seasonal allergy symptoms and prescription update check',
      createdAt: getDaysFromTodayAt(-1, 15, 0)
    },
    {
      id: 'demo_app_3',
      patientId: 'other_patient_2', // Simulated other patient
      doctorId: DEMO_DOCTOR_UID,
      startTime: todayStr(14, 0),
      endTime: todayStr(14, 30),
      status: 'confirmed',
      reason: 'Vaccination booster shot and medical card signoff',
      createdAt: getDaysFromTodayAt(-2, 10, 30)
    },
    {
      id: 'demo_app_4',
      patientId: DEMO_PATIENT_UID,
      doctorId: DEMO_DOCTOR_UID,
      startTime: tomorrowStr(10, 0),
      endTime: tomorrowStr(10, 30),
      status: 'pending',
      reason: 'Follow-up on laboratory blood test results',
      createdAt: getTodayAt(8, 0)
    }
  ];
};

export function initializeDemoStore() {
  if (!localStorage.getItem('gp_demo_initialized')) {
    localStorage.setItem('gp_demo_doctors', JSON.stringify([DEMO_DOCTOR]));
    localStorage.setItem('gp_demo_patients', JSON.stringify([DEMO_PATIENT]));
    localStorage.setItem('gp_demo_appointments', JSON.stringify(defaultAppointments()));
    localStorage.setItem('gp_demo_initialized', 'true');
  }
}

// Custom event to trigger updates across tabs and components
const triggerUpdate = () => {
  window.dispatchEvent(new Event('demo_db_update'));
};

export function getDemoAppointments(): Appointment[] {
  initializeDemoStore();
  const data = localStorage.getItem('gp_demo_appointments');
  return data ? JSON.parse(data) : [];
}

export function saveDemoAppointments(apps: Appointment[]) {
  localStorage.setItem('gp_demo_appointments', JSON.stringify(apps));
  triggerUpdate();
}

export function getDemoDoctors(): Doctor[] {
  initializeDemoStore();
  const data = localStorage.getItem('gp_demo_doctors');
  return data ? JSON.parse(data) : [DEMO_DOCTOR];
}

export function saveDemoDoctors(docs: Doctor[]) {
  localStorage.setItem('gp_demo_doctors', JSON.stringify(docs));
  triggerUpdate();
}

export function getDemoPatients(): Patient[] {
  initializeDemoStore();
  const data = localStorage.getItem('gp_demo_patients');
  return data ? JSON.parse(data) : [DEMO_PATIENT];
}

export function saveDemoPatients(pats: Patient[]) {
  localStorage.setItem('gp_demo_patients', JSON.stringify(pats));
  triggerUpdate();
}

// Registry of demo doctors available for search integration
export const DEMO_REGISTRY = [
  { name: 'Dr. Sarah Jenkins', identityNumber: 'GP-9018', practiceAddress: '102 Medical Center Dr, London' },
  { name: 'Dr. Arthur Conan', identityNumber: 'GP-3321', practiceAddress: '221B Baker St, London' },
  { name: 'Dr. Robert Chen', identityNumber: 'GP-4482', practiceAddress: '404 Healthcare Ave, Boston' },
  { name: 'Dr. Elena Rostova', identityNumber: 'GP-1122', practiceAddress: '77 Nevsky Prospect, Saint Petersburg' }
];
