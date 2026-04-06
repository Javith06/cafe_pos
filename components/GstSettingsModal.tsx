import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Fonts } from "../constants/Fonts";
import { GstTaxMode, useGstStore } from "../stores/gstStore";

/* ================= TYPES ================= */

interface Props {
  visible: boolean;
  onClose: () => void;
  previewSubtotal?: number;
}

type Step = 0 | 1 | 2 | 3; // 0=mode, 1=rate, 2=confirm, 3=success

interface TaxModeOption {
  id: GstTaxMode;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
}

const TAX_MODES: TaxModeOption[] = [
  {
    id: "none",
    icon: "close-circle-outline",
    label: "No Tax",
    desc: "Prices shown as-is, no GST applied",
  },
  {
    id: "exclusive",
    icon: "add-circle-outline",
    label: "Exclusive",
    desc: "GST added on top at checkout",
  },
  {
    id: "inclusive",
    icon: "checkmark-circle-outline",
    label: "Inclusive",
    desc: "GST already inside the price",
  },
];

const PRESETS: { rate: number; label: string }[] = [
  { rate: 0, label: "Exempt" },
  { rate: 6, label: "SST" },
  { rate: 8, label: "Reduced" },
  { rate: 9, label: "Standard" },
  { rate: 10, label: "Service" },
];

/* ================= COMPONENT ================= */

export default function GstSettingsModal({
  visible,
  onClose,
  previewSubtotal = 100,
}: Props) {
  const {
    percentage,
    registrationNumber,
    taxMode: savedMode,
    updateSettings,
  } = useGstStore();

  const [step, setStep] = useState<Step>(0);
  const [selectedMode, setSelectedMode] = useState<GstTaxMode>("exclusive");
  const [rateStr, setRateStr] = useState("9");
  const [regNo, setRegNo] = useState("");
  const [regErr, setRegErr] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  /* sync store values when modal opens */
  useEffect(() => {
    if (visible) {
      setStep(0);
      setSelectedMode(savedMode ?? "exclusive");
      setRateStr(percentage.toString());
      setRegNo(registrationNumber);
      setRegErr(false);
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
    }
  }, [visible]);

  /* ── animations ── */
  const animateStep = (next: Step) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  /* ── calculations ── */
  const rate = parseFloat(rateStr) || 0;

  const calcPreview = () => {
    const base = previewSubtotal;
    if (selectedMode === "none") return { base, gst: 0, total: base };
    if (selectedMode === "exclusive")
      return {
        base,
        gst: +((base * rate) / 100).toFixed(2),
        total: +(base + (base * rate) / 100).toFixed(2),
      };
    // inclusive
    const gst = +(base - base / (1 + rate / 100)).toFixed(2);
    return { base: +(base - gst).toFixed(2), gst, total: base };
  };

  const preview = calcPreview();

  /* ── validation ── */
  const validateReg = (val: string) => {
    if (!val.trim()) {
      setRegErr(false);
      return true;
    }
    // Malaysian GST / SST reg or generic alphanumeric 12-15 chars
    const ok = /^[A-Z0-9\-]{8,20}$/i.test(val.trim());
    setRegErr(!ok);
    return ok;
  };

  const handleRegChange = (val: string) => {
    setRegNo(val);
    validateReg(val);
  };

  /* ── save ── */
  const handleSave = async () => {
    if (!validateReg(regNo)) return;
    await updateSettings(rate, regNo.trim(), selectedMode);
    animateStep(3);
  };

  /* ── step helpers ── */
  const goNext = () => animateStep((step + 1) as Step);
  const goBack = () => animateStep((step - 1) as Step);

  const modeCanProceed = selectedMode !== undefined;
  const rateCanProceed = !isNaN(rate) && rate >= 0 && rate <= 100;

  /* ── header labels ── */
  const HEADERS = [
    { title: "Tax Mode", sub: "Step 1 of 3  —  How is GST applied?" },
    { title: "GST Rate", sub: "Step 2 of 3  —  Set your rate" },
    { title: "Confirm", sub: "Step 3 of 3  —  Review and save" },
    { title: "", sub: "" },
  ];

  /* ================= RENDER ================= */

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* ── HEADER ── */}
          {step < 3 && (
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.dot} />
                  <Text style={styles.headerTitle}>{HEADERS[step].title}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#555" />
                </TouchableOpacity>
              </View>
              <Text style={styles.headerSub}>{HEADERS[step].sub}</Text>

              {/* progress pips */}
              <View style={styles.pips}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.pip,
                      i <= step ? styles.pipActive : styles.pipInactive,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── ANIMATED BODY ── */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* STEP 0 — MODE */}
            {step === 0 && (
              <View style={styles.body}>
                {TAX_MODES.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.modeCard,
                      selectedMode === m.id && styles.modeCardActive,
                    ]}
                    onPress={() => setSelectedMode(m.id)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.modeIconWrap,
                        selectedMode === m.id && styles.modeIconWrapActive,
                      ]}
                    >
                      <Ionicons
                        name={m.icon}
                        size={22}
                        color={selectedMode === m.id ? "#000" : "#4ade80"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.modeLabel,
                          selectedMode === m.id && styles.modeLabelActive,
                        ]}
                      >
                        {m.label}
                      </Text>
                      <Text style={styles.modeDesc}>{m.desc}</Text>
                    </View>
                    {selectedMode === m.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#4ade80"
                      />
                    )}
                  </TouchableOpacity>
                ))}

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
                    <Text style={styles.btnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.btnNext,
                      !modeCanProceed && styles.btnDisabled,
                    ]}
                    onPress={goNext}
                    disabled={!modeCanProceed}
                  >
                    <Text style={styles.btnNextText}>
                      {selectedMode === "none" ? "Skip to Confirm" : "Next"}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 1 — RATE */}
            {step === 1 && (
              <View style={styles.body}>
                {/* presets */}
                <Text style={styles.sectionLabel}>QUICK PRESETS</Text>
                <View style={styles.presetGrid}>
                  {PRESETS.map((p) => (
                    <TouchableOpacity
                      key={p.rate}
                      style={[
                        styles.preset,
                        parseFloat(rateStr) === p.rate && styles.presetActive,
                      ]}
                      onPress={() => setRateStr(p.rate.toString())}
                    >
                      <Text
                        style={[
                          styles.presetRate,
                          parseFloat(rateStr) === p.rate &&
                            styles.presetRateActive,
                        ]}
                      >
                        {p.rate}%
                      </Text>
                      <Text
                        style={[
                          styles.presetLabel,
                          parseFloat(rateStr) === p.rate &&
                            styles.presetLabelActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* custom input */}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  CUSTOM RATE
                </Text>
                <View style={styles.rateInputWrap}>
                  <TextInput
                    style={styles.rateInput}
                    value={rateStr}
                    onChangeText={(v) => {
                      setRateStr(v);
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#444"
                    selectTextOnFocus
                  />
                  <Text style={styles.ratePercent}>%</Text>
                </View>

                {/* live preview */}
                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>
                    LIVE PREVIEW — ${previewSubtotal.toFixed(2)} ITEM
                  </Text>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLbl}>Base price</Text>
                    <Text style={styles.previewVal}>
                      ${preview.base.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLbl}>GST ({rate}%)</Text>
                    <Text style={[styles.previewVal, { color: "#4ade80" }]}>
                      ${preview.gst.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.previewRow, styles.previewTotalRow]}>
                    <Text style={styles.previewTotalLbl}>TOTAL</Text>
                    <Text style={styles.previewTotalVal}>
                      ${preview.total.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.btnBack} onPress={goBack}>
                    <Ionicons name="arrow-back" size={16} color="#888" />
                    <Text style={styles.btnBackText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.btnNext,
                      !rateCanProceed && styles.btnDisabled,
                    ]}
                    onPress={goNext}
                    disabled={!rateCanProceed}
                  >
                    <Text style={styles.btnNextText}>Next</Text>
                    <Ionicons name="arrow-forward" size={16} color="#000" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 2 — CONFIRM */}
            {step === 2 && (
              <View style={styles.body}>
                {/* reg no */}
                <Text style={styles.sectionLabel}>
                  GST REG NO <Text style={styles.optionalTag}>OPTIONAL</Text>
                </Text>
                <TextInput
                  style={[styles.regInput, regErr && styles.regInputErr]}
                  value={regNo}
                  onChangeText={handleRegChange}
                  placeholder="e.g. M2-1234567-X"
                  placeholderTextColor="#444"
                  autoCapitalize="characters"
                />
                {regErr && (
                  <Text style={styles.regErrText}>
                    Invalid registration number format
                  </Text>
                )}

                {/* summary card */}
                <Text style={[styles.sectionLabel, { marginTop: 18 }]}>
                  SETTINGS SUMMARY
                </Text>
                <View style={styles.summaryCard}>
                  <SummaryRow
                    label="Tax Mode"
                    value={
                      selectedMode === "none"
                        ? "No Tax"
                        : selectedMode === "exclusive"
                          ? "Exclusive (added on top)"
                          : "Inclusive (built in)"
                    }
                    green
                  />
                  {selectedMode !== "none" && (
                    <SummaryRow label="GST Rate" value={`${rate}%`} green />
                  )}
                  {regNo.trim() && !regErr && (
                    <SummaryRow label="Reg No" value={regNo.toUpperCase()} />
                  )}
                  <View style={styles.summaryDivider} />
                  <SummaryRow
                    label={`On $${previewSubtotal.toFixed(2)} → Total`}
                    value={`$${preview.total.toFixed(2)}`}
                    green
                    large
                  />
                </View>

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.btnBack} onPress={goBack}>
                    <Ionicons name="arrow-back" size={16} color="#888" />
                    <Text style={styles.btnBackText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnNext, regErr && styles.btnDisabled]}
                    onPress={handleSave}
                    disabled={regErr}
                  >
                    <Ionicons name="checkmark" size={16} color="#000" />
                    <Text style={styles.btnNextText}>Save GST</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 3 — SUCCESS */}
            {step === 3 && (
              <View style={[styles.body, styles.successBody]}>
                <View style={styles.successRing}>
                  <Ionicons name="checkmark" size={32} color="#4ade80" />
                </View>
                <Text style={styles.successTitle}>GST Applied</Text>
                <Text style={styles.successSub}>
                  {selectedMode === "none"
                    ? "Tax disabled. Prices shown as-is."
                    : `${selectedMode === "exclusive" ? "Exclusive" : "Inclusive"} · ${rate}% GST\nTotal on $${previewSubtotal.toFixed(2)} → $${preview.total.toFixed(2)}`}
                </Text>
                <TouchableOpacity style={styles.btnDone} onPress={onClose}>
                  <Text style={styles.btnDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

/* ── small helper ── */
function SummaryRow({
  label,
  value,
  green,
  large,
}: {
  label: string;
  value: string;
  green?: boolean;
  large?: boolean;
}) {
  return (
    <View style={summaryRowStyle.row}>
      <Text style={summaryRowStyle.key}>{label}</Text>
      <Text
        style={[
          summaryRowStyle.val,
          green && summaryRowStyle.valGreen,
          large && summaryRowStyle.valLarge,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const summaryRowStyle = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  key: {
    color: "#555",
    fontSize: 12,
    fontFamily: Fonts.medium,
    letterSpacing: 0.5,
    flex: 1,
  },
  val: {
    color: "#e2e8f0",
    fontSize: 13,
    fontFamily: Fonts.extraBold,
    textAlign: "right",
    flex: 1,
  },
  valGreen: { color: "#4ade80" },
  valLarge: { fontSize: 18 },
});

/* ================= STYLES ================= */

const styles = StyleSheet.create({
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
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },

  /* header */
  header: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  headerTitle: {
    color: "#f1f5f9",
    fontFamily: Fonts.black,
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  headerSub: {
    color: "#3a3a3a",
    fontSize: 11,
    fontFamily: Fonts.medium,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  pips: {
    flexDirection: "row",
    gap: 6,
  },
  pip: {
    height: 3,
    flex: 1,
    borderRadius: 2,
  },
  pipActive: {
    backgroundColor: "#4ade80",
  },
  pipInactive: {
    backgroundColor: "#2a2a2a",
  },

  /* body */
  body: {
    padding: 22,
  },

  /* mode cards */
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#222",
  },
  modeCardActive: {
    borderColor: "#4ade80",
    backgroundColor: "#052e16",
  },
  modeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(74,222,128,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  modeIconWrapActive: {
    backgroundColor: "#4ade80",
  },
  modeLabel: {
    color: "#e2e8f0",
    fontFamily: Fonts.extraBold,
    fontSize: 14,
    marginBottom: 2,
  },
  modeLabelActive: {
    color: "#4ade80",
  },
  modeDesc: {
    color: "#4a4a4a",
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },

  /* presets */
  sectionLabel: {
    color: "#3a3a3a",
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  presetGrid: {
    flexDirection: "row",
    gap: 8,
  },
  preset: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e1e1e",
  },
  presetActive: {
    backgroundColor: "#052e16",
    borderColor: "#4ade80",
  },
  presetRate: {
    color: "#666",
    fontFamily: Fonts.black,
    fontSize: 14,
  },
  presetRateActive: {
    color: "#4ade80",
  },
  presetLabel: {
    color: "#333",
    fontFamily: Fonts.medium,
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  presetLabelActive: {
    color: "#166534",
  },

  /* rate input */
  rateInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  rateInput: {
    flex: 1,
    color: "#4ade80",
    fontFamily: Fonts.black,
    fontSize: 24,
  },
  ratePercent: {
    color: "#333",
    fontFamily: Fonts.bold,
    fontSize: 20,
  },

  /* preview */
  previewBox: {
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  previewTitle: {
    color: "#333",
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  previewLbl: {
    color: "#555",
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  previewVal: {
    color: "#888",
    fontFamily: Fonts.extraBold,
    fontSize: 13,
  },
  previewTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#1e1e1e",
    marginTop: 8,
    paddingTop: 10,
  },
  previewTotalLbl: {
    color: "#e2e8f0",
    fontFamily: Fonts.black,
    fontSize: 14,
    letterSpacing: 1,
  },
  previewTotalVal: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 18,
  },

  /* reg no */
  optionalTag: {
    color: "#2a2a2a",
    fontSize: 10,
    letterSpacing: 1,
  },
  regInput: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 12,
    padding: 14,
    color: "#aaa",
    fontFamily: Fonts.medium,
    fontSize: 14,
    letterSpacing: 1,
  },
  regInputErr: {
    borderColor: "#ef4444",
  },
  regErrText: {
    color: "#ef4444",
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 5,
  },

  /* summary */
  summaryCard: {
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#1e1e1e",
    marginVertical: 8,
  },

  /* buttons */
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
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
  btnCancelText: {
    color: "#555",
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  btnBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    height: 50,
    justifyContent: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
  },
  btnBackText: {
    color: "#666",
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  btnNext: {
    flex: 2,
    height: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#4ade80",
    borderRadius: 12,
  },
  btnNextText: {
    color: "#000",
    fontFamily: Fonts.black,
    fontSize: 15,
  },
  btnDisabled: {
    backgroundColor: "#1a3a1a",
  },

  /* success */
  successBody: {
    alignItems: "center",
    paddingVertical: 40,
  },
  successRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#4ade80",
    backgroundColor: "#052e16",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  successTitle: {
    color: "#f1f5f9",
    fontFamily: Fonts.black,
    fontSize: 20,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  successSub: {
    color: "#555",
    fontFamily: Fonts.medium,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  btnDone: {
    width: "100%",
    height: 52,
    backgroundColor: "#4ade80",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnDoneText: {
    color: "#000",
    fontFamily: Fonts.black,
    fontSize: 16,
  },
});
