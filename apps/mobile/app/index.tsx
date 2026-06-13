import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Medicine = {
  id: string;
  name: string;
};

const SAMPLE_CABINET: Medicine[] = [
  { id: "1", name: "Pan-40" },
  { id: "2", name: "Paracetamol" },
  { id: "3", name: "Cetirizine" },
];

export default function Home() {
  const [cabinet] = useState<Medicine[]>(SAMPLE_CABINET);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Your Cabinet</Text>
        <Text style={styles.sub}>
          {cabinet.length} medicines registered
        </Text>

        {cabinet.map((med) => (
          <View key={med.id} style={styles.card}>
            <Text style={styles.cardTitle}>{med.name}</Text>
            <Text style={styles.cardMeta}>Tap for AI usage & dosage info</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} activeOpacity={0.85}>
          <Text style={styles.addButtonText}>+ Add Medicine</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          MedCheck dev build — backend (auth, AI enrichment, search) not yet
          wired up.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 20, gap: 12 },
  heading: { fontSize: 26, fontWeight: "800", color: "#0F172A" },
  sub: { fontSize: 14, color: "#64748B", marginBottom: 8 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  cardMeta: { fontSize: 13, color: "#94A3B8", marginTop: 4 },
  addButton: {
    backgroundColor: "#0EA5E9",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  addButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  footnote: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 16,
    textAlign: "center",
  },
});
