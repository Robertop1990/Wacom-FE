import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createButtonsSlice } from "./buttonsSlice";

export const useStore = create(
  persist(
    (set, get) => ({
      ...createButtonsSlice(set, get),
    }),
    {
      name: "store", // Nombre de la clave en el almacenamiento (localStorage o sessionStorage)
      storage: createJSONStorage(() => sessionStorage), // Usando sessionStorage
    }
  )
);