import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useState } from "react"
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { Screen, Header, Text } from "../components"
import moment from "moment"
import AsyncStorage from '@react-native-async-storage/async-storage'

interface TimeSheetScreenProps extends AppStackScreenProps<"TimeSheet"> {}

interface DayRecord {
  date: string;
  clockInTime: string | null;
  clockOutTime: string | null;
}

export const TimeSheetScreen: FC<TimeSheetScreenProps> = observer(function TimeSheetScreen({ navigation }: TimeSheetScreenProps) {
  const currentDate = moment();
  const startOfMonth = currentDate.clone().startOf('month');
  const currentWeekOfMonth = Math.ceil(currentDate.diff(startOfMonth, 'days') / 7) + 1;
  const startOfWeek = currentDate.clone().startOf('week');
  const daysOfWeek = Array.from({ length: 7 }, (v, i) => startOfWeek.clone().add(i, 'days')).filter(day => day.isoWeekday() < 6); // Monday to Friday

  const [dayRecords, setDayRecords] = useState<DayRecord[]>([]);

  useEffect(() => {
    const loadDayRecords = async () => {
      const records: DayRecord[] = [];
      for (const day of daysOfWeek) {
        const date = day.format('YYYY-MM-DD');
        const clockInTime = await AsyncStorage.getItem(`clockIn_${date}`);
        const clockOutTime = await AsyncStorage.getItem(`clockOut_${date}`);
        records.push({ date, clockInTime, clockOutTime });
      }
      setDayRecords(records);
    };
    loadDayRecords();
  }, [daysOfWeek]);

  const renderDay = ({ item }: { item: DayRecord }) => {
    const isCurrentDay = moment().isSame(item.date, 'day');
    return (
      <TouchableOpacity
        style={[styles.dayContainer, !isCurrentDay && styles.disabledContainer]}
        onPress={() => {
          if (isCurrentDay) {
            navigation.navigate('ClockInScreen', { date: item.date });
          }
        }}
        disabled={!isCurrentDay}
      >
        <View style={styles.dayRow}>
          <Text preset="subheading" style={styles.dayName}>{moment(item.date).format('dddd')}</Text>
          <Text style={styles.dayDate}>{moment(item.date).format('MMMM D')}</Text>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>Clock In: {item.clockInTime ? moment(item.clockInTime, 'HH:mm:ss').format('h:mm A') : '-'}</Text>
          <Text style={styles.timeText}>Clock Out: {item.clockOutTime ? moment(item.clockOutTime, 'HH:mm:ss').format('h:mm A') : '-'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen style={styles.container}>
      <Header
        title={`Week ${currentWeekOfMonth}`}
        titleMode="flex"
        titleStyle={{ color: '#fff', marginRight: "auto" }}
        rightText={`${startOfWeek.format('MMMM D')} - ${startOfWeek.clone().add(6, 'days').format('MMMM D')}`}
        style={styles.header}
      />
      <Text style={styles.heading}>Timesheets</Text>
      <FlatList
        data={dayRecords}
        renderItem={renderDay}
        keyExtractor={(item) => item.date}
      />
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
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333', // Darker color for text
    marginBottom: 20,
    marginTop: 20,
    textAlign: 'center',
  },
  dayContainer: {
    backgroundColor: '#fff', // White background for cards
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  disabledContainer: {
    backgroundColor: '#e0e0e0', // Light gray for disabled
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dayName: {
    color: '#333', // Darker color for text
    fontSize: 18,
  },
  dayDate: {
    color: '#888', // Grey color for secondary text
    fontSize: 14,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  timeText: {
    fontSize: 16,
    color: '#333',
  },
});
