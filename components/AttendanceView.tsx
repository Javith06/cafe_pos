import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Fonts } from "../constants/Fonts";
import { API_URL } from "@/constants/Config";
import { useToast } from "./Toast";

interface AttendanceRecord {
  AttendanceId: string;
  DeliveryPersonId: string;
  EmployeeName: string;
  StartDateTime: string;
  BreakInTime?: string;
  BreakOutTime?: string;
  EndDateTime?: string;
  NoofHours?: number;
  CreatedOn: string;
}

interface AttendanceViewProps {
  employeeId: string;
  employeeName?: string;
  onClose?: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  employeeId,
  employeeName,
  onClose,
}) => {
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shiftActive, setShiftActive] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const { showToast } = useToast();
  const { width } = useWindowDimensions();

  const isMobile = width < 768;

  useEffect(() => {
    fetchTodayAttendance();
    const interval = setInterval(fetchTodayAttendance, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [employeeId]);

  const fetchTodayAttendance = async () => {
    try {
      const response = await fetch(`${API_URL}/api/attendance/today/${employeeId}`);
      const data = await response.json();
      setAttendance(data);

      if (data) {
        setShiftActive(!data.EndDateTime);
        setOnBreak(data.BreakInTime && !data.BreakOutTime);
      }

      setError("");
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const trackAction = async (action: "START" | "BREAK_IN" | "BREAK_OUT" | "END") => {
    try {
      const response = await fetch(`${API_URL}/api/attendance/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          employeeName: employeeName || employeeId,
          action,
          timestamp: new Date().toISOString(),
          businessUnitId: "default",
          userId: "current-user",
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast({
          type: "success",
          message: `Shift ${action === "START" ? "Started" : action === "BREAK_IN" ? "Break Started" : action === "BREAK_OUT" ? "Break Ended" : "Ended"}`,
        });
        fetchTodayAttendance();
      }
    } catch (err) {
      console.error(`Error tracking ${action}:`, err);
      showToast({ type: "error", message: `Failed to track ${action}` });
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "--:--";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const calculateElapsedTime = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading && !attendance) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.employeeId}>{employeeId}</Text>
          <Text style={styles.employeeName}>{employeeName || "Employee"}</Text>
        </View>
        {shiftActive && (
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.badgeText}>ON DUTY</Text>
          </View>
        )}
      </View>

      {/* Status Cards */}
      <View style={styles.cardContainer}>
        {/* Start Time */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons
              name="log-in"
              size={24}
              color={shiftActive ? "#22c55e" : "#666"}
            />
          </View>
          <Text style={styles.cardLabel}>Start Time</Text>
          <Text style={styles.cardValue}>
            {attendance ? formatTime(attendance.StartDateTime) : "--:--"}
          </Text>
          {attendance?.StartDateTime && (
            <Text style={styles.cardDate}>
              {new Date(attendance.StartDateTime).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Break Status */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <MaterialIcons
              name="pause-circle-outline"
              size={24}
              color={onBreak ? "#3b82f6" : "#666"}
            />
          </View>
          <Text style={styles.cardLabel}>Break Status</Text>
          <Text style={styles.cardValue}>
            {onBreak ? "ON BREAK" : attendance?.BreakOutTime ? "Completed" : "Not Started"}
          </Text>
          {attendance?.BreakInTime && (
            <Text style={styles.cardDate}>
              {formatTime(attendance.BreakInTime)} -{" "}
              {attendance.BreakOutTime ? formatTime(attendance.BreakOutTime) : "..."}
            </Text>
          )}
        </View>

        {/* End Time */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons
              name="log-out"
              size={24}
              color={attendance?.EndDateTime ? "#666" : "#999"}
            />
          </View>
          <Text style={styles.cardLabel}>End Time</Text>
          <Text style={styles.cardValue}>
            {attendance?.EndDateTime ? formatTime(attendance.EndDateTime) : "--:--"}
          </Text>
          {!attendance?.EndDateTime && shiftActive && (
            <Text style={styles.cardDate}>Ongoing</Text>
          )}
        </View>

        {/* Total Hours */}
        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Ionicons name="time" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.cardLabel}>Total Hours</Text>
          <Text style={styles.cardValue}>
            {attendance?.NoofHours !== undefined
              ? attendance.NoofHours.toFixed(2)
              : shiftActive
                ? calculateElapsedTime(attendance?.StartDateTime || "", undefined)
                : "--"}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!shiftActive && !attendance ? (
          <TouchableOpacity
            style={[styles.btn, styles.btnStart]}
            onPress={() => trackAction("START")}
          >
            <Ionicons name="log-in" size={20} color="#fff" />
            <Text style={styles.btnText}>Start Shift</Text>
          </TouchableOpacity>
        ) : null}

        {shiftActive && !onBreak && attendance?.StartDateTime && (
          <TouchableOpacity
            style={[styles.btn, styles.btnBreak]}
            onPress={() => trackAction("BREAK_IN")}
          >
            <MaterialIcons name="pause-circle-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>Start Break</Text>
          </TouchableOpacity>
        )}

        {onBreak && (
          <TouchableOpacity
            style={[styles.btn, styles.btnBreakEnd]}
            onPress={() => trackAction("BREAK_OUT")}
          >
            <MaterialIcons name="play-circle-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>End Break</Text>
          </TouchableOpacity>
        )}

        {shiftActive && !onBreak && (
          <TouchableOpacity
            style={[styles.btn, styles.btnEnd]}
            onPress={() => trackAction("END")}
          >
            <Ionicons name="log-out" size={20} color="#fff" />
            <Text style={styles.btnText}>End Shift</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!isMobile && onClose && (
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
        >
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  employeeId: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: "#888",
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: "#fff",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  badgeText: {
    color: "#22c55e",
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  cardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardIcon: {
    marginBottom: 12,
    opacity: 0.8,
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: "#888",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  cardValue: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: "#fff",
  },
  cardDate: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: "#666",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  btn: {
    flex: 1,
    minWidth: 160,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  btnStart: {
    backgroundColor: "#22c55e",
  },
  btnBreak: {
    backgroundColor: "#3b82f6",
  },
  btnBreakEnd: {
    backgroundColor: "#a855f7",
  },
  btnEnd: {
    backgroundColor: "#ef4444",
  },
  btnText: {
    color: "#fff",
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  errorText: {
    color: "#ef4444",
    fontFamily: Fonts.medium,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  closeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeBtnText: {
    color: "#fff",
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
});
