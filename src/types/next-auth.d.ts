import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: string;
      plan?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    role?: string;
    plan?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
    plan?: string;
  }
}
