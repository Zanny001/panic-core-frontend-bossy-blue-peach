import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as TaskManager from 'expo-task-manager';

const BACKEND_ENDPOINT = 'http://127.0.0.1:3000/api/v1/sos/trigger';
const BACKGROUND_SOS_TASK = 'BACKGROUND_PANIC_TRIGGER_TASK';

const CONFIG = {
  USER_ID: 'CAMPUS_STUDENT_2026',
  SAFE_PIN: '1111',
  DURESS_PIN: '9999'
};

function obfuscatePayload(dataString) {
  const key = 42;
  let result = '';
  for (let i = 0; i < dataString.length; i++) {
    result += String.fromCharCode(dataString.charCodeAt(i) ^ key);
  }
  return btoa(result);
}

async function executeEmergencyDispatch(isDuressMode = false) {
  try {
    const locationStatus = await Location.getBackgroundPermissionsAsync();
    let latitude = 0.0;
    let longitude = 0.0;

    if (locationStatus.granted) {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      latitude = location.coords.latitude;
      longitude = location.coords.longitude;
    }

    const batteryLevel = await Battery.getBatteryLevelAsync();
    const batteryPercentage = Math.round(batteryLevel * 100);

    const rawPayload = {
      userId: CONFIG.USER_ID,
      latitude: latitude,
      longitude: longitude,
      batteryLevel: batteryPercentage,
      isDuress: isDuressMode,
      timestamp: Date.now()
    };

    const transportToken = obfuscatePayload(JSON.stringify(rawPayload));
    console.log('[FRONTEND SCRIPT] Dispatched token:', transportToken);

    const response = await fetch(BACKEND_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rawPayload)
    });

    const data = await response.json();
    return data.status === 'DISPATCHED';

  } catch (error) {
    console.error('[CRITICAL FRONTEND FAIL] Exception:', error.message);
    return false;
  }
}

TaskManager.defineTask(BACKGROUND_SOS_TASK, async ({ data, error }) => {
  if (error) return;
  if (data) {
    console.log('[BACKGROUND ENGINE] Processing change check vector.');
    await executeEmergencyDispatch(false);
  }
});

export default function App() {
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    (async () => {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') return;
      
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === 'granted') {
        setPermissionGranted(true);
        await Location.startLocationUpdatesAsync(BACKGROUND_SOS_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 5,
          foregroundService: {
            notificationTitle: "Personal Safety Shield Active",
            notificationBody: "Monitoring physical state metrics securely."
          }
        });
      }
    })();
  }, []);

  const handlePinInput = async (inputPin) => {
    if (inputPin === CONFIG.SAFE_PIN) {
      Alert.alert("System Disarmed", "Safety mode stood down.");
    } else if (inputPin === CONFIG.DURESS_PIN) {
      console.log('⚠️ [COERCION DETECTED] Initializing silent override.');
      await executeEmergencyDispatch(true); 
      Alert.alert("App Disabled", "Session closed down correctly.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EMERGENCY CORE FRONTEND</Text>
      <Text style={styles.status}>Status: {permissionGranted ? 'SHIELD ARMED' : 'AWAITING PERMISSIONS'}</Text>
      
      <TouchableOpacity style={styles.panicButton} onPress={() => executeEmergencyDispatch(false)}>
        <Text style={styles.buttonText}>TAP TO SOS</Text>
      </TouchableOpacity>

      <View style={styles.duressBox}>
        <TouchableOpacity style={styles.mockPinBtn} onPress={() => handlePinInput('1111')}>
          <Text style={styles.pinText}>Enter Safe PIN (1111)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mockPinBtnDuress} onPress={() => handlePinInput('9999')}>
          <Text style={styles.pinText}>Enter Duress PIN (9999)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 22, color: '#f8fafc', fontWeight: 'bold', marginBottom: 5 },
  status: { fontSize: 14, color: '#38bdf8', marginBottom: 40 },
  panicButton: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', elevation: 10 },
  buttonText: { fontSize: 24, color: '#ffffff', fontWeight: 'bold' },
  duressBox: { marginTop: 50, width: '100%' },
  mockPinBtn: { backgroundColor: '#334155', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  mockPinBtnDuress: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8, alignItems: 'center' },
  pinText: { color: '#cbd5e1', fontWeight: '600' }
});

