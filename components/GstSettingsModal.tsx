import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Fonts } from "../constants/Fonts";
import { GstTaxMode, useGstStore } from "../stores/gstStore";

interface Props {
  visible: boolean;
  onClose: () => void;
  previewSubtotal?: number;
}

const PRESETS = [0, 2.15, 6, 9, 10];

export default function GstSettingsModal({
  visible,
  onClose,
  previewSubtotal = 100,
}: Props) {
  const {
    percentage,
    registrationNumber,
    taxMode: savedMode,
    enabled: savedEnabled,
    updateSettings,
  } = useGstStore();

  const [percentStr, setPercentStr] = useState("2.15");
  const [regNo, setRegNo] = useState("");
  const [regErr, setRegErr] = useState(false);
  const [taxMode, setTaxMode] = useState<GstTaxMode>("exclusive");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (visible) {
      setPercentStr(percentage.toString());
      setRegNo(registrationNumber);
      setTaxMode(savedMode ?? "exclusive");
      setEnabled(savedEnabled ?? false);
      setRegErr(false);
    }
  }, [visible]);

  const rate = parseFloat(percentStr) || 0;

  // exclusive: GST added on top  |  inclusive: GST extracted from price
  const gstAmt =
    taxMode === "exclusive"
      ? +((previewSubtotal * rate) / 100).toFixed(2)
      : +(previewSubtotal - previewSubtotal / (1 + rate / 100)).toFixed(2);

  const total =
    taxMode === "exclusive"
      ? +(previewSubtotal + gstAmt).toFixed(2)
      : previewSubtotal; // inclusive: total IS the subtotal

  const baseAmt =
    taxMode === "inclusive"
      ? +(previewSubtotal - gstAmt).toFixed(2)
      : previewSubtotal;

  const isValid = !isNaN(rate) && rate >= 0 && rate <= 100;

  const handleRegChange = (v: string) => {
    setRegNo(v);
    setRegErr(v.trim().length > 0 && v.trim().length < 5);
  };

  const handleSave = async () => {
    if (!isValid || regErr) return;
    await updateSettings(rate, regNo.trim(), taxMode, enabled);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <View style={s.card}>
          {/* ── TITLE ── */}
          <View style={s.titleRow}>
            <View style={s.titleLeft}>
              <View
                style={[
                  s.dot,
                  { backgroundColor: enabled ? "#4ade80" : "#333" },
                ]}
              />
              <Text style={s.title}>GST Settings</Text>
            </View>
            <View style={s.titleRight}>
              <Text
                style={[s.toggleLabel, { color: enabled ? "#4ade80" : "#444" }]}
              >
                {enabled ? "ON" : "OFF"}
              </Text>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: "#222", true: "#166534" }}
                thumbColor={enabled ? "#4ade80" : "#444"}
                ios_backgroundColor="#222"
              />
              <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="#555" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── BODY (dimmed when off) ── */}
          <View
            style={{ opacity: enabled ? 1 : 0.3 }}
            pointerEvents={enabled ? "auto" : "none"}
          >
            {/* ── TAX MODE TOGGLE ── */}
            <View style={s.modeRow}>
              <TouchableOpacity
                style={[s.modeBtn, taxMode === "exclusive" && s.modeBtnActive]}
                onPress={() => setTaxMode("exclusive")}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={15}
                  color={taxMode === "exclusive" ? "#000" : "#555"}
                />
                <Text
                  style={[
                    s.modeTxt,
                    taxMode === "exclusive" && s.modeTxtActive,
                  ]}
                >
                  Excl. GST
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modeBtn, taxMode === "inclusive" && s.modeBtnActive]}
                onPress={() => setTaxMode("inclusive")}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={15}
                  color={taxMode === "inclusive" ? "#000" : "#555"}
                />
                <Text
                  style={[
                    s.modeTxt,
                    taxMode === "inclusive" && s.modeTxtActive,
                  ]}
                >
                  Incl. GST
                </Text>
              </TouchableOpacity>
            </View>

            {/* mode hint */}
            <Text style={s.modeHint}>
              {taxMode === "exclusive"
                ? "GST is added on top of the item price at checkout"
                : "GST is already built into the item price"}
            </Text>

            {/* ── PREVIEW ── */}
            <View style={s.preview}>
              <View>
                <Text style={s.previewLabel}>BASE</Text>
                <Text style={s.previewBase}>${baseAmt.toFixed(2)}</Text>
              </View>
              <View style={s.previewDivider} />
              <View style={{ alignItems: "center" }}>
                <Text style={s.previewLabel}>GST ({rate}%)</Text>
                <Text style={s.previewGst}>+${gstAmt.toFixed(2)}</Text>
              </View>
              <View style={s.previewDivider} />
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.previewLabel}>TOTAL</Text>
                <Text style={s.previewTotal}>${total.toFixed(2)}</Text>
              </View>
            </View>

            {/* ── PRESETS ── */}
            <Text style={s.label}>QUICK SELECT</Text>
            <View style={s.presetRow}>
              {PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[s.preset, rate === p && s.presetActive]}
                  onPress={() => setPercentStr(p.toString())}
                >
                  <Text style={[s.presetTxt, rate === p && s.presetTxtActive]}>
                    {p}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── RATE INPUT ── */}
            <Text style={s.label}>GST PERCENTAGE</Text>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                value={percentStr}
                onChangeText={setPercentStr}
                keyboardType="numeric"
                placeholder="2.15"
                placeholderTextColor="#444"
                selectTextOnFocus
              />
              <Text style={s.inputSuffix}>%</Text>
            </View>

            {/* ── REG NO ── */}
            <Text style={[s.label, { marginTop: 14 }]}>
              GST REG NO <Text style={s.optional}>OPTIONAL</Text>
            </Text>
            <TextInput
              style={[s.inputFull, regErr && s.inputErr]}
              value={regNo}
              onChangeText={handleRegChange}
              placeholder="e.g. M2-1234567-X"
              placeholderTextColor="#444"
              autoCapitalize="characters"
            />
            {regErr && (
              <Text style={s.errTxt}>Too short — check the format</Text>
            )}
          </View>

          {/* ── BUTTONS ── */}
          <View style={s.btns}>
            <TouchableOpacity style={s.btnCancel} onPress={onClose}>
              <Text style={s.btnCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btnSave, (!isValid || regErr) && s.btnDisabled]}
              onPress={handleSave}
              disabled={!isValid || regErr}
            >
              <Ionicons name="checkmark" size={16} color="#000" />
              <Text style={s.btnSaveTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#161616",
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80" },
  title: {
    color: "#f1f5f9",
    fontFamily: Fonts.black,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },

  titleRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggleLabel: { fontSize: 11, fontFamily: Fonts.black, letterSpacing: 1 },
  modeRow: {
    flexDirection: "row",
    backgroundColor: "#0d0d0d",
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeBtnActive: { backgroundColor: "#4ade80" },
  modeTxt: { color: "#555", fontFamily: Fonts.bold, fontSize: 13 },
  modeTxtActive: { color: "#000" },
  modeHint: {
    color: "#2e2e2e",
    fontSize: 11,
    fontFamily: Fonts.medium,
    textAlign: "center",
    marginBottom: 16,
  },

  // preview
  preview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  previewLabel: {
    color: "#333",
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  previewBase: { color: "#666", fontFamily: Fonts.black, fontSize: 18 },
  previewGst: { color: "#4ade80", fontFamily: Fonts.black, fontSize: 18 },
  previewTotal: { color: "#fff", fontFamily: Fonts.black, fontSize: 18 },
  previewDivider: { width: 1, height: 32, backgroundColor: "#1e1e1e" },

  label: {
    color: "#3a3a3a",
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  optional: { color: "#252525", letterSpacing: 1 },

  presetRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  preset: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#0d0d0d",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  presetActive: { backgroundColor: "#052e16", borderColor: "#4ade80" },
  presetTxt: { color: "#444", fontFamily: Fonts.black, fontSize: 13 },
  presetTxtActive: { color: "#4ade80" },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: "#4ade80",
    fontFamily: Fonts.black,
    fontSize: 22,
    paddingVertical: 12,
  },
  inputSuffix: { color: "#333", fontFamily: Fonts.bold, fontSize: 18 },

  inputFull: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 12,
    padding: 14,
    color: "#aaa",
    fontFamily: Fonts.medium,
    fontSize: 14,
    letterSpacing: 0.8,
  },
  inputErr: { borderColor: "#ef4444" },
  errTxt: {
    color: "#ef4444",
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 5,
  },

  btns: { flexDirection: "row", gap: 10, marginTop: 22 },
  btnCancel: {
    flex: 1,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  btnCancelTxt: { color: "#555", fontFamily: Fonts.bold, fontSize: 14 },
  btnSave: {
    flex: 2,
    height: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#4ade80",
    borderRadius: 12,
  },
  btnSaveTxt: { color: "#000", fontFamily: Fonts.black, fontSize: 15 },
  btnDisabled: { backgroundColor: "#1a3a1a" },
});
