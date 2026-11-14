import React, { useState, useRef } from 'react';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { analyzeFoodMacros } from '../services/gemini';

type InputScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Input'>;
};

export default function InputScreen({ navigation }: InputScreenProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [contextText, setContextText] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const permissionResult = await requestCameraPermission();
      if (!permissionResult.granted) {
        Alert.alert(
          'PERMISSION REQUIRED',
          'Camera access is required to take photos of your meals.'
        );
        return;
      }
    }
    setIsCameraActive(true);
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo?.uri && photo?.base64) {
        setImageUri(photo.uri);
        setBase64Image(photo.base64);
        setIsCameraActive(false);
      } else {
        Alert.alert('ERROR', 'Unable to capture image data. Please retry.');
      }
    } catch (error: any) {
      Alert.alert('CAMERA ERROR', error?.message || 'Failed to capture photo.');
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'PERMISSION REQUIRED',
          'Photo library access is required to select meal images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri && asset.base64) {
          setImageUri(asset.uri);
          setBase64Image(asset.base64);
          setIsCameraActive(false);
        }
      }
    } catch (error: any) {
      Alert.alert('LIBRARY ERROR', error?.message || 'Failed to pick image.');
    }
  };

  const handleResetImage = () => {
    setImageUri(null);
    setBase64Image(null);
    setIsCameraActive(false);
  };

  const handleAnalyze = async () => {
    if (!base64Image || !imageUri) {
      Alert.alert('NO IMAGE', 'Please take a photo or select an image from your library first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const estimatedMacros = await analyzeFoodMacros(base64Image, contextText);
      navigation.navigate('Review', {
        imageUri,
        macros: estimatedMacros,
        foodDescription: contextText.trim(),
      });
    } catch (error: any) {
      Alert.alert(
        'ANALYSIS FAILED',
        error?.message || 'An error occurred while estimating macros. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
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
            <Text className="text-black font-black text-xl tracking-tight uppercase">
              CAL PAL // 01
            </Text>
            <View className="bg-black px-2 py-0.5 rounded-none">
              <Text className="text-white font-mono text-xs font-bold uppercase">
                INPUT
              </Text>
            </View>
          </View>
          <Text className="text-neutral-600 text-xs font-mono tracking-widest mt-1 uppercase">
            MULTIMODAL MACRONUTRIENT ESTIMATOR
          </Text>
        </View>

        <View className="p-5 flex-1 justify-between">
          <View>
            {/* Viewport / Camera Preview / Placeholder */}
            <View className="w-full aspect-square border-2 border-black bg-neutral-100 overflow-hidden rounded-none mb-4 items-center justify-center relative">
              {isCameraActive ? (
                <View className="w-full h-full relative">
                  <CameraView
                    ref={cameraRef}
                    facing="back"
                    style={{ width: '100%', height: '100%' }}
                  />
                  {/* Viewfinder crosshairs overlay */}
                  <View className="absolute inset-4 border border-white/60 pointer-events-none items-center justify-center">
                    <View className="w-6 h-0.5 bg-white/80" />
                    <View className="w-0.5 h-6 bg-white/80 absolute" />
                  </View>

                  {/* Camera overlay controls */}
                  <View className="absolute bottom-4 left-4 right-4 flex-row justify-between items-center">
                    <TouchableOpacity
                      onPress={() => setIsCameraActive(false)}
                      className="bg-white border-2 border-black px-4 py-2.5 rounded-none active:bg-neutral-200"
                    >
                      <Text className="text-black font-bold text-xs uppercase tracking-wider">
                        CANCEL
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleCapturePhoto}
                      className="bg-black border-2 border-black px-6 py-2.5 rounded-none active:bg-neutral-800"
                    >
                      <Text className="text-white font-black text-xs uppercase tracking-widest">
                        SNAP PHOTO
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : imageUri ? (
                <View className="w-full h-full relative">
                  <Image
                    source={{ uri: imageUri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute top-2 right-2">
                    <TouchableOpacity
                      onPress={handleResetImage}
                      className="bg-black border border-white px-3 py-1.5 rounded-none active:bg-neutral-800"
                    >
                      <Text className="text-white font-mono text-xs font-bold uppercase tracking-wider">
                        RETAKE
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View className="items-center justify-center px-6 py-8">
                  <View className="w-16 h-16 border-2 border-dashed border-black items-center justify-center mb-3">
                    <Text className="text-black font-mono text-2xl font-bold">+</Text>
                  </View>
                  <Text className="text-black font-bold text-sm uppercase tracking-wider text-center">
                    NO IMAGE SELECTED
                  </Text>
                  <Text className="text-neutral-500 font-mono text-xs text-center mt-1 uppercase">
                    USE CAMERA OR CAMERA ROLL
                  </Text>
                </View>
              )}
            </View>

            {/* Photo Action Buttons */}
            {!isCameraActive && (
              <View className="flex-row space-x-3 gap-3 mb-5">
                <TouchableOpacity
                  onPress={handleOpenCamera}
                  className="flex-1 bg-black py-3.5 px-4 items-center justify-center border-2 border-black rounded-none active:bg-neutral-800"
                >
                  <Text className="text-white font-bold text-xs uppercase tracking-widest">
                    OPEN CAMERA
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePickFromLibrary}
                  className="flex-1 bg-white py-3.5 px-4 items-center justify-center border-2 border-black rounded-none active:bg-neutral-100"
                >
                  <Text className="text-black font-bold text-xs uppercase tracking-widest">
                    CAMERA ROLL
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Context & Portion Weight Input */}
            <View className="mb-6">
              <View className="flex-row justify-between items-baseline mb-1.5">
                <Text className="text-black font-bold text-xs tracking-wider uppercase">
                  MEAL CONTEXT & WEIGHTS
                </Text>
                <Text className="text-neutral-500 font-mono text-[10px] uppercase">
                  OPTIONAL
                </Text>
              </View>
              <TextInput
                value={contextText}
                onChangeText={setContextText}
                placeholder="e.g., 150g raw chicken breast, 300g cooked jasmine rice, 10g olive oil"
                placeholderTextColor="#737373"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="w-full min-h-[85px] border-2 border-black p-3.5 text-black font-sans text-sm rounded-none bg-white"
              />
              <Text className="text-neutral-500 font-mono text-[10px] mt-1 uppercase">
                SPECIFYING PRECISE WEIGHTS IMPROVES MACRO ACCURACY
              </Text>
            </View>
          </View>

          {/* Analyze Button */}
          <View className="pt-2 pb-4">
            <TouchableOpacity
              onPress={handleAnalyze}
              disabled={isAnalyzing || !imageUri || isCameraActive}
              className={`w-full py-4 items-center justify-center border-2 border-black rounded-none ${
                !imageUri || isCameraActive
                  ? 'bg-neutral-200 border-neutral-300'
                  : 'bg-black active:bg-neutral-900'
              }`}
            >
              {isAnalyzing ? (
                <View className="flex-row items-center space-x-2 gap-2">
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text className="text-white font-black text-sm tracking-widest uppercase">
                    ANALYZING WITH GEMINI...
                  </Text>
                </View>
              ) : (
                <Text
                  className={`font-black text-sm tracking-widest uppercase ${
                    !imageUri || isCameraActive ? 'text-neutral-400' : 'text-white'
                  }`}
                >
                  ANALYZE
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
