import { User } from '@prisma/client';

export type SerializedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: User['role'];
  status: User['status'];
  createdAt: Date;
  updatedAt: Date;
};

export function serializeUser(user: User): SerializedUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
