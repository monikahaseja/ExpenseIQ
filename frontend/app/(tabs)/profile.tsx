import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput, Modal, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from "../../context/AuthContext";
import { Colors } from "../../constants/colors";
import { useColorScheme } from "nativewind";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import api from '../../utils/api';
import { API_URL } from '../../constants/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const { colorScheme } = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [loading, setLoading] = useState(false);

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
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
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
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
            <Ionicons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
        </View>
        <TouchableOpacity onPress={() => isEditing ? handleUpdateProfile() : setIsEditing(true)}>
          <Text style={[styles.editButton, { color: theme.primary }]}>
            {isEditing ? (loading ? 'Saving...' : 'Save') : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ position: 'relative', alignSelf: 'center' }}>
          <TouchableOpacity 
            onPress={isEditing ? pickImage : undefined}
            style={[styles.avatar, { backgroundColor: theme.primary, overflow: 'hidden' }]}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
            )}
          </TouchableOpacity>
          {isEditing && (
            <TouchableOpacity 
              onPress={pickImage}
              style={{
                position: 'absolute',
                bottom: 6,
                right: 0,
                backgroundColor: theme.card,
                borderRadius: 18,
                padding: 4,
                borderWidth: 2,
                borderColor: theme.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              }}
            >
              <Ionicons name="camera" size={14} color={theme.primary} />
            </TouchableOpacity>
          )}
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

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.tabIconDefault }]}>ACCOUNT</Text>
        <TouchableOpacity 
          style={[styles.menuItem, { borderBottomColor: theme.border }]}
          onPress={() => setPasswordModalVisible(true)}
        >
          <Ionicons name="lock-closed-outline" size={22} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Change Password</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.tabIconDefault} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]}>
          <Ionicons name="shield-checkmark-outline" size={22} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Privacy & Security</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.tabIconDefault} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.tabIconDefault }]}>SUPPORT</Text>
        <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]}>
          <Ionicons name="help-circle-outline" size={22} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Help Center</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.tabIconDefault} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={[styles.logoutButton, { borderColor: theme.error }]} 
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={22} color={theme.error} />
        <Text style={[styles.logoutText, { color: theme.error }]}>Log Out</Text>
      </TouchableOpacity>

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
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { marginTop: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold' },
  editButton: { fontSize: 18, fontWeight: '600' },
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
    paddingVertical: 15, 
    borderBottomWidth: 1 
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
