import { User, UserRole, UserStatus, Profile, City } from '@prisma/client';

type UserWithProfile = User & {
  profile: (Profile & { city: City | null }) | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: UserWithProfile;
      userRole?: UserRole;
      userStatus?: UserStatus;
    }
  }
}

export {};
