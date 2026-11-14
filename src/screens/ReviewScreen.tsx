import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { saveMacrosToHealthKit } from '../services/healthKit';

type ReviewScreenProps = NativeStackScreenProps<RootStackParamList, 'Review'>;

export default function ReviewScreen({ route, navigation }: ReviewScreenProps) {
  const { imageUri, macros: initialMacros, foodDescription } = route.params;

  const [calories, setCalories] = useState<string>(String(initialMacros.calories));
  const [protein, setProtein] = useState<string>(String(initialMacros.protein));
  const [carbs, setCarbs] = useState<string>(String(initialMacros.carbs));
  const [fat, setFat] = useState<string>(String(initialMacros.fat));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Calculated caloric check: (Protein * 4) + (Carbs * 4) + (Fat * 9)
  const numericProtein = parseFloat(protein) || 0;
  const numericCarbs = parseFloat(carbs) || 0;
  const numericFat = parseFloat(fat) || 0;
  const calculatedKcal = Math.round(
    numericProtein * 4 + numericCarbs * 4 + numericFat * 9
  );

  const handleSyncToHealthKit = async () => {
    const finalCalories = parseFloat(calories) || 0;
    const finalProtein = parseFloat(protein) || 0;
    const finalCarbs = parseFloat(carbs) || 0;
    const finalFat = parseFloat(fat) || 0;

    if (finalCalories <= 0 && finalProtein <= 0 && finalCarbs <= 0 && finalFat <= 0) {
      Alert.alert(
        'INVALID INPUT',
        'Please enter valid macronutrient values greater than zero.'
      );
      return;
    }

    setIsSyncing(true);

    try {
      await saveMacrosToHealthKit({
        calories: finalCalories,
        protein: finalProtein,
        carbs: finalCarbs,
        fat: finalFat,
        foodName: foodDescription?.trim() || 'Food Log',
      });

      Alert.alert(
        'SYNC SUCCESSFUL',
        'Nutritional data successfully written to Apple HealthKit.\n\nMyFitnessPal and Cronometer will synchronize automatically.',
        [
          {
            text: 'DONE',
            onPress: () => {
              // Resets navigation stack back to Screen 1 (Input)
              navigation.reset({
                index: 0,
                routes: [{ name: 'Input' }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'HEALTHKIT SYNC ERROR',
        error?.message ||
          'Failed to write macros to Apple Health. Verify Apple Health permissions in iOS Settings.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="flex-1 bg-white"
      >
        {/* Stark Brutalist Header */}
        <View className="px-5 pt-4 pb-3 border-b-2 border-black bg-white">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="py-1 pr-3"
            >
              <Text className="text-black font-mono font-bold text-xs uppercase tracking-wider">
                [ ← BACK ]
              </Text>
            </TouchableOpacity>
            <View className="bg-black px-2 py-0.5 rounded-none">
              <Text className="text-white font-mono text-xs font-bold uppercase">
                REVIEW & EDIT
              </Text>
            </View>
          </View>
          <Text className="text-black font-black text-xl tracking-tight uppercase mt-1">
            CAL PAL // 02
          </Text>
        </View>

        <View className="p-5 flex-1 justify-between">
          <View>
            {/* Top Food Thumbnail & Context Badge */}
            <View className="flex-row items-center space-x-4 gap-4 p-3 border-2 border-black bg-neutral-50 mb-6">
              <View className="w-20 h-20 border border-black overflow-hidden bg-neutral-200">
                <Image
                  source={{ uri: imageUri }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              <View className="flex-1 justify-center">
                <Text className="text-neutral-500 font-mono text-[10px] tracking-wider uppercase">
                  DETECTED ITEM
                </Text>
                <Text
                  numberOfLines={2}
                  className="text-black font-bold text-sm uppercase mt-0.5"
                >
                  {foodDescription?.trim() || 'IMAGE ESTIMATE'}
                </Text>
                <Text className="text-neutral-500 font-mono text-[10px] mt-1 uppercase">
                  TAP ANY MACRO VALUE BELOW TO EDIT
                </Text>
              </View>
            </View>

            {/* 4 Large Distinct Numeric Inputs */}
            <Text className="text-black font-mono text-xs font-bold uppercase tracking-wider mb-2">
              ESTIMATED NUTRITIONAL VALUES:
            </Text>

            {/* Calories (kcal) */}
            <View className="border-2 border-black p-3.5 mb-3 bg-white">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-black font-mono text-xs font-bold uppercase tracking-wider">
                  01 // ENERGY (CALORIES)
                </Text>
                <Text className="text-neutral-500 font-mono text-xs uppercase">
                  KCAL
                </Text>
              </View>
              <View className="flex-row items-baseline">
                <TextInput
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  returnKeyType="done"
                  className="text-black font-mono font-black text-4xl p-0 flex-1"
                />
                <Text className="text-neutral-400 font-mono text-base font-bold ml-2">
                  kcal
                </Text>
              </View>
            </View>

            {/* 3-Column Macro Grid: Protein, Carbs, Fat */}
            <View className="space-y-3 gap-3 mb-4">
              {/* Protein */}
              <View className="border-2 border-black p-3.5 bg-white">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-black font-mono text-xs font-bold uppercase tracking-wider">
                    02 // PROTEIN
                  </Text>
                  <Text className="text-neutral-500 font-mono text-xs uppercase">
                    GRAMS
                  </Text>
                </View>
                <View className="flex-row items-baseline">
                  <TextInput
                    value={protein}
                    onChangeText={setProtein}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    className="text-black font-mono font-black text-3xl p-0 flex-1"
                  />
                  <Text className="text-neutral-400 font-mono text-base font-bold ml-2">
                    g
                  </Text>
                </View>
              </View>

              {/* Carbohydrates */}
              <View className="border-2 border-black p-3.5 bg-white">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-black font-mono text-xs font-bold uppercase tracking-wider">
                    03 // CARBOHYDRATES
                  </Text>
                  <Text className="text-neutral-500 font-mono text-xs uppercase">
                    GRAMS
                  </Text>
                </View>
                <View className="flex-row items-baseline">
                  <TextInput
                    value={carbs}
                    onChangeText={setCarbs}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    className="text-black font-mono font-black text-3xl p-0 flex-1"
                  />
                  <Text className="text-neutral-400 font-mono text-base font-bold ml-2">
                    g
                  </Text>
                </View>
              </View>

              {/* Total Fat */}
              <View className="border-2 border-black p-3.5 bg-white">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-black font-mono text-xs font-bold uppercase tracking-wider">
                    04 // TOTAL FAT
                  </Text>
                  <Text className="text-neutral-500 font-mono text-xs uppercase">
                    GRAMS
                  </Text>
                </View>
                <View className="flex-row items-baseline">
                  <TextInput
                    value={fat}
                    onChangeText={setFat}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    className="text-black font-mono font-black text-3xl p-0 flex-1"
                  />
                  <Text className="text-neutral-400 font-mono text-base font-bold ml-2">
                    g
                  </Text>
                </View>
              </View>
            </View>

            {/* Macro Ratio Breakdown */}
            <View className="border border-neutral-300 p-2.5 mb-6 bg-neutral-50">
              <Text className="text-neutral-500 font-mono text-[10px] uppercase">
                CALCULATED FROM MACROS: {calculatedKcal} KCAL (P:{numericProtein}g · C:{numericCarbs}g · F:{numericFat}g)
              </Text>
            </View>
          </View>

          {/* Submit Action: Send to MyFitnessPal via HealthKit */}
          <View className="pt-2 pb-4">
            <TouchableOpacity
              onPress={handleSyncToHealthKit}
              disabled={isSyncing}
              className="w-full bg-black py-4 px-6 items-center justify-center border-2 border-black rounded-none active:bg-neutral-900"
            >
              {isSyncing ? (
                <View className="flex-row items-center space-x-2 gap-2">
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text className="text-white font-black text-sm tracking-widest uppercase">
                    WRITING TO APPLE HEALTHKIT...
                  </Text>
                </View>
              ) : (
                <Text className="text-white font-black text-sm tracking-widest uppercase">
                  SEND TO MYFITNESSPAL
                </Text>
              )}
            </TouchableOpacity>

            <Text className="text-neutral-500 font-mono text-[10px] text-center mt-2 uppercase">
              WRITES DIRECTLY TO APPLE HEALTHKIT → AUTO-SYNCS TO MYFITNESSPAL & CRONOMETER
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
