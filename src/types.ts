export enum UserType {
  DOCTOR = 'doctor',
  PATIENT = 'patient'
}

export interface Doctor {
  uid: string;
  name: string;
  email: string;
  specialty: string;
  workingHours: {
    start: string;
    end: string;
  };
  calendarSync?: {
    googleEnabled: boolean;
  };
}

export interface Patient {
  uid: string;
  name: string;
  email: string;
  phone: string;
  assignedDoctorId?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  reason: string;
  createdAt: string;
}
