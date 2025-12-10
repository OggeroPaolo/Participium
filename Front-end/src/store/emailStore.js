import { create } from "zustand";

export const useEmailStore = create((set) => ({
  // state
  signupEmail: null,

  //actions
  setSignupEmail: (email) => set({ signupEmail: email }),

  clearSignupData: () => set({ signupEmail: null }),
}));
