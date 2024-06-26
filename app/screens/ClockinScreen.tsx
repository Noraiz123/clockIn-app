import { observer } from "mobx-react-lite"
import React, { FC, useState, useEffect, useRef } from "react"
import { View, StyleSheet, Alert, Modal, TextInput, TouchableOpacity } from "react-native"
import { Screen, Header, Text, Button } from "../components"
import moment from "moment"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AppStackScreenProps } from "../navigators"
import colors from "../constants/colors"

interface ClockInScreenProps extends AppStackScreenProps<"ClockInScreen"> {}

interface Break {
  start: string
  end: string | null
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
  const [showLateAlert, setShowLateAlert] = useState(false)
  const [timer, setTimer] = useState(0)
  const timerInterval = useRef<NodeJS.Timeout | null>(null)
  const expectedClockInTime = moment(date).set({ hour: 9, minute: 0, second: 0 }).format("HH:mm")
  const expectedClockOutTime = moment(date).set({ hour: 17, minute: 0, second: 0 }).format("HH:mm")

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

  const currentActiveBreak = breaks.find((breakItem) => breakItem.end === null)

  useEffect(() => {
    if (clockInTime && !clockOutTime && !currentActiveBreak) {
      startTimer()
    } else {
      stopTimer()
    }

    return () => stopTimer()
  }, [clockInTime, clockOutTime, currentActiveBreak])

  const startTimer = () => {
    if (timerInterval.current) return
    timerInterval.current = setInterval(() => {
      setTimer((prevTimer) => prevTimer + 1)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
      timerInterval.current = null
    }
  }

  const handleClockIn = async () => {
    const time = moment().format("HH:mm:ss")
    if (moment(time, "HH:mm:ss").isAfter(moment(expectedClockInTime, "HH:mm:ss"))) {
      setShowLateAlert(true)
    }
    setClockInTime(time)
    try {
      await AsyncStorage.setItem(`clockIn_${date}`, time)
    } catch (e) {
      Alert.alert("Error", "Failed to save clock in time")
    }
  }

  const handleClockOut = async () => {
    const time = moment().format("HH:mm:ss")
    if (moment(time, "HH:mm:ss").isBefore(moment(expectedClockOutTime, "HH:mm:ss"))) {
      Alert.alert(
        "Early Clock Out",
        "You are trying to clock out before the expected clock-out time. Do you want to proceed?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "OK",
            onPress: async () => {
              setClockOutTime(time)
              try {
                await AsyncStorage.setItem(`clockOut_${date}`, time)
              } catch (e) {
                Alert.alert("Error", "Failed to save clock out time")
              }
            },
          },
        ],
      )
    } else {
      setClockOutTime(time)
      try {
        await AsyncStorage.setItem(`clockOut_${date}`, time)
      } catch (e) {
        Alert.alert("Error", "Failed to save clock out time")
      }
    }
  }

  const handleTakeBreak = () => {
    setModalVisible(true)
  }

  const handleSaveBreak = async () => {
    const newBreak: Break = {
      start: moment().format("HH:mm:ss"),
      end: null,
      note: breakNote,
    }
    const updatedBreaks = [...breaks, newBreak]
    setBreaks(updatedBreaks)
    setBreakNote("")
    setModalVisible(false)
    try {
      await AsyncStorage.setItem(`breaks_${date}`, JSON.stringify(updatedBreaks))
    } catch (e) {
      Alert.alert("Error", "Failed to save break")
    }
  }

  const handleEndBreak = async () => {
    const updatedBreaks = breaks.map((breakItem, index) => {
      if (index === breaks.length - 1 && breakItem.end === null) {
        return { ...breakItem, end: moment().format("HH:mm:ss") }
      }
      return breakItem
    })
    setBreaks(updatedBreaks)
    try {
      await AsyncStorage.setItem(`breaks_${date}`, JSON.stringify(updatedBreaks))
    } catch (e) {
      Alert.alert("Error", "Failed to save break")
    }
  }

  const handleClearRecord = async () => {
    setClockInTime(null)
    setClockOutTime(null)
    setShowLateAlert(false)
    setBreaks([])
    setTimer(0)
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
      const clockInMoment = moment(clockInTime, "HH:mm:ss")
      const clockOutMoment = moment(clockOutTime, "HH:mm:ss")
      let duration = moment.duration(clockOutMoment.diff(clockInMoment))

      breaks.forEach((breakItem) => {
        if (breakItem.start && breakItem.end) {
          const breakStartMoment = moment(breakItem.start, "HH:mm:ss")
          const breakEndMoment = moment(breakItem.end, "HH:mm:ss")
          const breakDuration = moment.duration(breakEndMoment.diff(breakStartMoment))
          duration = duration.subtract(breakDuration)
        }
      })

      const hours = Math.floor(duration.asHours())
      const minutes = Math.floor(duration.asMinutes() % 60)
      return `${hours}h ${minutes}m`
    }
    return "-"
  }

  const formatTimer = () => {
    const hours = Math.floor(timer / 3600)
    const minutes = Math.floor((timer % 3600) / 60)
    const seconds = timer % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`
  }

  return (
    <Screen preset="scroll" style={styles.container}>
      <Header
        title={`Clock In/Out`}
        titleStyle={{ color: colors.white }}
        style={styles.header}
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />
      <Text style={styles.dateText}>{moment(date).format("dddd, MMMM D, YYYY")}</Text>
      <Text style={styles.timeText}>
        Expected Clock In: {moment(expectedClockInTime, "HH:mm:ss").format("h:mm A")}
      </Text>
      <Text style={styles.timeText}>
        Expected Clock Out: {moment(expectedClockOutTime, "HH:mm:ss").format("h:mm A")}
      </Text>
      {showLateAlert && (
        <Text style={styles.lateAlert}>
          You are late by {moment().diff(moment(expectedClockInTime, "HH:mm:ss"), "minutes")}{" "}
          minutes!
        </Text>
      )}
      <View style={styles.buttonContainer}>
        <Button
          text="Clock In"
          onPress={handleClockIn}
          disabled={!moment().isSame(date, "day") || !!clockInTime}
          style={styles.button}
          disabledStyle={styles.disabledButton}
          disabledTextStyle={{ color: colors.darkText }}
          textStyle={{ color: colors.white }}
        />
        <Button
          text="Clock Out"
          onPress={handleClockOut}
          disabled={!clockInTime || !!clockOutTime}
          style={styles.button}
          textStyle={{ color: colors.white }}
          disabledStyle={styles.disabledButton}
          disabledTextStyle={{ color: colors.darkText }}
        />
      </View>
      <Text style={styles.timeText}>Current Timer: {clockInTime ? formatTimer() : "--:--:--"}</Text>
      <Text style={styles.timeText}>
        Clock In Time: {clockInTime ? moment(clockInTime, "HH:mm:ss").format("h:mm A") : "-"}
      </Text>
      <Text style={styles.timeText}>
        Clock Out Time: {clockOutTime ? moment(clockOutTime, "HH:mm:ss").format("h:mm A") : "-"}
      </Text>
      <Text style={styles.timeText}>Total Working Hours: {calculateWorkingHours()}</Text>
      <Button
        text={currentActiveBreak ? "End Break" : "Take a Break"}
        onPress={currentActiveBreak ? handleEndBreak : handleTakeBreak}
        disabled={!clockInTime || !!clockOutTime}
        style={styles.button}
        textStyle={{ color: colors.white }}
        disabledStyle={styles.disabledButton}
        disabledTextStyle={{ color: colors.darkText }}
      />
      <View style={styles.breaksContainer}>
        <Text preset="subheading">Breaks</Text>
        {breaks.length > 0 ? (
          breaks.map((breakItem, index) => (
            <View key={index} style={styles.breakItem}>
              <Text style={styles.breakText}>Break {index + 1}</Text>
              <Text style={styles.breakNote}>Note: {breakItem.note}</Text>
              <View style={styles.breakDetails}>
                <Text style={styles.breakDetail}>
                  Start: {moment(breakItem.start, "HH:mm:ss").format("h:mm A")}
                </Text>
                <Text style={styles.breakDetail}>
                  End: {breakItem.end ? moment(breakItem.end, "HH:mm:ss").format("h:mm A") : "-"}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text preset="default">No breaks taken</Text>
        )}
      </View>
      <Button
        text="Clear Today's Record"
        onPress={handleClearRecord}
        textStyle={{ color: colors.white }}
        style={styles.clearBtn}
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
            placeholderTextColor={colors.placeholderGray}
          />
          <Button
            text="Save Break"
            onPress={handleSaveBreak}
            textStyle={{ color: colors.white }}
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
    backgroundColor: colors.lightBackground,
    padding: 10,
  },
  header: {
    backgroundColor: colors.lightGreen,
    padding: 15,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.darkText,
    marginVertical: 20,
    textAlign: "center",
  },
  timeText: {
    fontSize: 16,
    color: colors.darkText,
    textAlign: "center",
    marginVertical: 10,
  },
  lateAlert: {
    fontSize: 16,
    color: colors.red,
    textAlign: "center",
    marginVertical: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  breaksContainer: {
    marginTop: 20,
  },
  breakItem: {
    backgroundColor: colors.white,
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  breakText: {
    fontSize: 14,
    color: colors.darkText,
    marginBottom: 5,
  },
  breakNote: {
    fontSize: 14,
    color: colors.darkText,
    marginBottom: 5,
    textAlign: "left",
  },
  breakDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  breakDetail: {
    fontSize: 14,
    color: colors.darkText,
    flex: 1,
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 100,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 10,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.red,
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 18,
  },
  input: {
    height: 40,
    borderColor: colors.placeholderGray,
    borderWidth: 1,
    marginBottom: 15,
    width: "100%",
    paddingHorizontal: 10,
  },
  button: {
    padding: 10,
    backgroundColor: colors.lightGreen,
  },
  clearBtn: {
    padding: 10,
    marginTop: 20,
    marginBottom: 60,
    backgroundColor: colors.lightGreen,
  },
  disabledButton: {
    backgroundColor: colors.lightGray,
  },
})
