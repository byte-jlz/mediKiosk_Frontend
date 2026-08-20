// Mock staff accounts — mirrors the "Staff accounts" table in the Figma admin console.
// Replace with a real fetch to GET /api/staff once the backend is live.

export const mockStaff = [
  {
    id: 'S-1024',
    name: 'Dr. Amelia Chen',
    email: 'amelia.chen@clinic.io',
    role: 'Doctor',
    clinic: 'Northgate Clinic',
    status: 'Online',
    lastActive: '2 mins ago',
    initials: 'DA',
  },
  {
    id: 'S-1025',
    name: 'Marcus Reyes',
    email: 'marcus.reyes@clinic.io',
    role: 'Nurse',
    clinic: 'Bayview Medical',
    status: 'Online',
    lastActive: '14 mins ago',
    initials: 'MR',
  },
  {
    id: 'S-1026',
    name: 'Priya Natarjan',
    email: 'priya.n@clinic.io',
    role: 'Receptionist',
    clinic: 'Northgate Clinic',
    status: 'Online',
    lastActive: '1 hr ago',
    initials: 'PN',
  },
  {
    id: 'S-1027',
    name: 'Dr. Henrick Olsen',
    email: 'henrik.o@clinic.io',
    role: 'Doctor',
    clinic: 'Eastside Family',
    status: 'Suspended',
    lastActive: '3 days ago',
    initials: 'DH',
  },
  {
    id: 'S-1028',
    name: 'Sofia Mercado',
    email: 'sofia.m@clinic.io',
    role: 'Pharmacist',
    clinic: 'Eastside Family',
    status: 'Online',
    lastActive: '27 mins ago',
    initials: 'SM',
  },
];

// The signed-in admin used throughout the admin-console demo (matches "DR. ARINE THRONE" in Figma)
export const mockCurrentStaff = {
  name: 'Dr. Arine Throne',
  role: 'Attending - ER',
  initials: 'AT',
};
