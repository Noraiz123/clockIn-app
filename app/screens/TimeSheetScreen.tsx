import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useState } from "react"
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native"
import { AppStackScreenProps } from "../navigators"
import { Screen, Header, Text } from "../components"
import moment from "moment"
import AsyncStorage from '@react-native-async-storage/async-storage'
import colors from "../constants/colors"

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
        titleStyle={{ color: colors.white, marginRight: "auto" }}
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
    backgroundColor: colors.lightBackground,
    padding: 10,
  },
  header: {
    backgroundColor: colors.lightGreen,
    padding: 15,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 20,
    marginTop: 20,
    textAlign: 'center',
  },
  dayContainer: {
    backgroundColor: colors.white,
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  disabledContainer: {
    backgroundColor: colors.lightGray,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dayName: {
    color: colors.darkText,
    fontSize: 18,
  },
  dayDate: {
    color: colors.grayText,
    fontSize: 14,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  timeText: {
    fontSize: 16,
    color: colors.darkText,
  },
})
