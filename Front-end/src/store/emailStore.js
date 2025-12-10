import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useEmailStore = create(
  persist(
    (set) => ({
      // state
      signupEmail: null,

      //actions
      setSignupEmail: (email) => set({ signupEmail: email }),
      clearSignupData: () => set({ signupEmail: null }),
    }),
    { name: "signup-storage" }
  )
);
