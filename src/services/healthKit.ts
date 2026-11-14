import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health';
import { MacroData } from '../navigation/types';

export interface NutritionSavePayload extends MacroData {
  foodName?: string;
  date?: string;
}

/**
 * HealthKit Permissions Specification
 * Write permissions for:
 * - Dietary Energy (Calories / EnergyConsumed)
 * - Dietary Protein
 * - Dietary Carbohydrates
 * - Total Dietary Fat (FatTotal)
 */
export const HEALTHKIT_PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.EnergyConsumed,
      AppleHealthKit.Constants.Permissions.Protein,
      AppleHealthKit.Constants.Permissions.Carbohydrates,
      AppleHealthKit.Constants.Permissions.FatTotal,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.EnergyConsumed,
      AppleHealthKit.Constants.Permissions.Protein,
      AppleHealthKit.Constants.Permissions.Carbohydrates,
      AppleHealthKit.Constants.Permissions.FatTotal,
    ],
  },
};

/**
 * Checks if HealthKit is available on the current device.
 * HealthKit is only supported on physical iOS devices (and select iOS 17+ iPad models).
 */
export const checkHealthKitAvailability = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'ios') {
      resolve(false);
      return;
    }

    AppleHealthKit.isAvailable((error: Object | null, available: boolean) => {
      if (error) {
        console.warn('[HealthKit] isAvailable check failed:', error);
        resolve(false);
        return;
      }
      resolve(!!available);
    });
  });
};

/**
 * Requests authorization for HealthKit read/write permissions.
 */
export const requestHealthKitPermissions = (): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    if (Platform.OS !== 'ios') {
      return reject(new Error('Apple HealthKit is only available on iOS devices.'));
    }

    const available = await checkHealthKitAvailability();
    if (!available) {
      return reject(
        new Error('Apple HealthKit is not available on this device or simulator.')
      );
    }

    AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, (error: string) => {
      if (error) {
        console.error('[HealthKit] Permission init error:', error);
        reject(new Error(error));
        return;
      }
      resolve(true);
    });
  });
};

/**
 * Saves nutritional macros to Apple HealthKit as an HKCorrelation of type Food.
 * This automatically propagates to connected services like MyFitnessPal and Cronometer.
 */
export const saveMacrosToHealthKit = async (
  payload: NutritionSavePayload
): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple HealthKit is only supported on iOS devices.');
  }

  // Ensure permissions are initialized
  await requestHealthKitPermissions();

  return new Promise((resolve, reject) => {
    const foodOptions = {
      foodName: payload.foodName?.trim() || 'Food Log (AI Estimate)',
      mealType: 'Snacks',
      date: payload.date || new Date().toISOString(),
      energy: Number(payload.calories) || 0, // In kilocalories (kcal)
      protein: Number(payload.protein) || 0, // In grams (g)
      carbohydrates: Number(payload.carbs) || 0, // In grams (g)
      fatTotal: Number(payload.fat) || 0, // In grams (g)
    };

    AppleHealthKit.saveFood(foodOptions, (err: string, _result: HealthValue) => {
      if (err) {
        console.error('[HealthKit] saveFood error:', err);
        reject(new Error(typeof err === 'string' ? err : 'Failed to save food macros to Apple Health.'));
        return;
      }
      resolve(true);
    });
  });
};
