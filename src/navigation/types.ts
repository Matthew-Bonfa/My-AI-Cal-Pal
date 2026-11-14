export interface MacroData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type RootStackParamList = {
  Input: undefined;
  Review: {
    imageUri: string;
    macros: MacroData;
    foodDescription?: string;
  };
};
