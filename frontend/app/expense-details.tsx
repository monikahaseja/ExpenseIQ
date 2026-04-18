import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Colors } from "../constants/colors";
import { CATEGORIES, INCOME_CATEGORIES } from "../constants/categories";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { API_URL } from "../constants/api";
import { db } from "../db/database";

export default function ExpenseDetailsScreen() {
    const { colorScheme } = useColorScheme();
    const theme = Colors[colorScheme ?? "light"];
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuth();

    const id = params.id as string;
    const title = params.title as string;
    const amount = parseFloat(params.amount as string);
    const type = params.type as "income" | "expense";
    const categoryId = params.category as string;
    const paymentMode = params.payment_mode as string;
    const tags = params.tags as string;
    const createdAt = params.created_at as string;
    const isRecurring = params.is_recurring === "1" || params.is_recurring === "true";

    const isIncome = type === "income";
    const category = isIncome 
        ? INCOME_CATEGORIES.find(c => c.id === categoryId) 
        : CATEGORIES.find(c => c.id === categoryId);

    const categoryIcon = category?.icon || (isIncome ? "trending-up" : "grid");
    const categoryColor = category?.color || (isIncome ? theme.success : "#94a3b8");
    const categoryName = category?.name || categoryId || "Others";

    const handleDelete = () => {
        Alert.alert("Delete Transaction", "Are you sure you want to delete this?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Delete", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        if (user) {
                            await axios.delete(`${API_URL}/expenses/${id}`);
                        }
                        await db.runAsync("DELETE FROM expenses WHERE id=?;", [id]);
                        router.back();
                    } catch (error) {
                        console.error("Delete failed:", error);
                        Alert.alert("Error", "Failed to delete transaction");
                    }
                }
            }
        ]);
    };

    const handleEdit = () => {
        router.push({
            pathname: "/add-expense",
            params: { ...params } as any
        });
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Transaction Details</Text>
                <TouchableOpacity onPress={handleDelete} style={styles.deleteButtonHeader}>
                    <Ionicons name="trash-outline" size={24} color={theme.error} />
                </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
                    <Ionicons name={categoryIcon as any} size={40} color={categoryColor} />
                </View>
                
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                <Text style={[styles.amount, { color: isIncome ? theme.success : theme.error }]}>
                    {isIncome ? "+" : "-"} ₹ {amount.toFixed(2)}
                </Text>

                <View style={styles.divider} />

                <View style={styles.infoGrid}>
                    <DetailItem label="Status" value={isIncome ? "Income" : "Expense"} icon="stats-chart" theme={theme} color={categoryColor} />
                    <DetailItem label="Category" value={categoryName} icon={categoryIcon} theme={theme} color={categoryColor} />
                    <DetailItem label="Date" value={new Date(createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })} icon="calendar" theme={theme} />
                    <DetailItem label="Payment" value={paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1)} icon="card" theme={theme} />
                    {isRecurring && (
                        <DetailItem label="Recurring" value="Yes (Monthly)" icon="repeat" theme={theme} color={theme.primary} />
                    )}
                </View>

                {tags ? (
                    <View style={styles.tagsSection}>
                        <Text style={[styles.sectionLabel, { color: theme.tabIconDefault }]}>TAGS</Text>
                        <View style={styles.tagsContainer}>
                            {tags.split(',').map((tag, i) => (
                                <View key={i} style={[styles.tag, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                    <Text style={[styles.tagText, { color: theme.text }]}>#{tag.trim()}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}
            </View>

            <TouchableOpacity 
                style={[styles.editButton, { backgroundColor: theme.primary }]}
                onPress={handleEdit}
            >
                <Ionicons name="pencil" size={20} color="#fff" />
                <Text style={styles.editButtonText}>Edit Transaction</Text>
            </TouchableOpacity>
        </ScrollView>
        </SafeAreaView>
    );
}

function DetailItem({ label, value, icon, theme, color }: { label: string, value: string, icon: string, theme: any, color?: string }) {
    return (
        <View style={styles.detailItem}>
            <View style={[styles.detailIcon, { backgroundColor: theme.background }]}>
                <Ionicons name={icon as any} size={18} color={color || theme.tabIconDefault} />
            </View>
            <View>
                <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>{label}</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
    },
    deleteButtonHeader: {
        padding: 8,
    },
    card: {
        margin: 20,
        borderRadius: 32,
        padding: 24,
        alignItems: "center",
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 5,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 8,
    },
    amount: {
        fontSize: 32,
        fontWeight: "900",
        marginBottom: 24,
    },
    divider: {
        width: "100%",
        height: 1,
        backgroundColor: "#eee",
        marginBottom: 24,
    },
    infoGrid: {
        width: "100%",
        gap: 20,
    },
    detailItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    detailIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: "bold",
    },
    tagsSection: {
        width: "100%",
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: "bold",
        marginBottom: 12,
    },
    tagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    tagText: {
        fontSize: 13,
        fontWeight: "600",
    },
    editButton: {
        margin: 20,
        height: 60,
        borderRadius: 20,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        marginBottom: 40,
    },
    editButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
});
