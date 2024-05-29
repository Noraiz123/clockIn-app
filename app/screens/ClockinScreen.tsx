import { observer } from "mobx-react-lite"
import React, { FC, useState, useEffect } from "react"
import { View, StyleSheet, Alert, Modal, TextInput, TouchableOpacity } from "react-native"
import { Screen, Header, Text, Button } from "../components"
import moment from "moment"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AppStackScreenProps } from "../navigators"

interface ClockInScreenProps extends AppStackScreenProps<"ClockInScreen"> {}

interface Break {
  start: string
  end: string
  note: string
}

export const ClockInScreen: FC<ClockInScreenProps> = observer(function ClockInScreen({
  route,
  navigation,
}: ClockInScreenProps) {
  const { date } = route.params
  const [clockInTime, setClockInTime] = useState<string | null>(null)
  const [clockOutTime, setClockOutTime] = useState<string | null>(null)
  const [breaks, setBreaks] = useState<Break[]>([])
  const [isModalVisible, setModalVisible] = useState(false)
  const [breakNote, setBreakNote] = useState("")
  const [breakStartTime, setBreakStartTime] = useState<string | null>(null)

  useEffect(() => {
    const loadTimes = async () => {
      try {
        const clockIn = await AsyncStorage.getItem(`clockIn_${date}`)
        const clockOut = await AsyncStorage.getItem(`clockOut_${date}`)
        const breaksData = await AsyncStorage.getItem(`breaks_${date}`)
        if (clockIn) setClockInTime(clockIn)
        if (clockOut) setClockOutTime(clockOut)
        if (breaksData) setBreaks(JSON.parse(breaksData))
      } catch (e) {
        Alert.alert("Error", "Failed to load times")
      }
    }
    loadTimes()
  }, [date])

  const handleClockIn = async () => {
    const time = moment().format("HH:mm:ss")
    setClockInTime(time)
    try {
      await AsyncStorage.setItem(`clockIn_${date}`, time)
    } catch (e) {
      Alert.alert("Error", "Failed to save clock in time")
    }
  }

  const handleClockOut = async () => {
    const time = moment().format("HH:mm:ss")
    setClockOutTime(time)
    try {
      await AsyncStorage.setItem(`clockOut_${date}`, time)
    } catch (e) {
      Alert.alert("Error", "Failed to save clock out time")
    }
  }

  const handleTakeBreak = () => {
    setBreakStartTime(moment().format("HH:mm:ss"))
    setModalVisible(true)
  }

  const handleSaveBreak = async () => {
    const newBreak: Break = {
      start: breakStartTime!,
      end: moment().format("HH:mm:ss"),
      note: breakNote,
    }
    const updatedBreaks = [...breaks, newBreak]
    setBreaks(updatedBreaks)
    setModalVisible(false)
    setBreakNote("")
    try {
      await AsyncStorage.setItem(`breaks_${date}`, JSON.stringify(updatedBreaks))
    } catch (e) {
      Alert.alert("Error", "Failed to save break")
    }
  }

  const handleClearRecord = async () => {
    setClockInTime(null)
    setClockOutTime(null)
    setBreaks([])
    try {
      await AsyncStorage.removeItem(`clockIn_${date}`)
      await AsyncStorage.removeItem(`clockOut_${date}`)
      await AsyncStorage.removeItem(`breaks_${date}`)
    } catch (e) {
      Alert.alert("Error", "Failed to clear records")
    }
  }

  const calculateWorkingHours = () => {
    if (clockInTime && clockOutTime) {
      const clockInMoment = moment(clockInTime, 'HH:mm:ss')
      const clockOutMoment = moment(clockOutTime, 'HH:mm:ss')
      const duration = moment.duration(clockOutMoment.diff(clockInMoment))
      const hours = Math.floor(duration.asHours())
      const minutes = Math.floor(duration.asMinutes() % 60)
      return `${hours}h ${minutes}m`
    }
    return "-"
  }

  return (
    <Screen style={styles.container}>
      <Header
        title={`Clock In/Out`}
        titleStyle={{ color: "#fff" }}
        style={styles.header}
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />
      <Text style={styles.dateText}>{moment(date).format("dddd, MMMM D, YYYY")}</Text>
      <View style={styles.buttonContainer}>
        <Button
          text="Clock In"
          onPress={handleClockIn}
          disabled={!moment().isSame(date, "day") || !!clockInTime}
          style={styles.button}
          disabledStyle={styles.disabledButton}
          disabledTextStyle={{ color: "#333" }}
          textStyle={{ color: "#fff" }}
        />
        <Button
          text="Clock Out"
          onPress={handleClockOut}
          disabled={!clockInTime || !!clockOutTime}
          style={styles.button}
          textStyle={{ color: "#fff" }}
          disabledStyle={styles.disabledButton}
          disabledTextStyle={{ color: "#333" }}
        />
      </View>
      <Text style={styles.timeText}>Clock In Time: {clockInTime ? moment(clockInTime, 'HH:mm:ss').format('h:mm A') : "-"}</Text>
      <Text style={styles.timeText}>Clock Out Time: {clockOutTime ? moment(clockOutTime, 'HH:mm:ss').format('h:mm A') : "-"}</Text>
      <Text style={styles.timeText}>Total Working Hours: {calculateWorkingHours()}</Text>
      <Button
        text="Take a Break"
        onPress={handleTakeBreak}
        disabled={!clockInTime || !!clockOutTime}
        style={styles.button}
        textStyle={{ color: "#fff" }}
        disabledStyle={styles.disabledButton}
        disabledTextStyle={{ color: "#333" }}
      />
      <View style={styles.breaksContainer}>
        {breaks.map((breakItem, index) => (
          <View key={index} style={styles.breakItem}>
            <Text style={styles.breakText}>Break {index + 1}</Text>
            <View style={styles.breakDetails}>
              <Text style={styles.breakDetail}>Start: {moment(breakItem.start, 'HH:mm:ss').format('h:mm:ss A')}</Text>
              <Text style={styles.breakDetail}>End: {moment(breakItem.end, 'HH:mm:ss').format('h:mm:ss A')}</Text>
              <Text style={styles.breakDetail}>Note: {breakItem.note}</Text>
            </View>
          </View>
        ))}
      </View>
      <Button
        text="Clear Today's Record"
        onPress={handleClearRecord}
        textStyle={{ color: "#fff" }}
        style={styles.button}
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
          <Text style={styles.modalText}>Add Break Note</Text>
          <TextInput
            style={styles.input}
            onChangeText={setBreakNote}
            value={breakNote}
            placeholder="Enter break note"
          />
          <Button
            text="Save Break"
            onPress={handleSaveBreak}
            textStyle={{ color: "#fff" }}
            style={styles.button}
          />
        </View>
      </Modal>
    </Screen>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5", // Light background color
    padding: 10,
  },
  header: {
    backgroundColor: "#4caf50", // Light green color for header
    padding: 15,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 20,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  timeText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginVertical: 10,
  },
  breaksContainer: {
    marginTop: 20,
  },
  breakItem: {
    backgroundColor: "#fff",
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  breakText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  breakDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  breakDetail: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 100, // Move modal lower
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: "red",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 18,
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 15,
    width: "100%",
    paddingHorizontal: 10,
  },
  button: {
    padding: 10,
    backgroundColor: "#4caf50",
  },
  disabledButton: {
    backgroundColor: "#e0e0e0", // Light gray color for disabled button
  },
})
