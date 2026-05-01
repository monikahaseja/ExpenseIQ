import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useColorScheme } from "nativewind";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  LayoutAnimation,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedRN, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  withDelay,
  Easing
} from "react-native-reanimated";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import {
  ChatMessage,
  FinancialSummary,
  getFinancialSummary,
  getQuickActions,
  handleQuery,
  Insight,
  QuickAction,
  generateInsights,
} from "../../utils/aiAdvisor";

// ─── Insight type → color mapping ────────────────────────────────
const INSIGHT_COLORS: Record<
  string,
  { bg: string; border: string; text: string; darkBg: string; darkBorder: string; darkText: string }
> = {
  danger: {
    bg: "#FEF2F2",
    border: "#FECACA",
    text: "#991B1B",
    darkBg: "#450a0a",
    darkBorder: "#991b1b",
    darkText: "#f87171",
  },
  warning: {
    bg: "#FFFBEB",
    border: "#FDE68A",
    text: "#92400E",
    darkBg: "#422006",
    darkBorder: "#92400e",
    darkText: "#fbbf24",
  },
  success: {
    bg: "#F0FDF4",
    border: "#BBF7D0",
    text: "#166534",
    darkBg: "#052e16",
    darkBorder: "#166534",
    darkText: "#4ade80",
  },
  tip: {
    bg: "#EFF6FF",
    border: "#BFDBFE",
    text: "#1E40AF",
    darkBg: "#0c1a3d",
    darkBorder: "#1e3a5f",
    darkText: "#60a5fa",
  },
  info: {
    bg: "#F0F9FF",
    border: "#BAE6FD",
    text: "#0C4A6E",
    darkBg: "#0c2d48",
    darkBorder: "#155e75",
    darkText: "#67e8f9",
  },
};

// ─── Simple Markdown Text Component ───────────────────────────────
const FormattedMessage = ({ text, color }: { text: string; color: string }) => {
  // Split by bold patterns **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return (
    <Text style={{ color, fontSize: 14, lineHeight: 21 }}>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text key={index} style={{ fontWeight: "800" }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

// ─── Bouncing Dot Animation ─────────────────────────────────────
const BouncingDot = ({ delay }: { delay: number }) => {
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <AnimatedRN.View
      style={[
        {
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: "#06b6d4",
          marginHorizontal: 2,
        },
        animatedStyle,
      ]}
    />
  );
};

const TypingIndicator = () => (
  <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 4 }}>
    <BouncingDot delay={0} />
    <BouncingDot delay={150} />
    <BouncingDot delay={300} />
  </View>
);

export default function AdvisorScreen() {
  const { theme } = useTheme();
  const { token, user } = useAuth();
  const isDark = theme.background === "#000000" || theme.background === "#020617" || theme.background === "#0F0F17";

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      text: `👋 Hi ${user?.name?.split(' ')[0] || ''}! I'm your **AI Financial Advisor**. I analyzed your spending patterns and I'm ready to help you save! Ask me anything about your expenses.`,
      sender: "advisor",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, insightData] = await Promise.all([
        getFinancialSummary(token),
        generateInsights(token),
      ]);
      setSummary(summaryData);
      setInsights(insightData);
    } catch (e) {
      console.error("Failed to load advisor data:", e);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();

      // Keyboard listener to scroll to bottom
      const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      return () => {
        showSubscription.remove();
      };
    }, [])
  );

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: text.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await handleQuery(text, [...messages, userMsg], token);
      const advisorMsg: ChatMessage = {
        id: `advisor-${Date.now()}`,
        text: response,
        sender: "advisor",
        timestamp: new Date(),
      };
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMessages((prev) => [...prev, advisorMsg]);
    } catch (e) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        text: "Sorry, I had trouble analyzing your data. Please try again.",
        sender: "advisor",
        timestamp: new Date(),
      };
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const quickActions = getQuickActions();

  if (loading) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color={theme.text} />
        <Text
          className="mt-4 font-bold"
          style={{ color: theme.text }}
        >
          Analyzing your finances...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, backgroundColor: theme.background }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            {/* Header */}
            <View className="px-4 pt-4 pb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 16,
                      backgroundColor: theme.primaryBg,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>🤖</Text>
                  </View>
                  <View>
                    <Text
                      className="text-2xl font-black"
                      style={{ color: theme.text, letterSpacing: -0.5 }}
                    >
                      Advisor
                    </Text>
                    <View className="flex-row items-center">
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#4ade80",
                          marginRight: 6,
                        }}
                      />
                      <Text
                        style={{
                          color: theme.gray,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        AI Processing Active
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setMessages([]);
                    loadData();
                  }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: theme.card,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Ionicons name="refresh" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Main scrollable area */}
            <ScrollView
              ref={scrollRef}
              className="flex-1"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
              onContentSizeChange={() =>
                scrollRef.current?.scrollToEnd({ animated: true })
              }
            >
              {/* Mini Financial Summary */}
              {(summary?.transactionCount ?? 0) > 0 && (
                <View className="mb-6">
                  <View
                    style={{
                      backgroundColor: theme.card,
                      borderRadius: 24,
                      padding: 20,
                      borderWidth: 1,
                      borderColor: theme.border,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.1,
                      shadowRadius: 20,
                      elevation: 5,
                    }}
                  >
                    <View className="flex-row justify-between items-center mb-4">
                      <Text
                        style={{
                          color: theme.primary,
                          fontSize: 11,
                          fontWeight: "900",
                          letterSpacing: 2,
                          textTransform: "uppercase",
                        }}
                      >
                        {summary?.monthLabel} Snapshot
                      </Text>
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                          backgroundColor: theme.primaryBg,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.primary,
                            fontSize: 10,
                            fontWeight: "800",
                          }}
                        >
                          {summary?.transactionCount} Trans.
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <View>
                        <Text
                          style={{
                            color: theme.gray,
                            fontSize: 11,
                            fontWeight: "600",
                            marginBottom: 2,
                          }}
                        >
                          Income
                        </Text>
                        <Text
                          style={{
                            color: "#4ade80",
                            fontSize: 18,
                            fontWeight: "900",
                          }}
                        >
                          +₹{summary?.totalIncome.toLocaleString()}
                        </Text>
                      </View>
                      <View className="items-center">
                        <View
                          style={{
                            width: 1,
                            height: 30,
                            backgroundColor: theme.border,
                          }}
                        />
                      </View>
                      <View className="items-center">
                        <Text
                          style={{
                            color: theme.gray,
                            fontSize: 11,
                            fontWeight: "600",
                            marginBottom: 2,
                          }}
                        >
                          Net
                        </Text>
                        <Text
                          style={{
                            color: (summary?.netBalance ?? 0) >= 0 ? "#4ade80" : "#f87171",
                            fontSize: 22,
                            fontWeight: "900",
                          }}
                        >
                          ₹{summary?.netBalance.toLocaleString()}
                        </Text>
                      </View>
                      <View className="items-center">
                        <View
                          style={{
                            width: 1,
                            height: 30,
                            backgroundColor: theme.border,
                          }}
                        />
                      </View>
                      <View className="items-end">
                        <Text
                          style={{
                            color: theme.gray,
                            fontSize: 11,
                            fontWeight: "600",
                            marginBottom: 2,
                          }}
                        >
                          Spent
                        </Text>
                        <Text
                          style={{
                            color: "#f87171",
                            fontSize: 18,
                            fontWeight: "900",
                          }}
                        >
                          -₹{summary?.totalExpenses.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {(summary?.budgetLimit ?? 0) > 0 && (
                      <View className="mt-5 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                        <View className="flex-row justify-between mb-2">
                          <Text
                            style={{
                              color: theme.text,
                              fontSize: 12,
                              fontWeight: "600",
                            }}
                          >
                            Monthly Budget - {summary?.budgetLimit.toLocaleString()}
                          </Text>
                          <Text
                            style={{
                              color: (summary?.budgetUsedPercent ?? 0) >= 90 ? "#f87171" : theme.primary,
                              fontSize: 12,
                              fontWeight: "900",
                            }}
                          >
                            {summary?.budgetUsedPercent.toFixed(0)}%
                          </Text>
                        </View>
                        <View
                          style={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                            overflow: "hidden",
                          }}
                        >
                          <View
                            style={{
                              height: "100%",
                              width: `${Math.min(summary?.budgetUsedPercent || 0, 100)}%`,
                              borderRadius: 4,
                              backgroundColor:
                                (summary?.budgetUsedPercent || 0) >= 100
                                  ? "#f87171"
                                  : (summary?.budgetUsedPercent || 0) >= 80
                                    ? "#fbbf24"
                                    : theme.primary,
                            }}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Insight Cards */}
              {insights.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row items-center mb-3 ml-1">
                    <Ionicons name="bulb-outline" size={16} color={theme.gray} style={{ marginRight: 8 }} />
                    <Text className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      Smart Insights
                    </Text>
                  </View>
                  {insights.map((insight) => {
                    const colors = INSIGHT_COLORS[insight.type] || INSIGHT_COLORS.info;
                    return (
                      <View
                        key={insight.id}
                        style={{
                          backgroundColor: isDark ? colors.darkBg : colors.bg,
                          borderColor: isDark ? colors.darkBorder : colors.border,
                          borderWidth: 1,
                          borderRadius: 20,
                          padding: 16,
                          marginBottom: 10,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.05,
                          shadowRadius: 10,
                        }}
                      >
                        <View className="flex-row items-center mb-2">
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 10,
                              backgroundColor: "rgba(255,255,255,0.1)",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 12,
                            }}
                          >
                            <Text style={{ fontSize: 18 }}>{insight.icon}</Text>
                          </View>
                          <Text
                            style={{
                              color: isDark ? colors.darkText : colors.text,
                              fontWeight: "900",
                              fontSize: 15,
                            }}
                          >
                            {insight.title}
                          </Text>
                        </View>
                        <Text
                          style={{
                            color: isDark ? colors.darkText : colors.text,
                            fontSize: 13,
                            lineHeight: 20,
                            opacity: 0.8,
                            paddingLeft: 4,
                          }}
                        >
                          {insight.message}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Chat Messages */}
              {messages.length > 0 && (
                <View className="mb-2">
                  <View className="flex-row items-center mb-3 ml-1">
                    <Ionicons name="chatbubbles-outline" size={16} color={theme.gray} style={{ marginRight: 8 }} />
                    <Text className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      Conversation
                    </Text>
                  </View>
                  {messages.map((msg) => {
                    const isUser = msg.sender === "user";
                    return (
                      <View
                        key={msg.id}
                        style={{
                          alignItems: isUser ? "flex-end" : "flex-start",
                          marginBottom: 16,
                        }}
                      >
                        <View
                          style={{
                            maxWidth: "85%",
                            backgroundColor: isUser ? theme.primary : theme.card,
                            borderRadius: 22,
                            borderBottomRightRadius: isUser ? 4 : 22,
                            borderBottomLeftRadius: isUser ? 22 : 4,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderWidth: 1,
                            borderColor: isUser ? "transparent" : theme.border,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.05,
                            shadowRadius: 5,
                            elevation: 2,
                          }}
                        >
                          <FormattedMessage
                            text={msg.text}
                            color={isUser ? "#ffffff" : isDark ? "#f3f4f6" : "#1f2937"}
                          />
                          <Text
                            style={{
                              fontSize: 10,
                              color: isUser ? "rgba(255,255,255,0.6)" : theme.gray,
                              marginTop: 6,
                              alignSelf: "flex-end",
                              fontWeight: "700",
                            }}
                          >
                            {msg.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Typing indicator */}
                  {isTyping && (
                    <View style={{ alignItems: "flex-start", marginBottom: 16 }}>
                      <View
                        style={{
                          backgroundColor: theme.card,
                          borderRadius: 22,
                          borderBottomLeftRadius: 4,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}
                      >
                        <TypingIndicator />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* Quick Actions */}
            <View
              className="pb-2 pt-2 border-t"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              >
                {quickActions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    onPress={() => sendMessage(action.query)}
                    disabled={isTyping}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: theme.primaryBg,
                      borderRadius: 16,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      opacity: isTyping ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ fontSize: 16, marginRight: 8 }}>{action.icon}</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "800",
                        color: theme.primary,
                      }}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Input Area */}
            <View
              className="px-4 pt-2 pb-8"
              style={{
                backgroundColor: theme.background,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.card,
                  borderRadius: 28,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: theme.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 5,
                }}
              >
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Ask your advisor..."
                  placeholderTextColor={theme.gray}
                  className="flex-1 px-4"
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: "500",
                    height: 48,
                  }}
                  returnKeyType="send"
                  onSubmitEditing={() => sendMessage(inputText)}
                  editable={!isTyping}
                />
                <TouchableOpacity
                  onPress={() => sendMessage(inputText)}
                  disabled={!inputText.trim() || isTyping}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor:
                      inputText.trim() && !isTyping ? theme.primary : theme.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isTyping ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons
                      name="arrow-up"
                      size={24}
                      color={inputText.trim() ? "#ffffff" : theme.gray}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
