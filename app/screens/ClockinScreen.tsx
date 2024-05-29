import { observer } from "mobx-react-lite"
import React, { FC, useState, useEffect } from "react"
import { View, StyleSheet, Button, Alert } from "react-native"
import { Screen, Header, Text } from "../components"
import moment from "moment"
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppStackScreenProps } from "../navigators"

interface ClockInScreenProps extends AppStackScreenProps<"ClockInScreen"> {}

export const ClockInScreen: FC<ClockInScreenProps> = observer(function ClockInScreen({ route, navigation }: ClockInScreenProps) {
  const { date } = route.params;
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);

  useEffect(() => {
    const loadTimes = async () => {
      try {
        const clockIn = await AsyncStorage.getItem(`clockIn_${date}`);
        const clockOut = await AsyncStorage.getItem(`clockOut_${date}`);
        if (clockIn) setClockInTime(clockIn);
        if (clockOut) setClockOutTime(clockOut);
      } catch (e) {
        Alert.alert("Error", "Failed to load times");
      }
    };
    loadTimes();
  }, [date]);

  const handleClockIn = async () => {
    const time = moment().format('HH:mm:ss');
    setClockInTime(time);
    try {
      await AsyncStorage.setItem(`clockIn_${date}`, time);
    } catch (e) {
      Alert.alert("Error", "Failed to save clock in time");
    }
  };

  const handleClockOut = async () => {
    const time = moment().format('HH:mm:ss');
    setClockOutTime(time);
    try {
      await AsyncStorage.setItem(`clockOut_${date}`, time);
    } catch (e) {
      Alert.alert("Error", "Failed to save clock out time");
    }
  };

  return (
    <Screen style={styles.container}>
      <Header title={`Clock In/Out`} style={styles.header} leftIcon="caretLeft" onLeftPress={() => navigation.goBack()} />
      <Text style={styles.dateText}>{moment(date).format('dddd, MMMM D, YYYY')}</Text>
      <View style={styles.buttonContainer}>
        <Button title="Clock In" onPress={handleClockIn} disabled={!!clockInTime} />
        <Button title="Clock Out" onPress={handleClockOut} disabled={!clockInTime || !!clockOutTime} />
      </View>
      <Text style={styles.timeText}>Clock In Time: {clockInTime || '-'}</Text>
      <Text style={styles.timeText}>Clock Out Time: {clockOutTime || '-'}</Text>
    </Screen>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Light background color
    padding: 10,
  },
  header: {
    backgroundColor: '#4caf50', // Light green color for header
    padding: 15,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  timeText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginVertical: 10,
  },
});
