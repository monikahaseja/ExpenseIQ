import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput, Modal, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Colors } from "../../constants/colors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import api from '../../utils/api';
import { API_URL } from '../../constants/api';
import { useFocusEffect } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile, refreshProfile } = useAuth();
  const { theme, themeName } = useTheme();

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
    }, [])
  );
  const isDark = theme.background === "#000000" || theme.background === "#020617" || theme.background === "#0F0F17";

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [loading, setLoading] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);


  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: logout, style: "destructive" }
      ]
    );
  };

  const handleUpdateProfile = async () => {
    if (!name || !email) {
      Alert.alert('Error', 'Name and Email are required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/auth/profile`, { name, email, phoneNumber, profilePhoto });
      await updateProfile(response.data.data);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/auth/change-password`, { currentPassword, newPassword });
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        
        <TouchableOpacity 
          onPress={() => isEditing ? handleUpdateProfile() : setIsEditing(true)}
          style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border, width: 'auto', minWidth: 44, paddingHorizontal: 12 }]}
        >
          <Text style={[styles.editButton, { color: theme.primary }]}>
            {isEditing ? (loading ? 'Saving...' : 'Save') : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ position: 'relative', alignSelf: 'center' }}>
          <TouchableOpacity 
            onPress={() => setPreviewModalVisible(true)}
            style={[styles.avatar, { backgroundColor: theme.primary, overflow: 'hidden', borderWidth: 4, borderColor: theme.border }]}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={pickImage}
            style={{
              position: 'absolute',
              bottom: 10,
              right: 0,
              backgroundColor: theme.primary,
              borderRadius: 20,
              width: 30,
              height: 30,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: theme.card,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Ionicons name="camera" size={16} color="white" />
          </TouchableOpacity>
        </View>
        
        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor={theme.tabIconDefault}
            />
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.tabIconDefault}
            />
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              placeholderTextColor={theme.tabIconDefault}
            />
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
              <Text style={{ color: theme.error }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
            <Text style={[styles.email, { color: theme.tabIconDefault }]}>{user?.email}</Text>
            {user?.phoneNumber && (
              <Text style={[styles.phone, { color: theme.tabIconDefault }]}>{user.phoneNumber}</Text>
            )}
          </>
        )}
      </View>

      {/* Member Since Info */}
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 20, padding: 20 }]}>
        <View style={styles.menuItem}>
          <Ionicons name="calendar-outline" size={22} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Member Since</Text>
          <Text style={{ color: theme.gray, fontSize: 14 }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'N/A'}</Text>
        </View>
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Change Password</Text>
            
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Current Password"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholderTextColor={theme.tabIconDefault}
            />
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholderTextColor={theme.tabIconDefault}
            />
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Confirm New Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholderTextColor={theme.tabIconDefault}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.card }]} 
                onPress={() => setPasswordModalVisible(false)}
              >
                <Text style={{ color: theme.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: theme.primary }]} 
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff' }}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Photo Preview Modal */}
      <Modal
        visible={previewModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity 
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 1, padding: 10 }}
            onPress={() => setPreviewModalVisible(false)}
          >
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>
          
          <View style={{ width: '90%', aspectRatio: 1, backgroundColor: theme.card, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: theme.border }}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.primary }}>
                 <Text style={{ fontSize: 100, fontWeight: 'bold', color: 'white' }}>{user?.name?.[0]?.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, marginTop: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  editButton: { fontSize: 13, fontWeight: 'bold' },
  profileCard: { 
    padding: 30, 
    borderRadius: 24, 
    alignItems: 'center', 
    borderWidth: 1,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 15
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  email: { fontSize: 16, marginBottom: 5 },
  phone: { fontSize: 16 },
  editForm: { width: '100%', gap: 10 },
  input: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 12, 
    fontSize: 16,
    width: '100%'
  },
  cancelButton: { alignItems: 'center', marginTop: 5 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 15, letterSpacing: 1 },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  menuText: { flex: 1, fontSize: 16, marginLeft: 15 },
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 15, 
    borderRadius: 16, 
    borderWidth: 1,
    marginBottom: 50
  },
  logoutText: { fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20
  },
  modalContent: { 
    width: '100%', 
    padding: 24, 
    borderRadius: 24, 
    gap: 15 
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  modalButton: { 
    flex: 1, 
    padding: 15, 
    borderRadius: 12, 
    alignItems: 'center' 
  }
});
