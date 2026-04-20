import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../context/ThemeContext";
import { 
    getNotifications, 
    deleteNotification, 
    clearAllNotifications, 
    markAllAsRead, 
    markAsRead,
    NotificationRecord 
} from "../../db/database";
import { COLOR_MAP, ICON_MAP, NotificationType } from "../../components/NotificationContext";

export default function NotificationsScreen() {
    const { theme } = useTheme();
    const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

    const fetchNotifications = async () => {
        const data = await getNotifications();
        setNotifications(data);
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
        fetchNotifications();
    };

    const handleMarkAsRead = async (id: number) => {
        await markAsRead(id);
        fetchNotifications();
    };

    useFocusEffect(
        React.useCallback(() => {
            fetchNotifications();
        }, [])
    );

    const handleDelete = (id: number) => {
        Alert.alert("Delete", "Remove this notification?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Delete", 
                style: "destructive", 
                onPress: async () => {
                    await deleteNotification(id);
                    fetchNotifications();
                } 
            }
        ]);
    };

    const handleClearAll = () => {
        if (notifications.length === 0) return;
        Alert.alert("Clear All", "Remove all notifications?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Clear", 
                style: "destructive", 
                onPress: async () => {
                    await clearAllNotifications();
                    fetchNotifications();
                } 
            }
        ]);
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const renderItem = ({ item }: { item: NotificationRecord }) => {
        const type = (item.type || "info") as NotificationType;
        const colors = COLOR_MAP[type];
        const iconName = ICON_MAP[type];

        const isUnread = item.is_read === 0;

        return (
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => isUnread && handleMarkAsRead(item.id)}
                style={[
                    styles.notificationItem, 
                    { 
                        backgroundColor: theme.card, 
                        borderColor: theme.border,
                        opacity: isUnread ? 1 : 0.7,
                        borderLeftWidth: isUnread ? 4 : 1,
                        borderLeftColor: isUnread ? theme.primary : theme.border,
                    }
                ]}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${colors.icon}20` }]}>
                    <Ionicons name={iconName} size={20} color={colors.icon} />
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.messageHeader}>
                        <Text style={[styles.message, { color: theme.text }]}>{item.message}</Text>
                    </View>
                    <Text style={[styles.time, { color: theme.gray }]}>{formatTime(item.created_at)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                    <Ionicons name="trash-outline" size={20} color={theme.error} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerButton}>
                        <Text style={[styles.actionText, { color: theme.primary }]}>Mark all as read</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleClearAll} style={styles.headerButton}>
                        <Text style={[styles.clearText, { color: notifications.length > 0 ? theme.error : theme.gray }]}>
                            Clear All
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={64} color={theme.gray} />
                        <Text style={[styles.emptyText, { color: theme.gray }]}>No notifications yet</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerButton: {
        paddingVertical: 4,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    clearText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    message: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
        flex: 1,
    },
    time: {
        fontSize: 12,
        marginTop: 4,
    },
    deleteButton: {
        padding: 8,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyText: {
        fontSize: 18,
        marginTop: 16,
        fontWeight: '500',
    },
});
