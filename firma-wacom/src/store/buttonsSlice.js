export const createButtonsSlice = (set, get) => ({
  buttonsImage: null,

  buttonsActions: {
    setButtonsImage: (imageData) => {
      set({ buttonsImage: imageData });
    },
    clearButtonsImage: () => {
      set({ buttonsImage: null });
    },
  },
});